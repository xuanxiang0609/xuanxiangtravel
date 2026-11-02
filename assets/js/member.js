/* 玹翔旅遊 Ultimate Final v12.2｜Firebase 會員系統 + LINE 第三方綁定 + Booking Mall 會員同步・共用導覽防呆正式營運版 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
const MEMBER_VERSION = "Ultimate Final v12.2 Member System";
const firebaseConfig = cfg.FIREBASE || window.XX_FIREBASE_CONFIG || {};
const ready = ["apiKey", "authDomain", "projectId", "appId"].every((key) => {
  const value = String(firebaseConfig[key] || "");
  return value && !value.includes("請填");
});

/*
 * LINE 設定請放在 assets/js/config.js，不要把 Channel Secret 放前端。
 * 範例：
 * window.XUANXIANG_CONFIG = {
 *   LINE_CHANNEL_ID: "你的 LINE Login Channel ID",
 *   LINE_AUTH_API: "你的 Apps Script Web App URL"
 * };
 */
const LINE_CHANNEL_ID = String(cfg.LINE_CHANNEL_ID || window.XX_LINE_CHANNEL_ID || "").trim();
const LINE_AUTH_API = String(cfg.LINE_AUTH_API || cfg.APPS_SCRIPT_LINE_AUTH || cfg.APPS_SCRIPT_URL || window.XX_LINE_AUTH_API || "").trim();
const LINE_REDIRECT_PATH = String(cfg.LINE_REDIRECT_PATH || "register.html").replace(/^\//, "");

let auth = null;
let db = null;
let authChecked = false;
let resolveAuthReady;
const authReady=new Promise(resolve=>{resolveAuthReady=resolve;});
const BOOKING_MALL_VERSION = String(cfg.BOOKING_MALL_VERSION || cfg.BOOKING_VERSION || "v12");
const MEMBER_SOURCE = "member-v12-2-booking-mall-shared-layout";

const $ = (selector) => document.querySelector(selector);
const value = (selector) => String($(selector)?.value || "").trim();
const esc = (input) => String(input ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[char]);

function show(message, type = "info") {
  const box = $("#memberMessage") || $("#memberStatus") || $("#memberMsg") || $("#authMsg") || $("#bindStatus");
  if (box) {
    box.textContent = message;
    box.className = `member-alert ${type}`;
    box.setAttribute("role", type === "error" ? "alert" : "status");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    console.log(`[玹翔會員系統｜${type}]`, message);
  }
}

function setBindStatus(message, type = "info") {
  const box = $("#bindStatus");
  if (box) {
    box.textContent = message;
    box.className = `member-alert ${type}`;
    box.setAttribute("role", type === "error" ? "alert" : "status");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  show(message, type);
}

function errorText(error) {
  const messages = {
    "auth/email-already-in-use": "這個 Email 已經註冊過，請直接登入。",
    "auth/invalid-email": "Email 格式不正確。",
    "auth/weak-password": "密碼至少需要 6 碼。",
    "auth/invalid-credential": "帳號或密碼不正確。",
    "auth/popup-closed-by-user": "登入視窗已關閉，尚未完成登入。",
    "auth/cancelled-popup-request": "請勿重複點擊登入按鈕。",
    "auth/unauthorized-domain": "目前網域尚未加入 Firebase Authorized domains。",
    "auth/operation-not-allowed": "請先在 Firebase Authentication 啟用此登入方式。"
  };
  return messages[error?.code] || error?.message || `會員系統暫時無法完成操作。(${error?.code || "unknown"})`;
}

function getRedirectUri() {
  return new URL(LINE_REDIRECT_PATH, location.origin + "/").href;
}

function redirectAfterLogin() {
  const next = new URLSearchParams(location.search).get("next") || sessionStorage.getItem("xx_login_next") || "";
  const fallback = new URL("member-center.html", location.href);
  const target = new URL(next || fallback.href, location.href);
  sessionStorage.removeItem("xx_login_next");
  location.href = target.origin === location.origin ? target.href : fallback.href;
}

function cleanLineQuery() {
  const url = new URL(location.href);
  ["code", "state", "liff.state", "friendship_status_changed"].forEach((key) => url.searchParams.delete(key));
  history.replaceState({}, document.title, url.pathname + (url.search ? url.search : "") + url.hash);
}

async function upsertMember(user, extra = {}) {
  if (!db || !user) return;
  const ref=doc(db,'members',user.uid),old=await getDoc(ref);
  const previous=old.exists()?old.data():{};
  const payload={uid:user.uid,updatedAt:serverTimestamp(),lastLoginAt:serverTimestamp()};
  if(!old.exists())payload.createdAt=serverTimestamp();
  for(const key of ['name','phone','lineId']){
    if(Object.prototype.hasOwnProperty.call(extra,key))payload[key]=String(extra[key]||'').trim();
    else if(!Object.prototype.hasOwnProperty.call(previous,key)&&key==='name')payload.name=user.displayName||'';
  }
  if(user.email)payload.email=user.email;
  if(user.photoURL)payload.photoURL=user.photoURL;
  payload.providerIds=(user.providerData||[]).map(provider=>provider.providerId);
  await setDoc(ref,payload,{merge:true});
}

async function googleLogin(options = {}) {
  if (!ready || !auth) return show("Firebase 尚未設定完成，請先依照新手說明操作。", "error");
  const isBind = Boolean(options.bindOnly);
  try {
    show(isBind ? "正在開啟 Google 綁定…" : "Google 登入中，請稍候。");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    if(isBind&&!auth.currentUser)throw new Error('請先登入原會員，再綁定 Google。');
    const result = isBind?await linkWithPopup(auth.currentUser,provider):await signInWithPopup(auth,provider);
    await upsertMember(result.user);
    setBindStatus(`${isBind?'Google 綁定成功':'Google 登入成功'}：${result.user.displayName || result.user.email || "玹翔會員"}`, "success");
    if (!isBind) redirectAfterLogin();
  } catch (error) {
    console.error(error);
    const message = isBind ? "Google 綁定失敗，請稍後再試。" : errorText(error);
    show(message, "error");
    setBindStatus(message, "error");
  }
}

async function lineLogin(options = {}) {
  if(!ready||!auth)return show('Firebase 尚未設定完成。','error');
  await authReady;
  if(options.bindOnly&&!auth.currentUser)return show('請先登入會員，再綁定 LINE。','error');
  try{
    const mode=auth.currentUser?'link':'login';
    const token=auth.currentUser?await auth.currentUser.getIdToken():null;
    const response=await fetch('/member-auth/line/start',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({mode})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'LINE 驗證服務尚未完成設定');
    const target=new URL(data.url);
    if(target.origin!=='https://access.line.me')throw new Error('LINE 授權網址不正確');
    location.assign(target.href);
  }catch(error){show(error.message||'目前無法開始 LINE 驗證，請稍後重試。','error')}
}

async function handleLineCallback(){
  if(new URLSearchParams(location.search).has('code')){
    cleanLineQuery();
    show('舊 LINE 授權流程已更新，請重新點擊 LINE 登入。','error');
  }
}

async function emailLogin() {
  if (!ready || !auth) return show("Firebase 尚未設定完成，請先依照新手說明操作。", "error");
  const email = value("#email") || value("#loginEmail");
  const password = value("#password") || value("#loginPassword");
  if (!email || !password) return show("請輸入 Email 與密碼。", "error");
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await upsertMember(result.user);
    redirectAfterLogin();
  } catch (error) {
    console.error(error);
    show(errorText(error), "error");
  }
}

async function register() {
  if (!ready || !auth) return show("Firebase 尚未設定完成，請先依照新手說明操作。", "error");
  const email = value("#email") || value("#registerEmail");
  const password = value("#password") || value("#registerPassword");
  const name = value("#name") || value("#registerName") || email.split("@")[0];
  const phone = value("#phone") || value("#registerPhone");
  const lineId = value("#lineId") || value("#registerLine");
  if (!email || !password) return show("請填寫 Email 與至少 6 碼密碼。", "error");
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(result.user, { displayName: name });
    await upsertMember(result.user, { name, phone, lineId });
    redirectAfterLogin();
  } catch (error) {
    console.error(error);
    show(errorText(error), "error");
  }
}

