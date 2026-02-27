from contextlib import asynccontextmanager
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

# ── Migrations ────────────────────────────────────────────────────────────────

def _run_migrations():
    """Idempotent schema migrations that run on every startup."""
    from sqlalchemy import text

    with engine.connect() as conn:
        migrations = [
            # P1-2: connection_id on assets (original migration)
            ("SELECT connection_id FROM assets LIMIT 1",
             "ALTER TABLE assets ADD COLUMN connection_id INTEGER REFERENCES crypto_connections(id)"),
            # P1-2: group_name on budget_categories
            ("SELECT group_name FROM budget_categories LIMIT 1",
             "ALTER TABLE budget_categories ADD COLUMN group_name VARCHAR"),
            # P2: note on transactions (matches frontend types.ts)
            ("SELECT note FROM transactions LIMIT 1",
             "ALTER TABLE transactions ADD COLUMN note VARCHAR"),
        ]

        for check_sql, alter_sql in migrations:
            try:
                conn.execute(text(check_sql))
            except Exception:
                try:
                    conn.execute(text(alter_sql))
                    conn.commit()
                    logger.info(f"Migration applied: {alter_sql[:60]}…")
                except Exception as e:
                    logger.error(f"Migration failed: {e}")

        # income_items table (CREATE IF NOT EXISTS is idempotent)
        try:
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
        except Exception as e:
            logger.error(f"Migration (income_items) failed: {e}")

        # P1-2: net_worth_history table for daily snapshots
        try:
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS net_worth_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date VARCHAR UNIQUE,
                value FLOAT,
                breakdown VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """))
            conn.commit()
            logger.info("net_worth_history table ready.")
        except Exception as e:
            logger.error(f"Migration (net_worth_history) failed: {e}")


# ── App Lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Replaces deprecated @app.on_event('startup'/'shutdown')."""
    logger.info("Starting Yantage backend…")

    # Ensure all ORM-declared tables exist
    models.Base.metadata.create_all(bind=engine)

    # Run incremental schema migrations
    _run_migrations()

    # Register the running asyncio event loop with the WebSocket manager
    # so background threads can safely broadcast to connected clients.
    import asyncio
    from .routers.ws import manager as ws_manager
    ws_manager.set_loop(asyncio.get_running_loop())

    # Start background scheduler
    from . import scheduler as sched_module
    sched_module.start_scheduler()

    yield  # ← application runs here

    # Graceful shutdown
    sched_module.shutdown_scheduler()
    logger.info("Yantage backend shut down.")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(title="Personal Asset Dashboard API", lifespan=lifespan)

# Trust Cloudflare Tunnel / Nginx Headers
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# CORS setup
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,https://assets.yuunjiee.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routers import dashboard, assets, stats, goals, alerts, transactions, budgets, settings, system, integrations, income
from .routers.ws import router as ws_router

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
app.include_router(ws_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Asset Dash API"}
