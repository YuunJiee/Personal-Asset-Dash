import yfinance as yf
import ccxt
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from . import crud, models, schemas
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

def get_icon_for_ticker(ticker: str, category: str = None) -> str:
    ticker = ticker.upper()
    
    # Map common tickers to Lucide icon names
    mapping = {
        'BTC': 'Bitcoin',
        'WBTC': 'Bitcoin',
        'ETH': 'Gem', # Lucide doesn't have Ethereum
        'WETH': 'Gem',
        'USDT': 'DollarSign',
        'USDC': 'CircleDollarSign',
        'DAI': 'CircleDollarSign',
        'BNB': 'Coins',
        'SOL': 'Zap',
        'DOGE': 'PawPrint',
        'MAX': 'Rocket',
        'TWD': 'Banknote',
        'USD': 'DollarSign'
    }
    
    # Check exact match
    if ticker in mapping:
        return mapping[ticker]
        
    # Partial match heuristics
    if 'USD' in ticker: return 'DollarSign'
    if 'BTC' in ticker: return 'Bitcoin'
    if 'ETH' in ticker: return 'Gem'
    
    # Category fallback
    if category:
        cat = category.lower()
        if 'crypto' in cat: return 'Coins'
        if 'stock' in cat: return 'TrendingUp'
        if 'fluid' in cat or 'cash' in cat: return 'Wallet'
        
    return 'Circle' # Default

def fetch_stock_price(ticker: str) -> float:
    try:
        if ticker.isdigit() and len(ticker) == 4:
            ticker = f"{ticker}.TW"
        data = yf.Ticker(ticker)
        history = data.history(period="1d")
        if not history.empty:
            return history["Close"].iloc[-1]
    except Exception as e:
        logger.error(f"Error fetching stock {ticker}: {e}")
    return 0.0

def fetch_crypto_price(ticker: str) -> float:
    try:
        symbol = ticker
        if symbol.endswith("-USD"):
            symbol = symbol.replace("-USD", "")
        # Handle wrapped tokens
        if symbol == 'BTCB': symbol = 'BTC'
        elif symbol == 'WETH': symbol = 'ETH'
        # Stablecoins
        if symbol in ('USDT', 'USDC'): return 1.0

        exchange = ccxt.binance()
        ticker_data = exchange.fetch_ticker(f"{symbol}/USDT")
        return float(ticker_data['last'])
    except Exception as e:
        logger.error(f"Error fetching crypto {ticker}: {e}")
    return 0.0

def update_prices(db: Session):
    assets = crud.get_assets(db)

    # Classify assets by their price-fetch method
    crypto_jobs: list[tuple[int, str]] = []
    stock_jobs: list[tuple[int, str]] = []

    for asset in assets:
        is_crypto = asset.category == 'Crypto' or (
            asset.sub_category and "Crypto" in asset.sub_category
        )
        if is_crypto and asset.ticker:
            crypto_jobs.append((asset.id, asset.ticker))
        elif asset.category == 'Stock' and asset.ticker:
            stock_jobs.append((asset.id, asset.ticker))

    # Fetch prices in parallel using a thread pool
    # (yfinance and ccxt are I/O bound – threads give a big speedup)
    price_results: dict[int, float] = {}

    def _fetch_crypto(asset_id: int, ticker: str) -> tuple[int, float]:
        return asset_id, fetch_crypto_price(ticker)

    def _fetch_stock(asset_id: int, ticker: str) -> tuple[int, float]:
        return asset_id, fetch_stock_price(ticker)

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {
            executor.submit(_fetch_crypto, aid, t): aid
            for aid, t in crypto_jobs
        }
        futures.update({
            executor.submit(_fetch_stock, aid, t): aid
            for aid, t in stock_jobs
        })

        for future in as_completed(futures):
            try:
                asset_id, price = future.result()
                if price > 0:
                    price_results[asset_id] = price
            except Exception as e:
                logger.error(f"Price fetch error for asset {futures[future]}: {e}")

    # Apply results (single-threaded DB writes to avoid session conflicts)
    for asset_id, price in price_results.items():
        crud.update_asset_price(db, asset_id, price)
        check_alerts(db, asset_id, price)


def snapshot_net_worth(db: Session) -> None:
    """Write today's net worth to the NetWorthHistory table.

    Called by the scheduler after each price update so the /stats/history
    endpoint can serve from fast snapshot reads instead of recalculating
    from scratch every request.
    """
    from .services.exchange_rate_service import get_usdt_twd_rate

    today = datetime.now().strftime("%Y-%m-%d")
    assets = crud.get_assets(db)

    net_worth = 0.0
    breakdown: dict[str, float] = {}

    for asset in assets:
        if not asset.include_in_net_worth:
            continue
        val = asset.value_twd or 0.0
        if asset.category == 'Liabilities':
            net_worth -= val
            breakdown['Liabilities'] = breakdown.get('Liabilities', 0.0) - val
        else:
            net_worth += val
            breakdown[asset.category] = breakdown.get(asset.category, 0.0) + val

    rounded = round(net_worth, 0)

    try:
        existing = db.query(models.NetWorthHistory).filter_by(date=today).first()
        if existing:
            existing.value = rounded
            existing.breakdown = json.dumps({k: round(v, 0) for k, v in breakdown.items()})
        else:
            db.add(models.NetWorthHistory(
                date=today,
                value=rounded,
                breakdown=json.dumps({k: round(v, 0) for k, v in breakdown.items()}),
            ))
        db.commit()
        logger.info(f"Net worth snapshot saved: {today} = {rounded:,.0f}")
    except Exception as e:
        logger.error(f"Failed to save net worth snapshot: {e}")
        db.rollback()

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
            logger.info(f"ALERT TRIGGERED: Asset {asset_id} is {alert.condition} {alert.target_price} (Current: {price})")
            db.commit()

def update_exchange_rate(db: Session, pair="USDTWD=X"):
    """Kept for backward-compatibility with scheduler. Delegates to exchange_rate_service."""
    from .services.exchange_rate_service import get_usdt_twd_rate
    rate = get_usdt_twd_rate(db)
    logger.info(f"Exchange rate (via exchange_rate_service): {rate}")
    return rate

# NOTE: get_exchange_rate() has been removed — use services/exchange_rate_service.get_usdt_twd_rate() directly.

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
