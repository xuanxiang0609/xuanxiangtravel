// 玹翔旅遊｜Firebase 設定橋接檔
// 使用前：請先到 assets/js/config.js 的 FIREBASE 區塊填入正式 Firebase 設定。
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fallbackConfig = {
  apiKey: "請填入 Firebase Web API Key",
  authDomain: "請填入 Firebase Auth Domain",
  projectId: "請填入 Firebase Project ID",
  appId: "請填入 Firebase App ID"
};
const cfg = (window.XUANXIANG_CONFIG && window.XUANXIANG_CONFIG.FIREBASE) || fallbackConfig;
const usable = cfg && cfg.apiKey && !String(cfg.apiKey).includes("請填入") && cfg.projectId && !String(cfg.projectId).includes("請填入");
let app = null, auth = null, db = null;
const provider = new GoogleAuthProvider();
try {
  if (usable) {
    app = initializeApp(cfg);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("玹翔旅遊：Firebase 尚未設定，會員功能將顯示設定提醒，不影響一般靜態頁面。")
  }
} catch (err) {
  console.warn("玹翔旅遊：Firebase 初始化失敗，請檢查 assets/js/config.js。", err);
}
export { app, auth, db, provider };
export const googleProvider = provider;
