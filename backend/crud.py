from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime

def get_asset(db: Session, asset_id: int):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if asset:
        total_qty = sum(t.amount for t in asset.transactions)
        asset.value_twd = (asset.current_price or 0.0) * total_qty
        
        # Also compute unrealized PL if possible
        total_cost = sum(t.amount * t.buy_price for t in asset.transactions if t.buy_price > 0)
        # simplistic PL
        if total_cost > 0:
            asset.unrealized_pl = asset.value_twd - total_cost
            asset.roi = (asset.unrealized_pl / total_cost) * 100
    return asset

def get_assets(db: Session, skip: int = 0, limit: int = 100):
    assets = db.query(models.Asset).offset(skip).limit(limit).all()
    for asset in assets:
        # Compute value_twd dynamically
        total_qty = sum(t.amount for t in asset.transactions)
        asset.value_twd = (asset.current_price or 0.0) * total_qty
        
        # Compute PL/ROI
        # We need buy_price for transactions.
        # This is expensive for many assets, but necessary for the view.
        cost_basis = 0.0
        invested_capital = 0.0
        for t in asset.transactions:
             # Basic logic: 
             # If is_transfer, skip cost? Or assume 0 cost?
             # If buy_price is set.
             if t.amount > 0 and t.buy_price > 0:
                 invested_capital += t.amount * t.buy_price
        
        # Store temporary attributes for Pydantic
        if invested_capital > 0:
            asset.unrealized_pl = asset.value_twd - invested_capital
            asset.roi = (asset.unrealized_pl / invested_capital) * 100
        else:
            asset.unrealized_pl = 0.0
            asset.roi = 0.0
            
    return assets

