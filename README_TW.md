# Yantage 💰 — 個人資產儀表板

**Yantage** 是一款自架、隱私優先的個人財務儀表板。追蹤跨所有資產類別的淨值、連接交易所與鏈上錢包、取得投資組合分析報告 — 全部資料 100% 在本地儲存，零雲端依賴。

![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)

> [English Version](README.md) | 繁體中文版

---

## 💡 專案靈感

本專案的靈感來自 [Percento](https://www.percento.app/cn/)，一款設計精美的個人理財應用程式。我打造 Yantage 是為了：

- **隱私優先** — 100% 本地儲存，資料永不離開您的電腦
- **符合個人需求** — 功能完全依照個人理財管理習慣量身打造，而非企業會計邏輯
- **支援台灣市場** — 原生整合台股市場與 MAX 交易所
- **保持開源** — 讓所有人都能免費使用、Fork 與學習

---

## ✨ 功能特色

### 📊 資產管理
- **6 大資產類別**：流動資產（現金/存款）、股票、加密貨幣、固定資產、應收帳款、負債
- **即時報價**：台股與美股透過 Yahoo Finance；加密貨幣透過 Binance CCXT — 自動指數退避重試
- **交易所整合**：MAX、Binance、Pionex — 以唯讀 API 金鑰自動同步餘額與持倉
- **鏈上錢包追蹤**：透過直接 RPC 呼叫追蹤 Ethereum、Scroll、BSC 網路餘額（無需第三方 API）
- **拖曳排序**：在各類別內自由拖曳重排資產順序
- **同步資產保護**：由交易所管理的資產自動鎖定，防止手動編輯造成同步衝突

### 📈 分析報表
- **淨值趨勢**：互動式折線圖，支援 30天 / 3個月 / 6個月 / 1年 / 全部 時間範圍
- **月度損益圖**：長條圖顯示每月淨值變化
- **風險指標**：從歷史快照自動計算 CAGR（年化報酬率）、最大回撤、年化波動率
- **資產配置**：以環形圖視覺化跨所有類別的投資組合分布
- **表現排行**：按漲跌幅排列最佳/最差資產
- **自動每日快照**：每次價格更新週期後自動記錄淨值歷史

### 🎯 財務規劃
- **FIRE 目標追蹤**：視覺化進度條顯示趨向財務獨立目標的進展，並預測達成日期
- **資產配置目標**：為每個類別設定目標佔比；儀表板顯示各類別進度條、差異指標，以及整體 平衡/失衡 徽章（容許 ±5% 偏差）
- **財富模擬器**：複利計算機 — 輸入每月定投與預期報酬率，預測投資組合未來成長
- **預算規劃器**：色彩標示的預算類別，設定月度上限、顯示進度條，並追蹤收入來源
- **緊急備用金計算機**：您的流動資產能支撐幾個月的生活？
- **價格警報**：設定目標價格，每次價格更新後自動觸發通知

### 🖥️ 介面
- **儀表板**：SSR 渲染的首頁，零初始載入閃爍 — 資產手風琴、配置小工具、目標追蹤器、風險指標、表現排行、淨值圖表一覽無遺
- **獨立頁面**：所有資產、股票、加密貨幣、分析報表、預算規劃器、交易歷史、財務日曆、設定
- **骨架載入**：每個頁面在資料抓取期間顯示版面精確的 Shimmer 效果
- **Toast 通知**：所有資產、交易、預算操作均有 CRUD 反饋
- **雙語介面**：繁體中文與英文 — 編譯期對稱性守衛確保無缺漏翻譯鍵值
- **三種圖表主題**：經典、莫蘭迪、鮮豔 — 可在設定頁切換
- **深色/淺色模式**：透過 next-themes 無縫切換主題
- **隱私模式**：一鍵遮蓋全站所有金額數值
- **PWA 支援**：可安裝為桌面或手機 App，支援離線快取
- **響應式佈局**：桌面版側邊欄導覽，手機版底部標籤列

### 🔒 隱私與安全
- **100% 本地 SQLite 資料庫** — 您的財務資料永不離開您的電腦
- **無雲端同步、無追蹤、無遙測、無數據收集**
- **CORS** 可透過環境變數設定
- **Cloudflare Access**（建議但非必須）— 為整個應用程式加上 Email OTP 身份驗證，無需修改任何程式碼

---

## 🛠️ 技術架構

### 前端

| 技術 | 版本 | 用途 |
|---|---|---|
| Next.js（App Router） | 16.1.6 | 框架 — SSR + CSR 混合渲染 |
| React | 19.2.3 | UI 元件系統 |
| TypeScript | ^5 | 靜態型別 |
| Tailwind CSS | v4 | 原子化 CSS |
| shadcn/ui（Radix UI） | — | 無障礙 UI 基礎元件 |
| Recharts | ^3.7.0 | 折線圖、長條圖、圓餅圖 |
| @dnd-kit | ^6–10 | 拖曳排序 |
| SWR | ^2.4.0 | 資料抓取 + stale-while-revalidate 快取 |
| Lucide React | ^0.563 | 圖示集 |
| next-themes | ^0.4.6 | 淺色 / 深色模式 |

### 後端

| 技術 | 版本 | 用途 |
|---|---|---|
| FastAPI | latest | HTTP 框架，自動產生 OpenAPI 文件 |
| SQLAlchemy | ^2.0 | ORM（宣告式模型） |
| SQLite | — | 資料庫（每個 Profile 一個 `.db` 檔） |
| Pydantic v2 | ^2 | 請求驗證與回應序列化 |
| APScheduler | ^3.10 | 背景排程（價格更新、快照、交易所同步） |
| yfinance | ^0.2 | Yahoo Finance 股票報價 |
| CCXT | ^4 | 統一加密貨幣交易所 API |
| web3 | ^6 | Ethereum / EVM RPC 呼叫取得鏈上餘額 |
| python-dotenv | ^1.0 | 環境變數載入 |
| uvicorn | ^0.23 | ASGI 伺服器 |

---

## 📁 專案結構

```
personal-asset-dash/
├── backend/
│   ├── main.py                 # 應用程式入口：CORS、Router 掛載、lifespan、Schema Migration
│   ├── models.py               # SQLAlchemy ORM 模型（9 張資料表）
│   ├── schemas.py              # Pydantic v2 請求 / 回應型別
│   ├── crud.py                 # 底層 DB CRUD 操作
│   ├── service.py              # 業務邏輯：報價抓取、警報、淨值快照
│   ├── database.py             # Engine 建立、Session、WAL 模式、Profile 重連
│   ├── profile_manager.py      # 多 Profile 管理（config.json + 各 Profile SQLite 檔）
│   ├── scheduler.py            # APScheduler 任務定義
│   ├── routers/                # 12 個路由模組（功能導向切分）
│   │   ├── dashboard.py        # GET /api/dashboard/ — 聚合資產總覽
│   │   ├── assets.py           # CRUD /api/assets/*
│   │   ├── transactions.py     # CRUD /api/transactions/* + POST /transfer
│   │   ├── stats.py            # 歷史淨值、風險指標、資產層級歷史、預測
│   │   ├── goals.py            # CRUD /api/goals/
│   │   ├── alerts.py           # CRUD /api/alerts/
│   │   ├── budgets.py          # CRUD /api/budgets/categories
│   │   ├── income.py           # CRUD /api/income/items
│   │   ├── settings.py         # GET/PUT /api/settings/{key} — 系統 key-value 設定
│   │   ├── system.py           # 備份、CSV 匯出、重置、Seed、Profile 管理
│   │   ├── integrations.py     # 交易所 / 錢包連線管理
│   │   └── ws.py               # WebSocket /api/ws — 即時價格推播
│   └── services/               # 外部整合（各自獨立封裝）
│       ├── exchange_rate_service.py  # USDT/TWD 匯率（MAX API + DB 快取）
│       ├── max_service.py            # MAX 交易所持倉同步
│       ├── binance_service.py        # Binance 持倉同步
│       ├── exchange_service.py       # CCXT 協調器（Pionex 等）
│       ├── pionex_service.py         # Pionex 特定邏輯
│       └── wallet_service.py         # Web3 EVM 錢包餘額掃描
│
├── frontend/
│   ├── app/                    # Next.js App Router（資料夾 = 路由）
│   │   ├── page.tsx            # 首頁 / 儀表板（Server Component，SSR）
│   │   ├── analytics/          # 風險指標 + 淨值趨勢 + 月度損益
│   │   ├── assets/             # 所有資產列表 + 新增/編輯
│   │   ├── stock/              # 股票投資組合管理
│   │   ├── crypto/             # 跨所有交易所的加密貨幣持倉
│   │   ├── expenses/           # 預算規劃器
│   │   ├── history/            # 交易歷史記錄
│   │   ├── calendar/           # 財務日曆（依日期分類的交易視圖）
│   │   └── settings/           # 應用程式設定
│   ├── components/             # 可複用 React 元件
│   │   ├── DashboardClient.tsx      # 主儀表板（Client Component）
│   │   ├── AssetAccordion.tsx       # 可折疊資產卡片，含拖曳排序
│   │   ├── AssetActionDialog.tsx    # 多模式 Dialog（查詢/編輯/調整/轉帳）
│   │   ├── NetWorthTrendChart.tsx   # 淨值趨勢折線圖（Recharts）
│   │   ├── MonthlyChangeChart.tsx   # 月度損益長條圖
│   │   ├── AssetAllocationWidget.tsx # 投資組合環形圖
│   │   ├── GoalWidget.tsx           # 目標進度 + 預測達成日期
│   │   ├── WealthSimulatorWidget.tsx # 複利財富投影計算機
│   │   ├── RiskMetricsWidget.tsx    # CAGR / 最大回撤 / 年化波動率
│   │   ├── EmergencyFundWidget.tsx  # 財務跑道計算機
│   │   ├── IntegrationManager.tsx   # 交易所 / 錢包連線管理
│   │   ├── ProfileSwitcher.tsx      # 多 Profile 切換器
│   │   └── ui/                      # shadcn/ui 基礎元件 + MoneyInput
│   ├── lib/
│   │   ├── api.ts              # 所有 API 呼叫集中於此（唯一資料層）
│   │   ├── hooks.ts            # SWR Hooks（useDashboard、useGoals 等）
│   │   ├── types.ts            # 共用 TypeScript 介面
│   │   └── constants.ts        # 共用常數（CATEGORY_COLOR_MAP 等）
│   └── src/i18n/
│       └── dictionaries.ts     # 繁中 + English 翻譯字典
│                               # + _AssertSymmetry 編譯期對稱性守衛
│
├── scripts/
│   ├── dev.sh                  # 開發模式（即時熱重載）
│   ├── prod.sh                 # 生產模式（完整編譯後啟動）
│   ├── deploy.sh               # systemd 服務部署
│   ├── update.sh               # git pull + 重新編譯 + 重啟（CI/CD 使用）
│   ├── stop.sh                 # 停止所有服務
│   ├── status.sh               # 查看服務狀態
│   └── logs.sh                 # 即時追蹤日誌
│
├── ARCHITECTURE.md             # 完整架構深度說明文件
├── CHANGELOG.md                # 版本歷史記錄
└── README_TW.md
```

---

## � Docker（建議）

**系統需求：** 安裝 [Docker](https://docs.docker.com/get-docker/) 並含 Compose 外掛（Docker Desktop 或 Docker Engine 20.10+）

```bash
git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
cd Personal-Asset-Dash
docker compose up --build
```

- **儀表板** → http://localhost:3001
- **API 文件** → http://localhost:8000/docs

所有資料（SQLite DB + config）存放於 `yantage_data` named volume，容器重新建置後仍會保留。

**常用指令：**

| 指令 | 用途 |
|---|---|
| `docker compose up -d` | 在背景啟動 |
| `docker compose down` | 停止 |
| `docker compose down -v` | 停止並**清除資料** ⚠️ |
| `docker compose build --no-cache` | 強制完整重新建置 |
| `docker compose logs -f` | 即時追蹤日誌 |
| `docker compose pull && docker compose up -d --build` | 更新至最新版 |

**將現有資料遷移至 Docker：**
```bash
# 將現有 SQLite DB 複製到 Docker volume
docker run --rm -v yantage_data:/data -v "$(pwd)/backend":/src alpine \
  sh -c "cp /src/sql_app*.db /src/config.json /data/ 2>/dev/null; echo done"
```

---

## 🚀 快速開始（不使用 Docker）

### 方案 A — 腳本啟動

**開發模式**（即時熱重載，無需編譯）：
```bash
./scripts/dev.sh
```

**生產模式**（完整最佳化編譯）：
```bash
./scripts/prod.sh
```

**其他管理指令：**

| 指令 | 用途 |
|---|---|
| `./scripts/stop.sh` | 停止所有服務 |
| `./scripts/logs.sh` | 即時查看日誌 |
| `./scripts/status.sh` | 檢查服務狀態 |
| `./scripts/update.sh` | `git pull` + 重新編譯 + 重啟 |
| `./scripts/deploy.sh` | 安裝並啟用 systemd 服務 |

### 方案 B — 手動安裝

**系統需求：** Python 3.8+、Node.js 18+

```bash
# 1. 複製專案
git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
cd Personal-Asset-Dash

# 2. 後端
cd backend
pip install -r requirements.txt
cp .env.example .env          # 可選：自訂 CORS / 日誌等級

# 3. 前端
cd ../frontend
npm install

# 4. 啟動（開兩個終端機）
# 終端機 1 — 後端
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 終端機 2 — 前端
cd frontend && npm run dev
```

開啟 **http://localhost:3000** 使用應用程式 — API 文件請至 **http://localhost:8000/docs**

---

## ⚙️ 設定說明

### 環境變數

| 變數 | 預設值 | Docker 值 | 說明 |
|---|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:3000` | `http://localhost:3001` | CORS 允許的來源（逗號分隔） |
| `LOG_LEVEL` | `INFO` | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `YANTAGE_DATA_DIR` | *（backend 目錄）* | `/data` | SQLite DB 檔案與 config.json 的儲存目錄 |

> Docker 環境中，這些變數由 `docker-compose.yml` 設定。非 Docker 環境請根據 `backend/.env.example` 建立 `backend/.env`。

### 整合設定（設定頁面）

| 整合 | 同步內容 |
|---|---|
| MAX 交易所 | 加密貨幣持倉 + 交易歷史（唯讀 API 金鑰） |
| Binance | 現貨餘額（唯讀 API 金鑰） |
| Pionex | 透過 CCXT 同步持倉（唯讀 API 金鑰） |
| EVM 錢包 | 透過公開 RPC 取得鏈上餘額 — Ethereum、Scroll、BSC |

### 多 Profile

每個 Profile 使用獨立的 SQLite 資料庫檔案（`sql_app.db`、`sql_app_family.db` 等）。可在設定頁切換 Profile，或透過 `POST /api/system/profile/switch` API 操作。

---

## 🖧 部署說明

### Docker（建議）

請見上方的 [Docker](#-docker建議) 章節，使用 `docker compose up -d` 即可正式上線。

### Systemd（非 Docker 自架方案）

執行 `./scripts/deploy.sh` 即可安裝並啟用 systemd 服務。詳細 Unit 檔案範例請參考 [ARCHITECTURE.md](ARCHITECTURE.md)。

### Nginx + Cloudflare Tunnel

```
Internet → Cloudflare Tunnel（TLS 終止）→ Nginx（反向代理）
              ├── /        → Next.js  :3001
              └── /api     → FastAPI  :8000
```

> **重要**：WebSocket 必須在 Nginx 中單獨設定：
> ```nginx
> location /api/ws {
>     proxy_pass         http://127.0.0.1:8000/api/ws;
>     proxy_http_version 1.1;
>     proxy_set_header   Upgrade $http_upgrade;
>     proxy_set_header   Connection "upgrade";
>     proxy_read_timeout 3600s;
> }
> ```

### CI/CD（GitHub Actions 自架 Runner）

推送到 `main` 分支後，自架 Runner 會自動執行 `scripts/update.sh`。無需 SSH 金鑰或開放端口。也支援透過 `workflow_dispatch` 手動觸發。

### 資料庫備份

SQLite 是單一檔案，備份非常簡單：

```bash
# crontab -e — 每天凌晨 2 點備份，保留 30 天
0 2 * * * sqlite3 /path/to/backend/sql_app.db ".backup /backup/sql_app_$(date +%Y%m%d).db"
0 2 * * * find /backup -name "sql_app_*.db" -mtime +30 -delete
```

---

## 🔄 即時更新流程

```
APScheduler（背景執行緒，可設定間隔 — 預設 60 分鐘）
  └─ run_price_updates()
       ├─ 抓取股票報價    （yfinance，多次指數退避重試）
       ├─ 抓取加密貨幣報價（CCXT/Binance，重試）
       ├─ 同步交易所持倉  （MAX / Binance / Pionex）
       ├─ 掃描錢包餘額    （Web3 RPC）
       ├─ 檢查價格警報    （觸發條件成立則通知）
       ├─ 寫入 net_worth_history 快照
       └─ 透過 WebSocket 廣播 {"type":"prices_updated"}
             └─ 前端 useRealtimeUpdates()
                   └─ SWR mutate() → 介面自動刷新（無需輪詢）
```

---

## 📖 相關文件

| 文件 | 內容 |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 資料流、資料庫設計、部署指南、安全性分析、已知問題、優化路線圖 |
| [CHANGELOG.md](CHANGELOG.md) | 完整版本歷史 |
| [backend/README.md](backend/README.md) | 後端相關說明 |
| [frontend/README.md](frontend/README.md) | 前端相關說明 |
| http://localhost:8000/docs | 互動式 API 參考文件（執行中時可用） |

---

## 📜 授權條款

MIT — 自由使用、修改與散布。
