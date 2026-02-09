from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class CryptoConnection(Base):
    __tablename__ = "crypto_connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # e.g. "My Pionex", "Main Wallet"
    provider = Column(String) # "pionex", "max", "wallet"
    api_key = Column(String, nullable=True)
    api_secret = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    assets = relationship("Asset", back_populates="connection", cascade="all, delete-orphan")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    ticker = Column(String, index=True) # e.g., AAPL, BTC/USDT
    category = Column(String, index=True) # e.g., Investment, Fluid, Fixed, Receivables, Liabilities
    sub_category = Column(String, nullable=True) # e.g., Cash, Stock, Real Estate
    current_price = Column(Float, default=0.0)
    last_updated_at = Column(DateTime, default=datetime.now)
    is_favorite = Column(Boolean, default=False)
    include_in_net_worth = Column(Boolean, default=True)
    icon = Column(String, nullable=True)
    manual_avg_cost = Column(Float, nullable=True)
    payment_due_day = Column(Integer, nullable=True)  # Day of month for credit card payment (1-31)
    source = Column(String, default="manual") # manual, max, binance
    
    # Pro Features
    network = Column(String, nullable=True) # e.g. "Scroll", "Ethereum", "BSC"
    contract_address = Column(String, nullable=True) # 0x...
    decimals = Column(Integer, default=18) # for Web3 precision

    # Multi-Integration
    connection_id = Column(Integer, ForeignKey("crypto_connections.id"), nullable=True)
    connection = relationship("CryptoConnection", back_populates="assets")

    transactions = relationship("Transaction", back_populates="asset")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    amount = Column(Float) # Quantity
    buy_price = Column(Float) # Average Cost
    date = Column(DateTime, default=datetime.now)
    is_transfer = Column(Boolean, default=False)

    asset = relationship("Asset", back_populates="transactions")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # e.g. "Net Worth Target", "Monthly Budget"
    target_amount = Column(Float)
    goal_type = Column(String) # "NET_WORTH", "MONTHLY_SPENDING"
    currency = Column(String, default="TWD")
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    target_price = Column(Float)
    condition = Column(String) # "ABOVE", "BELOW"
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    asset = relationship("Asset", back_populates="alerts")

# Add back_populates to Asset
Asset.alerts = relationship("Alert", back_populates="asset", cascade="all, delete-orphan")

# Tag Association Table
from sqlalchemy import Table
asset_tags = Table('asset_tags', Base.metadata,
    Column('asset_id', Integer, ForeignKey('assets.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String, default="blue") # e.g. blue, red, green
    
    assets = relationship("Asset", secondary=asset_tags, back_populates="tags")

Asset.tags = relationship("Tag", secondary=asset_tags, back_populates="assets")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    amount = Column(Float)
    currency = Column(String, default="TWD")
    frequency = Column(String) # "MONTHLY", "YEARLY"
    due_day = Column(Integer) # 1-31
    category = Column(String) # "Subscription", "Rent", etc.
    split_with = Column(Integer, default=1) # 1 = Paying full, 2 = split with 1 other, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)