def create_asset(db: Session, asset: schemas.AssetCreate):
    db_asset = models.Asset(
        name=asset.name,
        ticker=asset.ticker,
        category=asset.category,
        sub_category=asset.sub_category,
        include_in_net_worth=asset.include_in_net_worth,
        is_favorite=asset.is_favorite,
        icon=asset.icon,
        current_price=asset.current_price if asset.current_price is not None else (0.0 if asset.ticker else 1.0), # Initial price: from input, or 0 for market, 1 for manual
        last_updated_at=datetime.now()
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def create_transaction(db: Session, transaction: schemas.TransactionCreate, asset_id: int):
    tx_date = transaction.date if transaction.date else datetime.now()
    # Remove date from dict if it exists to avoid double passing if we assume strict models, but here we construct manual
    # Actually, transaction.dict() will include date if set.
    # But models.Transaction expects 'date'.
    # If transaction.date is None, we want datetime.now()
    
    tx_data = transaction.dict()
    if 'date' in tx_data and tx_data['date'] is None:
        tx_data['date'] = datetime.now()
    elif 'date' not in tx_data: # Should not happen if in schema but just in case
        tx_data['date'] = datetime.now()
        
    db_transaction = models.Transaction(
        **tx_data,
        asset_id=asset_id
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

def transfer_funds(db: Session, transfer: schemas.TransferCreate):
    # 1. Deduct from Source
    withdraw_tx = schemas.TransactionCreate(
        amount=-transfer.amount,
        buy_price=1.0,
        date=transfer.date or datetime.now(),
        is_transfer=True
    )
    create_transaction(db, withdraw_tx, transfer.from_asset_id)
    
    # 2. Add to Destination (Net Amount)
    deposit_amount = transfer.amount - (transfer.fee or 0.0)
    
    # Logic Fix: If destination is Liability, a "Transfer" is a Payment (reducing debt/balance).
    # Since Liabilities usually have positive balance = debt.
    # Reducing debt = Negative Amount transaction.
    # So if we transfer 1000 to Credit Card, we want -1000 transaction.
    
    to_asset = get_asset(db, transfer.to_asset_id)
    if to_asset and to_asset.category == 'Liabilities':
        deposit_amount = -deposit_amount
        
    deposit_tx = schemas.TransactionCreate(
        amount=deposit_amount,
        buy_price=1.0, 
        date=transfer.date or datetime.now(),
        is_transfer=True
    )
    create_transaction(db, deposit_tx, transfer.to_asset_id)
    
    return True

def update_asset_price(db: Session, asset_id: int, price: float):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if asset:
        asset.current_price = price
        asset.last_updated_at = datetime.now()
        db.commit()
        db.refresh(asset)
    return asset

def update_asset(db: Session, asset_id: int, asset_update: schemas.AssetUpdate):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if db_asset:
        for key, value in asset_update.dict(exclude_unset=True).items():
            setattr(db_asset, key, value)
        db_asset.last_updated_at = datetime.now()
        db.commit()
        db.refresh(db_asset)
    return db_asset
    
def delete_asset(db: Session, asset_id: int):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if asset:
        db.delete(asset)
        db.commit()
        return True
    return False

def delete_transaction(db: Session, transaction_id: int):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if transaction:
        db.delete(transaction)
        db.commit()
        return True
    return False

def update_transaction(db: Session, transaction_id: int, transaction_update: schemas.TransactionUpdate):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if db_transaction:
        update_data = transaction_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_transaction, key, value)
        db.commit()
        db.refresh(db_transaction)
    return db_transaction

# Goals CRUD
def get_goals(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Goal).offset(skip).limit(limit).all()

def create_goal(db: Session, goal: schemas.GoalCreate):
    db_goal = models.Goal(
        **goal.dict(),
        created_at=datetime.now()
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

def update_goal(db: Session, goal_id: int, goal_update: schemas.GoalUpdate):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if db_goal:
        for key, value in goal_update.dict(exclude_unset=True).items():
            setattr(db_goal, key, value)
        db.commit()
        db.refresh(db_goal)
    return db_goal

    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if goal:
        db.delete(goal)
        db.commit()
        return True
    return False

# Alert CRUD
def create_alert(db: Session, alert: schemas.AlertCreate, asset_id: int):
    db_alert = models.Alert(**alert.model_dump(), asset_id=asset_id)
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alerts_by_asset(db: Session, asset_id: int):
    return db.query(models.Alert).filter(models.Alert.asset_id == asset_id).all()

def get_active_alerts(db: Session):
    return db.query(models.Alert).filter(models.Alert.is_active == True).all()

    return db_alert

def delete_alert(db: Session, alert_id: int):
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if db_alert:
        db.delete(db_alert)
        db.commit()
    return db_alert

# Tag CRUD
def get_tag_by_name(db: Session, name: str):
    return db.query(models.Tag).filter(models.Tag.name == name).first()

def create_tag(db: Session, tag: schemas.TagCreate):
    db_tag = models.Tag(name=tag.name, color=tag.color)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag

def get_tags(db: Session):
    return db.query(models.Tag).all()

def add_tag_to_asset(db: Session, asset_id: int, tag_name: str, color: str = "blue"):
    asset = get_asset(db, asset_id)
    if not asset: return None
    
    tag = get_tag_by_name(db, tag_name)
    if not tag:
        tag = create_tag(db, schemas.TagCreate(name=tag_name, color=color))
    
    if tag not in asset.tags:
        asset.tags.append(tag)
        db.commit()
        db.refresh(asset)
    return asset

def remove_tag_from_asset(db: Session, asset_id: int, tag_id: int):
    asset = get_asset(db, asset_id)
    if not asset: return None
    
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if tag and tag in asset.tags:
        asset.tags.remove(tag)
        db.commit()
        db.refresh(asset)
    return asset

# Expense CRUD
def get_expenses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Expense).offset(skip).limit(limit).all()

def create_expense(db: Session, expense: schemas.ExpenseCreate):
    db_expense = models.Expense(**expense.dict())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def update_expense(db: Session, expense_id: int, expense_update: schemas.ExpenseUpdate):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense:
        for key, value in expense_update.dict(exclude_unset=True).items():
            setattr(db_expense, key, value)
        db.commit()
        db.refresh(db_expense)
    return db_expense

def delete_expense(db: Session, expense_id: int):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if db_expense:
        db.delete(db_expense)
        db.commit()
        return True
    return False
