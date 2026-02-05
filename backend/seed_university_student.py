from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models
from datetime import datetime, timedelta

# Drop and Recreate All Tables to Reset
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def seed_university_data():
    db = SessionLocal()
    
    print("Clearing existing data...")
    # Double check delete if drop_all above didn't work smoothly (though it should)
    db.query(models.Transaction).delete()
    db.query(models.Asset).delete()
    db.query(models.Expense).delete()
    db.commit()

    print("Creating University Student Profile...")

    # --- Assets ---
    # 1. Cash / Fluid
    part_time_savings = models.Asset(name="Part-time Savings", category="Fluid", current_price=1.0, last_updated_at=datetime.utcnow(), include_in_net_worth=True)
    living_allowance = models.Asset(name="Monthly Allowance", category="Fluid", sub_category="Cash", current_price=1.0, last_updated_at=datetime.utcnow(), include_in_net_worth=True)
    
    # 2. Investment (Small scale)
    etf_00878 = models.Asset(name="00878 Sustainability", ticker="00878.TW", category="Investment", sub_category="Stock", current_price=22.5, last_updated_at=datetime.utcnow(), include_in_net_worth=True)
    bitcoin = models.Asset(name="Bitcoin", ticker="BTC-USD", category="Investment", sub_category="Crypto", current_price=1350000.0, last_updated_at=datetime.utcnow(), include_in_net_worth=True) # Approx price
    
    # 3. Liabilities (Student Loan)
    student_loan = models.Asset(name="Student Loan", category="Liabilities", current_price=1.0, last_updated_at=datetime.utcnow(), include_in_net_worth=True)

    assets = [part_time_savings, living_allowance, etf_00878, bitcoin, student_loan]
    db.add_all(assets)
    db.commit()
    
    # Refresh to get IDs
    for a in assets: db.refresh(a)

    # --- Transactions (Holdings) ---
    transactions = [
        # Cash: 45,000 Saved
        models.Transaction(asset_id=part_time_savings.id, amount=45200, buy_price=1.0, date=datetime.utcnow()),
        # Allowance: 8,000 left this month
        models.Transaction(asset_id=living_allowance.id, amount=8000, buy_price=1.0, date=datetime.utcnow()),
        
        # ETF: Bought 500 shares slowly
        models.Transaction(asset_id=etf_00878.id, amount=500, buy_price=19.5, date=datetime.utcnow() - timedelta(days=120)),
        
        # Crypto: Small amount
        models.Transaction(asset_id=bitcoin.id, amount=0.002, buy_price=1000000.0, date=datetime.utcnow() - timedelta(days=200)),
        
        # Loan: 400k Debt (Negative Asset or Handled as Positive Liability? Assuming standard is negative qty or handle as liability category)
        # In this app, Liabilities usually have negative holdings or are displayed negatively. 
        # Let's populate as POSITIVE amount in "Liabilities" category, the frontend/backend usually subtracts it. 
        # Or better, use negative amount for clarity if the app logic supports it. 
        # Based on previous context, user adds "Liabilities" which reduce Net Worth. 
        # Let's use Negative Amount for safety in Net Worth Calc.
        models.Transaction(asset_id=student_loan.id, amount=-400000, buy_price=1.0, date=datetime.utcnow()), 
    ]
    db.add_all(transactions)
    
    # --- Fixed Expenses ---
    expenses = [
        models.Expense(name="Spotify Student", amount=75, frequency="MONTHLY", due_day=5, category="Subscription", is_active=True, currency="TWD"),
        models.Expense(name="Netflix (Split)", amount=390, split_with=4, frequency="MONTHLY", due_day=15, category="Subscription", is_active=True, currency="TWD"), # 390/4 = 97.5
        models.Expense(name="Dorm Rent", amount=6500, frequency="MONTHLY", due_day=1, category="Housing", is_active=True, currency="TWD"),
        models.Expense(name="Mobile Date Plan", amount=499, frequency="MONTHLY", due_day=20, category="Bills", is_active=True, currency="TWD"),
        models.Expense(name="Gym Membership", amount=800, frequency="MONTHLY", due_day=10, category="Health", is_active=True, currency="TWD"),
    ]
    db.add_all(expenses)
    
    db.commit()
    db.close()
    print("University Student Profile Created Successfully!")

if __name__ == "__main__":
    seed_university_data()
