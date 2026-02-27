# 專案名稱

這是一個整合前後端與資料庫的網頁應用程式 (React + Vite + Express + SQLite)。

## 本地端開發 (Run Locally)

**先決條件：**
請確認系統已安裝 [Node.js](https://nodejs.org/) 與 npm。

1. **安裝依賴套件**
   在專案根目錄執行：
   ```bash
   npm install
   ```

2. **設定環境變數**
   請在專案根目錄建立 `.env` 檔案，或從 `.env.example` 複製一份，並填寫所需的 API Key 與設定（如 `GEMINI_API_KEY`、OAuth 資訊）。

3. **啟動開發伺服器**
   包含後端 API 的開發模式：
   ```bash
   npm run dev
   ```
   啟動後即可在瀏覽器開啟 `http://localhost:3000` 預覽。

## 部署上線 (Deploy)

本專案不僅是純靜態網頁，還包含了 `server.ts` 後端（Google OAuth、Express），必須部署至可執行 Node.js 的環境（如自管 VPS、Render 等），無法僅依賴 GitHub Pages。

**透過 GitHub Action 自動部署：**
專案已配置了 `.github/workflows/deploy.yml` 範本。
1. 在 GitHub 的 repository 設定中（**Settings > Secrets and variables > Actions**），新增連線到您主機需要的參數（例如 `SERVER_HOST`、`SERVER_USER`、`SERVER_SSH_KEY`）。
2. 每當推送程式碼至 `main` 分支時，即會自動執行 `npm install`、`npm run build`，並透過 SSH 登入伺服器完成部署流程。若您使用不同平台（如 Render），可直接替換為該平台提供的 Action。
