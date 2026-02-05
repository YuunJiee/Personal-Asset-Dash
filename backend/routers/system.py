from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

router = APIRouter(
    prefix="/api/system",
    tags=["system"],
    responses={404: {"description": "Not found"}},
)

@router.get("/backup")
def download_backup():
    # Helper to find the database file. 
    # Usually in the root of backend, which is where main.py runs.
    db_path = "./sql_app.db"
    return FileResponse(
        path=db_path, 
        filename="ymoney_backup.db", 
        media_type='application/x-sqlite3'
    )

from sqlalchemy.orm import Session
from fastapi import Depends
from .. import database
from sqlalchemy import text

@router.delete("/reset")
def reset_database(db: Session = Depends(database.get_db)):
    try:
        # Delete data from all tables
        # Order matters for Foreign Keys
        db.execute(text("DELETE FROM transactions"))
        db.execute(text("DELETE FROM asset_tags"))
        db.execute(text("DELETE FROM tags"))
        db.execute(text("DELETE FROM assets"))
        db.execute(text("DELETE FROM goals"))
        db.execute(text("DELETE FROM expenses"))
        db.execute(text("DELETE FROM alerts"))
        db.execute(text("DELETE FROM system_settings"))

        # Re-seed default settings
        db.execute(text("INSERT INTO system_settings (key, value) VALUES ('budget_start_day', '1')"))
        
        db.commit()
        return {"message": "System reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

from datetime import datetime, timedelta
from .. import models

@router.post("/seed")
def seed_database(db: Session = Depends(database.get_db)):
    # 1. Reset first
    try:
        db.execute(text("DELETE FROM transactions"))
        db.execute(text("DELETE FROM asset_tags"))
        db.execute(text("DELETE FROM tags"))
        db.execute(text("DELETE FROM assets"))
        db.execute(text("DELETE FROM goals"))
        db.execute(text("DELETE FROM expenses"))
        db.execute(text("DELETE FROM alerts"))
        db.execute(text("DELETE FROM system_settings"))
        # Reset sequences if using Postgres, but for SQLite it's auto.
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

    try:
        # 2. System Settings
        db.add(models.SystemSetting(key='budget_start_day', value='1'))
        
        # 3. Create Tags
        tags = [
            models.Tag(name="Emergency Fund", color="red"),
            models.Tag(name="Tech", color="blue"),
            models.Tag(name="Dividend", color="green"),
            models.Tag(name="Vacation", color="yellow"),
        ]
        db.add_all(tags)
        db.commit() # Commit to get IDs
        
        # 4. Create Assets
        # Cash
        ctbc = models.Asset(name="CTBC Bank", category="Fluid", sub_category="Cash", is_favorite=True, icon="Wallet")
        chase = models.Asset(name="Chase Bank", category="Fluid", sub_category="Cash", is_favorite=False, icon="Landmark")
        
        # Stocks
        tsmc = models.Asset(name="TSMC", ticker="2330", category="Investment", sub_category="Stock", is_favorite=True, include_in_net_worth=True, icon="TrendingUp")
        nvda = models.Asset(name="NVIDIA", ticker="NVDA", category="Investment", sub_category="Stock", is_favorite=True, include_in_net_worth=True, icon="Cpu")
        
        # Crypto
        btc = models.Asset(name="Bitcoin", ticker="BTC", category="Investment", sub_category="Crypto", is_favorite=False, include_in_net_worth=True, icon="Bitcoin")
        
        # Liability
        amex = models.Asset(name="Amex Gold", category="Liabilities", sub_category="Credit Card", is_favorite=True, include_in_net_worth=True, icon="CreditCard")
        
        db.add_all([ctbc, chase, tsmc, nvda, btc, amex])
        db.commit()
        
        # 5. Add Tags to Assets
        tsmc.tags.append(tags[1]) # Tech
        tsmc.tags.append(tags[2]) # Dividend
        nvda.tags.append(tags[1]) # Tech
        ctbc.tags.append(tags[0]) # Emergency
        
        # 6. Create Transactions (History)
        today = datetime.now()
        
        # Initial Deposits (3 months ago)
        date_3m = today - timedelta(days=90)
        db.add(models.Transaction(asset_id=ctbc.id, amount=50000, buy_price=1, date=date_3m))
        db.add(models.Transaction(asset_id=chase.id, amount=2000, buy_price=32, date=date_3m)) 
        
        # Stock Buys (2 months ago)
        date_2m = today - timedelta(days=60)
        db.add(models.Transaction(asset_id=tsmc.id, amount=1000, buy_price=600, date=date_2m)) # Cost 600,000
        db.add(models.Transaction(asset_id=ctbc.id, amount=-600000, buy_price=1, date=date_2m)) # Pay from CTBC
        
        # Crypto Buy (1 month ago)
        date_1m = today - timedelta(days=30)
        db.add(models.Transaction(asset_id=btc.id, amount=0.1, buy_price=60000, date=date_1m)) # Cost 6,000 USD
        
        # Current Month Expenses (Smart Budgeting Test)
        # Assuming budget start day is 1st.
        curr_month_start = today.replace(day=1)
        db.add(models.Transaction(asset_id=amex.id, amount=5000, buy_price=1, date=curr_month_start + timedelta(days=2))) # Expense 5000 TWD
        db.add(models.Transaction(asset_id=amex.id, amount=3000, buy_price=1, date=curr_month_start + timedelta(days=5))) # Expense 3000 TWD

        
        # 7. Create Goals
        fire_goal = models.Goal(name="FIRE Target", target_amount=30000000, goal_type="NET_WORTH", currency="TWD")
        budget_goal = models.Goal(name="Monthly Budget", target_amount=40000, goal_type="MONTHLY_SPENDING", currency="TWD")
        
        db.add_all([fire_goal, budget_goal])
        
        # 8. Create Recuring Expenses
        netflix = models.Expense(name="Netflix", amount=390, currency="TWD", frequency="MONTHLY", due_day=15, category="Subscription")
        spotify = models.Expense(name="Spotify", amount=190, currency="TWD", frequency="MONTHLY", due_day=5, category="Subscription")
        
        db.add_all([netflix, spotify])
        
        db.commit()
        return {"message": "Database seeded with demo data successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

from ..services import max_service

@router.post("/sync/max")
def trigger_max_sync(db: Session = Depends(database.get_db)):
    success = max_service.sync_max_assets(db)
    if success:
        return {"message": "MAX assets synced successfully"}
    else:
        # It might return False if no keys set, which isn't exactly an error
        return {"message": "Sync attempted (Check logs or API keys)"}

# --- Profile Management ---
from pydantic import BaseModel
from .. import profile_manager

class ProfileCreate(BaseModel):
    name: str

class ProfileSwitch(BaseModel):
    name: str

@router.get("/profiles")
def get_profiles():
    return {
        "current": profile_manager.get_current_profile(),
        "profiles": profile_manager.list_profiles()
    }

@router.post("/profiles")
def create_new_profile(profile: ProfileCreate):
    if profile.name == "default":
        raise HTTPException(status_code=400, detail="Cannot create default profile")
    
    # Simple validation: alphanumeric only
    if not profile.name.isalnum():
         raise HTTPException(status_code=400, detail="Profile name must be alphanumeric")

    if profile_manager.create_profile(profile.name):
        return {"message": f"Profile '{profile.name}' created"}
    else:
        raise HTTPException(status_code=400, detail="Profile already exists")

@router.post("/switch_profile")
def switch_active_profile(profile: ProfileSwitch):
    if profile_manager.switch_profile(profile.name):
        # Trigger DB Reconnect
        database.reconnect()
        return {"message": f"Switched to profile '{profile.name}'"}
    else:
        raise HTTPException(status_code=404, detail="Profile not found")
        
@router.delete("/profile/{name}")
def delete_profile(name: str):
    if profile_manager.delete_profile(name):
        return {"message": f"Profile '{name}' deleted"}
    else:
        raise HTTPException(status_code=400, detail="Could not delete profile (Default or Not Found)")

