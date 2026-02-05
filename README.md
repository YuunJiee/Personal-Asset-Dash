# Yantage 💰 - Personal Asset Dashboard

**Yantage** is a privacy-focused personal finance management tool designed to help you track your net worth, manage assets across multiple categories, and achieve financial independence. Built with a "fuzzy accounting" philosophy, it focuses on high-level asset tracking without the burden of logging every transaction.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
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

## 📸 Screenshots

### Dashboard
![Dashboard](./screenshots/dashboard.png)

### Assets Management
![Assets](./screenshots/assets.png)

### Investment Tracking
![Investments](./screenshots/investments.png)

### Analytics
![Analytics](./screenshots/analytics.png)

### Transaction History
![History](./screenshots/history.png)

### Financial Calendar
![Calendar](./screenshots/calendar.png)

### Expense Tracking
![Expenses](./screenshots/expenses.png)

### Settings & Tools
![Settings](./screenshots/settings.png)

### Dark Mode (Traditional Chinese)
![Dark Mode](./screenshots/dashboard_dark_TW.png)

---

## ✨ Features

### 📊 **Comprehensive Asset Management**
- **Multi-Category Tracking**: Manage assets across 5 categories (Liquid, Investments, Fixed, Receivables, Liabilities)
- **Real-Time Valuation**: Auto-fetch prices for stocks (Taiwan/US via Yahoo Finance) and crypto (via CCXT/MAX)
- **MAX Exchange Integration**: Auto-sync balances and trade history with read-only API access

### 🎯 **Financial Planning Tools**
- **Wealth Simulator**: Project future wealth based on contributions and expected returns
- **Emergency Fund Check**: Calculate financial survival time based on liquid assets
- **Goal Tracking**: Set and monitor FIRE (Financial Independence, Retire Early) targets
- **Budget Management**: Visual progress tracking for monthly budgets

### 📈 **Analytics & Insights**
- **Net Worth Trends**: Historical tracking with interactive charts
- **Asset Allocation**: Visualize portfolio distribution
- **Rebalancing Suggestions**: Maintain target asset allocation
- **Top Performers**: Track best/worst performing assets

### 🔒 **Privacy First**
- **100% Local Storage**: All data stored in local SQLite database
- **No Cloud Sync**: Your financial data never leaves your machine
- **Secure API Keys**: Encrypted storage in local database

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** (for backend)
- **Node.js 18+** (for frontend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
   cd Personal-Asset-Dash
   ```

2. **Run the startup script**
   ```bash
   ./start.sh
   ```
   This script will:
   - Create Python virtual environment
   - Install backend dependencies
   - Install frontend dependencies
   - Start both servers concurrently

3. **Access the application**
   - **Frontend**: http://localhost:3000
   - **API Docs**: http://localhost:8000/docs

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: Shadcn/UI + TailwindCSS
- **Charts**: Recharts
- **State**: React Server Components + Client Hooks
- **i18n**: Custom dictionary-based translation (EN/ZH-TW)

### Backend
- **Framework**: FastAPI
- **Database**: SQLite + SQLAlchemy ORM
- **Scheduler**: APScheduler (background price updates)
- **Services**: 
  - `MAXService`: Exchange integration with HMAC authentication
  - `MarketService`: Real-time price fetching

---

## 📁 Project Structure

```
personal-asset-dash/
├── backend/              # FastAPI backend
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   └── README.md         # Backend documentation
├── frontend/             # Next.js frontend
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── src/i18n/         # Translations
│   └── README.md         # Frontend documentation
├── .gitignore            # Root ignore rules
└── start.sh              # Startup script
```

---

## 🔑 Configuration

### Backend Setup
1. Navigate to Settings page
2. Configure MAX Exchange API (optional):
   - Enter API Key
   - Enter API Secret
   - Click "Sync MAX Assets"

### Environment Variables
See `.env.example` for available configuration options.

---

## 📖 Documentation

- **Backend API**: See [backend/README.md](backend/README.md)
- **Frontend Components**: See [frontend/README.md](frontend/README.md)
- **API Reference**: http://localhost:8000/docs (when running)

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
- Developed with assistance from AI pair programming tools