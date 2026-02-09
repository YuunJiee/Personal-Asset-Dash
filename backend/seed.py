from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models
from datetime import datetime

Base.metadata.create_all(bind=engine)


def seed_web3_assets(db: Session):
    # Check if exists
    scroll_eth = db.query(models.Asset).filter(models.Asset.name == "Scroll ETH").first()
    if not scroll_eth:
        print("Seeding Scroll ETH...")
        asset = models.Asset(
            name="Scroll ETH",
            ticker="ETH",
            category="Fluid",
            sub_category="Crypto",
            source="manual_wallet", # Will be picked up by wallet_service because we set network
            network="Scroll",
            contract_address=None,
            include_in_net_worth=True
        )
        db.add(asset)
        db.commit()
    
    # Example Token (LiquidUSD on Scroll - Need real address or placeholder)
    # Using a placeholder address for now
    liquid_usd = db.query(models.Asset).filter(models.Asset.name == "LiquidUSD (Scroll)").first()
    if not liquid_usd:
        print("Seeding LiquidUSD...")
        asset = models.Asset(
            name="LiquidUSD (Scroll)",
            ticker="LUSD",
            category="Investment",
            sub_category="Stablecoin",
            source="manual_wallet",
            network="Scroll",
            contract_address="0xfE7eE0D0afb617Ea8cC6a5839b231A8591873138", # Example LUSD on Scroll
            decimals=18,
            include_in_net_worth=True
        )
        db.add(asset)
        db.commit()

def seed_data():
    db = SessionLocal()
    seed_web3_assets(db) # Call web3 seeder
    
    # Check if data exists
    if db.query(models.Asset).filter(models.Asset.source == 'manual').first():
        print("Manual Data already exists.")
        db.close()
        return

    # Create Assets

    assets = [
        models.Asset(name="Cash", category="Fluid", current_price=1.0, last_updated_at=datetime.utcnow()),
        models.Asset(name="AAPL", ticker="AAPL", category="Investment", current_price=150.0, last_updated_at=datetime.utcnow()),
        models.Asset(name="Bitcoin", ticker="BTC/USDT", category="Investment", current_price=40000.0, last_updated_at=datetime.utcnow()),
        models.Asset(name="House", category="Fixed", current_price=500000.0, last_updated_at=datetime.utcnow()),
        models.Asset(name="Car Loan", category="Liabilities", current_price=20000.0, last_updated_at=datetime.utcnow()),
    ]
    
    db.add_all(assets)
    db.commit()
    
    # Reload assets to get IDs
    for asset in assets:
        db.refresh(asset)
        
    # Create Transactions
    transactions = [
        models.Transaction(asset_id=assets[0].id, amount=10000, buy_price=1.0, date=datetime.utcnow()), # Cash
        models.Transaction(asset_id=assets[1].id, amount=10, buy_price=140.0, date=datetime.utcnow()), # AAPL
        models.Transaction(asset_id=assets[2].id, amount=0.5, buy_price=35000.0, date=datetime.utcnow()), # BTC
        models.Transaction(asset_id=assets[3].id, amount=1, buy_price=450000.0, date=datetime.utcnow()), # House
        models.Transaction(asset_id=assets[4].id, amount=1, buy_price=20000.0, date=datetime.utcnow()), # Car Loan
    ]
    
    db.add_all(transactions)
    db.commit()
    db.close()
    print("Seed data created.")

if __name__ == "__main__":
    seed_data()
