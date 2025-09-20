# Time Coordinator (時間協調器)

一個簡單、直觀的線上時間協調工具，旨在幫助團隊快速找到最適合所有人的活動時間。建立活動、分享連結，即可輕鬆查看所有參與者的空閒時段。

**線上體驗 » [https://time-coordinator.pages.dev/](https://time-coordinator.pages.dev/)**

## ✨ 主要功能

  * **無需註冊**：快速建立活動，無需繁瑣的註冊流程。
  * **直觀的時間選擇介面**：透過點擊或拖曳即可輕鬆標示您的空閒時間。
  * **即時更新**：所有參與者的選擇會近乎即時地同步顯示在活動頁面上。
  * **智慧時段推薦**：自動標示出最多人選擇的「最佳時段」。
  * **兩種排程模式**：可選擇特定日期（Date-based）或通用的一週（Weekly）來安排活動。
  * **自動過期機制**：為保護隱私並維持系統整潔，所有活動資料將在建立 7 天後自動刪除。

## 🚀 技術架構

本專案採用現代化的 Jamstack 架構，完全基於 Cloudflare 的生態系統進行建置與部署，以實現極致的效能和擴展性。

  * **前端**：使用 **React** 和 **Vite** 建構，並透過 **Cloudflare Pages** 進行全球部署。
  * **後端 API**：由 **Cloudflare Workers** 提供無伺服器 (Serverless) 的 API 服務。
  * **資料庫**：使用 **Cloudflare Workers KV** 作為低延遲的鍵值資料庫，儲存所有活動資訊。

## 🔧 本地開發與設定

### **先決條件**

  * [Node.js](https://nodejs.org/) (建議版本 v18 或更高)
  * [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Cloudflare 開發工具)
  * 一個 [Cloudflare 帳號](https://www.google.com/search?q=https://dash.cloudflare.com/sign-up)

### **設定步驟**

1.  **Clone 專案**

    ```bash
    git clone https://github.com/your-username/time-coordinator.git
    cd time-coordinator
    ```

2.  **安裝前端依賴**

    ```bash
    npm install
    ```

3.  **建立後端資源 (KV & Worker)**

      * **建立 KV Namespace**: 在 Cloudflare 儀表板或使用 Wrangler CLI 建立一個 KV Namespace。

        ```bash
        npx wrangler kv:namespace create EVENTS_KV
        ```

        記下產生的 `id` 和 `preview_id`。

      * **設定 Worker**: 複製 `wrangler.example.toml` 並重新命名為 `wrangler.toml`。將上一步得到的 `id` 和 `preview_id` 填入對應的欄位。

4.  **修改前端 API 端點**

      * 在 `src/pages/EventPage.tsx` 中，找到 `API_BASE_URL` 變數，並將其值替換為您的 Worker URL。

5.  **啟動本地開發伺服器**

      * 在兩個不同的終端機中，分別啟動前端和後端開發伺服器。

    <!-- end list -->

    ```bash
    # 終端機 1: 啟動前端 (Vite)
    npm run dev

    # 終端機 2: 啟動後端 (Worker)
    npx wrangler dev
    ```

    現在，您可以在 `http://localhost:5173` (或 Vite 指定的 port) 看到您的應用程式。

## 部署

本專案可輕鬆部署至 Cloudflare。

1.  **部署後端 Worker**:

    ```bash
    npx wrangler deploy
    ```

    記下 Worker 的正式 URL，並更新前端 `EventPage.tsx` 中的 `API_BASE_URL`。

2.  **部署前端 Pages**:

      * 將您的專案推送到 GitHub/GitLab 倉庫。
      * 在 Cloudflare 儀表板中，前往 **Workers & Pages** \> **Create application** \> **Pages**。
      * 連接您的 Git 倉庫。
      * 使用以下建置設定：
          * **Framework preset**: `Vite`
          * **Build command**: `npm run build`
          * **Build output directory**: `dist`
      * 點擊 **Save and Deploy**。

## 🌟 v2 更新日誌

此版本主要專注於改善核心使用者體驗，並修正了幾個關鍵的錯誤。

  * **功能: 記住使用者**
      * 現在會使用瀏覽器的 `localStorage` 來記住您的名稱。當您關閉分頁後重新回到活動頁面，系統會自動辨識您的身分，讓您能無縫地修改先前的選擇，無需重新輸入名稱。

  * **功能: 新增個人化時間選擇工具**
      * **隱藏他人選擇**: 在時間表上方新增了一個開關，您可以隱藏所有其他參與者的選擇，以便更專注於標示自己的空閒時段。
      * **一鍵清空選擇**: 新增了「Clear my selections」按鈕，讓您可以一次性地清除所有自己已選擇的時段，方便重新規劃。

  * **修正: 建立活動時的日期選擇錯誤**
      * 解決了因時區轉換導致在日曆上選擇的日期會差一天的問題。現在您點選的日期將會被正確地儲存。

  * **改善: 日期選擇器 UI**
      * 將日曆標頭的星期顯示從兩個字母 (如 "Sa") 更新為更清晰的三個字母 (如 "Sat")。