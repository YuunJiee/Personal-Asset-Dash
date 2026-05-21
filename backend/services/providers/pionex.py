import time
import hmac
import hashlib
import requests
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from .base import ExchangeProvider
from ... import models
from ...utils.icons import get_icon_for_ticker

logger = logging.getLogger(__name__)

BASE_URL = "https://api.pionex.com"


def _auth_headers(api_key: str, api_secret: str, method: str, path: str, params: dict | None = None):
    if params is None:
        params = {}
    params['timestamp'] = int(time.time() * 1000)
    sorted_str = '&'.join(f"{k}={v}" for k, v in sorted(params.items()))
    payload = f"{method.upper()}{path}?{sorted_str}"
    signature = hmac.new(api_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    headers = {'PIONEX-KEY': api_key, 'PIONEX-SIGNATURE': signature}
    return headers, params


class PionexProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting Pionex Sync...")

        connections = db.query(models.CryptoConnection).filter(
            models.CryptoConnection.provider == 'pionex',
            models.CryptoConnection.is_active == True,
        ).all()

        if not connections:
            logger.info("Pionex Sync skipped: No active connections found.")
            return False

        success_count = 0

        for conn in connections:
            logger.info(f"Syncing Pionex Connection: {conn.name}")
            if not conn.api_key or not conn.api_secret:
                logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
                continue

            try:
                path = "/api/v1/account/balances"
                headers, final_params = _auth_headers(conn.api_key, conn.api_secret, "GET", path)
                resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=final_params)

                if resp.status_code != 200:
                    logger.error(f"Pionex API Error {resp.status_code}: {resp.text}")
                    continue

                data = resp.json()
                if not data.get('result', False):
                    logger.error(f"Pionex API Result False: {data}")
                    continue

                assets_found: dict[str, float] = {}
                for b in data.get('data', {}).get('balances', []):
                    total = float(b.get('free', 0)) + float(b.get('frozen', 0))
                    if total > 0:
                        assets_found[b.get('coin')] = total

                if not assets_found:
                    logger.info(f"  {conn.name}: No assets found.")
                else:
                    logger.info(f"  {conn.name}: Found {len(assets_found)} assets.")

                # Fetch market prices
                market_prices: dict[str, float] = {}
                try:
                    t_resp = requests.get(f"{BASE_URL}/api/v1/market/tickers")
                    if t_resp.status_code == 200:
                        t_data = t_resp.json()
                        if t_data.get('result', False):
                            for t in t_data.get('data', {}).get('tickers', []):
                                market_prices[t.get('symbol')] = float(t.get('close', 0))
                except Exception as e:
                    logger.error(f"Error fetching Pionex prices: {e}")

                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()

                for ticker, amount in assets_found.items():
                    current_price = 1.0 if ticker == 'USDT' else market_prices.get(f"{ticker}_USDT", 0.0)
                    target_name = f"{ticker} ({clean_conn_name})"
                    target_icon = get_icon_for_ticker(ticker, "Crypto")

                    db_asset = db.query(models.Asset).filter(
                        models.Asset.connection_id == conn.id,
                        models.Asset.ticker == ticker,
                    ).first()

                    if db_asset:
                        db_asset.last_updated_at = datetime.now()
                        db_asset.name = target_name
                        if current_price > 0:
                            db_asset.current_price = current_price
                        db_asset.sub_category = "Crypto"
                        if db_asset.icon != target_icon:
                            db_asset.icon = target_icon

                        current_qty = sum(t.amount for t in db_asset.transactions)
                        diff = amount - current_qty
                        if abs(diff) > 1e-8:
                            db.add(models.Transaction(
                                asset_id=db_asset.id, amount=diff,
                                buy_price=0, date=datetime.now(), is_transfer=False,
                            ))
                        db.commit()
                    else:
                        new_asset = models.Asset(
                            name=target_name, ticker=ticker,
                            category="Crypto", sub_category="Crypto",
                            source="pionex", icon=target_icon,
                            include_in_net_worth=True,
                            current_price=current_price if current_price > 0 else None,
                            connection_id=conn.id,
                        )
                        db.add(new_asset)
                        db.commit()
                        db.refresh(new_asset)
                        db.add(models.Transaction(
                            asset_id=new_asset.id, amount=amount,
                            buy_price=0, date=datetime.now(), is_transfer=False,
                        ))
                        db.commit()

                success_count += 1

            except Exception as e:
                logger.error(f"Pionex Sync Exception for {conn.name}: {e}")

        return success_count > 0
