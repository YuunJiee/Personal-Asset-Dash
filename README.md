# Yantage — Personal Asset Dashboard

Self-hosted personal finance dashboard. Track net worth across every asset class, connect to exchanges and on-chain wallets, and get portfolio analytics — all with local SQLite storage and zero cloud dependency.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## Features

- **6 asset categories**: Fluid, Stock, Crypto, Fixed Assets, Receivables, Liabilities
- **Real-time prices**: Taiwan/US stocks via Yahoo Finance, crypto via Binance CCXT
- **Exchange sync**: MAX, Binance, Pionex — auto-sync balances with read-only API keys
- **On-chain wallets**: Ethereum, Scroll, BSC via direct RPC (no third-party API)
- **Analytics**: Net worth trend, monthly P&L, CAGR, Max Drawdown, Volatility
- **Goal tracking**: FIRE target with projected date, asset allocation targets
- **Budget planner**: Monthly limits, progress bars, income tracking
- **Price alerts**: Trigger automatically after each price update cycle
- **Multiple profiles**: Each profile uses its own independent SQLite DB
- **Bilingual UI**: English + Traditional Chinese
- **Privacy mode**: One-click mask of all monetary values
- **PWA support**: Installable as desktop or mobile app

---

## Docker (Recommended)

**Prerequisites:** Docker with Compose plugin (Docker Desktop or Engine 20.10+)

```bash
git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
cd Personal-Asset-Dash
docker compose up --build
```

- **Dashboard** → http://localhost:3001
- **API docs** → http://localhost:8000/docs

Data is stored in the `yantage_data` named volume and survives container rebuilds.

| Command | Purpose |
|---|---|
| `docker compose up -d` | Start in background |
| `docker compose down` | Stop |
| `docker compose down -v` | Stop and **wipe data** ⚠️ |
| `docker compose logs -f` | Tail logs |
| `./scripts/update.sh` | `git pull` + rebuild + restart |

**Migrate existing data into Docker:**
```bash
docker run --rm -v yantage_data:/data -v "$(pwd)/backend":/src alpine \
  sh -c "cp /src/sql_app*.db /src/config.json /data/ 2>/dev/null; echo done"
```

---

## Dev Setup (without Docker)

**Prerequisites:** Python 3.8+, Node.js 18+

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Or use `./scripts/dev.sh` to start both with hot reload.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins (comma-separated) |
| `LOG_LEVEL` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `YANTAGE_DATA_DIR` | *(backend dir)* | Directory for SQLite DB files + config.json |

In Docker these are set in `docker-compose.yml`. For local dev, create `backend/.env` from `backend/.env.example`.

---

## Nginx + Cloudflare Tunnel

```
Internet → Cloudflare Tunnel (TLS) → Nginx (reverse proxy)
              ├── /        → Next.js  :3001
              └── /api     → FastAPI  :8000
```

---

## License

MIT — free to use, modify, and distribute.
