from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float
    buy_price: float
    date: Optional[datetime] = None
    is_transfer: Optional[bool] = False

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    buy_price: Optional[float] = None
    date: Optional[datetime] = None
    is_transfer: Optional[bool] = None

class TransferCreate(BaseModel):
    from_asset_id: int
    to_asset_id: int
    amount: float
    fee: Optional[float] = 0.0
    date: Optional[datetime] = None

class Transaction(TransactionBase):
    id: int
    asset_id: int
    date: datetime

    class Config:
        from_attributes = True

# Asset Schemas
class AssetBase(BaseModel):
    name: str
    ticker: Optional[str] = None
    category: str
    sub_category: Optional[str] = None
    is_favorite: Optional[bool] = False
    include_in_net_worth: Optional[bool] = True
    icon: Optional[str] = None
    manual_avg_cost: Optional[float] = None
    payment_due_day: Optional[int] = None  # Day of month for credit card payment (1-31)
    value_twd: Optional[float] = 0.0 # Computed field
    unrealized_pl: Optional[float] = 0.0 # Computed field
    roi: Optional[float] = 0.0 # Computed field
    tags: List['Tag'] = []
    source: Optional[str] = "manual"

class AssetCreate(AssetBase):
    current_price: Optional[float] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    ticker: Optional[str] = None
    category: Optional[str] = None
    is_favorite: Optional[bool] = None
    include_in_net_worth: Optional[bool] = None
    icon: Optional[str] = None
    manual_avg_cost: Optional[float] = None
    payment_due_day: Optional[int] = None

# Crypto Connection Schema
class CryptoConnection(BaseModel):
    id: int
    name: str # e.g. "My Pionex"
    provider: str # "pionex", "max"

    class Config:
        from_attributes = True

class Asset(AssetBase):
    id: int
    current_price: float
    last_updated_at: datetime
    transactions: List[Transaction] = []
    connection: Optional[CryptoConnection] = None

    class Config:
        from_attributes = True

class DashboardData(BaseModel):
    net_worth: float
    total_pl: float
    total_roi: float
    exchange_rate: float
    assets: List[Asset]
    updated_at: datetime
    
class AlertBase(BaseModel):
    target_price: float
    condition: str # ABOVE, BELOW

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    asset_id: int
    is_active: bool
    triggered_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


# Goal Schemas
class GoalBase(BaseModel):
    name: str
    target_amount: float
    goal_type: str # "NET_WORTH", "MONTHLY_SPENDING"
    currency: Optional[str] = "TWD"
    description: Optional[str] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    goal_type: Optional[str] = None
    description: Optional[str] = None

class Goal(GoalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
    class Config:
        from_attributes = True

# Tag Schemas
class TagBase(BaseModel):
    name: str
    color: Optional[str] = "blue"

class TagCreate(TagBase):
    pass

    class Config:
        from_attributes = True

class Tag(TagBase):
    id: int
    # assets: List[AssetBase] = [] # Removed to prevent recursion

    class Config:
        from_attributes = True

# Expense Schemas
class ExpenseBase(BaseModel):
    name: str
    amount: float
    currency: Optional[str] = "TWD"
    frequency: str # MONTHLY, YEARLY
    due_day: Optional[int] = 1
    category: Optional[str] = "Subscription"
    split_with: Optional[int] = 1
    is_active: Optional[bool] = True

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    due_day: Optional[int] = None
    category: Optional[str] = None
    split_with: Optional[int] = None
    is_active: Optional[bool] = None

class Expense(ExpenseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SystemSettingBase(BaseModel):
    key: str
    value: str

class SystemSetting(SystemSettingBase):
    class Config:
        from_attributes = True
