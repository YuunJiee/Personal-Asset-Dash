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
        # Normalize ticker
        symbol = ticker
        if symbol.endswith("-USD"):
            symbol = symbol.replace("-USD", "")
            
        # Handle wrapped tokens or specific mappings
        if symbol == 'BTCB':
            symbol = 'BTC'
        elif symbol == 'WETH':
            symbol = 'ETH'
            
        # USDT is stablecoin
        if symbol == 'USDT' or symbol == 'USDC':
            return 1.0
            
        # Try finding the pair
        # Binance uses /USDT usually
        pair = f"{symbol}/USDT"
        
        exchange = ccxt.binance()
        # Fetch ticker (this might fail if pair invalid)
        ticker_data = exchange.fetch_ticker(pair)
        return float(ticker_data['last'])
    except Exception as e:
        print(f"Error fetching crypto {ticker} (tried pair {symbol}/USDT): {e}")
    return 0.0

def update_prices(db: Session):
    assets = crud.get_assets(db)
    for asset in assets:
        price = 0.0
        # Determine fetch method based on category
        is_crypto = asset.category == 'Crypto'
        if not is_crypto and asset.sub_category and "Crypto" in asset.sub_category:
            is_crypto = True

        if is_crypto and asset.ticker:
            price = fetch_crypto_price(asset.ticker)
        elif asset.category == 'Stock' and asset.ticker:
            price = fetch_stock_price(asset.ticker)
        elif asset.category in ["Investment", "Fluid"] and asset.ticker: 
            # Legacy/Generic fallback
            if "/" in asset.ticker or "-" in asset.ticker: 
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
        # Use value_twd computed by crud.get_assets
        asset_market_value = asset.value_twd or 0.0
        
        # Calculate Cost Logic (if not fully handled in crud yet)
        # crud.get_assets computes unrealized_pl and roi, implying it knows cost.
        # But it doesn't expose total_cost directly on the model unless we added a transient field.
        # Let's re-calculate cost here using the same robust logic or trust PL?
        # asset.unrealized_pl = value - cost. So Cost = Value - PL.
        
        asset_pl = asset.unrealized_pl or 0.0
        asset_cost = asset_market_value - asset_pl
        
        # Net Worth Calculation Logic
        if asset.include_in_net_worth:
            if asset.category == 'Liabilities':
                # Liabilities reduce Net Worth
                total_market_value -= asset_market_value
                # For Liabilities, cost is usually the principal loan amount. 
                # PL is (Current Balance - Principal).
                # If we just subtract cost, it works out.
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
        # We must validate to ensure Pydantic serializes the transient fields
        assets=[schemas.Asset.model_validate(a) for a in asset_list],
        updated_at=datetime.now(timezone.utc)
    )
