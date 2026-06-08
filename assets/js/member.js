/* 玹翔旅遊 Ultimate Final v8.0｜Firebase 會員系統 + LINE 第三方綁定最終版 */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
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

const cfg = window.XUANXIANG_CONFIG || {};
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
const LINE_AUTH_API = String(cfg.LINE_AUTH_API || cfg.APPS_SCRIPT_LINE_AUTH || window.XX_LINE_AUTH_API || "").trim();
const LINE_REDIRECT_PATH = String(cfg.LINE_REDIRECT_PATH || "register.html").replace(/^\//, "");

let auth = null;
let db = null;
let authChecked = false;
let pendingLinePayload = null;

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
  } else {
    console.log(`[玹翔會員系統｜${type}]`, message);
  }
}

function setBindStatus(message, type = "info") {
  const box = $("#bindStatus");
  if (box) {
    box.textContent = message;
    box.className = `member-alert ${type}`;
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
  const ref = doc(db, "members", user.uid);
  const old = await getDoc(ref);
  const providerIds = Array.isArray(user.providerData) ? user.providerData.map((provider) => provider.providerId) : [];
  const lineProfile = extra.lineProfile || null;
  const payload = {
    uid: user.uid,
    name: extra.name || lineProfile?.displayName || user.displayName || "",
    phone: extra.phone || "",
    email: extra.email || user.email || "",
    lineId: extra.lineId || lineProfile?.userId || "",
    lineUserId: extra.lineUserId || lineProfile?.userId || "",
    lineDisplayName: extra.lineDisplayName || lineProfile?.displayName || "",
    photoURL: extra.photoURL || lineProfile?.pictureUrl || user.photoURL || "",
    pictureUrl: extra.pictureUrl || lineProfile?.pictureUrl || "",
    providerIds: Array.from(new Set([...providerIds, ...(lineProfile ? ["line.com"] : [])])),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };
  if (!old.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: true });
}

async function bindLineProfileToCurrentUser(lineProfile = {}) {
  if (!auth?.currentUser) return false;
  await upsertMember(auth.currentUser, {
    lineProfile,
    lineUserId: lineProfile.userId || "",
    lineDisplayName: lineProfile.displayName || "",
    pictureUrl: lineProfile.pictureUrl || ""
  });
  return true;
}

async function googleLogin(options = {}) {
  if (!ready || !auth) {
    return show("Firebase 尚未設定完成，請先依照新手說明操作。", "error");
  }

  const isBind = Boolean(options.bindOnly);

  try {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account"
    });

    const result = await signInWithPopup(auth, provider);

    console.log("Google Login Success", result);

    if (result?.user) {
      await upsertMember(result.user, {});
    }

    if (!isBind) {
      show("Google 登入成功，正在前往會員中心。", "success");
      redirectAfterLogin();
    } else {
      show("Google 帳號綁定完成。", "success");
    }

  } catch (error) {
    console.error("Firebase Full Error:", error);

    alert(JSON.stringify({
      code: error.code || "unknown",
      message: error.message || String(error)
    }, null, 2));

    show(errorText(error), "error");
  }
}


function lineLogin(options = {}) {
  if (!LINE_CHANNEL_ID) return show("LINE Channel ID 尚未設定，請先到 config.js 填入 LINE_CHANNEL_ID。", "error");
  const state = crypto.randomUUID ? crypto.randomUUID() : `xx-line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const next = new URLSearchParams(location.search).get("next");
  if (next) sessionStorage.setItem("xx_login_next", next);
  if (options.bindOnly) sessionStorage.setItem("xx_line_bind_mode", "1");
  sessionStorage.setItem("xx_line_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINE_CHANNEL_ID,
    redirect_uri: getRedirectUri(),
    state,
    scope: "profile openid email"
  });

  show("正在前往 LINE 授權頁面…");
  location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

async function handleLineCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return;

  const savedState = sessionStorage.getItem("xx_line_state") || localStorage.getItem("xx_line_state");
  sessionStorage.removeItem("xx_line_state");
  localStorage.removeItem("xx_line_state");
  const isBindMode = sessionStorage.getItem("xx_line_bind_mode") === "1";
  sessionStorage.removeItem("xx_line_bind_mode");

  if (!savedState || savedState !== state) {
    cleanLineQuery();
    return show("LINE 授權驗證失敗，請重新點擊 LINE 登入。", "error");
  }

  if (!LINE_AUTH_API) {
    cleanLineQuery();
    return show("LINE 後端 API 尚未設定，請先到 config.js 填入 LINE_AUTH_API。", "error");
  }

  try {
    show("LINE 授權成功，正在建立會員資料…");
    const response = await fetch(LINE_AUTH_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "line-login",
        code,
        redirectUri: getRedirectUri(),
        origin: location.origin
      })
    });

    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.message || data.error || "LINE 後端驗證失敗");

    const lineProfile = data.profile || data.lineProfile || data;
    pendingLinePayload = { data, lineProfile };

    if (data.firebaseCustomToken && auth) {
      const result = await signInWithCustomToken(auth, data.firebaseCustomToken);
      await upsertMember(result.user, { lineProfile });
      cleanLineQuery();
      redirectAfterLogin();
      return;
    }

    if (auth?.currentUser) {
      await bindLineProfileToCurrentUser(lineProfile);
      cleanLineQuery();
      setBindStatus(`LINE 綁定成功：${lineProfile.displayName || lineProfile.userId || "玹翔會員"}`, "success");
      if (!isBindMode) redirectAfterLogin();
      return;
    }

    cleanLineQuery();
    setBindStatus("LINE 資料已取得。請先用 Email 或 Google 登入後，再點一次 LINE 綁定。", "info");
  } catch (error) {
    console.error(error);
    cleanLineQuery();
    show(`LINE 登入失敗：${error.message || "請稍後再試"}`, "error");
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
    if (pendingLinePayload?.lineProfile) await bindLineProfileToCurrentUser(pendingLinePayload.lineProfile);
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
    if (pendingLinePayload?.lineProfile) await bindLineProfileToCurrentUser(pendingLinePayload.lineProfile);
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
  let uid = form.querySelector('[name="memberUid"]');
  let email = form.querySelector('[name="memberEmail"]');
  if (!uid) {
    uid = Object.assign(document.createElement("input"), { type: "hidden", name: "memberUid" });
    form.append(uid);
  }
  if (!email) {
    email = Object.assign(document.createElement("input"), { type: "hidden", name: "memberEmail" });
    form.append(email);
  }
  uid.value = user?.uid || "";
  email.value = user?.email || "";
  if (gate) gate.innerHTML = user
    ? `<div class="notice-box">已登入：${esc(user.email || user.displayName || "玹翔會員")}。訂單會自動綁定會員。</div>`
    : '<div class="notice-box">可直接預約；登入會員後，訂單會自動綁定帳號方便追蹤。 <a href="login.html?next=booking.html">會員登入</a></div>';
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
    syncBookingMember(user);
    document.body.classList.toggle("is-member", Boolean(user));
    document.body.classList.toggle("is-guest", !user);
    if (pendingLinePayload?.lineProfile && user) {
      await bindLineProfileToCurrentUser(pendingLinePayload.lineProfile);
      pendingLinePayload = null;
    }
    if ($("#memberMessage")) show(user ? `目前已登入：${user.email || user.displayName || "玹翔會員"}` : "目前尚未登入，可使用 Email、Google 或 LINE 登入。", user ? "success" : "info");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindButtons();
  handleLineCallback();
});

window.XXMember = {
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