async function resetPassword() {
  if (!ready || !auth) return show("Firebase 尚未設定完成，請先依照新手說明操作。", "error");
  const email = value("#email") || value("#loginEmail");
  if (!email) return show("請先輸入 Email。", "error");
  try {
    await sendPasswordResetEmail(auth, email);
    show("重設密碼信已寄出，請檢查信箱與垃圾郵件匣。", "success");
  } catch (error) {
    console.error(error);
    show(errorText(error), "error");
  }
}

async function logout() {
  if (auth) await signOut(auth);
  location.href = "login.html";
}

function syncBookingMember(user) {
  const form = $("#bookingForm");
  const gate = $("#bookingMemberGate");
  if (!form) return;

  const ensureHidden = (name) => {
    let input = form.querySelector(`[name="${name}"]`);
    if (!input) {
      input = Object.assign(document.createElement("input"), { type: "hidden", name });
      form.append(input);
    }
    return input;
  };

  const uid = ensureHidden("memberUid");
  const email = ensureHidden("memberEmail");
  const memberName = ensureHidden("memberName");
  const memberPhone = ensureHidden("memberPhone");
  const memberProvider = ensureHidden("memberProvider");
  const memberVersionInput = ensureHidden("memberVersion");
  const bookingVersionInput = ensureHidden("bookingMallVersion");
  const memberSourceInput = ensureHidden("memberSource");
  const memberLoggedInInput = ensureHidden("memberLoggedIn");
  const layoutVersionInput = ensureHidden("layoutVersion");

  uid.value = user?.uid || "";
  email.value = user?.email || "";
  memberName.value = user?.displayName || "";
  memberPhone.value = user?.phoneNumber || "";
  memberProvider.value = Array.isArray(user?.providerData) ? user.providerData.map((provider) => provider.providerId).join(",") : "";
  memberVersionInput.value = MEMBER_VERSION;
  bookingVersionInput.value = BOOKING_MALL_VERSION;
  memberSourceInput.value = MEMBER_SOURCE;
  memberLoggedInInput.value = user ? "1" : "0";
  layoutVersionInput.value = cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core";
  form.dataset.xxMemberSyncReady = "1";
  form.dataset.xxMemberVersion = MEMBER_VERSION;
  form.dataset.xxBookingMallVersion = BOOKING_MALL_VERSION;
  form.dataset.xxSharedLayoutVersion = cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core";

  if (gate) gate.innerHTML = user
    ? `<div class="notice-box">已登入：${esc(user.email || user.displayName || "玹翔會員")}。會員識別已帶入，訂單紀錄待客服核對。</div>`
    : '<div class="notice-box">可直接預約；登入會員可帶入帳號識別，訂單紀錄待客服核對。 <a href="login.html?next=booking.html">會員登入</a></div>';

  document.dispatchEvent(new CustomEvent("xx:booking-member-sync", {
    detail: {
      uid: uid.value,
      email: email.value,
      name: memberName.value,
      memberVersion: MEMBER_VERSION,
      bookingMallVersion: BOOKING_MALL_VERSION,
      memberSource: MEMBER_SOURCE,
      layoutVersion: cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core",
      isLoggedIn: Boolean(user)
    }
  }));
}

