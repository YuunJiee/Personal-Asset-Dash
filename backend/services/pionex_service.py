import time
import hmac
import hashlib
import json
import requests
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from .. import models

logger = logging.getLogger(__name__)

BASE_URL = "https://api.pionex.com"

def get_pionex_signature(api_secret, method, path, params=None):
    """
    Pionex V1 Signature
    """
    timestamp = str(int(time.time() * 1000))
    
    # Sort params
    sorted_params = sorted(params.items()) if params else []
    query_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
    
    if query_string:
        to_sign = f"{method}{path}?{query_string}&timestamp={timestamp}"
    else:
        to_sign = f"{method}{path}?timestamp={timestamp}"
        
    # Official docs sometimes say just query string + timestamp?
    # Let's try standard pattern: query_string including timestamp
    
    # Actually, let's use the query param approach more standardly
    # PIONEX-SIGNATURE header? 
    # Let's verify standard Pionex V1.
    # Usually: 
    # Header: "PIONEX-KEY": api_key
    # Header: "PIONEX-SIGNATURE": signature
    # Query: timestamp=...
    # Signature input: path + "?" + query_string (w/ timestamp) + body
    
    # Let's try to stick to a known working pattern if possible.
    # Pattern: 
    # Sig = hmac_sha256(secret, body_string_or_query)
    pass 

def get_auth_headers_pionex(api_key, api_secret, method, path, params=None):
    timestamp = int(time.time() * 1000)
    
    # Prepare params with timestamp
    if params is None:
        params = {}
    params['timestamp'] = timestamp
    
    # Sort
    sorted_str = '&'.join([f"{k}={v}" for k, v in sorted(params.items())])
    
    # Signature payload: method + path + ? + query + body
    # But usually just Parameter string for GET
    payload = f"{method.upper()}{path}?{sorted_str}"
    
    signature = hmac.new(
        api_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        'PIONEX-KEY': api_key,
        'PIONEX-SIGNATURE': signature
    }
    
    return headers, params

def sync_pionex_assets(db: Session):
    logger.info("Starting Pionex Sync (Custom)...")
    
    connections = db.query(models.CryptoConnection).filter(
        models.CryptoConnection.provider == 'pionex',
        models.CryptoConnection.is_active == True
    ).all()
    
    if not connections:
        logger.info("Pionex Sync skipped: No active connections found.")
        return False
        
    success_count = 0
    
    for conn in connections:
        logger.info(f"Syncing Pionex Connection: {conn.name}")
        api_key = conn.api_key
        api_secret = conn.api_secret
        
        if not api_key or not api_secret:
            logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
            continue
            
        # Fetch Balance
        path = "/api/v1/account/balances"
        
        try:
            headers, final_params = get_auth_headers_pionex(api_key, api_secret, "GET", path, {})
            
            resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=final_params)
            
            if resp.status_code != 200:
                logger.error(f"Pionex API Error {resp.status_code}: {resp.text}")
                continue
                
            data = resp.json()
            # Likely { "data": { "balances": [...] }, "result": true }
            
            if not data.get('result', False):
                 logger.error(f"Pionex API Result False: {data}")
                 continue
                 
            balances = data.get('data', {}).get('balances', [])
            
            assets_found = {}
            for b in balances:
                # "coin": "BTC", "free": "0.1", "frozen": "0.0"
                coin = b.get('coin')
                free = float(b.get('free', 0))
                frozen = float(b.get('frozen', 0))
                total = free + frozen
                
                if total > 0:
                    assets_found[coin] = total
                    
            if not assets_found:
                logger.info(f"  {conn.name}: No assets found.")
            else:
                 logger.info(f"  {conn.name}: Found {len(assets_found)} assets.")
                 
            # 3. Fetch Prices (Global)
            try:
                # 3a. Get USDT/TWD rate from Shared Service
                # Import here to avoid circular dependency if any (though structured well it should be fine)
                from .exchange_rate_service import get_usdt_twd_rate
                usdt_twd_rate = get_usdt_twd_rate(db)
                logger.info(f"  USDT/TWD Rate: {usdt_twd_rate}")

                # 3b. Pionex V1 Tickers
                t_path = "/api/v1/market/tickers"
                t_resp = requests.get(f"{BASE_URL}{t_path}")
                market_prices = {}
                
                if t_resp.status_code == 200:
                    t_data = t_resp.json()
                    # Response: {"data": {"tickers": [{"symbol": "BTC_USDT", "close": "60000"}, ...]}, "result": true}
                    if t_data.get('result', False):
                        tickers_list = t_data.get('data', {}).get('tickers', [])
                        for t in tickers_list:
                             symbol = t.get('symbol') # e.g. BTC_USDT
                             price_usdt = float(t.get('close', 0))
                             # Store USD price (no TWD conversion here)
                             market_prices[symbol] = price_usdt
            except Exception as e:
                 logger.error(f"Error fetching Pionex prices: {e}")
                 # logic continues, prices remain 0

            # Sync to DB
            for ticker, amount in assets_found.items():
                db_asset = db.query(models.Asset).filter(
                    models.Asset.connection_id == conn.id,
                    models.Asset.ticker == ticker
                ).first()
                
                # Clean Name
                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()
                target_name = f"{ticker} ({clean_conn_name})"
                
                # Determine Price (USD base for crypto, convert to TWD)
                current_price_usd = 0.0
                if ticker == 'USDT':
                     current_price_usd = 1.0  # USDT = 1 USD
                else:
                    pair_key = f"{ticker}_USDT"
                    if pair_key in market_prices:
                        current_price_usd = market_prices[pair_key]
                
                # current_price is USD. Backend converts to TWD for display if needed. 
                current_price = current_price_usd
                
                if db_asset:
                    db_asset.last_updated_at = datetime.now()
                    db_asset.name = target_name
                    
                    if current_price > 0:
                        db_asset.current_price = current_price
                    
                    # Update Qty
                    current_qty = sum(t.amount for t in db_asset.transactions)
                    diff = amount - current_qty
                    
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
                    # Create New
                    new_asset = models.Asset(
                        name=target_name,
                        ticker=ticker,
                        category="Crypto",
                        sub_category=None,
                        source="pionex",
                        include_in_net_worth=True,
                        current_price=current_price if current_price > 0 else None,
                        connection_id=conn.id
                    )
                    db.add(new_asset)
                    db.commit()
                    db.refresh(new_asset)
                    
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
            logger.error(f"Pionex Sync Exception for {conn.name}: {e}")
            
    return success_count > 0
