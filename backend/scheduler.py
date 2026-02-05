from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from .database import SessionLocal
from .database import SessionLocal
from . import service, models
from .services import max_service

scheduler = BackgroundScheduler()

def run_price_updates():
    print("Running scheduled price updates...")
    db: Session = SessionLocal()
    try:
        service.update_prices(db)
        service.update_exchange_rate(db)
        print("Scheduled price updates completed.")
    except Exception as e:
        print(f"Error in scheduled price update: {e}")
    finally:
        db.close()

def run_max_sync():
    print("Running MAX exchange sync...")
    db: Session = SessionLocal()
    try:
        success = max_service.sync_max_assets(db)
        if success:
            print("MAX exchange sync completed.")
    except Exception as e:
        print(f"Error in MAX sync: {e}")
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
        print(f"Could not load scheduler usage setting: {e}")
    finally:
        db.close()

    if not scheduler.running:
        scheduler.add_job(run_price_updates, 'interval', minutes=interval_minutes, id='price_update_job')
        scheduler.add_job(run_max_sync, 'interval', minutes=60, id='max_sync_job') # Default 1 hour
        scheduler.start()
        print(f"Scheduler started with interval: {interval_minutes} minutes")

def reschedule_updates(interval_minutes: int):
    if scheduler.get_job('price_update_job'):
        scheduler.reschedule_job('price_update_job', trigger='interval', minutes=interval_minutes)
        print(f"Rescheduled price updates to every {interval_minutes} minutes")
    else:
        scheduler.add_job(run_price_updates, 'interval', minutes=interval_minutes, id='price_update_job')
        print(f"Added new price update job with interval: {interval_minutes} minutes")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
