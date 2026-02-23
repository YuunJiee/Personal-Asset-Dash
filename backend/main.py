from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Asset Dashboard API")

# Trust Cloudflare Tunnel / Nginx Headers
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"]) # Trust all upstream proxies (Cloudflare)

# CORS setup - use environment variable or default to localhost
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,https://assets.yuunjiee.com").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routers import dashboard, assets, stats, goals, alerts, transactions, budgets, settings, system, integrations, income

app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(alerts.router)
app.include_router(budgets.router)
app.include_router(income.router)
app.include_router(settings.router)
app.include_router(system.router)
app.include_router(integrations.router)

from . import scheduler
from sqlalchemy import text

@app.on_event("startup")
def start_scheduler_service():
    logger.info("Starting application...")
    scheduler.start_scheduler()
    
    # Auto-migration for new connection_id column
    with engine.connect() as conn:
        try:
            # Check if column exists
            conn.execute(text("SELECT connection_id FROM assets LIMIT 1"))
        except Exception:
            logger.info("Migrating: Adding connection_id to assets table...")
            try:
                conn.execute(text("ALTER TABLE assets ADD COLUMN connection_id INTEGER REFERENCES crypto_connections(id)"))
                conn.commit()
                logger.info("Migration successful.")
            except Exception as e:
                logger.error(f"Migration failed: {e}")
                
        # Auto-migration for Budget Refactoring (group_name)
        try:
            conn.execute(text("SELECT group_name FROM budget_categories LIMIT 1"))
        except Exception:
            logger.info("Migrating: Adding group_name to budget_categories table...")
            try:
                conn.execute(text("ALTER TABLE budget_categories ADD COLUMN group_name VARCHAR"))
                conn.commit()
                logger.info("Migration (group_name) successful.")
            except Exception as e:
                logger.error(f"Migration (group_name) failed: {e}")
                
        # Auto-migration for Income Layer
        try:
            logger.info("Checking income_items table...")
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS income_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR,
                amount FLOAT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """))
            conn.commit()
            logger.info("Income items table ready.")
        except Exception as e:
            logger.error(f"Migration (income_items) failed: {e}")

@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Asset Dash API"}


