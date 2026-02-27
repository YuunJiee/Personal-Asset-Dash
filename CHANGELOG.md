# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-02-27

### ✨ Added

- **Skeleton Loading System** — fully consistent loading UX across all pages
  - New shared variants in `components/ui/skeleton.tsx`: `PageHeaderSkeleton`, `TableRowSkeleton`, `BudgetRowSkeleton`
  - Applied to all 6 pages (`assets`, `crypto`, `history`, `calendar`, `expenses`, `stock`); all now show layout-accurate shimmer instead of a blank screen
  - Replaced all ad-hoc `animate-pulse` inline divs in `assets` and `crypto` pages with the shared `PageHeaderSkeleton`
- **Toast Notification System** — `components/ui/toast.tsx`
  - `ToastProvider` + `useToast()` hook with enter/exit animation
  - Wired into `ClientLayout`; used in `AddAssetDialog`, `TradeDialog`, `assets/page` for CRUD feedback
- **Empty State Component** — `components/EmptyState.tsx`; shown in `assets/page` when no assets exist

### ♻️ Refactored

- **Analytics page responsibility split** — removed `PortfolioAllocation × 2`, `TopPerformersWidget`, `TopMovers` (duplicate of Stock page); Analytics now focuses on historical reports: `RiskMetricsWidget` + `NetWorthTrendChart` + `MonthlyChangeChart` + PDF export
- **`EditAssetView.tsx` fully typed**
  - `asset: any` prop → `Asset | null`; formData state given explicit generic
  - Added `null` guards in `handleDelete` / `handleSubmit`
  - Fixed dead `'Investment'` category comparison (correct union: `'Stock' | 'Crypto'`)
  - Fixed `subCategories` map to match actual `Asset['category']` union
  - Fixed `manual_avg_cost` cast: `|| null` → `Number(x) : null`
- **`GlobalThemeProvider.tsx`** — exported `ThemeName` type; `settings/page.tsx` replaced `as any` with `as ThemeName`

### 🌐 i18n

- **Full bilingual audit**: found and fixed 23 asymmetric translation keys between EN and ZH-TW
  - 13 keys missing from ZH-TW (integration providers, sub-categories)
  - 10 keys missing from EN (table headers, favorites, price columns)
  - 10 new UI keys added to both languages: `export_pdf`, `asset_created`, `asset_create_failed`, `asset_deleted`, `delete_failed`, `trade_success`, `trade_failed`, `invalid_qty_price`, `no_assets_found`, `no_assets_desc`
- **`_AssertSymmetry` compile-time guard** added at bottom of `dictionaries.ts` — TypeScript error on any missing ZH-TW key
- **JSDoc** added to `dictionaries.ts` explaining how to add new keys and new languages
- Normalized two quoted keys (`'confirm_delete'`, `'sync_includes_scan'`) to unquoted in ZH-TW section
- Eliminated all `t(x as any)` casts (13 files, ~25 occurrences) — `t()` already accepts `string`

### 🐛 Fixed

- `PortfolioAllocation` prop type: `assets: any[]` → `Asset[]`; added `connection?: { id, name, provider }` to `lib/types.ts`
- `MonthlyChangeChart` temporal dead zone crash on mount

### 🔒 Type Safety

- Global `as any` count reduced to **2** (both in `IconPicker.tsx` for dynamic Lucide icon lookup — unavoidable)
- Full-project `npx tsc --noEmit` → **0 errors**

---

## [2.4.0] - 2026-02-23

### ✨ Added

- **Asset Allocation Goals**: Replaced `MONTHLY_SPENDING` goal type with a new `ASSET_ALLOCATION` type
  - Set target percentages for multiple asset categories (Fluid, Stock, Crypto, Fixed, Receivables) that must sum to 100%
  - Multi-row editor in GoalDialog with live total badge (green = 100%, red = off)
  - Dynamically add / remove category rows
  - GoalWidget shows per-category progress bars with target marker lines and diff indicators (+/-%)
  - Overall **Balanced / Off-Balance** badge when all categories are within ±5% of target
  - Data stored as JSON in existing `description` field — no DB schema change required
