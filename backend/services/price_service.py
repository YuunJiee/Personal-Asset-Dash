import os
import time
import logging
import yfinance as yf
import ccxt
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session

from ..repositories.asset_repo import AssetRepository

logger = logging.getLogger(__name__)


def fetch_stock_price(ticker: str) -> float:
    if ticker.isdigit() and len(ticker) == 4:
        ticker = f"{ticker}.TW"
    for attempt in range(3):
        try:
            data = yf.Ticker(ticker)
            history = data.history(period="1d")
            if not history.empty:
                return float(history["Close"].iloc[-1])
        except Exception as e:
            if attempt == 2:
                logger.error(f"fetch_stock_price {ticker} failed after 3 attempts: {e}")
            else:
                time.sleep(1.0 * (2 ** attempt))
    return 0.0


def fetch_crypto_price(ticker: str) -> float:
    symbol = ticker.replace("-USD", "")
    if symbol == "BTCB": symbol = "BTC"
    elif symbol == "WETH": symbol = "ETH"
    if symbol in ("USDT", "USDC"): return 1.0

    for attempt in range(3):
        try:
            exchange = ccxt.binance()
            ticker_data = exchange.fetch_ticker(f"{symbol}/USDT")
            return float(ticker_data["last"])
        except Exception as e:
            if attempt == 2:
                logger.error(f"fetch_crypto_price {ticker} failed after 3 attempts: {e}")
            else:
                time.sleep(0.5 * (2 ** attempt))
    return 0.0


def update_prices(db: Session) -> None:
    assets = AssetRepository(db).list_all()

    crypto_jobs: list[tuple[int, str]] = []
    stock_jobs:  list[tuple[int, str]] = []

    for asset in assets:
        is_crypto = asset.category == "Crypto" or (
            asset.sub_category and "Crypto" in asset.sub_category
        )
        if is_crypto and asset.ticker:
            crypto_jobs.append((asset.id, asset.ticker))
        elif asset.category == "Stock" and asset.ticker:
            stock_jobs.append((asset.id, asset.ticker))

    price_results: dict[int, float] = {}
    _max_workers = min(8, os.cpu_count() or 4)

    with ThreadPoolExecutor(max_workers=_max_workers) as executor:
        futures = {
            **{executor.submit(fetch_crypto_price, t): aid for aid, t in crypto_jobs},
            **{executor.submit(fetch_stock_price,  t): aid for aid, t in stock_jobs},
        }
        for future in as_completed(futures):
            try:
                price = future.result()
                if price > 0:
                    price_results[futures[future]] = price
            except Exception as e:
                logger.error(f"Price fetch error for asset {futures[future]}: {e}")

    repo = AssetRepository(db)
    for asset_id, price in price_results.items():
        repo.update_price(asset_id, price)