function bindButtons() {
  $(`[data-google-login]`)?.addEventListener("click", () => googleLogin());
  $(`[data-line-login]`)?.addEventListener("click", () => lineLogin());
  $("#googleBindBtn")?.addEventListener("click", () => googleLogin({ bindOnly: true }));
  $("#lineBindBtn")?.addEventListener("click", () => lineLogin({ bindOnly: true }));
  $(`[data-email-login]`)?.addEventListener("click", emailLogin);
  $(`[data-register]`)?.addEventListener("click", register);
  $(`[data-reset-password]`)?.addEventListener("click", resetPassword);
  $(`[data-logout]`)?.addEventListener("click", logout);
}

if (!ready) {
  document.addEventListener("DOMContentLoaded", () => show("Firebase 尚未設定完成，請依新手說明填寫設定。", "error"));
} else {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, cfg.FIREBASE_DATABASE_ID || "xuanxiangtravel");
  setPersistence(auth, browserLocalPersistence).catch(console.warn);
  onAuthStateChanged(auth, async (user) => {
    authChecked = true;
    resolveAuthReady(user);
    syncBookingMember(user);
    if (window.XXAnalytics && typeof window.XXAnalytics.trackEvent === "function") {
      window.XXAnalytics.trackEvent("member_auth_state", {
        member_logged_in: Boolean(user),
        member_version: MEMBER_VERSION,
        booking_mall_version: BOOKING_MALL_VERSION,
        member_source: MEMBER_SOURCE,
        layout_version: cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core"
      });
    }
    document.body.classList.toggle("is-member", Boolean(user));
    document.body.classList.toggle("is-guest", !user);

    if ($("#memberMessage")) show(user ? `目前已登入：${user.email || user.displayName || "玹翔會員"}` : "目前尚未登入，可使用 Email、Google 或 LINE 登入。", user ? "success" : "info");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindButtons();
  handleLineCallback();
});

window.XXMember = {
  version: MEMBER_VERSION,
  bookingMallVersion: BOOKING_MALL_VERSION,
  source: MEMBER_SOURCE,
  layoutVersion: cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core",
  syncBookingMember,
  getCurrentUser: () => auth?.currentUser || null,
  isAuthChecked: () => authChecked,
  googleLogin,
  lineLogin,
  googleBind: () => googleLogin({ bindOnly: true }),
  lineBind: () => lineLogin({ bindOnly: true }),
  emailLogin,
  register,
  resetPassword,
  logout
};

document.dispatchEvent(new CustomEvent("xx:member-script-ready", {
  detail: {
    version: MEMBER_VERSION,
    bookingMallVersion: BOOKING_MALL_VERSION,
    memberSource: MEMBER_SOURCE,
    layoutVersion: cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core",
    firebaseReady: ready,
    hasLineChannelId: Boolean(LINE_CHANNEL_ID),
    hasLineAuthApi: Boolean(LINE_AUTH_API)
  }
}));