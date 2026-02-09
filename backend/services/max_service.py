from datetime import datetime
import time
import json
import hashlib
import hmac
import base64
import requests
import logging
from sqlalchemy.orm import Session
from .. import models, crud

logger = logging.getLogger(__name__)

BASE_URL = "https://max-api.maicoin.com"

def get_auth_headers(path, api_key, api_secret, params=None):
    nonce = int(time.time() * 1000)
    
    payload_data = {
        'nonce': nonce,
        'path': path
    }
    if params:
        payload_data.update(params)
        
    # JSON dump with separators to avoid spaces if needed, but standard dumps usually works. 
    # MAX docs: json.dumps(params_to_sign)
    json_str = json.dumps(payload_data)
    
    # Base64 encode
    payload = base64.b64encode(json_str.encode()).decode()
    
    # Signature
    signature = hmac.new(
        api_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return {
        'X-MAX-ACCESSKEY': api_key,
        'X-MAX-PAYLOAD': payload,
        'X-MAX-SIGNATURE': signature,
        'Content-Type': 'application/json'
    }, payload_data

# Icon Mapping (Lucide React names)
TICKER_ICONS = {
    'BTC': 'Bitcoin',
    'WBTC': 'Bitcoin',
    'ETH': 'Gem', # Ethereum not in Lucide, use Gem
    'WETH': 'Gem',
    'USDT': 'DollarSign',
    'USDC': 'DollarSign',
    'MAX': 'Rocket', # MAX Token -> Rocket
    'SOL': 'Zap',
    'DOGE': 'PawPrint', # If available, or Coins
    'TWD': 'Wallet'
}

def sync_max_assets(db: Session):
    """
    Fetch balances from MAX and sync to Assets table using CryptoConnection.
    """
    logger.info("Starting MAX Sync...")
    
    # 1. Get Active MAX Connections
    connections = db.query(models.CryptoConnection).filter(
        models.CryptoConnection.provider == 'max',
        models.CryptoConnection.is_active == True
    ).all()
    
    if not connections:
        logger.info("MAX Sync skipped: No active connections found.")
        return False

    success_count = 0

    for conn in connections:
        logger.info(f"Syncing MAX Connection: {conn.name} ({conn.id})")
        api_key = conn.api_key
        api_secret = conn.api_secret
        
        if not api_key or not api_secret:
            logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
            continue
    
        # 2. Fetch Balance
        path = "/api/v3/wallet/spot/accounts"
        
        try:
            headers, payload_data = get_auth_headers(path, api_key, api_secret)
            query_params = payload_data.copy()
            if 'path' in query_params:
                del query_params['path']
                
            resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=query_params)
            
            if resp.status_code != 200:
                logger.error(f"MAX API Error {resp.status_code}: {resp.text}")
                continue
                
            accounts = resp.json() 
            
            active_balances = {}
            for acc in accounts:
                currency = acc.get('currency', '').upper()
                balance = float(acc.get('balance', 0))
                if balance > 0:
                    active_balances[currency] = balance
                    
            if not active_balances:
                logger.info(f"  {conn.name}: No positive balances found.")
                # We still 'succeeded' in connecting, just no funds
            else:
                logger.info(f"  {conn.name}: Found {len(active_balances)} assets: {list(active_balances.keys())}")
            
            # 3. Fetch Prices (Global)
            try:
                markets_to_fetch = []
                for ticker in active_balances.keys():
                    if ticker != 'TWD' and ticker != 'USDT':
                         markets_to_fetch.append(f"{ticker.lower()}twd")
                    elif ticker == 'USDT':
                         markets_to_fetch.append("usdttwd")
    
                market_prices = {}
                if markets_to_fetch:
                    params_list = [('markets[]', m) for m in markets_to_fetch]
                    prices_resp = requests.get(f"{BASE_URL}/api/v3/tickers", params=params_list)
                    if prices_resp.status_code == 200:
                        tickers_data = prices_resp.json()
                        for t_data in tickers_data:
                            m_pair = t_data.get('market')
                            last_price = float(t_data.get('last', 0))
                            market_prices[m_pair] = last_price
                    else:
                        logger.error(f"Failed to fetch MAX prices: {prices_resp.status_code}")
    
            except Exception as e:
                logger.error(f"Error fetching MAX prices: {e}")
                market_prices = {}
                
            # 4. Sync to DB
            for ticker, amount in active_balances.items():
                db_asset = db.query(models.Asset).filter(
                    models.Asset.connection_id == conn.id,
                    models.Asset.ticker == ticker
                ).first()
                
                # Clean Name
                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()
                current_price = 0.0
                if ticker == 'TWD':
                    current_price = 1.0
                else:
                    pair_key = f"{ticker.lower()}twd"
                    if pair_key in market_prices:
                        current_price = market_prices[pair_key]
                    elif ticker == 'USDT' and 'usdttwd' in market_prices:
                        current_price = market_prices['usdttwd']
                
                # Determine Avg Cost (from Trades)
                avg_cost = 0.0
                if ticker != 'TWD':
                    try:
                        market = f"{ticker.lower()}twd"
                        trades_path = "/api/v3/wallet/spot/trades"
                        t_params = {'market': market, 'limit': 500}
                        t_headers, t_payload = get_auth_headers(trades_path, api_key, api_secret, t_params)
                        
                        t_query_params = t_payload.copy()
                        if 'path' in t_query_params: del t_query_params['path']
                        
                        t_resp = requests.get(f"{BASE_URL}{trades_path}", headers=t_headers, params=t_query_params)
                        
                        if t_resp.status_code == 200:
                            trades = t_resp.json()
                            total_cost = 0.0
                            total_vol = 0.0
                            
                            for t in trades:
                                if t['side'] in ['buy', 'bid']:
                                    vol = float(t['volume'])
                                    price = float(t['price'])
                                    total_cost += vol * price
                                    total_vol += vol
                                    
                            if total_vol > 0:
                                avg_cost = total_cost / total_vol
                                
                    except Exception as e:
                        # Trades detail failure shouldn't block the asset sync
                        pass
    
                # Determine Target Icon
                target_icon = TICKER_ICONS.get(ticker, "Coins")
    
                if db_asset:
                    # Update Price if changed
                    if current_price > 0:
                        db_asset.current_price = current_price
                        db_asset.last_updated_at = datetime.now()
                    
                    # Update Avg Cost
                    if avg_cost > 0:
                        db_asset.manual_avg_cost = avg_cost
    
                    # Update Icon 
                    if db_asset.icon != target_icon:
                        db_asset.icon = target_icon
                    
                    # Balance Logic
                    current_recorded_qty = sum(t.amount for t in db_asset.transactions)
                    diff = amount - current_recorded_qty
                    
                    if abs(diff) > 1e-8:
                        new_tx = models.Transaction(
                            asset_id=db_asset.id,
                            amount=diff,
                            buy_price=0, 
                            date=datetime.now(), 
                            is_transfer=False
                        )
                        db.add(new_tx)
                    
                    db.commit()
                    
                else:
                    # Create New Asset
                    logger.info(f"  Creating new MAX asset: {ticker}")
                    
                    if ticker == 'TWD':
                        category = "Fluid"
                        sub_category = "Cash"
                    else:
                        category = "Crypto"
                        sub_category = None
                        
                    new_asset = models.Asset(
                        name=f"{ticker} ({conn.name})",
                        ticker=ticker,
                        category=category,
                        sub_category=sub_category,
                        source="max",
                        icon=target_icon,
                        include_in_net_worth=True,
                        current_price=current_price,
                        manual_avg_cost=avg_cost if avg_cost > 0 else None,
                        connection_id=conn.id
                    )
                    db.add(new_asset)
                    db.commit()
                    db.refresh(new_asset)
                    
                    # Initial Transaction
                    init_tx = models.Transaction(
                        asset_id=new_asset.id,
                        amount=amount,
                        buy_price=0,
                        date=datetime.now(),
                        is_transfer=False
                    )
                    db.add(init_tx)
                    db.commit()
            
            success_count += 1
            
        except Exception as e:
            logger.error(f"MAX Sync Exception for {conn.name}: {e}")
            
    return success_count > 0

