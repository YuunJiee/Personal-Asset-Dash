# Yantage — Developer Guide & Refactoring Plan

## Project Overview

**Yantage** is a self-hosted personal finance dashboard.
- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend**: Next.js 19 + TypeScript (`frontend/`)
- **Deployment**: Docker Compose (`docker-compose.yml`)
- **Data stays local**: no cloud dependency

---

## Refactoring Goals

The codebase is functional but suffers from three recurring problems:

1. **Business logic lives in the wrong layer** — route handlers compute CAGR, do currency conversion, dispatch exchange syncs. Routers should only handle HTTP.
2. **Duplicated logic** — `is_usd` detection is copy-pasted verbatim across 3+ files. Same masking logic repeated in two route handlers.
3. **No shared contracts** — exchange providers (Binance, MAX, Pionex, Wallet) each have unique function signatures with no common interface.

---

## Target Architecture

```
backend/
├── models.py          # SQLAlchemy ORM only (no logic)
├── schemas.py         # All Pydantic schemas (including connection schemas)
├── database.py        # DB session / engine
├── main.py            # App factory, router registration
├── scheduler.py       # APScheduler jobs
│
├── repositories/      # NEW — data access layer (replaces crud.py)
│   ├── asset_repo.py
│   ├── goal_repo.py
│   ├── alert_repo.py
│   └── budget_repo.py
│
├── services/
│   ├── price_service.py          # fetch_stock_price, fetch_crypto_price, update_prices
│   ├── analytics_service.py      # NEW — CAGR, max drawdown, volatility, forecasts
│   ├── snapshot_service.py       # NEW — snapshot_net_worth (extracted from service.py)
│   ├── alert_service.py          # NEW — check_alerts (extracted from service.py)
│   ├── dashboard_service.py      # NEW — calculate_dashboard_metrics
│   ├── exchange_rate_service.py  # Already exists, keep
│   │
│   └── providers/                # NEW — exchange provider abstraction
│       ├── base.py               # ExchangeProvider ABC
│       ├── binance.py            # (rename from binance_service.py)
│       ├── max.py                # (rename from max_service.py)
│       ├── pionex.py             # (rename from pionex_service.py)
│       └── wallet.py             # (rename from wallet_service.py)
│
└── routers/           # HTTP only — call services, return responses
    ├── assets.py
    ├── stats.py       # Thin wrappers around analytics_service
    ├── integrations.py
    └── ...
```

---

## Refactoring Tasks (Priority Order)

### Phase 1 — Extract Duplicated Logic (High Impact, Low Risk)

**1.1 Extract `is_usd` detection**

The following 8-line block is copy-pasted in 3 files:
- `crud.py:13-23` (inside `get_asset`)
- `crud.py:56-66` (inside `get_assets`)
- `routers/stats.py:335-345` (inside `get_rebalance_suggestions`)

Target: extract to a free function in a new `backend/utils/currency.py`:

```python
def is_usd_denominated(asset) -> bool:
    if asset.source == 'max':
        return False
    if asset.category == 'Crypto':
        return True
    if asset.category == 'Stock' and asset.ticker:
        if asset.ticker.endswith('.TW') or (asset.ticker.isdigit() and len(asset.ticker) == 4):
            return False
        return True
    return False
```

Replace all three occurrences with a call to this function.

---

**1.2 Extract API key masking**

Duplicated in `routers/integrations.py` (GET handler line ~42 and POST handler line ~70):

```python
def mask_api_key(key: str | None) -> str | None:
    if not key:
        return None
    return f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "****"
```

Move to `backend/utils/masking.py` and replace both call sites.

---

**1.3 Move `ConnectionSchema` / `ConnectionResponse` to `schemas.py`**

Currently defined inside `routers/integrations.py`. These are domain schemas and belong in `schemas.py` alongside all other Pydantic models.

---

### Phase 2 — Service Layer Extraction (Reduces router size)

**2.1 Create `services/analytics_service.py`**

Extract from `routers/stats.py`:
- `safe_float()` → `backend/utils/math.py`
- `parse_range()` → `analytics_service.parse_range()`
- `fetch_yahoo_history()` → `analytics_service.fetch_yahoo_history()`
- The CAGR / max drawdown / volatility calculation in `get_risk_metrics` → `analytics_service.compute_risk_metrics(history)`
- The net worth history build loop in `get_net_worth_history` → `analytics_service.build_net_worth_history(assets, start_date, db)`
- The forecast logic in `get_goal_forecast` → `analytics_service.compute_goal_forecast(db)`

Each route handler becomes a thin wrapper: call the service, return the result.

---

**2.2 Extract `snapshot_service.py` and `alert_service.py`**

From `service.py`:
- `snapshot_net_worth(db)` → `services/snapshot_service.py`
- `check_alerts(db, asset_id, price)` → `services/alert_service.py`
- `get_icon_for_ticker()` → `utils/icons.py`

