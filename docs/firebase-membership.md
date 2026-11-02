# Firebase 會員登入與帳號綁定

此變更把會員驗證整合到既有靜態官網，不是另建網站。Firebase 專案仍為 `xuanxiang-travel`，Firestore 仍使用既有具名資料庫 `xuanxiangtravel`。既有 Email 登入、註冊及 Apps Script 預約送出保留。

## 行為

- 會員中心原入口 `member-center.html` 升級為 Google／LINE 登入、帳號綁定、簡訊驗證、常用資料及網站訂單查詢。
- 舊登入／註冊頁仍可用，新增 LINE 入口。Google「綁定」改用 `linkWithPopup`，不再切換至另一帳號。
- 修正舊會員登入的欄位白名單與空值覆蓋問題。再次登入不會清空原電話、LINE ID 或姓名。
- LINE code 交換、PKCE、state、nonce、短效裝置綁定與 token 驗證由 `memberAuth` 後端處理；LINE Secret 不進前端。
- LINE 綁定要求五分鐘內的 Firebase 登入，已屬於另一會員的 LINE 不自動轉移或合併。
- 手機使用 Firebase `linkWithPhoneNumber`，與原 Firebase UID 綁定；自行填寫的聯絡電話不等於已驗證手機。
- 常用資料由 API 驗證 Firebase ID token 後存取，與舊 `members/{uid}` 的姓名、電話、LINE 聯絡 ID 保持相容；既有角色與狀態不改動。
- 訂單 API 僅查詢 `orders.memberUid == verified Firebase UID`，回傳安全欄位白名單，不回傳內部備註、其他客戶或司機個資。正式報價需有確認時間及已確認狀態，不將未報價當成零元。
- 原 Apps Script 接到的訂單不會自動成為這個 Firestore 查詢的結果。需要後端驗證的同步或客服核對歸戶；前端隱藏的 memberUid 不可當作身分驗證。

## 尚未完成的正式驗證

本次只修改原始碼與執行本機檢查；未取得 Firebase 管理登入、未部署，Google／LINE／正式 SMS 端到端尚未驗證。GitHub 合併也不代表已上線。

## 上線前設定

1. 備份既有 Hosting 設定與版本。`firebase.json` 原站內容、既有重新導向、具名資料庫與索引已保留；僅增加 Functions codebase、會員 rewrite、必要 CSP frame 來源及精確快取規則。
2. 核對 Firebase Authentication 的 Google、Phone provider 與 Authorized domains。Google popup 需保留 `same-origin-allow-popups`，Firebase authDomain 與 reCAPTCHA iframe 來源已加入 CSP。
3. 檢查 Functions、Firestore、Secret Manager 與 SMS 所需方案、配額及可能費用。不自動升級方案，也不在未確認時發送正式簡訊。
4. `functions/membership/.env.example` 只列設定格式。設定 `MEMBER_PUBLIC_ORIGIN` 為實際正式 HTTPS origin（無尾斜線），`LINE_CHANNEL_ID=2010261169`。如正式網址為 https://xuanxiangtravel.com，LINE Callback URL 即 `https://xuanxiangtravel.com/member-auth/line/callback`；須在 LINE Developers 核對此網域後設定。
5. LINE Channel Secret 由擁有人在 Firebase Secret Manager 安全設定：`firebase functions:secrets:set LINE_CHANNEL_SECRET --project xuanxiang-travel`。不要貼至對話、原始碼或前端。
6. 確認 Functions 服務帳號可以依官方 IAM 方式簽發 custom token；若需調整權限，先核對實際執行帳號與最小範圍，不下載私鑰。
7. 新驗證集合為後端專用，Firestore rules 已加入精確 deny，原業務規則未放寬。對 `xuanxiangAuthSessions`、`xuanxiangAuthGrants`、`xuanxiangAuthBrowsers`、`xuanxiangAuthLimits` 的 `expiresAt` 設 TTL；程式也會檢查期限。
8. 檢查既有網站是否使用 `__session` Cookie。Firebase Hosting 對 Functions 通常只轉送這個名稱；本流程限定 `/member-auth` 路徑，遇同名 Cookie 會拒絕作業，先整合既有 session 設計。
9. 部署 membership codebase、具名資料庫規則及 Hosting 後，先以測試會員和 Firebase 測試手機驗收；正式環境不得停用 reCAPTCHA。

## 驗收

- Google 登入→記錄 UID→綁 LINE→登出→LINE 登入，UID 與既有訂單歸戶不變。
- 綁定已被另一會員使用的 Google／LINE／手機應失敗，不自動合併。
- 手機錯碼、過期、取消驗證不顯示成功；完成後才能顯示已驗證手機。
- 同一 UID 可以讀寫自己的常用資料，不能指定其他 UID；跨來源及匿名 API 存取失敗。
- 改變前端 uid、Email、手機或訂單編號，不得讀到他人訂單。
- 再次 Email／Google 登入保留原電話、LINE ID、姓名。
- 原 booking.html 的 Apps Script 需求送出流程、服務選項、價目、首頁與導覽保持原行為。

## 本機檢查

根目錄 `npm ci --ignore-scripts && npm test`；Functions 目錄 `npm ci --ignore-scripts`，再執行 `node --check src/index.mjs`。正式 Firebase／LINE/SMS 測試需專案設定與部署後另外執行。
