import ccxt
import logging
from sqlalchemy.orm import Session
from datetime import datetime
from .. import models

logger = logging.getLogger(__name__)

def sync_binance_assets(db: Session):
    logger.info("Starting Binance Sync...")
    
    connections = db.query(models.CryptoConnection).filter(
        models.CryptoConnection.provider == 'binance',
        models.CryptoConnection.is_active == True
    ).all()
    
    if not connections:
        logger.info("Binance Sync skipped: No active connections found.")
        return False
        
    success_count = 0
    
    for conn in connections:
        logger.info(f"Syncing Binance Connection: {conn.name}")
        api_key = conn.api_key
        api_secret = conn.api_secret
        
        if not api_key or not api_secret:
            logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
            continue
            
        try:
            exchange = ccxt.binance({
                'apiKey': api_key,
                'secret': api_secret,
                'enableRateLimit': True,
            })
            
            # Fetch Balance
            balance = exchange.fetch_balance()
            # result structure: {'total': {'BTC': 0.1, ...}, 'free': {...}, 'used': {...}, ...}
            
            total_balances = balance.get('total', {})
            
            assets_found = {}
            for coin, amount in total_balances.items():
                if amount > 0:
                    assets_found[coin] = amount
            
            if not assets_found:
                logger.info(f"  {conn.name}: No assets found.")
            else:
                logger.info(f"  {conn.name}: Found {len(assets_found)} assets.")
                
            # Fetch Prices
            # For simplicity, fetch all tickers or fetch individually. ccxt has fetch_tickers()
            all_tickers = exchange.fetch_tickers() 
            # structure: {'BTC/USDT': {'last': 60000.0, ...}, ...}
            
            # Get USDT/TWD rate from Shared Service
            from .exchange_rate_service import get_usdt_twd_rate
            usdt_twd_rate = get_usdt_twd_rate(db)
            logger.info(f"  USDT/TWD Rate: {usdt_twd_rate}")

            # Sync to DB
            for coin, amount in assets_found.items():
                # Determine Price in USD
                current_price_usd = 0.0
                
                if coin == 'USDT':
                     current_price_usd = 1.0
                else:
                    # Try common pairs
                    pair = f"{coin}/USDT"
                    if pair in all_tickers:
                        current_price_usd = float(all_tickers[pair]['last'])
                    else:
                        # try BUSD or BTC pair? explicit check for now
                        pass

                # Convert to TWD - REMOVED to avoid double multiplication
                # We store native USD price. Dashboard/Frontend handles conversion.
                current_price = current_price_usd 
                # * usdt_twd_rate

                # DB Logic
                db_asset = db.query(models.Asset).filter(
                    models.Asset.connection_id == conn.id,
                    models.Asset.ticker == coin
                ).first()
                
                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()
                target_name = f"{coin} ({clean_conn_name})"
                
                # Determine standard icon
                from ..service import get_icon_for_ticker
                target_icon = get_icon_for_ticker(coin, "Crypto")
                
                if db_asset:
                    db_asset.last_updated_at = datetime.now()
                    db_asset.name = target_name
                    
                    if current_price > 0:
                        db_asset.current_price = current_price
                        
                    # Enforce Sub-category and Icon
                    db_asset.sub_category = "Crypto" 
                    if db_asset.icon != target_icon:
                        db_asset.icon = target_icon
                    
                    # Update Qty logic - complex if manual edits allowed, but for synced, we usually overwrite or add diff
                    # Previous logic in Pionex was adding a transaction for the diff.
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
                     new_asset = models.Asset(
                        name=target_name,
                        ticker=coin,
                        category="Crypto",
                        sub_category="Crypto",
                        source="binance",
                        icon=target_icon,
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
            logger.error(f"Binance Sync Exception for {conn.name}: {e}")
            
    return success_count > 0