`service.py` should eventually contain only `calculate_dashboard_metrics` (or be deleted when that moves to `dashboard_service.py`).

---

### Phase 3 — Repository Pattern (Replaces `crud.py`)

`crud.py` is 336 lines of standalone functions. The goal is to group them by domain into classes that take `db` once in `__init__`:

```python
# repositories/asset_repo.py
class AssetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, asset_id: int) -> Asset | None: ...
    def list_all(self, skip=0, limit=100) -> list[Asset]: ...
    def create(self, data: AssetCreate) -> Asset: ...
    def update(self, asset_id: int, data: AssetUpdate) -> Asset | None: ...
    def delete(self, asset_id: int) -> bool: ...
    def update_price(self, asset_id: int, price: float) -> Asset | None: ...
```

Similarly: `GoalRepository`, `AlertRepository`, `BudgetRepository`, `IncomeRepository`.

Callers switch from `crud.get_asset(db, id)` to `AssetRepository(db).get(id)`.

> **Note**: Do this after Phase 1 & 2 — Phase 1/2 reduce the surface area that references `crud`, making Phase 3 a smaller diff.

---

### Phase 4 — Exchange Provider Abstraction

**4.1 Define `ExchangeProvider` ABC**

Create `services/providers/base.py`:

```python
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session

class ExchangeProvider(ABC):
    @abstractmethod
    def sync(self, db: Session) -> bool:
        """Sync balances from exchange to DB. Returns True on success."""
        ...
```

**4.2 Rename + refactor existing services**

| Current file | New file | Public function → class |
|---|---|---|
| `services/binance_service.py` | `services/providers/binance.py` | `sync_binance_assets(db)` → `BinanceProvider().sync(db)` |
| `services/max_service.py` | `services/providers/max.py` | `sync_max_assets(db)` → `MaxProvider().sync(db)` |
| `services/pionex_service.py` | `services/providers/pionex.py` | `sync_pionex_assets(db)` → `PionexProvider().sync(db)` |
| `services/wallet_service.py` | `services/providers/wallet.py` | `sync_wallets(db)` → `WalletProvider().sync(db)` |

**4.3 Replace `sync_provider` if/elif with a registry**

In `routers/integrations.py`:

```python
# Before (fragile — must edit router every time a new provider is added)
if provider == 'max':
    max_service.sync_max_assets(db)
elif provider == 'binance':
    ...

# After
PROVIDERS: dict[str, ExchangeProvider] = {
    "max": MaxProvider(),
    "binance": BinanceProvider(),
    "pionex": PionexProvider(),
    "wallet": WalletProvider(),
}

provider_instance = PROVIDERS.get(provider)
if not provider_instance:
    raise HTTPException(status_code=400, detail="Unknown provider")
provider_instance.sync(db)
```

Adding a new exchange now means creating one new class and adding one line to the registry.

---

### Phase 5 — Proper i18n (Frontend)

**Current state**: Hand-rolled `LanguageContext` + one 1178-line flat dictionary (`src/i18n/dictionaries.ts`). The TypeScript symmetry guard is good and should be preserved. The main pain points:
- All ~400 keys in a single flat file with no namespacing
- `t()` uses `(dict as any)[key]` — loses type narrowing at call sites
- No pluralization or number/date formatting
- No Server Component support

**Target: `next-intl`** — the Next.js App Router-native solution.

> **Why not `react-i18next`?** `next-intl` has first-class App Router / RSC support and an identical `t()` API to what already exists, making the migration mechanical. `react-i18next` would also work, but requires extra client/server wiring.

> **Why not keep the custom approach?** It works, but grows brittle — namespace support, RSC support, and pluralization all require reinventing what `next-intl` already ships.

---

**5.1 Install `next-intl`**

```bash
npm install next-intl
```

---

**5.2 Convert flat dictionary to JSON message files (with namespaces)**

The 400 flat keys become structured JSON files, one per locale:

```
frontend/
└── messages/
    ├── en.json
    └── zh-TW.json
```

Group keys by feature domain (namespace):

```json
// messages/en.json
{
  "nav": {
    "dashboard": "Dashboard",
    "assets": "All Assets",
    "analytics": "Analytics"
  },
  "dashboard": {
    "net_worth": "Net Worth",
    "last_updated": "Last updated"
  },
  "asset": {
    "add": "Add Asset",
    "edit": "Edit Asset"
  },
  "analytics": { ... },
  "budget": { ... },
  "settings": { ... },
  "common": {
    "done": "Done",
    "cancel": "Cancel",
    "save": "Save"
  }
}
```

The `en.json` is the source of truth. `zh-TW.json` mirrors the same structure.

---

**5.3 Configure `next-intl` (no URL locale prefix needed)**

Since this is a personal app with no SEO requirements, use the **without locale in URL** approach — locale is stored in a cookie, not in the URL path. This means **zero route changes**.

