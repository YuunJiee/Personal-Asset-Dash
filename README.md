# Yantage 💰 - Personal Asset Dashboard

**Yantage** is a privacy-focused personal finance management tool designed to help you track your net worth, manage assets across multiple categories, and achieve financial independence. Built with a "fuzzy accounting" philosophy, it focuses on high-level asset tracking without the burden of logging every transaction.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)

> English Version | [繁體中文版](README_TW.md)

---

## 💡 Inspiration

This project was inspired by [Percento](https://www.percento.app/cn/), a beautifully designed personal finance app. While Percento offers an excellent user experience, I wanted to create a tool that:
- **Prioritizes Privacy**: 100% local data storage with no cloud dependency
- **Fits My Workflow**: Features tailored to my personal finance management needs
- **Supports Taiwan Market**: Native integration with Taiwan stock market and MAX Exchange
- **Remains Open Source**: Free for anyone to use, modify, and learn from

This is a passion project built to solve my own financial tracking challenges, and I hope it helps others too!

---

## ✨ Key Features

### 🎨 **Modern, Minimalist Design**
- **Soft Color Palette**: Calming mint green, beige, and blue-gray tones
- **Clean Typography**: Easy-to-read interface with clear visual hierarchy
- **Dark Mode Support**: Seamless theme switching for comfortable viewing
- **Responsive Layout**: Optimized for desktop and mobile devices

### 📊 **Comprehensive Asset Management**
- **Multi-Category Tracking**: Manage assets across 5 categories (Liquid, Investments, Fixed, Receivables, Liabilities)
- **Real-Time Valuation**: Auto-fetch prices for stocks (Taiwan/US via Yahoo Finance) and crypto (via CCXT/MAX)
- **MAX Exchange Integration**: Auto-sync balances and trade history with read-only API access
- **Expandable Asset Cards**: Drill down into individual holdings with a single click

### 🎯 **Financial Planning Tools**
- **Goal Tracking**: Visual progress bars for FIRE (Financial Independence, Retire Early) targets
- **Smart Budget Management**: Track monthly spending with pacing indicators (on track, over budget, under budget)
- **Wealth Simulator**: Project future wealth based on contributions and expected returns
- **Emergency Fund Check**: Calculate financial survival time based on liquid assets

### 📈 **Analytics & Insights**
- **Net Worth Trends**: Historical tracking with interactive charts and multiple timeframes (30D, 3MO, 6MO, 1Y, ALL)
- **Asset Allocation**: Visualize portfolio distribution with donut charts
- **Rebalancing Suggestions**: Maintain target asset allocation with actionable recommendations
- **Top Performers**: Track best/worst performing assets with percentage gains/losses

### 🔒 **Privacy First**
- **100% Local Storage**: All data stored in local SQLite database
- **No Cloud Sync**: Your financial data never leaves your machine
- **Secure API Keys**: Encrypted storage in local database
- **No Tracking**: No analytics, no telemetry, no data collection

---

## 🚀 Quick Start

### Development Mode (Fast Iteration)
Use this for coding and testing changes without rebuilding. Hot-reloading is enabled.
```bash
./scripts/dev.sh
```

### Production Mode (Full Build)
Use this to build and deploy the application.
```bash
./scripts/prod.sh
```

### Management Scripts
- **Stop All**: `./scripts/stop.sh`
- **View Logs**: `./scripts/logs.sh`
- **Check Status**: `./scripts/status.sh`
- **Update App**: `./scripts/update.sh`
- **Deploy (Systemd)**: `./scripts/deploy.sh`

### Manual Setup


### Prerequisites
- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
   cd Personal-Asset-Dash
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Optional: Copy environment template
   cp .env.example .env
   # Edit .env to customize configuration (e.g., CORS origins)
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the Application**
   ```bash
   # Backend (from backend directory)
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend (from frontend directory, in a new terminal)
   npm run dev
   ```

5. **Access the Application**
   - **Frontend**: http://localhost:3000
   - **API Docs**: http://localhost:8000/docs

### Environment Variables (Optional)

The backend supports configuration via `.env` file. Available variables:

- `ALLOWED_ORIGINS`: CORS allowed origins, comma-separated (default: `http://localhost:3000`)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL, default: INFO)

Example `.env` file is provided at `backend/.env.example`. See configuration guide for details.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: Shadcn/UI + TailwindCSS 4
- **Charts**: Recharts
- **State**: React Server Components + Client Hooks
- **i18n**: Custom dictionary-based translation (EN/ZH-TW)
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Database**: SQLite + SQLAlchemy ORM
- **Scheduler**: APScheduler (background price updates)
- **Services**: 
  - `MAXService`: Exchange integration with HMAC authentication
  - `WalletService`: Web3 integration for on-chain balances
  - `MarketService`: Real-time price fetching via yfinance and CCXT

---

## 📁 Project Structure

```
personal-asset-dash/
├── backend/              # FastAPI backend
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── .env.example      # Environment template
│   └── README.md         # Backend documentation
├── frontend/             # Next.js frontend
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and API client
│   └── README.md         # Frontend documentation
├── screenshots/          # Application screenshots
├── .gitignore            # Git ignore rules
└── start.sh              # Startup script
```

---

## 🔑 Configuration

### Backend Setup
1. Navigate to Settings page
2. Configure integrations (optional):
   - **MAX Exchange**: Enter API Key and Secret for auto-sync
   - **Wallet Addresses**: Add Ethereum, Scroll, or BSC addresses for on-chain tracking

### Environment Variables
See `backend/.env.example` for available configuration options.

---

## 📖 Documentation

- **Backend API**: See [backend/README.md](backend/README.md)
- **Frontend Components**: See [frontend/README.md](frontend/README.md)
- **API Reference**: http://localhost:8000/docs (when running)
- **Configuration Guide**: See `configuration_guide.md` in artifacts

---

## 🌍 Language Support

The application supports:
- 🇺🇸 English
- 🇹🇼 Traditional Chinese (繁體中文)

Switch languages in the Settings page.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

MIT License - see LICENSE file for details.

---

## ⚠️ Disclaimer

This tool is for personal financial tracking only. It does not provide financial advice. Always consult with a qualified financial advisor before making investment decisions.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [FastAPI](https://fastapi.tiangolo.com/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- Charts by [Recharts](https://recharts.org/)
- Developed with assistance from AI pair programming tools

---

## 📞 Contact

Questions or suggestions? Feel free to open an Issue or Pull Request!