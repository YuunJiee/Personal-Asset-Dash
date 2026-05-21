import ccxt
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from .base import ExchangeProvider
from ... import models
from ...utils.icons import get_icon_for_ticker
from ..exchange_rate_service import get_usdt_twd_rate

logger = logging.getLogger(__name__)


class BinanceProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
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
            if not conn.api_key or not conn.api_secret:
                logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
                continue

            try:
                exchange = ccxt.binance({
                    'apiKey': conn.api_key,
                    'secret': conn.api_secret,
                    'enableRateLimit': True,
                })

                balance = exchange.fetch_balance()
                assets_found = {
                    coin: amount
                    for coin, amount in balance.get('total', {}).items()
                    if amount > 0
                }

                if not assets_found:
                    logger.info(f"  {conn.name}: No assets found.")
                else:
                    logger.info(f"  {conn.name}: Found {len(assets_found)} assets.")

                all_tickers = exchange.fetch_tickers()
                usdt_twd_rate = get_usdt_twd_rate(db)
                logger.info(f"  USDT/TWD Rate: {usdt_twd_rate}")

                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()

                for coin, amount in assets_found.items():
                    current_price_usd = 1.0 if coin == 'USDT' else float(
                        all_tickers.get(f"{coin}/USDT", {}).get('last') or 0
                    )

                    db_asset = db.query(models.Asset).filter(
                        models.Asset.connection_id == conn.id,
                        models.Asset.ticker == coin,
                    ).first()

                    target_name = f"{coin} ({clean_conn_name})"
                    target_icon = get_icon_for_ticker(coin, "Crypto")

                    if db_asset:
                        db_asset.last_updated_at = datetime.now()
                        db_asset.name = target_name
                        if current_price_usd > 0:
                            db_asset.current_price = current_price_usd
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
                            name=target_name, ticker=coin,
                            category="Crypto", sub_category="Crypto",
                            source="binance", icon=target_icon,
                            include_in_net_worth=True,
                            current_price=current_price_usd if current_price_usd > 0 else None,
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
                logger.error(f"Binance Sync Exception for {conn.name}: {e}")

        return success_count > 0
