# Yantage 💰 - 個人資產儀表板

**Yantage** 是一款注重隱私的個人財務管理工具，旨在幫助您追蹤淨資產、管理多類別資產，並實現財務自由。採用「模糊記帳」理念，專注於高階資產追蹤，無需記錄每一筆交易的繁瑣負擔。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)

> [English Version](README.md) | 繁體中文版

---

## 💡 專案靈感

本專案的靈感來自 [Percento](https://www.percento.app/cn/)，一款設計精美的個人理財應用程式。雖然 Percento 提供了出色的使用體驗，但我想打造一個符合以下需求的工具：
- **隱私優先**：100% 本地資料儲存，無雲端依賴
- **符合個人需求**：功能完全依照我的理財管理習慣量身打造
- **支援台灣市場**：原生整合台股市場與 MAX 交易所
- **保持開源**：讓所有人都能免費使用、修改與學習

這是一個為了解決我自己的財務追蹤挑戰而誕生的熱情專案，希望也能幫助到其他人！

---

## ✨ 主要功能

### 🎨 **現代簡約設計**
- **柔和配色**：舒適的薄荷綠、米色和藍灰色調
- **清晰排版**：易讀的介面與明確的視覺層次
- **深色模式**：無縫切換主題，舒適閱讀
- **響應式佈局**：針對桌面和行動裝置優化

### 📊 **全方位資產管理**
- **多類別追蹤**：管理 5 大類資產（流動資產、投資、固定資產、應收帳款、負債）
- **即時估值**：自動抓取股票價格（台股/美股透過 Yahoo Finance）與加密貨幣（透過 CCXT/MAX）
- **MAX 交易所整合**：使用唯讀 API 自動同步餘額與交易紀錄
- **可展開資產卡片**：單擊即可深入查看個別持倉

### 🎯 **財務規劃工具**
- **目標追蹤**：FIRE（財務獨立，提早退休）目標的視覺化進度條，以及**多類別資產配置目標** — 為每個資產類別設定目標佔比，一眼掌握投資組合是否平衡
- **預算規劃器**：將每月支出整理成色彩標示的類別，設定預算上限並顯示進度條
- **緊急預備金檢測**：根據流動資產計算財務生存時間

### 📈 **分析與洞察**
- **風險指標評估**：自動從歷史淨值推算您的 **年化報酬率 (CAGR)**、**最大回撤 (Max Drawdown)** 與 **年化波動率 (Volatility)**，專業評估投資組合健康度
- **淨值趨勢**：歷史追蹤與互動式圖表，支援多種時間範圍（30天、3個月、6個月、1年、全部）
- **資產配置**：使用環形圖視覺化投資組合分布
- **再平衡建議**：維持目標資產配置，提供可執行的建議
- **績效排行**：追蹤表現最佳/最差的資產，顯示百分比漲跌

### 🔒 **隱私優先**
- **100% 本地儲存**：所有資料儲存於本地 SQLite 資料庫
- **無雲端同步**：您的財務資料永不離開您的電腦
- **安全的 API 金鑰**：加密儲存於本地資料庫
- **無追蹤**：無分析、無遙測、無資料收集

---

## 🚀 快速開始

### 開發模式（快速迭代）
用於編寫程式碼和測試變更，無需重新編譯。支援即時熱重載 (Hot Reload)。
```bash
./scripts/dev.sh
```

### 生產模式（完整編譯）
用於編譯並部署應用程式。
```bash
./scripts/prod.sh
```

### 管理腳本
- **停止所有服務**：`./scripts/stop.sh`
- **查看日誌**：`./scripts/logs.sh`
- **檢查狀態**：`./scripts/status.sh`
- **更新應用程式**：`./scripts/update.sh`
- **部署 (Systemd)**：`./scripts/deploy.sh`

### 手動安裝步驟

### 系統需求
- **Python 3.8+**（後端）
- **Node.js 18+**（前端）

### 安裝步驟

1. **複製專案**
   ```bash
   git clone https://github.com/YuunJiee/Personal-Asset-Dash.git
   cd Personal-Asset-Dash
   ```

2. **後端設定**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # 可選：複製環境變數範本
   cp .env.example .env
   # 編輯 .env 檔案以自訂配置（如 CORS origins）
   ```

3. **前端設定**
   ```bash
   cd ../frontend
   npm install
   ```

4. **啟動應用程式**
   ```bash
   # 後端（從 backend 目錄）
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # 前端（從 frontend 目錄，另開終端機）
   npm run dev
   ```

5. **訪問應用程式**
   - **前端介面**：http://localhost:3000
   - **API 文件**：http://localhost:8000/docs

### 環境變數配置（可選）

後端支援使用 `.env` 檔案進行配置。可用的環境變數：

- `ALLOWED_ORIGINS`: CORS 允許的來源，以逗號分隔（預設：`http://localhost:3000`）
- `LOG_LEVEL`: 日誌級別（DEBUG, INFO, WARNING, ERROR, CRITICAL，預設：INFO）

範例 `.env` 檔案已提供在 `backend/.env.example`。詳細說明請參考配置指南。

---

## 🛠️ 技術架構

### 前端
- **框架**：Next.js 16（App Router）
- **UI**：Shadcn/UI + TailwindCSS 4
- **圖表**：Recharts
- **狀態管理**：React Server Components + Client Hooks
- **國際化**：自訂字典式翻譯（英文/繁體中文）
- **圖示**：Lucide React

### 後端
- **框架**：FastAPI
- **資料庫**：SQLite + SQLAlchemy ORM
- **排程器**：APScheduler（背景價格更新）
- **服務**：
  - `MAXService`：交易所整合（HMAC 驗證）
  - `WalletService`：Web3 整合，追蹤鏈上餘額
  - `MarketService`：透過 yfinance 和 CCXT 即時抓取價格

---

## 📁 專案結構

```
personal-asset-dash/
├── backend/              # FastAPI 後端
│   ├── routers/          # API 端點
│   │   ├── assets.py
│   │   ├── budgets.py    # 預算類別 CRUD
│   │   ├── stats.py
│   │   └── system.py
│   ├── services/         # 業務邏輯
│   ├── models.py         # SQLAlchemy 模型
│   ├── schemas.py        # Pydantic 驗證
│   ├── .env.example      # 環境變數範本
│   └── README.md         # 後端文件
├── frontend/             # Next.js 前端
│   ├── app/              # App Router 頁面
│   ├── components/       # React 元件
│   ├── lib/              # 工具函式與 API 客戶端
│   └── README.md         # 前端文件
├── scripts/              # 管理腳本（dev/prod/deploy）
├── CHANGELOG.md          # 版本紀錄
└── .gitignore
```

---

## 🔑 設定說明

### 後端設定
1. 進入設定頁面
2. 配置整合（選用）：
   - **MAX 交易所**：輸入 API Key 和 Secret 以啟用自動同步
   - **錢包地址**：新增 Ethereum、Scroll 或 BSC 地址以追蹤鏈上資產

### 環境變數
參考 `backend/.env.example` 查看可用的設定選項。

---

## 📖 文件

- **後端 API**：參見 [backend/README.md](backend/README.md)
- **前端元件**：參見 [frontend/README.md](frontend/README.md)
- **API 參考**：http://localhost:8000/docs（執行時）
- **配置指南**：參見 artifacts 中的 `configuration_guide.md`

---

## 🌍 語言支援

應用程式支援以下語言：
- 🇺🇸 English
- 🇹🇼 繁體中文

可在設定頁面切換語言。

---

## 🤝 貢獻

歡迎貢獻！請隨時提交 Pull Request。

---

## 📝 授權

MIT License - 詳見 LICENSE 檔案。

---

## ⚠️ 免責聲明

此工具僅供個人財務追蹤使用，不提供財務建議。在做出任何投資決策前，請務必諮詢合格的財務顧問。

---

## 🙏 致謝

- 使用 [Next.js](https://nextjs.org/) 建構
- 由 [FastAPI](https://fastapi.tiangolo.com/) 驅動
- UI 元件來自 [Shadcn/UI](https://ui.shadcn.com/)
- 圖表由 [Recharts](https://recharts.org/) 提供
- 開發過程中使用 AI 程式設計輔助工具協作

---

## 📞 聯絡方式

如有問題或建議，歡迎開 Issue 或 Pull Request！
