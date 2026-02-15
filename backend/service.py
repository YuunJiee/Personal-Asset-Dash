import yfinance as yf
import ccxt
from sqlalchemy.orm import Session
from . import crud, models, schemas
from datetime import datetime, timezone

def fetch_stock_price(ticker: str) -> float:
    try:
        # Heuristic for Taiwan stocks (e.g. 0050 -> 0050.TW)
        if ticker.isdigit() and len(ticker) == 4:
            ticker = f"{ticker}.TW"
            
        data = yf.Ticker(ticker)
        history = data.history(period="1d")
        if not history.empty:
            return history["Close"].iloc[-1]
    except Exception as e:
        print(f"Error fetching stock {ticker}: {e}")
    return 0.0

def fetch_crypto_price(ticker: str) -> float:
    try:
        # Assuming Binance for now, ticker format e.g., 'BTC/USDT'
        exchange = ccxt.binance()
        ticker_data = exchange.fetch_ticker(ticker)
        return ticker_data['last']
    except Exception as e:
        print(f"Error fetching crypto {ticker}: {e}")
    return 0.0

def update_prices(db: Session):
    assets = crud.get_assets(db)
    for asset in assets:
        price = 0.0
        if asset.category in ["Investment", "Fluid"] and asset.ticker: # Only update market assets
            if "/" in asset.ticker: # Simple heuristic for Crypto
                 price = fetch_crypto_price(asset.ticker)
            else:
                 price = fetch_stock_price(asset.ticker)
            
            if price > 0:
                crud.update_asset_price(db, asset.id, price)
                check_alerts(db, asset.id, price)

def check_alerts(db: Session, asset_id: int, price: float):
    alerts = crud.get_alerts_by_asset(db, asset_id)
    for alert in alerts:
        if not alert.is_active:
            continue
        
        triggered = False
        if alert.condition == "ABOVE" and price >= alert.target_price:
            triggered = True
        elif alert.condition == "BELOW" and price <= alert.target_price:
            triggered = True
            
        if triggered and not alert.triggered_at:
            alert.triggered_at = datetime.now()
            print(f"ALERT TRIGGERED: Asset {asset_id} is {alert.condition} {alert.target_price} (Current: {price})")
            db.commit()

def update_exchange_rate(db: Session, pair="USDTWD=X"):
    try:
        data = yf.Ticker(pair)
        hist = data.history(period="1d")
        if not hist.empty:
            rate = float(hist["Close"].iloc[-1])
            # Store in DB
            setting = db.query(models.SystemSetting).filter_by(key="exchange_rate_usdtwd").first()
            if not setting:
                setting = models.SystemSetting(key="exchange_rate_usdtwd", value=str(rate))
                db.add(setting)
            else:
                setting.value = str(rate)
            db.commit()
            print(f"Updated Exchange Rate: {rate}")
            return rate
    except Exception as e:
        print(f"Error fetching exchange rate {pair}: {e}")
    return None

def get_exchange_rate(db: Session = None) -> float:
    # Try to get from DB first
    if db:
        setting = db.query(models.SystemSetting).filter_by(key="exchange_rate_usdtwd").first()
        if setting:
            try:
                return float(setting.value)
            except:
                pass
    
    # Fallback if no DB or no setting (first run)
    # We should avoid blocking here if possible, but first run needs one.
    # If db is provided, try 'update_exchange_rate' synchronously once?
    if db:
        rate = update_exchange_rate(db)
        if rate: return rate

    return 30.0 # Hard Fallback

def calculate_dashboard_metrics(db: Session) -> schemas.DashboardData:
    # update_prices(db) # Moved to background scheduler
    from .services.exchange_rate_service import get_usdt_twd_rate
    usdtwd = get_usdt_twd_rate(db)
    
    assets = crud.get_assets(db)
    total_market_value = 0.0
    total_cost = 0.0
    
    asset_list = []
    
    for asset in assets:
        asset_market_value = 0.0
        asset_cost = 0.0
        quantity = 0.0
        
        for txn in asset.transactions:
            quantity += txn.amount
            # Cost basis: simpler to track in TWD or native?
            # Let's assume buy_price was in native currency.
            asset_cost += txn.amount * txn.buy_price
            
        if asset.manual_avg_cost is not None and asset.manual_avg_cost > 0:
             # Use manual average cost if set
             asset_cost = quantity * asset.manual_avg_cost
        
        # Format for conversion if needed
        is_usd = False
        if asset.sub_category and ("Crypto" in asset.sub_category or "Stock" in asset.sub_category):
             if asset.ticker:
                 if asset.ticker.endswith(".TW") or (asset.ticker.isdigit() and len(asset.ticker) == 4):
                     is_usd = False 
                 else:
                     if asset.source == 'max':
                         is_usd = False
                     else:
                         is_usd = True
        
        # Calculate Market Value in Native Currency
        native_price = asset.current_price
        
        if not asset.transactions and asset.current_price == 1.0:
            # Manual asset (Cash) - Quantity is Value
             asset_market_value = quantity * native_price 
        else:
             asset_market_value = quantity * native_price
             
        # Convert to TWD if USD
        if is_usd:
            asset_market_value *= usdtwd
            # Only convert cost if manual_avg_cost wasn't already in TWD?
            # Assuming manual_avg_cost is entered in native currency.
            asset_cost *= usdtwd 
            
        # Computed field injection
        asset.value_twd = asset_market_value
        
        # Calculate P/L and ROI per asset
        asset_pl = asset_market_value - asset_cost
        asset_roi = (asset_pl / asset_cost * 100) if asset_cost > 0 else 0.0
        
        asset.unrealized_pl = asset_pl
        asset.roi = asset_roi
        
        # Net Worth Calculation Logic
        if asset.include_in_net_worth:
            if asset.category == 'Liabilities':
                total_market_value -= asset_market_value
                # For liabilities, 'cost' implies initial debt. 
                # If we subtract current value, we should probably subtract cost too to keep PL consistent?
                # PL = (Current - Cost). 
                # If Liability: Current = -90, Cost = -100. PL = +10.
                total_cost -= asset_cost
            else:
                total_market_value += asset_market_value
                total_cost += asset_cost
        
        asset_list.append(asset)

    total_pl = total_market_value - total_cost
    total_roi = (total_pl / total_cost * 100) if total_cost > 0 else 0.0
    
    return schemas.DashboardData(
        net_worth=total_market_value,
        total_pl=total_pl,
        total_roi=total_roi,
        exchange_rate=usdtwd,
        assets=[schemas.Asset.model_validate(a) for a in asset_list],
        updated_at=datetime.now(timezone.utc)
    )
