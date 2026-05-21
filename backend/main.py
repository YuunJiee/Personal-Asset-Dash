from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# ── App Lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Replaces deprecated @app.on_event('startup'/'shutdown')."""
    logger.info("Starting Yantage backend…")

    # Apply all pending Alembic migrations (creates tables on first run,
    # applies incremental changes on subsequent runs).
    from . import migrations as db_migrations
    db_migrations.run_migrations()

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

from .routers import dashboard, assets, stats, goals, transactions, budgets, settings, system, integrations, income

app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(budgets.router)
app.include_router(income.router)
app.include_router(settings.router)
app.include_router(system.router)
app.include_router(integrations.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Asset Dash API"}
