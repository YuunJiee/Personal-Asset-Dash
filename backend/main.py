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

from .routers import dashboard, assets, stats, goals, alerts, transactions, expenses, settings, system, integrations

app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(alerts.router)
app.include_router(expenses.router)
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

@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Asset Dash API"}


