/**
 * ============================================================
 * 玹翔旅遊 V39 Member Center
 * auth.js｜會員登入與工作階段管理模組
 * ============================================================
 *
 * 職責：
 * 1. Email／密碼登入與註冊
 * 2. Google 登入
 * 3. LINE Login 導向與回呼
 * 4. Firebase 登入狀態管理
 * 5. 串接後端 memberLogin 建立會員資料
 * 6. 管理前端會員 Session
 * 7. 忘記密碼與登出
 * 8. 提供登入狀態監聽
 *
 * 建議載入順序：
 * 1. Firebase App Compat SDK
 * 2. Firebase Auth Compat SDK
 * 3. config.js
 * 4. firebase.js
 * 5. api.js
 * 6. auth.js
 */

(function initializeXuanXiangMemberAuth(global) {
  'use strict';

  const MODULE_NAME = 'XuanXiangMemberAuth';

  const state = {
    initialized: false,
    readyPromise: null,
    authUnsubscribe: null,
    currentUser: null,
    session: null,
    status: 'idle',
    lastError: null,
    listeners: new Set(),
    exchangePromises: new Map(),
    lastObservedUid: ''
  };

  /**
   * 建立標準登入錯誤。
   *
   * @param {string} code 錯誤代碼
   * @param {string} message 顯示訊息
   * @param {object} details 額外資訊
   * @param {unknown} cause 原始錯誤
   * @returns {Error}
   */
  function createAuthError(code, message, details, cause) {
    const error = new Error(
      message || '會員登入程序發生錯誤。'
    );

    error.name = 'XuanXiangMemberAuthError';
    error.code = `member/auth/${code || 'unknown'}`;

    if (details && typeof details === 'object') {
      Object.keys(details).forEach(function assignDetail(key) {
        error[key] = details[key];
      });
    }

    if (cause !== undefined) {
      error.cause = cause;
    }

    return error;
  }

  /**
   * 正規化字串。
   *
   * @param {unknown} value 原始內容
   * @param {string} fallback 預設值
   * @returns {string}
   */
  function normalizeString(value, fallback) {
    if (value === undefined || value === null) {
      return fallback || '';
    }

    return String(value).trim();
  }

  /**
   * 判斷一般物件。
   *
   * @param {unknown} value 原始內容
   * @returns {boolean}
   */
  function isPlainObject(value) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    );
  }

  /**
   * 複製一般物件。
   *
   * @param {unknown} value 原始內容
   * @returns {object}
   */
  function cloneObject(value) {
    return isPlainObject(value)
      ? Object.assign({}, value)
      : {};
  }

  /**
   * 取得會員中心設定。
   *
   * @returns {object}
   */
  function getConfig() {
    const config =
      global.XuanXiangMemberConfig ||
      global.MEMBER_CONFIG;

    if (!config || typeof config !== 'object') {
      throw createAuthError(
        'config-not-loaded',
        '尚未載入會員中心 config.js。'
      );
    }

    return config;
  }

  /**
   * 取得 Firebase 模組。
   *
   * @returns {object}
   */
  function getFirebaseModule() {
    const firebaseModule = global.XuanXiangFirebase;

    if (!firebaseModule) {
      throw createAuthError(
        'firebase-module-not-loaded',
        '尚未載入 firebase.js。'
      );
    }

    return firebaseModule;
  }

  /**
   * 取得 API 模組。
   *
   * @returns {object}
   */
  function getApiModule() {
    const apiModule = global.XuanXiangMemberApi;

    if (!apiModule) {
      throw createAuthError(
        'api-module-not-loaded',
        '尚未載入 api.js。'
      );
    }

    return apiModule;
  }

  /**
   * 安全取得 localStorage。
   *
   * @returns {Storage|null}
   */
  function getLocalStorage() {
    try {
      if (
        global.localStorage &&
        typeof global.localStorage.getItem === 'function'
      ) {
        return global.localStorage;
      }
    } catch (error) {
      console.warn(
        '[XuanXiangMemberAuth] 無法使用 localStorage：',
        error
      );
    }

    return null;
  }

  /**
   * 安全取得 sessionStorage。
   *
   * @returns {Storage|null}
   */
  function getSessionStorage() {
    try {
      if (
        global.sessionStorage &&
        typeof global.sessionStorage.getItem === 'function'
      ) {
        return global.sessionStorage;
      }
    } catch (error) {
      console.warn(
        '[XuanXiangMemberAuth] 無法使用 sessionStorage：',
        error
      );
    }

    return null;
  }

  /**
   * 取得儲存鍵值。
   *
   * @param {string} keyName 設定鍵名
   * @param {string} fallback 預設鍵值
   * @returns {string}
   */
  function getStorageKey(keyName, fallback) {
    const config = getConfig();
    const storageConfig = config.storage || {};

    return normalizeString(
      storageConfig[keyName],
      fallback
    );
  }

  /**
   * 儲存 JSON。
   *
   * @param {Storage|null} storage 儲存空間
   * @param {string} key 鍵值
   * @param {unknown} value 資料
   * @returns {boolean}
   */
  function writeJson(storage, key, value) {
    if (!storage || !key) {
      return false;
    }

    try {
      storage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn(
        '[XuanXiangMemberAuth] 無法儲存登入資料：',
        error
      );

      return false;
    }
  }

  /**
   * 讀取 JSON。
   *
   * @param {Storage|null} storage 儲存空間
   * @param {string} key 鍵值
   * @returns {unknown|null}
   */
  function readJson(storage, key) {
    if (!storage || !key) {
      return null;
    }

    try {
      const rawValue = storage.getItem(key);

      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue);
    } catch (error) {
      console.warn(
        '[XuanXiangMemberAuth] 無法解析登入資料：',
        error
      );

      return null;
    }
  }

  /**
   * 安全移除儲存內容。
   *
   * @param {Storage|null} storage 儲存空間
   * @param {string} key 鍵值
   */
  function removeStorageValue(storage, key) {
    if (!storage || !key) {
      return;
    }

    try {
      storage.removeItem(key);
    } catch (error) {
      console.warn(
        '[XuanXiangMemberAuth] 無法清除登入資料：',
        error
      );
    }
  }

  /**
   * 不在瀏覽器長期保存 Firebase Token。
   *
   * 清除早期版本可能留下的 Token。
   */
  function clearLegacyTokenStorage() {
    const localStorage = getLocalStorage();
    const sessionStorage = getSessionStorage();

    const tokenKeys = [
      getStorageKey(
        'idToken',
        'xx_member_id_token'
      ),
      getStorageKey(
        'refreshToken',
        'xx_member_refresh_token'
      )
    ];

    tokenKeys.forEach(function clearTokenKey(key) {
      removeStorageValue(localStorage, key);
      removeStorageValue(sessionStorage, key);
    });
  }

  /**
   * 取得 Session 最大有效時間。
   *
   * @returns {number}
   */
  function getSessionMaximumAgeMs() {
    const config = getConfig();
    const configuredValue = Number(
      config.session &&
      config.session.maximumAgeMs
    );

    if (
      Number.isFinite(configuredValue) &&
      configuredValue > 0
    ) {
      return configuredValue;
    }

    return 8 * 60 * 60 * 1000;
  }

  /**
   * 取得 Firebase Provider 清單。
   *
   * @param {object} user Firebase User
   * @returns {string[]}
   */
  function getProviderIds(user) {
    if (!user || !Array.isArray(user.providerData)) {
      return [];
    }

    return user.providerData
      .map(function mapProvider(provider) {
        return normalizeString(
          provider && provider.providerId,
          ''
        );
      })
      .filter(Boolean);
  }

  /**
   * 判斷會員主要登入方式。
   *
   * @param {object} user Firebase User
   * @param {string} fallback 備用方式
   * @returns {string}
   */
  function detectProvider(user, fallback) {
    const fallbackProvider = normalizeString(
      fallback,
      ''
    );

    if (fallbackProvider) {
      return fallbackProvider;
    }

    const providerIds = getProviderIds(user);

    if (providerIds.includes('google.com')) {
      return 'google';
    }

    if (providerIds.includes('password')) {
      return 'password';
    }

    if (
      providerIds.includes('oidc.line') ||
      providerIds.includes('line')
    ) {
      return 'line';
    }

    if (providerIds.includes('apple.com')) {
      return 'apple';
    }

    return 'firebase';
  }

  /**
   * 將 Firebase User 轉為可安全傳送與儲存的資料。
   *
   * 不包含 ID Token、Refresh Token。
   *
   * @param {object|null} user Firebase User
   * @returns {object|null}
   */
  function serializeFirebaseUser(user) {
    if (!user) {
      return null;
    }

    const metadata = user.metadata || {};

    return {
      uid: normalizeString(user.uid, ''),
      email: normalizeString(user.email, ''),
      displayName: normalizeString(
        user.displayName,
        ''
      ),
      phoneNumber: normalizeString(
        user.phoneNumber,
        ''
      ),
      photoURL: normalizeString(
        user.photoURL,
        ''
      ),
      emailVerified: Boolean(user.emailVerified),
      isAnonymous: Boolean(user.isAnonymous),
      providerIds: getProviderIds(user),
      creationTime: normalizeString(
        metadata.creationTime,
        ''
      ),
      lastSignInTime: normalizeString(
        metadata.lastSignInTime,
        ''
      )
    };
  }

  /**
   * 讀取已儲存 Session。
   *
   * @returns {object|null}
   */
  function readStoredSession() {
    const storage = getLocalStorage();
    const sessionKey = getStorageKey(
      'session',
      'xx_member_session'
    );

    const storedSession = readJson(
      storage,
      sessionKey
    );

    return isPlainObject(storedSession)
      ? storedSession
      : null;
  }

  /**
   * 儲存 Session。
   *
   * @param {object} session Session 資料
   */
  function persistSession(session) {
    const storage = getLocalStorage();

    const sessionKey = getStorageKey(
      'session',
      'xx_member_session'
    );

    const profileKey = getStorageKey(
      'profile',
      'xx_member_profile'
    );

    writeJson(storage, sessionKey, session);

    if (session && session.member) {
      writeJson(
        storage,
        profileKey,
        session.member
      );
    }
  }

  /**
   * 清除會員 Session。
   */
  function clearStoredSession() {
    const localStorage = getLocalStorage();
    const sessionStorage = getSessionStorage();

    const keys = [
      getStorageKey(
        'session',
        'xx_member_session'
      ),
      getStorageKey(
        'profile',
        'xx_member_profile'
      ),
      getStorageKey(
        'loginProvider',
        'xx_member_login_provider'
      )
    ];

    keys.forEach(function clearKey(key) {
      removeStorageValue(localStorage, key);
      removeStorageValue(sessionStorage, key);
    });

    clearLegacyTokenStorage();
  }

  /**
   * 檢查已儲存 Session 是否可沿用。
   *
   * @param {object|null} session 已儲存 Session
   * @param {object|null} user Firebase User
   * @returns {boolean}
   */
  function isSessionUsable(session, user) {
    if (
      !session ||
      !user ||
      !normalizeString(user.uid, '')
    ) {
      return false;
    }

    if (
      normalizeString(session.uid, '') !==
      normalizeString(user.uid, '')
    ) {
      return false;
    }

    const expiresAt = Number(session.expiresAt);

    if (
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return false;
    }

    return true;
  }

  /**
   * 取得後端回應中的會員資料。
   *
   * @param {object} response API 回應
   * @returns {object|null}
   */
  function extractMemberFromResponse(response) {
    if (!isPlainObject(response)) {
      return null;
    }

    if (isPlainObject(response.member)) {
      return response.member;
    }

    if (
      isPlainObject(response.data) &&
      isPlainObject(response.data.member)
    ) {
      return response.data.member;
    }

    if (isPlainObject(response.profile)) {
      return response.profile;
    }

    return null;
  }

  /**
   * 建立不含敏感 Token 的 Session。
   *
   * @param {object} user Firebase User
   * @param {string} provider 登入方式
   * @param {object} response 後端回應
   * @returns {object}
   */
  function createSafeSession(user, provider, response) {
    const now = Date.now();
    const member = extractMemberFromResponse(response);

    const backendSession =
      isPlainObject(response) &&
      isPlainObject(response.session)
        ? response.session
        : {};

    return {
      authenticated: true,
      uid: normalizeString(user.uid, ''),
      provider: detectProvider(user, provider),
      createdAt: now,
      expiresAt:
        now + getSessionMaximumAgeMs(),
      user: serializeFirebaseUser(user),
      member: member,
      backend: {
        requestId: normalizeString(
          response && response.requestId,
          ''
        ),
        sessionId: normalizeString(
          response && response.sessionId,
          normalizeString(
            backendSession.id,
            ''
          )
        )
      }
    };
  }

  /**
   * 取得公開狀態快照。
   *
   * @returns {object}
   */
  function getSnapshot() {
    return {
      initialized: state.initialized,
      status: state.status,
      authenticated: Boolean(state.currentUser),
      currentUser: serializeFirebaseUser(
        state.currentUser
      ),
      session: state.session,
      lastError: state.lastError
        ? {
            name: state.lastError.name,
            code: state.lastError.code,
            message: state.lastError.message
          }
        : null
    };
  }

  /**
   * 通知登入狀態監聽者。
   *
   * @param {string} eventName 事件名稱
   */
  function notifyListeners(eventName) {
    const snapshot = getSnapshot();

    state.listeners.forEach(function notify(listener) {
      try {
        listener(snapshot, eventName);
      } catch (error) {
        console.error(
          '[XuanXiangMemberAuth] 登入監聽器發生錯誤：',
          error
        );
      }
    });
  }

  /**
   * 設定狀態。
   *
   * @param {string} status 狀態名稱
   * @param {Error|null} error 錯誤
   * @param {string} eventName 事件
   */
  function updateStatus(status, error, eventName) {
    state.status = status;
    state.lastError = error || null;

    notifyListeners(
      eventName || 'status'
    );
  }

  /**
   * 將 Firebase 錯誤轉為繁體中文。
   *
   * @param {unknown} originalError Firebase 錯誤
   * @param {string} fallbackCode 備用代碼
   * @returns {Error}
   */
  function normalizeFirebaseError(
    originalError,
    fallbackCode
  ) {
    if (
      originalError &&
      originalError.name ===
        'XuanXiangMemberAuthError'
    ) {
      return originalError;
    }

    const firebaseCode = normalizeString(
      originalError && originalError.code,
      fallbackCode || 'firebase-error'
    );

    const messages = {
      'auth/invalid-email':
        'Email 格式不正確。',
      'auth/user-disabled':
        '此會員帳號已被停用，請聯絡客服。',
      'auth/user-not-found':
        '找不到此會員帳號。',
      'auth/wrong-password':
        '密碼不正確，請重新輸入。',
      'auth/invalid-credential':
        '帳號或密碼不正確。',
      'auth/email-already-in-use':
        '此 Email 已經註冊。',
      'auth/weak-password':
        '密碼強度不足，請至少使用 6 個字元。',
      'auth/too-many-requests':
        '登入嘗試次數過多，請稍後再試。',
      'auth/network-request-failed':
        '網路連線異常，請檢查網路後重試。',
      'auth/popup-closed-by-user':
        'Google 登入視窗已關閉。',
      'auth/popup-blocked':
        '瀏覽器封鎖了登入視窗，請允許彈出式視窗。',
      'auth/cancelled-popup-request':
        '已有另一個登入視窗正在處理。',
      'auth/account-exists-with-different-credential':
        '此 Email 已使用其他登入方式註冊。',
      'auth/operation-not-allowed':
        '此登入方式尚未在 Firebase 啟用。',
      'auth/unauthorized-domain':
        '目前網域尚未加入 Firebase 授權網域。',
      'auth/requires-recent-login':
        '此操作需要重新登入後才能執行。'
    };

    return createAuthError(
      firebaseCode.replace(/^auth\//, ''),
      messages[firebaseCode] ||
        normalizeString(
          originalError && originalError.message,
          '會員登入失敗，請稍後再試。'
        ),
      {
        firebaseCode: firebaseCode
      },
      originalError
    );
  }

  /**
   * 呼叫後端建立會員資料與工作階段。
   *
   * 同一 UID 同時間只執行一次，避免 Auth Listener
   * 與登入按鈕同時觸發重複 API。
   *
   * @param {object} user Firebase User
   * @param {string} provider 登入方式
   * @param {object} profile 補充資料
   * @returns {Promise<object>}
   */
  function exchangeMemberSession(
    user,
    provider,
    profile
  ) {
    const uid = normalizeString(
      user && user.uid,
      ''
    );

    if (!uid) {
      return Promise.reject(
        createAuthError(
          'missing-user-uid',
          'Firebase 沒有回傳會員 UID。'
        )
      );
    }

    if (state.exchangePromises.has(uid)) {
      return state.exchangePromises.get(uid);
    }

    const exchangePromise = (async function performExchange() {
      updateStatus(
        'creating-session',
        null,
        'session-start'
      );

      const api = getApiModule();

      const response = await api.memberLogin({
        provider: detectProvider(
          user,
          provider
        ),
        firebaseUser:
          serializeFirebaseUser(user),
        profile: cloneObject(profile)
      });

      const session = createSafeSession(
        user,
        provider,
        response
      );

      state.currentUser = user;
      state.session = session;

      persistSession(session);
      clearLegacyTokenStorage();

      updateStatus(
        'authenticated',
        null,
        'signed-in'
      );

      return {
        user: user,
        session: session,
        response: response
      };
    })();

    state.exchangePromises.set(
      uid,
      exchangePromise
    );

    return exchangePromise.finally(
      function clearExchangePromise() {
        state.exchangePromises.delete(uid);
      }
    );
  }

  /**
   * 確保會員 Session 已建立。
   *
   * @param {object} user Firebase User
   * @param {string} provider 登入方式
   * @param {object} profile 補充資料
   * @param {boolean} forceExchange 強制重建
   * @returns {Promise<object>}
   */
  async function ensureMemberSession(
    user,
    provider,
    profile,
    forceExchange
  ) {
    const storedSession = readStoredSession();

    if (
      !forceExchange &&
      isSessionUsable(storedSession, user)
    ) {
      state.currentUser = user;
      state.session = storedSession;

      updateStatus(
        'authenticated',
        null,
        'session-restored'
      );

      return {
        user: user,
        session: storedSession,
        response: null
      };
    }

    return exchangeMemberSession(
      user,
      provider,
      profile
    );
  }

  /**
   * 處理 Firebase 登入狀態變更。
   *
   * @param {object|null} user Firebase User
   * @param {string} provider 登入方式
   * @param {boolean} forceExchange 是否強制建立 Session
   * @returns {Promise<object|null>}
   */
  async function handleAuthUser(
    user,
    provider,
    forceExchange
  ) {
    if (!user) {
      state.currentUser = null;
      state.session = null;
      state.lastObservedUid = '';

      clearStoredSession();

      updateStatus(
        'signed-out',
        null,
        'signed-out'
      );

      return null;
    }

    state.currentUser = user;
    state.lastObservedUid = normalizeString(
      user.uid,
      ''
    );

    try {
      return await ensureMemberSession(
        user,
        provider,
        {},
        Boolean(forceExchange)
      );
    } catch (error) {
      const normalizedError =
        error &&
        error.name === 'XuanXiangMemberAuthError'
          ? error
          : createAuthError(
              'backend-session-failed',
              'Firebase 已登入，但無法建立會員中心工作階段。',
              {},
              error
            );

      state.session = null;

      updateStatus(
        'authenticated-without-session',
        normalizedError,
        'session-error'
      );

      throw normalizedError;
    }
  }

  /**
   * 啟動 Firebase 登入狀態監聽。
   */
  function subscribeFirebaseAuthState() {
    if (state.authUnsubscribe) {
      return;
    }

    const firebaseModule =
      getFirebaseModule();

    state.authUnsubscribe =
      firebaseModule.onAuthStateChanged(
        function handleFirebaseUser(user) {
          const uid = normalizeString(
            user && user.uid,
            ''
          );

          if (
            uid &&
            uid === state.lastObservedUid &&
            state.currentUser
          ) {
            state.currentUser = user;
            return;
          }

          handleAuthUser(
            user || null,
            '',
            false
          ).catch(function handleListenerError(error) {
            console.warn(
              '[XuanXiangMemberAuth] 登入狀態同步失敗：',
              error
            );
          });
        },
        function handleFirebaseListenerError(error) {
          const normalizedError =
            normalizeFirebaseError(
              error,
              'auth-state-failed'
            );

          updateStatus(
            'error',
            normalizedError,
            'auth-state-error'
          );
        }
      );
  }

  /**
   * 初始化會員登入系統。
   *
   * @param {{
   *   persistence?: 'local'|'session'|'none',
   *   exchangeSession?: boolean,
   *   strictSession?: boolean
   * }} options 初始化設定
   * @returns {Promise<object>}
   */
  function initialize(options) {
    if (state.readyPromise) {
      return state.readyPromise;
    }

    const initializeOptions =
      isPlainObject(options)
        ? options
        : {};

    state.readyPromise = (async function performInitialization() {
      updateStatus(
        'initializing',
        null,
        'initializing'
      );

      clearLegacyTokenStorage();

      const firebaseModule =
        getFirebaseModule();

      firebaseModule.initialize({
        persistence:
          normalizeString(
            initializeOptions.persistence,
            'local'
          )
      });

      if (
        typeof firebaseModule.waitForPersistence ===
        'function'
      ) {
        await firebaseModule.waitForPersistence();
      }

      const user =
        await firebaseModule.waitForAuthReady();

      state.initialized = true;
      state.currentUser = user || null;
      state.lastObservedUid = normalizeString(
        user && user.uid,
        ''
      );

      if (user) {
        const shouldExchange =
          initializeOptions.exchangeSession !== false;

        if (shouldExchange) {
          try {
            await ensureMemberSession(
              user,
              '',
              {},
              false
            );
          } catch (error) {
            if (
              initializeOptions.strictSession === true
            ) {
              throw error;
            }
          }
        } else {
          updateStatus(
            'firebase-authenticated',
            null,
            'firebase-ready'
          );
        }
      } else {
        state.session = null;
        clearStoredSession();

        updateStatus(
          'signed-out',
          null,
          'ready'
        );
      }

      subscribeFirebaseAuthState();

      return getSnapshot();
    })().catch(function handleInitializationError(error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'initialization-failed'
        );

      state.initialized = false;
      state.readyPromise = null;

      updateStatus(
        'error',
        normalizedError,
        'initialization-error'
      );

      throw normalizedError;
    });

    return state.readyPromise;
  }

  /**
   * 驗證 Email 格式。
   *
   * @param {string} email Email
   * @returns {string}
   */
  function validateEmail(email) {
    const normalizedEmail = normalizeString(
      email,
      ''
    ).toLowerCase();

    if (!normalizedEmail) {
      throw createAuthError(
        'missing-email',
        '請輸入 Email。'
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      )
    ) {
      throw createAuthError(
        'invalid-email',
        'Email 格式不正確。'
      );
    }

    return normalizedEmail;
  }

  /**
   * 驗證密碼。
   *
   * @param {string} password 密碼
   * @param {number} minimumLength 最短長度
   * @returns {string}
   */
  function validatePassword(
    password,
    minimumLength
  ) {
    const normalizedPassword =
      password === undefined ||
      password === null
        ? ''
        : String(password);

    if (!normalizedPassword) {
      throw createAuthError(
        'missing-password',
        '請輸入密碼。'
      );
    }

    const requiredLength =
      Number.isFinite(Number(minimumLength))
        ? Number(minimumLength)
        : 6;

    if (
      normalizedPassword.length <
      requiredLength
    ) {
      throw createAuthError(
        'weak-password',
        `密碼至少需要 ${requiredLength} 個字元。`
      );
    }

    return normalizedPassword;
  }

  /**
   * Email／密碼登入。
   *
   * @param {string} email Email
   * @param {string} password 密碼
   * @param {object} profile 補充會員資料
   * @returns {Promise<object>}
   */
  async function signInWithEmail(
    email,
    password,
    profile
  ) {
    await initialize();

    const normalizedEmail =
      validateEmail(email);

    const normalizedPassword =
      validatePassword(password, 1);

    updateStatus(
      'signing-in',
      null,
      'email-sign-in-start'
    );

    try {
      const auth =
        getFirebaseModule().getAuth();

      if (
        typeof auth.signInWithEmailAndPassword !==
        'function'
      ) {
        throw createAuthError(
          'email-login-unavailable',
          'Firebase Email 登入功能不可用。'
        );
      }

      const credential =
        await auth.signInWithEmailAndPassword(
          normalizedEmail,
          normalizedPassword
        );

      const user =
        credential &&
        credential.user
          ? credential.user
          : auth.currentUser;

      return await ensureMemberSession(
        user,
        'password',
        cloneObject(profile),
        true
      );
    } catch (error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'email-sign-in-failed'
        );

      updateStatus(
        'signed-out',
        normalizedError,
        'email-sign-in-error'
      );

      throw normalizedError;
    }
  }

  /**
   * Email 註冊。
   *
   * @param {object} params 註冊資料
   * @returns {Promise<object>}
   */
  async function registerWithEmail(params) {
    await initialize();

    const registration =
      cloneObject(params);

    const email =
      validateEmail(registration.email);

    const password =
      validatePassword(
        registration.password,
        6
      );

    const displayName = normalizeString(
      registration.displayName,
      normalizeString(
        registration.name,
        ''
      )
    );

    updateStatus(
      'registering',
      null,
      'registration-start'
    );

    try {
      const auth =
        getFirebaseModule().getAuth();

      if (
        typeof auth.createUserWithEmailAndPassword !==
        'function'
      ) {
        throw createAuthError(
          'registration-unavailable',
          'Firebase Email 註冊功能不可用。'
        );
      }

      const credential =
        await auth.createUserWithEmailAndPassword(
          email,
          password
        );

      const user =
        credential &&
        credential.user
          ? credential.user
          : auth.currentUser;

      if (
        user &&
        displayName &&
        typeof user.updateProfile === 'function'
      ) {
        await user.updateProfile({
          displayName: displayName
        });
      }

      return await ensureMemberSession(
        user,
        'password',
        {
          name: displayName,
          phone: normalizeString(
            registration.phone,
            ''
          ),
          source: normalizeString(
            registration.source,
            'member-register'
          )
        },
        true
      );
    } catch (error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'registration-failed'
        );

      updateStatus(
        'signed-out',
        normalizedError,
        'registration-error'
      );

      throw normalizedError;
    }
  }

  /**
   * 傳送重設密碼信件。
   *
   * @param {string} email Email
   * @param {object} actionCodeSettings Firebase 設定
   * @returns {Promise<object>}
   */
  async function sendPasswordReset(
    email,
    actionCodeSettings
  ) {
    await initialize({
      exchangeSession: false
    });

    const normalizedEmail =
      validateEmail(email);

    try {
      const auth =
        getFirebaseModule().getAuth();

      if (
        typeof auth.sendPasswordResetEmail !==
        'function'
      ) {
        throw createAuthError(
          'password-reset-unavailable',
          'Firebase 忘記密碼功能不可用。'
        );
      }

      if (isPlainObject(actionCodeSettings)) {
        await auth.sendPasswordResetEmail(
          normalizedEmail,
          actionCodeSettings
        );
      } else {
        await auth.sendPasswordResetEmail(
          normalizedEmail
        );
      }

      notifyListeners('password-reset-sent');

      return {
        ok: true,
        email: normalizedEmail,
        message:
          '密碼重設信件已寄出，請檢查信箱。'
      };
    } catch (error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'password-reset-failed'
        );

      updateStatus(
        state.currentUser
          ? 'authenticated'
          : 'signed-out',
        normalizedError,
        'password-reset-error'
      );

      throw normalizedError;
    }
  }

  /**
   * Google 登入。
   *
   * popup：直接開啟登入視窗
   * redirect：整頁導向 Google
   *
   * @param {{
   *   mode?: 'popup'|'redirect',
   *   scopes?: string[],
   *   prompt?: string,
   *   profile?: object
   * }} options 登入設定
   * @returns {Promise<object>}
   */
  async function signInWithGoogle(options) {
    await initialize();

    const googleOptions =
      isPlainObject(options)
        ? options
        : {};

    const mode = normalizeString(
      googleOptions.mode,
      'popup'
    ).toLowerCase();

    const firebaseModule =
      getFirebaseModule();

    const auth =
      firebaseModule.getAuth();

    const provider =
      firebaseModule.createGoogleProvider({
        scopes: Array.isArray(
          googleOptions.scopes
        )
          ? googleOptions.scopes
          : ['email', 'profile'],
        prompt: normalizeString(
          googleOptions.prompt,
          'select_account'
        )
      });

    updateStatus(
      'signing-in',
      null,
      'google-sign-in-start'
    );

    try {
      if (mode === 'redirect') {
        if (
          typeof auth.signInWithRedirect !==
          'function'
        ) {
          throw createAuthError(
            'google-redirect-unavailable',
            'Firebase Google Redirect 登入不可用。'
          );
        }

        await auth.signInWithRedirect(provider);

        return {
          redirecting: true,
          provider: 'google'
        };
      }

      if (
        typeof auth.signInWithPopup !==
        'function'
      ) {
        throw createAuthError(
          'google-popup-unavailable',
          'Firebase Google Popup 登入不可用。'
        );
      }

      const credential =
        await auth.signInWithPopup(provider);

      const user =
        credential &&
        credential.user
          ? credential.user
          : auth.currentUser;

      return await ensureMemberSession(
        user,
        'google',
        cloneObject(
          googleOptions.profile
        ),
        true
      );
    } catch (error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'google-sign-in-failed'
        );

      updateStatus(
        state.currentUser
          ? 'authenticated'
          : 'signed-out',
        normalizedError,
        'google-sign-in-error'
      );

      throw normalizedError;
    }
  }

  /**
   * 完成 Google Redirect 登入。
   *
   * @returns {Promise<object|null>}
   */
  async function completeGoogleRedirect() {
    await initialize({
      exchangeSession: false
    });

    const auth =
      getFirebaseModule().getAuth();

    if (
      typeof auth.getRedirectResult !==
      'function'
    ) {
      throw createAuthError(
        'redirect-result-unavailable',
        'Firebase Redirect 回傳功能不可用。'
      );
    }

    try {
      const credential =
        await auth.getRedirectResult();

      if (
        !credential ||
        !credential.user
      ) {
        return null;
      }

      return await ensureMemberSession(
        credential.user,
        'google',
        {},
        true
      );
    } catch (error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'google-redirect-failed'
        );

      updateStatus(
        'signed-out',
        normalizedError,
        'google-redirect-error'
      );

      throw normalizedError;
    }
  }

  /**
   * 產生 OAuth State。
   *
   * @returns {string}
   */
  function createOAuthState() {
    const bytes = new Uint8Array(24);

    if (
      global.crypto &&
      typeof global.crypto.getRandomValues ===
        'function'
    ) {
      global.crypto.getRandomValues(bytes);

      return Array.from(bytes)
        .map(function mapByte(value) {
          return value
            .toString(16)
            .padStart(2, '0');
        })
        .join('');
    }

    return [
      Date.now().toString(36),
      Math.random().toString(36).slice(2),
      Math.random().toString(36).slice(2)
    ].join('-');
  }

  /**
   * 取得 LINE OAuth State 儲存鍵值。
   *
   * @returns {string}
   */
  function getLineStateStorageKey() {
    return `${getStorageKey(
      'session',
      'xx_member_session'
    )}_line_oauth_state`;
  }

  /**
   * 建立 LINE Login 導向網址。
   *
   * 後端需提供：
   * action=lineLoginStart
   *
   * 完成後導回 login.html，並附帶：
   * customToken
   * state
   *
   * @param {object} options LINE Login 設定
   * @returns {string}
   */
  function buildLineLoginUrl(options) {
    const lineOptions =
      isPlainObject(options)
        ? options
        : {};

    const api =
      getApiModule();

    const baseUrl =
      normalizeString(
        lineOptions.startUrl,
        api.getBaseUrl()
      );

    if (!baseUrl) {
      throw createAuthError(
        'line-login-url-missing',
        '尚未設定 LINE Login 後端網址。'
      );
    }

    const oauthState = createOAuthState();

    const currentUrl =
      global.location &&
      global.location.href
        ? String(global.location.href)
        : '';

    const returnUrl = normalizeString(
      lineOptions.returnUrl,
      currentUrl
    );

    const storage =
      getSessionStorage();

    writeJson(
      storage,
      getLineStateStorageKey(),
      {
        state: oauthState,
        createdAt: Date.now(),
        returnUrl: returnUrl
      }
    );

    const query = new URLSearchParams();

    query.set(
      'action',
      normalizeString(
        lineOptions.action,
        'lineLoginStart'
      )
    );

    query.set('state', oauthState);

    if (returnUrl) {
      query.set('returnUrl', returnUrl);
    }

    if (lineOptions.prompt) {
      query.set(
        'prompt',
        normalizeString(
          lineOptions.prompt,
          ''
        )
      );
    }

    return `${baseUrl}${
      baseUrl.includes('?') ? '&' : '?'
    }${query.toString()}`;
  }

  /**
   * 開始 LINE Login。
   *
   * @param {{
   *   navigate?: boolean,
   *   startUrl?: string,
   *   returnUrl?: string,
   *   action?: string
   * }} options LINE Login 設定
   * @returns {object}
   */
  function beginLineLogin(options) {
    const lineOptions =
      isPlainObject(options)
        ? options
        : {};

    const url =
      buildLineLoginUrl(lineOptions);

    updateStatus(
      'redirecting',
      null,
      'line-login-start'
    );

    if (
      lineOptions.navigate !== false &&
      global.location &&
      typeof global.location.assign ===
        'function'
    ) {
      global.location.assign(url);
    }

    return {
      redirecting:
        lineOptions.navigate !== false,
      provider: 'line',
      url: url
    };
  }

  /**
   * 從網址取得 LINE 回呼參數。
   *
   * @param {string} callbackUrl 回呼網址
   * @returns {object}
   */
  function parseLineCallback(callbackUrl) {
    const targetUrl = normalizeString(
      callbackUrl,
      global.location &&
      global.location.href
        ? global.location.href
        : ''
    );

    if (!targetUrl) {
      return {
        customToken: '',
        state: '',
        error: '',
        errorDescription: ''
      };
    }

    const url = new URL(
      targetUrl,
      global.location &&
      global.location.origin
        ? global.location.origin
        : 'https://member.local'
    );

    return {
      customToken: normalizeString(
        url.searchParams.get('customToken') ||
        url.searchParams.get('firebaseCustomToken'),
        ''
      ),
      state: normalizeString(
        url.searchParams.get('state'),
        ''
      ),
      error: normalizeString(
        url.searchParams.get('error'),
        ''
      ),
      errorDescription: normalizeString(
        url.searchParams.get(
          'error_description'
        ),
        ''
      )
    };
  }

  /**
   * 清除 LINE 回呼網址中的敏感參數。
   *
   * @param {string} callbackUrl 原始網址
   */
  function cleanLineCallbackUrl(callbackUrl) {
    if (
      !global.history ||
      typeof global.history.replaceState !==
        'function'
    ) {
      return;
    }

    try {
      const url = new URL(
        callbackUrl ||
          global.location.href
      );

      [
        'customToken',
        'firebaseCustomToken',
        'state',
        'error',
        'error_description'
      ].forEach(function deleteParameter(key) {
        url.searchParams.delete(key);
      });

      global.history.replaceState(
        {},
        global.document
          ? global.document.title
          : '',
        `${url.pathname}${
          url.searchParams.toString()
            ? `?${url.searchParams.toString()}`
            : ''
        }${url.hash || ''}`
      );
    } catch (error) {
      console.warn(
        '[XuanXiangMemberAuth] 無法清除 LINE 回呼網址：',
        error
      );
    }
  }

  /**
   * 完成 LINE Login 回呼。
   *
   * 後端需將 LINE 身分換成 Firebase Custom Token。
   *
   * @param {string} callbackUrl 回呼網址
   * @returns {Promise<object|null>}
   */
  async function completeLineLogin(
    callbackUrl
  ) {
    const callback =
      parseLineCallback(callbackUrl);

    if (
      !callback.customToken &&
      !callback.error
    ) {
      return null;
    }

    if (callback.error) {
      throw createAuthError(
        'line-provider-error',
        callback.errorDescription ||
          'LINE Login 未完成。',
        {
          providerError: callback.error
        }
      );
    }

    const storage =
      getSessionStorage();

    const storedState =
      readJson(
        storage,
        getLineStateStorageKey()
      );

    if (
      !storedState ||
      !storedState.state ||
      storedState.state !== callback.state
    ) {
      throw createAuthError(
        'line-state-mismatch',
        'LINE Login 安全驗證失敗，請重新登入。'
      );
    }

    const stateAge =
      Date.now() -
      Number(storedState.createdAt || 0);

    if (
      !Number.isFinite(stateAge) ||
      stateAge < 0 ||
      stateAge > 10 * 60 * 1000
    ) {
      throw createAuthError(
        'line-state-expired',
        'LINE Login 已逾時，請重新登入。'
      );
    }

    await initialize({
      exchangeSession: false
    });

    const auth =
      getFirebaseModule().getAuth();

    if (
      typeof auth.signInWithCustomToken !==
      'function'
    ) {
      throw createAuthError(
        'custom-token-unavailable',
        'Firebase Custom Token 登入功能不可用。'
      );
    }

    updateStatus(
      'signing-in',
      null,
      'line-callback-start'
    );

    try {
      const credential =
        await auth.signInWithCustomToken(
          callback.customToken
        );

      const user =
        credential &&
        credential.user
          ? credential.user
          : auth.currentUser;

      removeStorageValue(
        storage,
        getLineStateStorageKey()
      );

      cleanLineCallbackUrl(
        callbackUrl ||
        (
          global.location &&
          global.location.href
            ? global.location.href
            : ''
        )
      );

      return await ensureMemberSession(
        user,
        'line',
        {},
        true
      );
    } catch (error) {
      const normalizedError =
        normalizeFirebaseError(
          error,
          'line-sign-in-failed'
        );

      updateStatus(
        'signed-out',
        normalizedError,
        'line-sign-in-error'
      );

      throw normalizedError;
    }
  }

  /**
   * 登出會員。
   *
   * 先通知後端，再登出 Firebase。
   * 即使後端暫時失敗，仍會完成本機登出。
   *
   * @returns {Promise<object>}
   */
  async function signOut() {
    updateStatus(
      'signing-out',
      null,
      'sign-out-start'
    );

    let backendError = null;
    let firebaseError = null;

    try {
      if (state.currentUser) {
        await getApiModule().logout();
      }
    } catch (error) {
      backendError = error;

      console.warn(
        '[XuanXiangMemberAuth] 後端登出失敗：',
        error
      );
    }

    try {
      const firebaseModule =
        getFirebaseModule();

      const auth =
        firebaseModule.getAuth();

      if (
        typeof auth.signOut === 'function'
      ) {
        await auth.signOut();
      }
    } catch (error) {
      firebaseError =
        normalizeFirebaseError(
          error,
          'sign-out-failed'
        );
    }

    state.currentUser = null;
    state.session = null;
    state.lastObservedUid = '';

    clearStoredSession();

    updateStatus(
      'signed-out',
      firebaseError,
      'signed-out'
    );

    if (firebaseError) {
      throw firebaseError;
    }

    return {
      ok: true,
      backendLogoutOk:
        backendError === null,
      message: '已安全登出會員中心。'
    };
  }

  /**
   * 強制更新後端會員 Session。
   *
   * @returns {Promise<object>}
   */
  async function refreshSession() {
    await initialize({
      exchangeSession: false
    });

    const user =
      getFirebaseModule().getCurrentUser();

    if (!user) {
      throw createAuthError(
        'not-authenticated',
        '目前沒有登入中的會員。'
      );
    }

    return ensureMemberSession(
      user,
      detectProvider(user, ''),
      {},
      true
    );
  }

  /**
   * 確認會員已登入。
   *
   * @returns {Promise<object>}
   */
  async function requireAuthenticated() {
    await initialize();

    if (!state.currentUser) {
      throw createAuthError(
        'not-authenticated',
        '請先登入會員中心。'
      );
    }

    if (!state.session) {
      await refreshSession();
    }

    return {
      user: state.currentUser,
      session: state.session
    };
  }

  /**
   * 訂閱登入狀態。
   *
   * @param {(snapshot: object, eventName: string) => void} listener
   * @param {boolean} emitImmediately 是否立即回傳目前狀態
   * @returns {Function}
   */
  function onChange(
    listener,
    emitImmediately
  ) {
    if (typeof listener !== 'function') {
      throw createAuthError(
        'invalid-listener',
        '登入狀態監聽器必須是函式。'
      );
    }

    state.listeners.add(listener);

    if (emitImmediately !== false) {
      listener(
        getSnapshot(),
        'subscribe'
      );
    }

    return function unsubscribe() {
      state.listeners.delete(listener);
    };
  }

  /**
   * 取得目前 Firebase User。
   *
   * @returns {object|null}
   */
  function getCurrentUser() {
    return state.currentUser;
  }

  /**
   * 取得目前會員 Session。
   *
   * @returns {object|null}
   */
  function getSession() {
    return state.session;
  }

  /**
   * 判斷目前是否已登入。
   *
   * @returns {boolean}
   */
  function isAuthenticated() {
    return Boolean(
      state.currentUser &&
      state.session
    );
  }

  /**
   * 停止登入狀態監聽。
   *
   * 一般頁面不需要主動呼叫。
   */
  function destroy() {
    if (
      typeof state.authUnsubscribe ===
      'function'
    ) {
      state.authUnsubscribe();
    }

    state.authUnsubscribe = null;
    state.listeners.clear();
    state.readyPromise = null;
    state.initialized = false;
  }

  const publicApi = Object.freeze({
    initialize: initialize,
    signInWithEmail: signInWithEmail,
    registerWithEmail: registerWithEmail,
    sendPasswordReset: sendPasswordReset,
    signInWithGoogle: signInWithGoogle,
    completeGoogleRedirect:
      completeGoogleRedirect,
    beginLineLogin: beginLineLogin,
    buildLineLoginUrl: buildLineLoginUrl,
    completeLineLogin: completeLineLogin,
    parseLineCallback: parseLineCallback,
    signOut: signOut,
    refreshSession: refreshSession,
    requireAuthenticated:
      requireAuthenticated,
    getCurrentUser: getCurrentUser,
    getSession: getSession,
    getSnapshot: getSnapshot,
    isAuthenticated: isAuthenticated,
    onChange: onChange,
    normalizeFirebaseError:
      normalizeFirebaseError,
    createError: createAuthError,
    destroy: destroy
  });

  global[MODULE_NAME] = publicApi;
})(globalThis);
