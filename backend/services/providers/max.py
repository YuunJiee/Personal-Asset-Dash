import time
import json
import hashlib
import hmac
import base64
import requests
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from .base import ExchangeProvider
from ... import models
from ...utils.icons import get_icon_for_ticker

logger = logging.getLogger(__name__)

BASE_URL = "https://max-api.maicoin.com"


def _auth_headers(path: str, api_key: str, api_secret: str, params: dict | None = None):
    nonce = int(time.time() * 1000)
    payload_data = {'nonce': nonce, 'path': path}
    if params:
        payload_data.update(params)
    payload = base64.b64encode(json.dumps(payload_data).encode()).decode()
    signature = hmac.new(api_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    headers = {
        'X-MAX-ACCESSKEY': api_key,
        'X-MAX-PAYLOAD':   payload,
        'X-MAX-SIGNATURE': signature,
        'Content-Type':    'application/json',
    }
    return headers, payload_data


class MaxProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting MAX Sync...")

        connections = db.query(models.CryptoConnection).filter(
            models.CryptoConnection.provider == 'max',
            models.CryptoConnection.is_active == True,
        ).all()

        if not connections:
            logger.info("MAX Sync skipped: No active connections found.")
            return False

        success_count = 0

        for conn in connections:
            logger.info(f"Syncing MAX Connection: {conn.name} ({conn.id})")
            if not conn.api_key or not conn.api_secret:
                logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
                continue

            try:
                path = "/api/v3/wallet/spot/accounts"
                headers, payload_data = _auth_headers(path, conn.api_key, conn.api_secret)
                query_params = {k: v for k, v in payload_data.items() if k != 'path'}
                resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=query_params)

                if resp.status_code != 200:
                    logger.error(f"MAX API Error {resp.status_code}: {resp.text}")
                    continue

                active_balances = {
                    acc.get('currency', '').upper(): float(acc.get('balance', 0))
                    for acc in resp.json()
                    if float(acc.get('balance', 0)) > 0
                }

                if active_balances:
                    logger.info(f"  {conn.name}: Found {len(active_balances)} assets: {list(active_balances.keys())}")

                # Fetch prices
                market_prices: dict[str, float] = {}
                try:
                    markets = []
                    for ticker in active_balances:
                        if ticker == 'TWD':
                            pass
                        elif ticker == 'USDT':
                            markets.append("usdttwd")
                        else:
                            markets.append(f"{ticker.lower()}twd")
                    if markets:
                        pr = requests.get(
                            f"{BASE_URL}/api/v3/tickers",
                            params=[('markets[]', m) for m in markets],
                        )
                        if pr.status_code == 200:
                            for t in pr.json():
                                market_prices[t.get('market')] = float(t.get('last', 0))
                except Exception as e:
                    logger.error(f"Error fetching MAX prices: {e}")

                for ticker, amount in active_balances.items():
                    if ticker == 'TWD':
                        current_price = 1.0
                    else:
                        pair_key = "usdttwd" if ticker == 'USDT' else f"{ticker.lower()}twd"
                        current_price = market_prices.get(pair_key, 0.0)

                    # Fetch avg cost from trades
                    avg_cost = 0.0
                    if ticker != 'TWD':
                        try:
                            t_path = "/api/v3/wallet/spot/trades"
                            t_params = {'market': f"{ticker.lower()}twd", 'limit': 500}
                            t_headers, t_payload = _auth_headers(t_path, conn.api_key, conn.api_secret, t_params)
                            t_qp = {k: v for k, v in t_payload.items() if k != 'path'}
                            t_resp = requests.get(f"{BASE_URL}{t_path}", headers=t_headers, params=t_qp)
                            if t_resp.status_code == 200:
                                total_cost = total_vol = 0.0
                                for t in t_resp.json():
                                    if t['side'] in ('buy', 'bid'):
                                        vol = float(t['volume'])
                                        total_cost += vol * float(t['price'])
                                        total_vol += vol
                                if total_vol > 0:
                                    avg_cost = total_cost / total_vol
                        except Exception:
                            pass

                    target_icon = get_icon_for_ticker(
                        ticker, "Crypto" if ticker != 'TWD' else "Fluid"
                    )

                    db_asset = db.query(models.Asset).filter(
                        models.Asset.connection_id == conn.id,
                        models.Asset.ticker == ticker,
                    ).first()

                    if db_asset:
                        if current_price > 0:
                            db_asset.current_price = current_price
                            db_asset.last_updated_at = datetime.now()
                        if avg_cost > 0:
                            db_asset.manual_avg_cost = avg_cost
                        if ticker != 'TWD':
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
                        logger.info(f"  Creating new MAX asset: {ticker}")
                        category     = "Fluid"  if ticker == 'TWD' else "Crypto"
                        sub_category = "Cash"   if ticker == 'TWD' else "Crypto"
                        new_asset = models.Asset(
                            name=f"{ticker} ({conn.name})",
                            ticker=ticker, category=category, sub_category=sub_category,
                            source="max", icon=target_icon, include_in_net_worth=True,
                            current_price=current_price,
                            manual_avg_cost=avg_cost if avg_cost > 0 else None,
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
                logger.error(f"MAX Sync Exception for {conn.name}: {e}")

        return success_count > 0