Create `frontend/i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh-TW'],
  defaultLocale: 'zh-TW',
  localeDetection: false  // We control locale via cookie / user setting
});
```

Create `frontend/i18n/request.ts` (read locale from cookie):

```ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const locale = (await cookies()).get('app_language')?.value ?? 'zh-TW';
  const validLocales = ['en', 'zh-TW'];
  const resolved = validLocales.includes(locale) ? locale : 'zh-TW';

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
```

Update `frontend/next.config.ts`:

```ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
export default withNextIntl(nextConfig);
```

---

**5.4 Replace `useLanguage()` with `useTranslations()`**

Before (current):
```tsx
const { t, language, setLanguage } = useLanguage();
// ...
<span>{t('net_worth')}</span>
<span>{t('checkin_message', { days: 3 })}</span>
```

After (next-intl):
```tsx
const t = useTranslations('dashboard');
// ...
<span>{t('net_worth')}</span>
<span>{t('checkin_message', { days: 3 })}</span>
```

For locale switching (still stored in cookie, no URL change):
```tsx
import { useLocale } from 'next-intl';

// Read current locale
const locale = useLocale(); // 'en' | 'zh-TW'

// Switch locale — write cookie, then router.refresh()
async function switchLocale(next: string) {
  await fetch('/api/set-locale', { method: 'POST', body: next });
  router.refresh();
}
```

---

**5.5 Migration order**

1. Install `next-intl`, add plugin to `next.config.ts`
2. Generate `messages/en.json` and `messages/zh-TW.json` from existing `dictionaries.ts` (one-time script or manual grouping)
3. Migrate one component at a time — start with `AppSidebar.tsx` (simplest)
4. Once all components are migrated, delete `src/context/LanguageContext.tsx`, `src/i18n/dictionaries.ts`, and the `components/LanguageProvider.tsx` proxy

**Type safety**: `next-intl` generates types from the message files automatically when you run the TypeScript project — equivalent to the current `_AssertSymmetry` guard, but built-in.

---

### Phase 6 — Remove SSE, replace with SWR polling

**Current state**: `backend/routers/sse.py` implements a full SSE push mechanism — `SSEManager` with a thread-safe asyncio queue, keepalive heartbeat, and connection tracking. The frontend `useRealtimeUpdates()` hook opens an `EventSource` and on `prices_updated` calls `mutate(SWR_KEYS.dashboard)` to trigger a SWR re-fetch.

**The problem**: SSE is only used as a "scheduler finished, go re-fetch" signal. It carries no actual data. For a personal app that updates prices once per hour, this complexity buys nothing meaningful — being 1–2 minutes late to show updated prices is perfectly acceptable.

**Target**: Delete SSE entirely. Use SWR's built-in `refreshInterval` instead.

---

**6.1 Delete backend SSE**

- Delete `backend/routers/sse.py`
- Remove `app.include_router(sse.router)` from `backend/main.py`
- Remove `manager.broadcast_from_thread(...)` call from `backend/scheduler.py`
- Remove `from .routers.sse import manager` import in `scheduler.py`

---

**6.2 Replace `useRealtimeUpdates()` with SWR `refreshInterval`**

Find where `useDashboard()` (or the equivalent SWR key) is configured and add `refreshInterval`:

```ts
// lib/hooks.ts — in the useSWR call for dashboard data
const { data, mutate } = useSWR(SWR_KEYS.dashboard, fetcher, {
  refreshInterval: 60 * 60 * 1000,  // match scheduler interval (1 hour)
});
```

- Delete `useRealtimeUpdates()` from `lib/hooks.ts`
- Remove `<RealtimeSync />` (or wherever `useRealtimeUpdates()` is called) from `components/ClientLayout.tsx`

---

**Files to delete entirely**

| File | Reason |
|---|---|
| `backend/routers/sse.py` | Entire SSE infrastructure no longer needed |

**Net result**: ~120 lines of backend complexity and ~40 lines of frontend hook code deleted, replaced by one `refreshInterval` option.

---

## Coding Conventions (going forward)

- **Routers**: no business logic. Depend on services, return Pydantic schemas.
- **Services**: no SQLAlchemy queries. Call repositories. Raise domain exceptions.
- **Repositories**: no business logic. SQLAlchemy only. Never call services.
- **`utils/`**: pure functions with no dependencies on models, db, or services.
- **No inline Pydantic schemas** in router files — all schemas go in `schemas.py`.
- **One import style**: never `from .. import models, service` and `from ..service import X` in the same file — pick one.
- Comments: only for non-obvious WHY (hidden constraint, algorithm reason). Skip "what" comments.

---

## What NOT to Change

- Alembic migrations — functional, keep as-is.
- `scheduler.py` — keep APScheduler setup; only update which service functions it calls after Phase 2.
- `database.py` — stable, no changes needed.
- Frontend component logic — out of scope for this refactoring pass (except Phase 5 i18n).
- Docker / docker-compose setup — already clean.
