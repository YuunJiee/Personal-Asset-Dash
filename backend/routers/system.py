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
from .. import database, models
from sqlalchemy import text

@router.get("/export/csv")
def export_assets_csv(db: Session = Depends(database.get_db)):
    import csv
    import io
    from datetime import datetime
    
    # Fetch Assets
    assets = db.query(models.Asset).all()
    
    # Prepare CSV Data
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow(['ID', 'Name', 'Ticker', 'Category', 'Sub-Category', 'Source', 'Quantity', 'Current Price', 'Value (approx)', 'Include in NW'])
    
    for asset in assets:
        quantity = sum(t.amount for t in asset.transactions)
        value = quantity * (asset.current_price or 0)
        
        writer.writerow([
            asset.id,
            asset.name,
            asset.ticker or '',
            asset.category,
            asset.sub_category or '',
            asset.source or 'manual',
            quantity,
            asset.current_price,
            round(value, 2),
            asset.include_in_net_worth
        ])
        
    output.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ymoney_assets_{timestamp}.csv"
    
    return FileResponse(
        path=None, # Not using physical file
        content=output.getvalue(),
        filename=filename,
        media_type='text/csv'
    )
    # Note: FileResponse expects a path or bytes-like object? 
    # Actually FileResponse is for files on disk. 
    # For in-memory, use StreamingResponse or Response with media_type.
    
    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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
        db.execute(text("DELETE FROM crypto_connections"))

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
    import random
    from datetime import timedelta

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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

    try:
        # 2. System Settings
        db.add(models.SystemSetting(key='budget_start_day', value='1'))
        
        # 3. Create Tags
        tag_names = ["Emergency Fund", "Tech", "Dividend", "Vacation", "High Risk", "Safe", "Retirement", "Short Term"]
        tags = []
        colors = ["red", "blue", "green", "yellow", "orange", "purple", "indigo", "pink"]
        for i, name in enumerate(tag_names):
            t = models.Tag(name=name, color=colors[i % len(colors)])
            tags.append(t)
        db.add_all(tags)
        db.commit() # Commit to get IDs
        
        # 4. Create Assets & Transactions
        today = datetime.now()
        assets = []
        
        # --- Cash ---
        ctbc = models.Asset(name="CTBC Bank", category="Fluid", sub_category="Cash", is_favorite=True, icon="Wallet", source="manual")
        chase = models.Asset(name="Chase Bank", category="Fluid", sub_category="Cash", is_favorite=False, icon="Landmark", source="manual")
        wallet = models.Asset(name="Cash Wallet", category="Fluid", sub_category="Cash", is_favorite=False, icon="Banknote", source="manual")
        assets.extend([ctbc, chase, wallet])
        
        # --- Stocks (TW & US) ---
        tsmc = models.Asset(name="TSMC", ticker="2330", category="Stock", sub_category="Stock", is_favorite=True, include_in_net_worth=True, icon="TrendingUp", source="manual", current_price=1080)
        nvda = models.Asset(name="NVIDIA", ticker="NVDA", category="Stock", sub_category="Stock", is_favorite=True, include_in_net_worth=True, icon="Cpu", source="manual", current_price=135)
        aapl = models.Asset(name="Apple", ticker="AAPL", category="Stock", sub_category="Stock", is_favorite=False, include_in_net_worth=True, icon="Smartphone", source="manual", current_price=220)
        vti = models.Asset(name="Vanguard Total Stock", ticker="VTI", category="Stock", sub_category="Stock", is_favorite=True, include_in_net_worth=True, icon="Globe", source="manual", current_price=270)
        assets.extend([tsmc, nvda, aapl, vti])

        # --- Crypto ---
        btc = models.Asset(name="Bitcoin", ticker="BTC", category="Crypto", sub_category="Crypto", is_favorite=True, include_in_net_worth=True, icon="Bitcoin", source="binance", current_price=98000)
        eth = models.Asset(name="Ethereum", ticker="ETH", category="Crypto", sub_category="Crypto", is_favorite=False, include_in_net_worth=True, icon="Zap", source="binance", current_price=2800)
        sol = models.Asset(name="Solana", ticker="SOL", category="Crypto", sub_category="Crypto", is_favorite=False, include_in_net_worth=True, icon="Activity", source="pionex", current_price=180)
        usdt_earn = models.Asset(name="USDT Earn", ticker="USDT", category="Crypto", sub_category="Crypto", is_favorite=False, include_in_net_worth=True, icon="DollarSign", source="pionex", current_price=1)
        assets.extend([btc, eth, sol, usdt_earn])

        # --- Fixed Assets ---
        car = models.Asset(name="Tesla Model 3", category="Fixed", sub_category="Car", is_favorite=False, include_in_net_worth=True, icon="Car", source="manual", current_price=1200000)
        rolex = models.Asset(name="Rolex Submariner", category="Fixed", sub_category="Other Fixed Asset", is_favorite=False, include_in_net_worth=True, icon="Watch", source="manual", current_price=350000)
        assets.extend([car, rolex])

        # --- Liabilities ---
        amex = models.Asset(name="Amex Gold", category="Liabilities", sub_category="Credit Card", is_favorite=True, include_in_net_worth=True, icon="CreditCard", source="manual")
        mortgage = models.Asset(name="Apartment Mortgage", category="Liabilities", sub_category="Loan", is_favorite=False, include_in_net_worth=True, icon="Home", source="manual")
        assets.extend([amex, mortgage])

        db.add_all(assets)
        db.commit()

        # 5. Add Tags
        tsmc.tags.extend([tags[1], tags[2], tags[5]]) # Tech, Dividend, Safe
        nvda.tags.extend([tags[1], tags[4]]) # Tech, High Risk
        aapl.tags.extend([tags[1], tags[5]]) # Tech, Safe
        vti.tags.extend([tags[5], tags[6]]) # Safe, Retirement
        btc.tags.extend([tags[4]]) # High Risk
        ctbc.tags.extend([tags[0]]) # Emergency Fund
        usdt_earn.tags.extend([tags[7]]) # Short Term

        # 6. Generate History (Transactions)
        transactions = []

        # Cash History
        # Initial large deposit 1 year ago
        transactions.append(models.Transaction(asset_id=ctbc.id, amount=500000, buy_price=1, date=today - timedelta(days=365)))
        transactions.append(models.Transaction(asset_id=chase.id, amount=10000, buy_price=32, date=today - timedelta(days=365)))
        # Random spending/salary
        for i in range(12):
            date_entry = today - timedelta(days=30 * (12 - i))
            # Salary
            transactions.append(models.Transaction(asset_id=ctbc.id, amount=80000, buy_price=1, date=date_entry))
            # Credit Card Payoff
            transactions.append(models.Transaction(asset_id=ctbc.id, amount=-40000, buy_price=1, date=date_entry + timedelta(days=5)))
            transactions.append(models.Transaction(asset_id=amex.id, amount=-40000, buy_price=1, date=date_entry + timedelta(days=5))) # Paying off liability is negative amount? No, liability balance implies positive amount usually? 
            # Wait, Liability implementation: usually positive balance = debt.
            # So "Paying off" means reducing the balance (negative amount transaction).
            # "Spending" on card means increasing the balance (positive amount transaction).

        # Spending on Card
        for i in range(20):
             days_ago = random.randint(1, 60)
             amount = random.randint(500, 5000)
             transactions.append(models.Transaction(asset_id=amex.id, amount=amount, buy_price=1, date=today - timedelta(days=days_ago)))

        # Stock DCA
        for stock in [tsmc, nvda, aapl, vti]:
            # Initial buy
            transactions.append(models.Transaction(asset_id=stock.id, amount=random.randint(100, 1000), buy_price=stock.current_price * 0.7, date=today - timedelta(days=365)))
            # Monthly DCA
            for i in range(12):
                date_entry = today - timedelta(days=30 * (12 - i))
                price_fluctuation = random.uniform(0.8, 1.2)
                transactions.append(models.Transaction(asset_id=stock.id, amount=random.randint(10, 50), buy_price=stock.current_price * price_fluctuation, date=date_entry))

        # Crypto Volatility
        for coin in [btc, eth, sol]:
             # Initial buy
            transactions.append(models.Transaction(asset_id=coin.id, amount=random.uniform(0.01, 1.0), buy_price=coin.current_price * 0.5, date=today - timedelta(days=365)))
            # Random trades
            for i in range(5):
                 days_ago = random.randint(1, 300)
                 is_buy = random.choice([True, True, False]) # More buys
                 amount = random.uniform(0.01, 0.5)
                 price = coin.current_price * random.uniform(0.6, 1.1)
                 transactions.append(models.Transaction(
                     asset_id=coin.id, 
                     amount=amount if is_buy else -amount, 
                     buy_price=price, 
                     date=today - timedelta(days=days_ago)
                 ))

        # Fixed Assets
        transactions.append(models.Transaction(asset_id=car.id, amount=1, buy_price=1200000, date=today - timedelta(days=200)))
        transactions.append(models.Transaction(asset_id=rolex.id, amount=1, buy_price=350000, date=today - timedelta(days=100)))

        # Mortgage
        transactions.append(models.Transaction(asset_id=mortgage.id, amount=8000000, buy_price=1, date=today - timedelta(days=600)))
        # Monthly payments
        for i in range(20):
             date_entry = today - timedelta(days=30 * (20 - i))
             transactions.append(models.Transaction(asset_id=mortgage.id, amount=-25000, buy_price=1, date=date_entry))

        db.add_all(transactions)

        # 7. Create Goals
        fire_goal = models.Goal(name="FIRE Target", target_amount=30000000, goal_type="NET_WORTH", currency="TWD", description="Financial Independence, Retire Early")
        car_goal = models.Goal(name="Buy Porsche 911", target_amount=8000000, goal_type="NET_WORTH", currency="TWD", description="Dream Car Fund")
        budget_goal = models.Goal(name="Monthly Spending Limit", target_amount=60000, goal_type="MONTHLY_SPENDING", currency="TWD")
        
        db.add_all([fire_goal, car_goal, budget_goal])
        
        # 8. Create Recuring Expenses
        expenses = [
            models.Expense(name="Netflix", amount=390, currency="TWD", frequency="MONTHLY", due_day=15, category="Subscription"),
            models.Expense(name="Spotify", amount=190, currency="TWD", frequency="MONTHLY", due_day=5, category="Subscription"),
            models.Expense(name="Rent", amount=25000, currency="TWD", frequency="MONTHLY", due_day=1, category="Housing"),
            models.Expense(name="Gym", amount=1200, currency="TWD", frequency="MONTHLY", due_day=10, category="Health"),
            models.Expense(name="Internet", amount=900, currency="TWD", frequency="MONTHLY", due_day=20, category="Utilities"),
            models.Expense(name="Car Insurance", amount=12000, currency="TWD", frequency="YEARLY", due_day=1, category="Insurance"),
            models.Expense(name="AWS", amount=50, currency="USD", frequency="MONTHLY", due_day=3, category="Tech"),
        ]
        
        db.add_all(expenses)
        
        db.commit()
        return {"message": "Database seeded with comprehensive fake data successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

from ..services import max_service, wallet_service, exchange_service

@router.post("/sync/max")
def trigger_max_sync(db: Session = Depends(database.get_db)):
    success = max_service.sync_max_assets(db)
    if success:
        return {"message": "MAX assets synced successfully"}
    else:
        # It might return False if no keys set, which isn't exactly an error
        return {"message": "Sync attempted (Check logs or API keys)"}

@router.post("/sync/pionex")
def trigger_pionex_sync(db: Session = Depends(database.get_db)):
    # Legacy endpoint name, now triggers generic sync for all CCXT exchanges (including Pionex)
    success = exchange_service.sync_all_exchanges(db)
    if success:
        return {"message": "Exchange assets synced successfully"}
    else:
        return {"message": "Sync attempted (Check active connections)"}

@router.post("/sync/wallet")
def trigger_wallet_sync(db: Session = Depends(database.get_db)):
    success = wallet_service.sync_wallets(db)
    if success:
        return {"message": "Wallet assets synced successfully"}
    else:
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

