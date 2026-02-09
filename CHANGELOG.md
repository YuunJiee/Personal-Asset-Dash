# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-02-10

### ✨ Added
- **Management Scripts Suite**: Created comprehensive `scripts/` directory containing:
  - `dev.sh`: Development mode with hot-reloading (fast iteration).
  - `prod.sh`: Production mode (build & run).
  - `deploy.sh`: Automated Systemd service deployment.
  - `update.sh`: One-click update (git pull + rebuild + restart).
  - `stop.sh`, `status.sh`, `logs.sh`: Service management utilities.
- **Enhanced Documentation**: Updated `README.md` and `README_TW.md` with detailed script usage instructions.

### 🔧 Changed
- **Sidebar Renaming**:
  - "Calendar" → "Financial Calendar" (財務日曆)
  - "Assets" → "All Assets" (所有資產)
- **Version Update**: Bumped application version to v2.1.

### 🐛 Fixed
- **Chart Sizing**: Fixed `width(-1)` errors in Recharts by adding `min-w-0` to containers.
- **Backend Startup**: Resolved `ImportError` in startup scripts by correctly setting `PYTHONPATH`.
- **Systemd Conflicts**: Updated scripts to automatically handle conflicts with running systemd services.

## [2.0.0] - 2026-02-09

### 🚨 Breaking Changes

- **Page Restructure**: Split `/investments` page into separate `/stock` and `/crypto` pages
  - Users will need to update bookmarks
  - Navigation structure has changed
- **Asset Classification**: Refactored asset categorization system with new subcategories
  - Existing assets may display differently
- **Integration Architecture**: Migrated from single MAX integration to multi-integration system
  - Users must reconfigure integrations via new Integration Manager
- **Settings API**: Removed deprecated API key settings from Settings page
  - Use Integration Manager instead

### ✨ Added

#### Multi-Integration System
- Pionex Exchange integration with auto-sync support
- Web3 wallet integration (Ethereum, Scroll, BSC networks)
- Centralized Integration Manager UI for managing all connections
- Support for multiple simultaneous exchange and wallet connections

#### Financial Planning Tools
- **Wealth Simulator**: Project future wealth based on monthly contributions and expected returns
- **Emergency Fund Widget**: Calculate financial survival time based on liquid assets and monthly expenses

#### New Pages
- `/stock` - Dedicated stock portfolio management page with detailed performance metrics
- `/crypto` - Specialized cryptocurrency tracking page with multi-exchange aggregation

#### Components
- `IntegrationManager.tsx` - Centralized integration management interface
- `IntegrationDialog.tsx` - Dialog for adding/editing integrations
- `WealthSimulatorWidget.tsx` - Interactive wealth projection tool
- `EmergencyFundWidget.tsx` - Financial runway calculator
- `PortfolioAllocation.tsx` - Enhanced portfolio visualization

#### Backend Services
- `exchange_service.py` - Exchange service coordinator
- `pionex_service.py` - Pionex exchange integration
- `wallet_service.py` - Web3 wallet integration
- `integrations.py` router - API endpoints for integration management

### 🔧 Changed

#### Backend
- Standardized logging system across all services (replaced `print` with `logging` module)
- Added environment variable support via `.env` file
- Updated `requirements.txt` with version constraints
- Centralized logging configuration in `main.py`
- CORS configuration now supports environment variables
- Enhanced `max_service.py` with better error handling

#### Frontend
- Simplified Settings page with integration-focused UI
- Updated sidebar navigation structure (new Portfolio and Crypto sections)
- Refined asset accordion with improved expand/collapse UX
- Enhanced chart visualizations across all widgets
- Improved goal tracking and rebalancing widgets
- Better error handling in API calls
- Updated i18n dictionaries with new translation keys

#### Dependencies
- Next.js upgraded to v16
- TailwindCSS upgraded to v4
- Added `web3>=6.0.0`
- Added `requests>=2.31.0`
- Added `python-dotenv>=1.0.0`

### 🐛 Fixed

- Removed duplicate `start_scheduler_service` function in `main.py`
- Fixed duplicate `SessionLocal` import in `scheduler.py`
- Removed all debug `console.log` statements from frontend
- Removed unnecessary `console.error` calls
- Fixed asset categorization logic inconsistencies

### 🗑️ Removed

- Deleted `/investments` page (split into `/stock` and `/crypto`)
- Removed deprecated API key settings from Settings page
- Removed temporary migration scripts from repository
- Cleaned up unused debug code

### 📚 Documentation

- Updated README.md with modern design highlights and v2.0.0 features
- Updated README_TW.md with Traditional Chinese translations
- Created `.env.example` template for environment configuration
- Added comprehensive configuration guide
- Enhanced feature descriptions and installation instructions

### 🔒 Security

- API keys now managed through secure Integration Manager
- Environment variables support for sensitive configuration
- Improved CORS configuration options

---

## [1.0.0] - 2026-01-30

### ✨ Added

- Initial release of Yantage Personal Asset Dashboard
- Multi-category asset tracking (Liquid, Investments, Fixed, Receivables, Liabilities)
- MAX Exchange integration for Taiwan crypto market
- Real-time price updates for stocks (Taiwan/US) and cryptocurrencies
- Financial planning tools:
  - Goal tracking for FIRE targets
  - Budget management with visual progress
  - Net worth trend analysis
- Analytics dashboard with interactive charts
- Asset allocation visualization
- Rebalancing suggestions
- Bilingual support (English/Traditional Chinese)
- Dark mode support
- 100% local storage with SQLite database
- Privacy-focused design (no cloud sync, no tracking)

### 🛠️ Tech Stack

- Frontend: Next.js 15, Shadcn/UI, TailwindCSS, Recharts
- Backend: FastAPI, SQLAlchemy, APScheduler
- Database: SQLite

---

## Links

- [Repository](https://github.com/YuunJiee/Personal-Asset-Dash)
- [Issues](https://github.com/YuunJiee/Personal-Asset-Dash/issues)
- [Releases](https://github.com/YuunJiee/Personal-Asset-Dash/releases)