- **Delete Goal button** added to GoalDialog (trash icon on lower-left when editing)

### 🔧 Fixed

- **`crud.py`**: Added missing `delete_goal()` function (caused `AttributeError` when deleting goals)
- **`crud.py`**: Removed orphaned `return db_alert` line inside `get_active_alerts()` body
- **`AddAssetDialog.tsx`**: Removed all leftover Tag-related code (state, handlers, `tags` API payload, UI) from the Tag-removal refactor
- **`createTransaction`**: Added missing required `date` field (`new Date().toISOString()`) in initial balance transaction call
- **GoalDialog layout**: Fixed `%` label and delete button overlapping the number Input (switched to `absolute` positioning inside a `relative` wrapper)
- **`types.ts`**: Updated `Goal.goal_type` union from `MONTHLY_SPENDING` → `ASSET_ALLOCATION`

---

## [2.3.0] - 2026-02-22


### ✨ Added

- **Budget Planner** (`/expenses`): Replaced Fixed Expenses tracker with a full Budget Category Manager
  - Color-coded budget category cards with emoji icons and monthly budget amounts
  - Progress bar showing each category's proportion of total budget
  - Total monthly budget summary card
  - Add / Edit / Delete categories via dialog
  - Demo seed data: 6 default Chinese budget categories (食物, 交通, 娛樂, 房租, 醫療, 訂閱)
  - New backend model `BudgetCategory`, Pydantic schemas, CRUD, and `/api/budgets/` router

### 🔧 Fixed

- **CSV Export**: `GET /api/system/export/csv` was using `FileResponse` for in-memory data (always crashed). Fixed to use `Response` with correct `Content-Disposition` header
- **System Reset**: `DELETE /api/system/reset` no longer attempts to `DELETE FROM expenses`, `asset_tags`, or `tags` (tables that no longer exist)
- **System Seed**: `POST /api/system/seed` no longer creates `Expense` or `Tag` objects; seeds `BudgetCategory` instead
- **Scheduler**: Removed stale `pionex_service` import; `run_pionex_sync` now calls `exchange_service.sync_all_exchanges()`
- **Stats**: Removed duplicate `import math` in `stats.py`
- **i18n**: Removed duplicate keys (`per_month_suffix`, budget form shared keys) that caused TypeScript errors

### ♻️ Refactored

- **`stats.py`**: Extracted two module-level helpers:
  - `parse_range(range)` – shared date range parser (removes duplicated if/elif blocks from both endpoints)
  - `fetch_yahoo_history(symbols, start_date)` – single yfinance downloader shared by both `/history` and `/asset/{id}/history`
- **`stats.py`**: Replaced `asset.yf_ticker` monkey-patch on SQLAlchemy model with a local `yf_ticker_map: dict[int, str]`
- **`system.py`**: Consolidated all imports to top of file (removed mid-file scattered `from x import y` blocks)

### 🗑️ Removed

- Removed `Expense` model, schemas, CRUD functions, and `/api/expenses/` router

---

## [2.2.0] - 2026-02-15

### ✨ Enhanced
- **Visual Polish**:
  - Updated **Fixed Assets** color to Teal/Cyan (`#0d9488`) for better distinction.
  - Refined **Currency Display** by removing redundant "TWD" labels in Asset Cards and Dashboard.
  - Shortened "Cryptocurrency" label to "Crypto" (加密) in mobile charts for better fit.
- **UI/UX Improvements**:
  - **Full Width Calendar**: Month navigation now spans full width on mobile for easier access.
  - **Theme Stability**: Fixed "Flash of Unstyled Content" (FOUC) on page refresh.
  - **Dialog Scroll**: Added `max-height` constraints to Transaction History and other dialogs to prevent overflow on small screens.

### 🛡️ Security & Integrity
- **Synced Assets Protection**: Disabled manual "Edit" and "Adjust Balance" for assets managed by integrations (MAX, Pionex, Binance) to prevent sync conflicts.

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
