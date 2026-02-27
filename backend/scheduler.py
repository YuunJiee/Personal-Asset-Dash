from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from .database import SessionLocal
from . import service, models
from .services import max_service, wallet_service, binance_service, exchange_service
import json
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def run_price_updates():
    logger.info("Running scheduled price updates...")
    db: Session = SessionLocal()
    try:
        service.update_prices(db)
        service.update_exchange_rate(db)
        # Take a net worth snapshot after every price update so the history
        # endpoint can serve from fast DB reads instead of recalculating.
        service.snapshot_net_worth(db)
        logger.info("Scheduled price updates + snapshot completed.")
        # Notify all connected WebSocket clients so the frontend SWR cache
        # revalidates automatically (no manual page refresh needed).
        from .routers.ws import manager as ws_manager
        ws_manager.broadcast_from_thread(json.dumps({"type": "prices_updated"}))
    except Exception as e:
        logger.error(f"Error in scheduled price update: {e}")
    finally:
        db.close()

def run_max_sync():
    logger.info("Running MAX exchange sync...")
    db: Session = SessionLocal()
    try:
        success = max_service.sync_max_assets(db)
        if success:
            logger.info("MAX exchange sync completed.")
    except Exception as e:
        logger.error(f"Error in MAX sync: {e}")
    finally:
        db.close()

def run_pionex_sync():
    logger.info("Running exchange sync (CCXT/Pionex)...")
    db: Session = SessionLocal()
    try:
        success = exchange_service.sync_all_exchanges(db)
        if success:
            logger.info("Exchange sync completed.")
    except Exception as e:
        logger.error(f"Error in exchange sync: {e}")
    finally:
        db.close()

def run_wallet_sync():
    logger.info("Running Wallet sync (Web3)...")
    db: Session = SessionLocal()
    try:
        success = wallet_service.sync_wallets(db)
        if success:
            logger.info("Wallet sync completed.")
    except Exception as e:
        logger.error(f"Error in Wallet sync: {e}")
    finally:
        db.close()

def run_binance_sync():
    logger.info("Running Binance exchange sync...")
    db: Session = SessionLocal()
    try:
        success = binance_service.sync_binance_assets(db)
        if success:
            logger.info("Binance exchange sync completed.")
    except Exception as e:
        logger.error(f"Error in Binance sync: {e}")
    finally:
        db.close()

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

    if not scheduler.running:
        scheduler.add_job(run_price_updates, 'interval', minutes=interval_minutes, id='price_update_job')
        scheduler.add_job(run_max_sync, 'interval', minutes=60, id='max_sync_job') # Default 1 hour
        scheduler.add_job(run_pionex_sync, 'interval', minutes=60, id='pionex_sync_job')
        scheduler.add_job(run_binance_sync, 'interval', minutes=60, id='binance_sync_job')
        scheduler.add_job(run_wallet_sync, 'interval', minutes=10, id='wallet_sync_job') # Low cost RPC, higher freq
        # Daily midnight snapshot ensures history data exists even on days with no manual refresh
        scheduler.add_job(lambda: run_price_updates(), 'cron', hour=0, minute=5, id='daily_snapshot_job')
        scheduler.start()
        logger.info(f"Scheduler started with interval: {interval_minutes} minutes")

def reschedule_updates(interval_minutes: int):
    if scheduler.get_job('price_update_job'):
        scheduler.reschedule_job('price_update_job', trigger='interval', minutes=interval_minutes)
        logger.info(f"Rescheduled price updates to every {interval_minutes} minutes")
    else:
        scheduler.add_job(run_price_updates, 'interval', minutes=interval_minutes, id='price_update_job')
        logger.info(f"Added new price update job with interval: {interval_minutes} minutes")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
