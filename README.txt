玹翔旅遊高端旅遊平台最終修正版：請上傳 site 資料夾內容至 Cloudflare Pages。已統一導覽列、字體、顏色、手機版與重點頁面文案。

==============================
V5.2 合併升級檢查補充
==============================
產出時間：2026-05-31T03:23:16

本版目標：
1. 合併最新封存內容到 Ultimate Final v5 架構。
2. 保留會員綁定、預約商城、CRM、Apps Script、Cloudflare 上線檔。
3. 補齊缺圖，避免首頁或內頁出現破圖。
4. 補 Firebase 設定橋接檔 firebase-config.js，方便後期接 Firebase。
5. 補最終檢查報告，後期修改可以照表施工。

新手最重要的 7 件事：
1. 先解壓縮整包。
2. 上傳 Cloudflare Pages 前，不要改檔名，不要只丟 index.html。
3. 先打開 assets/js/config.js，確認電話、LINE、API_URL。
4. Firebase 設定沒填以前，會員功能會提示尚未設定，這是正常，不是網站壞掉。
5. Apps Script 部署完成後，把 /exec 網址貼回 config.js。
6. LINE Token 與管理員 userId 放在 Apps Script Script Properties，不要寫死在前端。
7. 正式網域確認後，更新 sitemap.xml、robots.txt、每頁 canonical。

第三方註冊／綁定流程：
Firebase Console → Authentication → Sign-in method → 啟用 Email/Password 與 Google → 將 Firebase Web config 貼入 assets/js/config.js → Cloudflare Pages 網域加入 Firebase 授權網域 → 會員註冊測試 → Google 登入測試 → 預約商城測試。

訂單需綁定後才可預約：
booking.html 會載入 member.js；member.js 會檢查 Firebase 登入狀態。未登入時顯示登入提醒；已登入時允許填表，並把 memberUid / memberEmail 一起送到 Apps Script。

後期修改備註：
- 只改文案：直接改對應 html。
- 改全站導覽／Footer：assets/js/site.js。
- 改聯絡資訊：assets/js/config.js。
- 改訂單欄位：booking.html、assets/js/site.js、apps-script/Code.gs、Google Sheet 欄位都要一起改。
- 改會員：assets/js/member.js、assets/js/config.js、Firebase Console。
- 改圖片：images/ 或 assets/img/。
