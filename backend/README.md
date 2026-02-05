# Backend - Yantage API

FastAPI-based REST API for personal asset management.

## 🏗️ Architecture

```
backend/
├── routers/              # API endpoints
│   ├── assets.py         # Asset CRUD operations
│   ├── dashboard.py      # Dashboard aggregations
│   ├── expenses.py       # Expense tracking
│   ├── goals.py          # Financial goals
│   ├── settings.py       # System settings
│   ├── stats.py          # Analytics & statistics
│   ├── system.py         # System operations (MAX sync)
│   └── transactions.py   # Transaction history
├── services/
│   └── max_service.py    # MAX Exchange integration
├── models.py             # SQLAlchemy ORM models
├── schemas.py            # Pydantic request/response schemas
├── crud.py               # Database operations
├── service.py            # Business logic (MarketService)
├── scheduler.py          # Background tasks (price updates)
├── database.py           # DB connection & session
└── main.py               # FastAPI app entry point
```

## 🚀 Getting Started

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Database Initialization

The database is automatically created on first run. To seed with sample data:

```bash
python seed.py  # General sample data
# or
python seed_university_student.py  # Student-specific scenario
```

## 📊 Database Schema

### Core Tables

- **`assets`**: Asset records (stocks, crypto, cash, etc.)
- **`transactions`**: Transaction history
- **`goals`**: Financial goals and targets
- **`expenses`**: Monthly expense tracking
- **`alerts`**: Price alerts
- **`system_settings`**: Configuration (API keys, preferences)
- **`profiles`**: Multi-profile support

### Key Relationships

```
assets ──< transactions
assets ──< alerts
profiles ──< assets
```

## 🔌 API Endpoints

### Assets
- `GET /api/assets/` - List all assets
- `POST /api/assets/` - Create asset
- `PUT /api/assets/{id}` - Update asset
- `DELETE /api/assets/{id}` - Delete asset

### Dashboard
- `GET /api/dashboard/` - Get dashboard summary

### Statistics
- `GET /api/stats/history` - Net worth history
- `GET /api/stats/forecast` - Future projections
- `GET /api/stats/rebalance` - Rebalancing suggestions

### System
- `POST /api/system/sync/max` - Sync MAX Exchange data
- `POST /api/system/update-prices` - Manual price update

**Full API Documentation**: http://localhost:8000/docs

## 🔐 Configuration

### System Settings (via API)

```python
# Example: Set MAX API credentials
PUT /api/settings/max_api_key
PUT /api/settings/max_api_secret
```

### Environment Variables

Create `.env` file (optional):

```env
DATABASE_URL=sqlite:///./sql_app.db
PRICE_UPDATE_INTERVAL=30  # minutes
```

## 🔧 Services

### MarketService

Fetches real-time prices from:
- **Yahoo Finance**: Taiwan/US stocks
- **CCXT**: Cryptocurrency prices
- **MAX Exchange**: Taiwan crypto exchange

### MAXService

- **Authentication**: HMAC-SHA256 signed requests
- **Read-Only**: Only fetches data, never places orders
- **Auto-Sync**: Balances and trade history

### Scheduler

Background tasks running via APScheduler:
- Price updates (every 30 minutes by default)
- Configurable via system settings

## 🧪 Testing

```bash
# Run tests (if available)
pytest

# Check code coverage
pytest --cov=.
```

## 📝 Development Notes

### Adding New Endpoints

1. Create router in `routers/`
2. Define schemas in `schemas.py`
3. Add CRUD operations in `crud.py`
4. Register router in `main.py`

### Database Migrations

Currently using SQLAlchemy's `create_all()`. For production, consider:
- Alembic for migrations
- Backup strategy for `sql_app.db`

## 🐛 Troubleshooting

### Database Locked Error
- Close all connections to `sql_app.db`
- Restart the server

### Price Update Failures
- Check internet connection
- Verify Yahoo Finance/CCXT availability
- Check logs for specific errors

## 📚 Dependencies

- **FastAPI**: Web framework
- **SQLAlchemy**: ORM
- **Pydantic**: Data validation
- **APScheduler**: Background tasks
- **CCXT**: Crypto exchange integration
- **yfinance**: Stock price fetching
- **requests**: HTTP client
