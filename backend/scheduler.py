from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import models
from .services.providers import PROVIDERS
from .services.price_service import update_prices
from .services.exchange_rate_service import get_usdt_twd_rate
from .services.snapshot_service import snapshot_net_worth
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def run_price_updates():
    logger.info("Running scheduled price updates...")
    db: Session = SessionLocal()
    try:
        update_prices(db)
        get_usdt_twd_rate(db)
        # Take a net worth snapshot after every price update so the history
        # endpoint can serve from fast DB reads instead of recalculating.
        snapshot_net_worth(db)
        logger.info("Scheduled price updates + snapshot completed.")
    except Exception as e:
        logger.error(f"Error in scheduled price update: {e}")
    finally:
        db.close()

def _run_provider_sync(name: str) -> None:
    db: Session = SessionLocal()
    try:
        success = PROVIDERS[name].sync(db)
        if success:
            logger.info(f"{name} sync completed.")
    except Exception as e:
        logger.error(f"Error in {name} sync: {e}")
    finally:
        db.close()


def run_max_sync():     _run_provider_sync("max")
def run_pionex_sync():  _run_provider_sync("pionex")
def run_binance_sync(): _run_provider_sync("binance")
def run_wallet_sync():  _run_provider_sync("wallet")

def start_scheduler():
    # Helper to get interval from DB
    db = SessionLocal()
    interval_minutes = 60 # Default to 1 hour
    try:
        setting = db.query(models.SystemSetting).filter_by(key="price_update_interval_minutes").first()
        if setting:
            interval_minutes = int(setting.value)
    except Exception as e:
        logger.error(f"Could not load scheduler usage setting: {e}")
    finally:
        db.close()

    # coalesce=True: if a job misfires multiple times, run it only once on recovery.
    # misfire_grace_time=60: tolerate up to 60s late start before marking a misfire.
    _job_defaults = dict(coalesce=True, misfire_grace_time=60)

    if not scheduler.running:
        scheduler.add_job(run_price_updates, 'interval', minutes=interval_minutes, id='price_update_job', **_job_defaults)
        scheduler.add_job(run_max_sync, 'interval', minutes=60, id='max_sync_job', **_job_defaults)
        scheduler.add_job(run_pionex_sync, 'interval', minutes=60, id='pionex_sync_job', **_job_defaults)
        scheduler.add_job(run_binance_sync, 'interval', minutes=60, id='binance_sync_job', **_job_defaults)
        scheduler.add_job(run_wallet_sync, 'interval', minutes=10, id='wallet_sync_job', **_job_defaults)
        # Daily midnight snapshot ensures history data exists even on days with no manual refresh
        scheduler.add_job(lambda: run_price_updates(), 'cron', hour=0, minute=5, id='daily_snapshot_job', **_job_defaults)
        scheduler.start()
        logger.info(f"Scheduler started with interval: {interval_minutes} minutes")

def reschedule_updates(interval_minutes: int):
    _job_defaults = dict(coalesce=True, misfire_grace_time=60)
    if scheduler.get_job('price_update_job'):
        scheduler.reschedule_job(
            'price_update_job',
            trigger='interval',
            minutes=interval_minutes,
        )
        logger.info(f"Rescheduled price updates to every {interval_minutes} minutes")
    else:
        scheduler.add_job(
            run_price_updates, 'interval',
            minutes=interval_minutes,
            id='price_update_job',
            **_job_defaults,
        )
        logger.info(f"Added new price update job with interval: {interval_minutes} minutes")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
