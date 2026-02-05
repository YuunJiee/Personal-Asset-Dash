from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Asset Dashboard API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routers import dashboard, assets, stats, goals, alerts, transactions, expenses, settings, system

app.include_router(dashboard.router)
app.include_router(assets.router)
app.include_router(transactions.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(alerts.router)
app.include_router(expenses.router)
app.include_router(settings.router)
app.include_router(system.router)

from . import scheduler

@app.on_event("startup")
def start_scheduler_service():
    scheduler.start_scheduler()

@app.get("/")
def read_root():
    return {"message": "Welcome to Personal Asset Dash API"}
