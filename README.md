# Yantage 💰 — Personal Asset Dashboard

**Yantage** is a self-hosted, privacy-first personal finance dashboard. Track your net worth across every asset class, connect to exchanges and on-chain wallets, and get portfolio analytics — all with 100% local data storage and zero cloud dependency.

![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)

> English Version | [繁體中文版](README_TW.md)

---

## 💡 Inspiration

This project was inspired by [Percento](https://www.percento.app/cn/), a beautifully designed personal finance app. I built Yantage to:

- **Prioritize Privacy** — 100% local storage, your data never leaves your machine
- **Fit my workflow** — features tailored to personal finance management, not enterprise accounting
- **Support the Taiwan market** — native integration with Taiwan stocks and MAX Exchange
- **Stay open source** — free for anyone to use, fork, and learn from

---

## ✨ Features

### 📊 Asset Management
- **6 asset categories**: Fluid (cash/savings), Stock, Crypto, Fixed Assets, Receivables, Liabilities
- **Real-time prices**: Taiwan and US stocks via Yahoo Finance; crypto via Binance CCXT — with automatic retry on rate limits
- **Exchange integrations**: MAX, Binance, Pionex — auto-sync balances and positions with read-only API keys
- **On-chain wallet tracking**: Ethereum, Scroll, and BSC networks via direct RPC calls (no third-party API required)
- **Drag-and-drop reordering**: Rearrange assets within each category
- **Synced asset protection**: Exchange-managed assets are locked from manual edits to prevent sync conflicts

### 📈 Analytics
- **Net Worth Trend**: Interactive line chart with 30D / 3MO / 6MO / 1Y / ALL timeframes
- **Monthly P&L Chart**: Bar chart showing month-over-month net worth changes
- **Risk Metrics**: CAGR, Max Drawdown, and Annualized Volatility calculated from your historical snapshots
- **Asset Allocation**: Donut chart showing portfolio distribution across all categories
- **Top Performers / Movers**: Best and worst performing assets by percentage gain/loss
- **Automatic daily snapshots**: Net worth history recorded after every price update cycle

### 🎯 Financial Planning
- **FIRE Goal Tracking**: Visual progress bar toward your financial independence target with projected milestone date
- **Asset Allocation Goals**: Set target percentage per category; dashboard shows per-category progress bars with diff indicators and an overall Balanced/Off-Balance badge (±5% tolerance)
- **Wealth Simulator**: Compound interest calculator — project portfolio growth with monthly contributions and expected return rate
- **Budget Planner**: Color-coded budget categories with monthly limits, progress bars, and income source tracking
- **Emergency Fund Calculator**: How many months can you survive on your liquid assets?
- **Price Alerts**: Set target prices; alerts trigger automatically after each price update

### 🖥️ Interface
- **Dashboard**: SSR-rendered home page with zero initial loading flash — asset accordion, allocation widget, goal tracker, risk metrics, top performers, and net worth chart all in one view
- **Dedicated pages**: All Assets, Stocks, Crypto, Analytics, Budget Planner, Transaction History, Financial Calendar, Settings
- **Skeleton loading**: Layout-accurate shimmer placeholders on every page during data fetch
- **Toast notifications**: CRUD feedback across all asset, trade, and budget operations
- **Bilingual UI**: English and Traditional Chinese — compile-time symmetry guard ensures no missing translation keys
- **Three chart themes**: Classic, Morandi, Vibrant — switchable in Settings
- **Dark / Light mode**: Seamless theme switching via next-themes
- **Privacy mode**: One-click mask of all monetary values across the entire UI
- **PWA support**: Installable as a desktop or mobile app with offline cache
- **Responsive layout**: Sidebar navigation on desktop, bottom tab bar on mobile

### 🔒 Privacy & Security
- **100% local SQLite database** — your financial data never leaves your machine
- **No cloud sync, no tracking, no telemetry, no analytics**
- **CORS** configurable via environment variable
- **Cloudflare Access** (optional but recommended) — drop-in Email OTP authentication in front of the entire app with zero code changes

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js (App Router) | 16.1.6 | Framework — SSR + CSR hybrid rendering |
| React | 19.2.3 | UI component system |
| TypeScript | ^5 | Static typing |
| Tailwind CSS | v4 | Atomic CSS |
| shadcn/ui (Radix UI) | — | Accessible UI primitives |
| Recharts | ^3.7.0 | Line, bar, and pie charts |
| @dnd-kit | ^6–10 | Drag-and-drop asset reordering |
| SWR | ^2.4.0 | Data fetching + stale-while-revalidate cache |
| Lucide React | ^0.563 | Icon set |
| next-themes | ^0.4.6 | Light / dark mode |

### Backend

| Technology | Version | Role |
|---|---|---|
| FastAPI | latest | HTTP framework with automatic OpenAPI docs |
| SQLAlchemy | ^2.0 | ORM (declarative models) |
| SQLite | — | Database (one `.db` file per profile) |
| Pydantic v2 | ^2 | Request validation and response serialization |
| APScheduler | ^3.10 | Background scheduler (price updates, snapshots, exchange sync) |
| yfinance | ^0.2 | Yahoo Finance stock prices |
| CCXT | ^4 | Unified crypto exchange API |
| web3 | ^6 | Ethereum / EVM RPC calls for on-chain balances |
| python-dotenv | ^1.0 | Environment variable loading |
| uvicorn | ^0.23 | ASGI server |

---

## 📁 Project Structure

```
personal-asset-dash/
├── backend/
│   ├── main.py                 # App entry: CORS, router mounts, lifespan, schema migration
│   ├── models.py               # SQLAlchemy ORM models (9 tables)
│   ├── schemas.py              # Pydantic v2 request / response types
│   ├── crud.py                 # Low-level DB CRUD operations
│   ├── service.py              # Business logic: price fetching, alerts, net worth snapshots
│   ├── database.py             # Engine setup, Session, WAL mode, profile reconnect
│   ├── profile_manager.py      # Multi-profile management (config.json + per-profile SQLite files)
│   ├── scheduler.py            # APScheduler job definitions
│   ├── routers/                # 12 router modules (feature-oriented)
│   │   ├── dashboard.py        # GET /api/dashboard/ — aggregated asset summary
│   │   ├── assets.py           # CRUD /api/assets/*
│   │   ├── transactions.py     # CRUD /api/transactions/* + POST /transfer
│   │   ├── stats.py            # History, risk metrics, asset-level history, forecast
│   │   ├── goals.py            # CRUD /api/goals/
│   │   ├── alerts.py           # CRUD /api/alerts/
│   │   ├── budgets.py          # CRUD /api/budgets/categories
│   │   ├── income.py           # CRUD /api/income/items
│   │   ├── settings.py         # GET/PUT /api/settings/{key} — key-value system settings
│   │   ├── system.py           # Backup, CSV export, reset, seed, profile management
│   │   ├── integrations.py     # Exchange / wallet connection management
│   │   └── ws.py               # WebSocket /api/ws — real-time price push
│   └── services/               # External integrations (each independently encapsulated)
│       ├── exchange_rate_service.py  # USDT/TWD rate via MAX API + DB cache
│       ├── max_service.py            # MAX Exchange position sync
│       ├── binance_service.py        # Binance position sync
│       ├── exchange_service.py       # CCXT coordinator (Pionex etc.)
│       ├── pionex_service.py         # Pionex-specific logic
│       └── wallet_service.py         # Web3 EVM wallet balance scan
│
├── frontend/
│   ├── app/                    # Next.js App Router (folder = route)
│   │   ├── page.tsx            # Home / Dashboard (Server Component, SSR)
│   │   ├── analytics/          # Risk metrics + net worth trend + monthly P&L
│   │   ├── assets/             # All assets list + add/edit
│   │   ├── stock/              # Stock portfolio management
│   │   ├── crypto/             # Crypto holdings across all exchanges
│   │   ├── expenses/           # Budget planner
│   │   ├── history/            # Transaction history
│   │   ├── calendar/           # Financial calendar (transactions by date)
│   │   └── settings/           # App settings
│   ├── components/             # Reusable React components
│   │   ├── DashboardClient.tsx      # Main dashboard (Client Component)
│   │   ├── AssetAccordion.tsx       # Collapsible asset cards with DnD sorting
│   │   ├── AssetActionDialog.tsx    # Multi-mode dialog (view/edit/adjust/transfer)
│   │   ├── NetWorthTrendChart.tsx   # Net worth line chart (Recharts)
│   │   ├── MonthlyChangeChart.tsx   # Monthly P&L bar chart
│   │   ├── AssetAllocationWidget.tsx # Portfolio donut chart
│   │   ├── GoalWidget.tsx           # Goal progress + projected milestone
│   │   ├── WealthSimulatorWidget.tsx # Compound interest projector
│   │   ├── RiskMetricsWidget.tsx    # CAGR / Max Drawdown / Volatility
│   │   ├── EmergencyFundWidget.tsx  # Financial runway calculator
│   │   ├── IntegrationManager.tsx   # Exchange / wallet connection management
│   │   ├── ProfileSwitcher.tsx      # Multi-profile switcher
│   │   └── ui/                      # shadcn/ui base components + MoneyInput
│   ├── lib/
│   │   ├── api.ts              # All API calls (single data layer)
│   │   ├── hooks.ts            # SWR hooks (useDashboard, useGoals, …)
│   │   ├── types.ts            # Shared TypeScript interfaces
│   │   └── constants.ts        # Shared constants (CATEGORY_COLOR_MAP, …)
│   └── src/i18n/
│       └── dictionaries.ts     # EN + ZH-TW translation dictionaries
│                               # + _AssertSymmetry compile-time guard
│
├── scripts/
│   ├── dev.sh                  # Development mode (hot reload)
│   ├── prod.sh                 # Production build and start
│   ├── deploy.sh               # systemd service deployment
│   ├── update.sh               # git pull + rebuild + restart (used by CI/CD runner)
│   ├── stop.sh                 # Stop all services
│   ├── status.sh               # Show service status
│   └── logs.sh                 # Tail logs
│
├── ARCHITECTURE.md             # Full architecture deep-dive
├── CHANGELOG.md                # Version history
└── README.md
```

---

## � Docker (Recommended)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) with Compose plugin (Docker Desktop or Docker Engine 20.10+)

```bash
git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
cd Personal-Asset-Dash
docker compose up --build
```

- **Dashboard** → http://localhost:3001
- **API docs** → http://localhost:8000/docs

All data (SQLite DB + config) is stored in the `yantage_data` named volume and survives container rebuilds.

**Common commands:**

| Command | Purpose |
|---|---|
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop |
| `docker compose down -v` | Stop and **wipe data** ⚠️ |
| `docker compose build --no-cache` | Force full rebuild |
| `docker compose logs -f` | Tail logs |
| `docker compose pull && docker compose up -d --build` | Update to latest |

**Migrate existing data into Docker:**
```bash
# Copy your current SQLite DB into the volume
docker run --rm -v yantage_data:/data -v "$(pwd)/backend":/src alpine \
  sh -c "cp /src/sql_app*.db /src/config.json /data/ 2>/dev/null; echo done"
```

---

## 🚀 Quick Start (without Docker)

### Option A — Scripts

**Development mode** (hot reload, no build step):
```bash
./scripts/dev.sh
```

**Production mode** (full optimized build):
```bash
./scripts/prod.sh
```

**Other management commands:**

| Command | Purpose |
|---|---|
| `./scripts/stop.sh` | Stop all services |
| `./scripts/logs.sh` | Tail live logs |
| `./scripts/status.sh` | Check service status |
| `./scripts/update.sh` | `git pull` + rebuild + restart |
| `./scripts/deploy.sh` | Install and enable systemd services |

### Option B — Manual Setup

**Prerequisites:** Python 3.8+, Node.js 18+

```bash
# 1. Clone
git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
cd Personal-Asset-Dash

# 2. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env          # optional: customize CORS / log level

# 3. Frontend
cd ../frontend
npm install

# 4. Start (two terminals)
# Terminal 1 — backend
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open the app at **http://localhost:3000** — API docs at **http://localhost:8000/docs**

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Docker value | Description |
|---|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:3000` | `http://localhost:3001` | CORS allowed origins (comma-separated) |
| `LOG_LEVEL` | `INFO` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `YANTAGE_DATA_DIR` | *(backend dir)* | `/data` | Directory for SQLite DB files + config.json |

> In Docker, these are set in `docker-compose.yml`. For non-Docker, create `backend/.env` based on `backend/.env.example`.

### Integrations (Settings page)

| Integration | What it sync |
|---|---|
| MAX Exchange | Crypto positions + trade history (read-only API key) |
| Binance | Spot balances (read-only API key) |
| Pionex | Positions via CCXT (read-only API key) |
| EVM Wallet | On-chain balances via public RPC — Ethereum, Scroll, BSC |

### Multiple Profiles

Each profile uses its own independent SQLite database file (`sql_app.db`, `sql_app_family.db`, …). Switch profiles from the Settings page or via `POST /api/system/profile/switch`.

---

## 🖧 Deployment

### Docker (Recommended)

See the [Docker](#-docker-recommended) section above. Use `docker compose up -d` for production.

### Systemd (Non-Docker Self-Hosting)

Run `./scripts/deploy.sh` to install and enable systemd services. See [ARCHITECTURE.md](ARCHITECTURE.md) for example unit file configurations.

### Nginx + Cloudflare Tunnel

```
Internet → Cloudflare Tunnel (TLS) → Nginx (reverse proxy)
              ├── /        → Next.js  :3001
              └── /api     → FastAPI  :8000
```

> **Important:** WebSocket must be explicitly proxied in Nginx:
> ```nginx
> location /api/ws {
>     proxy_pass         http://127.0.0.1:8000/api/ws;
>     proxy_http_version 1.1;
>     proxy_set_header   Upgrade $http_upgrade;
>     proxy_set_header   Connection "upgrade";
>     proxy_read_timeout 3600s;
> }
> ```

### CI/CD (GitHub Actions Self-Hosted Runner)

Push to `main` automatically triggers `scripts/update.sh` on the server via a self-hosted runner. No SSH keys or open ports required. Manual trigger also available via `workflow_dispatch`.

### Database Backup

```bash
# crontab -e — daily backup at 2 AM, keep 30 days
0 2 * * * sqlite3 /path/to/backend/sql_app.db ".backup /backup/sql_app_$(date +%Y%m%d).db"
0 2 * * * find /backup -name "sql_app_*.db" -mtime +30 -delete
```

---

## 🔄 Real-Time Update Flow

```
APScheduler (background thread, configurable interval — default 60 min)
  └─ run_price_updates()
       ├─ Fetch stock prices    (yfinance, exponential-backoff retry)
       ├─ Fetch crypto prices   (CCXT/Binance, retry)
       ├─ Sync exchange positions (MAX / Binance / Pionex)
       ├─ Scan wallet balances  (Web3 RPC)
       ├─ Check price alerts    (trigger if threshold crossed)
       ├─ Write net_worth_history snapshot
       └─ Broadcast {"type":"prices_updated"} via WebSocket
             └─ Frontend useRealtimeUpdates()
                   └─ SWR mutate() → UI refreshes automatically (no polling)
```

---

## 📖 Documentation

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Data flow, DB schema, deployment guide, security analysis, known issues, optimization roadmap |
| [CHANGELOG.md](CHANGELOG.md) | Full version history |
| [backend/README.md](backend/README.md) | Backend-specific notes |
| [frontend/README.md](frontend/README.md) | Frontend-specific notes |
| http://localhost:8000/docs | Interactive API reference (when running) |

---

## 📜 License

MIT — free to use, modify, and distribute.
