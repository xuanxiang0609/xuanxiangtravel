/**
 * ============================================================
 * 玹翔旅遊 V39 Member Center
 * firebase.js｜Firebase Authentication 初始化模組
 * ============================================================
 *
 * 職責：
 * 1. 初始化 Firebase App
 * 2. 初始化 Firebase Authentication
 * 3. 設定登入狀態持久化
 * 4. 等待 Firebase 還原登入狀態
 * 5. 提供目前登入會員及 ID Token
 * 6. 建立 Google 登入 Provider
 *
 * 載入順序：
 * 1. Firebase App Compat SDK
 * 2. Firebase Auth Compat SDK
 * 3. config.js
 * 4. firebase.js
 *
 * 注意：
 * LINE Login 不屬於 Firebase 原生 Provider，
 * 將由後續 auth.js 與後端 API 流程處理。
 */

(function initializeXuanXiangFirebaseModule(global) {
  'use strict';

  const MODULE_NAME = 'XuanXiangFirebase';

  const state = {
    app: null,
    auth: null,
    initialized: false,
    readyPromise: null,
    persistencePromise: null
  };

  /**
   * 取得會員中心設定。
   *
   * @returns {object}
   */
  function getMemberConfig() {
    const config =
      global.XuanXiangMemberConfig ||
      global.MEMBER_CONFIG;

    if (!config || typeof config !== 'object') {
      throw createFirebaseError(
        'config-not-loaded',
        '尚未載入會員中心 config.js。'
      );
    }

    return config;
  }

  /**
   * 取得 Firebase Compat SDK。
   *
   * @returns {object}
   */
  function getFirebaseSdk() {
    const sdk = global.firebase;

    if (!sdk || typeof sdk !== 'object') {
      throw createFirebaseError(
        'sdk-not-loaded',
        '尚未載入 Firebase SDK。'
      );
    }

    if (typeof sdk.initializeApp !== 'function') {
      throw createFirebaseError(
        'app-sdk-not-loaded',
        '尚未載入 Firebase App SDK。'
      );
    }

    if (typeof sdk.auth !== 'function') {
      throw createFirebaseError(
        'auth-sdk-not-loaded',
        '尚未載入 Firebase Authentication SDK。'
      );
    }

    return sdk;
  }

  /**
   * 建立統一錯誤物件。
   *
   * @param {string} code 錯誤代碼
   * @param {string} message 錯誤訊息
   * @param {unknown} cause 原始錯誤
   * @returns {Error}
   */
  function createFirebaseError(code, message, cause) {
    const error = new Error(message);

    error.name = 'XuanXiangFirebaseError';
    error.code = `member/firebase/${code}`;

    if (cause !== undefined) {
      error.cause = cause;
    }

    return error;
  }

  /**
   * 正規化字串。
   *
   * @param {unknown} value 原始內容
   * @returns {string}
   */
  function normalizeString(value) {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).trim();
  }

  /**
   * 取得可供 Firebase 初始化的設定。
   *
   * @returns {object}
   */
  function getFirebaseOptions() {
    const config = getMemberConfig();
    const firebaseConfig = config.firebase || {};

    const options = {
      apiKey: normalizeString(firebaseConfig.apiKey),
      authDomain: normalizeString(firebaseConfig.authDomain),
      projectId: normalizeString(firebaseConfig.projectId),
      appId: normalizeString(firebaseConfig.appId)
    };

    const messagingSenderId = normalizeString(
      firebaseConfig.messagingSenderId
    );

    const measurementId = normalizeString(
      firebaseConfig.measurementId
    );

    if (messagingSenderId) {
      options.messagingSenderId = messagingSenderId;
    }

    if (measurementId) {
      options.measurementId = measurementId;
    }

    return options;
  }

  /**
   * 檢查 Firebase 必要設定。
   *
   * @returns {{
   *   ok: boolean,
   *   errors: string[],
   *   options: object
   * }}
   */
  function validateFirebaseConfig() {
    const options = getFirebaseOptions();
    const errors = [];

    if (!options.apiKey) {
      errors.push('尚未設定 Firebase apiKey。');
    }

    if (!options.authDomain) {
      errors.push('尚未設定 Firebase authDomain。');
    }

    if (!options.projectId) {
      errors.push('尚未設定 Firebase projectId。');
    }

    if (!options.appId) {
      errors.push('尚未設定 Firebase appId。');
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      options: options
    };
  }

  /**
   * 將持久化模式轉換成 Firebase 接受的值。
   *
   * 支援：
   * local   關閉瀏覽器後仍保留登入
   * session 關閉分頁後登出
   * none    僅保留於記憶體
   *
   * @param {object} sdk Firebase SDK
   * @param {string} persistenceName 持久化模式
   * @returns {string}
   */
  function resolvePersistence(sdk, persistenceName) {
    const normalizedName =
      normalizeString(persistenceName || 'local').toUpperCase();

    const persistenceEnum =
      sdk.auth &&
      sdk.auth.Auth &&
      sdk.auth.Auth.Persistence
        ? sdk.auth.Auth.Persistence
        : null;

    const fallbackValues = {
      LOCAL: 'local',
      SESSION: 'session',
      NONE: 'none'
    };

    if (!fallbackValues[normalizedName]) {
      throw createFirebaseError(
        'invalid-persistence',
        `不支援的登入持久化模式：${persistenceName}`
      );
    }

    if (
      persistenceEnum &&
      persistenceEnum[normalizedName]
    ) {
      return persistenceEnum[normalizedName];
    }

    return fallbackValues[normalizedName];
  }

  /**
   * 初始化 Firebase App 與 Authentication。
   *
   * @param {{
   *   persistence?: 'local'|'session'|'none'
   * }} options 初始化選項
   * @returns {{
   *   app: object,
   *   auth: object
   * }}
   */
  function initialize(options) {
    if (state.initialized && state.app && state.auth) {
      return {
        app: state.app,
        auth: state.auth
      };
    }

    const validation = validateFirebaseConfig();

    if (!validation.ok) {
      throw createFirebaseError(
        'invalid-config',
        validation.errors.join(' ')
      );
    }

    const sdk = getFirebaseSdk();

    let app;

    if (
      Array.isArray(sdk.apps) &&
      sdk.apps.length > 0 &&
      typeof sdk.app === 'function'
    ) {
      app = sdk.app();
    } else {
      app = sdk.initializeApp(validation.options);
    }

    let auth;

    if (app && typeof app.auth === 'function') {
      auth = app.auth();
    } else {
      auth = sdk.auth();
    }

    if (!auth) {
      throw createFirebaseError(
        'auth-initialization-failed',
        'Firebase Authentication 初始化失敗。'
      );
    }

    if (typeof auth.useDeviceLanguage === 'function') {
      auth.useDeviceLanguage();
    }

    const initializeOptions =
      options && typeof options === 'object'
        ? options
        : {};

    const persistence = resolvePersistence(
      sdk,
      initializeOptions.persistence || 'local'
    );

    if (typeof auth.setPersistence === 'function') {
      state.persistencePromise = Promise
        .resolve(auth.setPersistence(persistence))
        .catch(function handlePersistenceError(error) {
          console.warn(
            '[XuanXiangFirebase] 無法設定登入持久化：',
            error
          );

          return null;
        });
    } else {
      state.persistencePromise = Promise.resolve(null);
    }

    state.app = app;
    state.auth = auth;
    state.initialized = true;

    return {
      app: state.app,
      auth: state.auth
    };
  }

  /**
   * 確保 Firebase 已初始化。
   *
   * @returns {{
   *   app: object,
   *   auth: object
   * }}
   */
  function ensureInitialized() {
    if (!state.initialized) {
      return initialize();
    }

    return {
      app: state.app,
      auth: state.auth
    };
  }

  /**
   * 取得 Firebase App。
   *
   * @returns {object}
   */
  function getApp() {
    return ensureInitialized().app;
  }

  /**
   * 取得 Firebase Authentication。
   *
   * @returns {object}
   */
  function getAuth() {
    return ensureInitialized().auth;
  }

  /**
   * 等待登入持久化設定完成。
   *
   * @returns {Promise<void>}
   */
  async function waitForPersistence() {
    ensureInitialized();

    if (state.persistencePromise) {
      await state.persistencePromise;
    }
  }

  /**
   * 等待 Firebase 完成登入狀態還原。
   *
   * @returns {Promise<object|null>}
   */
  function waitForAuthReady() {
    const auth = getAuth();

    if (state.readyPromise) {
      return state.readyPromise;
    }

    state.readyPromise = new Promise(function authReadyExecutor(
      resolve,
      reject
    ) {
      if (typeof auth.onAuthStateChanged !== 'function') {
        reject(
          createFirebaseError(
            'auth-listener-unavailable',
            'Firebase Auth 不支援登入狀態監聽。'
          )
        );

        return;
      }

      let unsubscribe = null;

      const handleUser = function handleUser(user) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }

        resolve(user || null);
      };

      const handleError = function handleError(error) {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }

        reject(
          createFirebaseError(
            'auth-state-failed',
            '無法取得 Firebase 登入狀態。',
            error
          )
        );
      };

      unsubscribe = auth.onAuthStateChanged(
        handleUser,
        handleError
      );
    });

    return Promise
      .all([
        waitForPersistence(),
        state.readyPromise
      ])
      .then(function resolveAuthReady(results) {
        return results[1];
      });
  }

  /**
   * 取得目前登入會員。
   *
   * @returns {object|null}
   */
  function getCurrentUser() {
    const auth = getAuth();

    return auth.currentUser || null;
  }

  /**
   * 訂閱登入狀態變化。
   *
   * @param {(user: object|null) => void} callback 成功回呼
   * @param {(error: Error) => void} errorCallback 錯誤回呼
   * @returns {Function}
   */
  function onAuthStateChanged(callback, errorCallback) {
    const auth = getAuth();

    if (typeof callback !== 'function') {
      throw createFirebaseError(
        'invalid-auth-callback',
        '登入狀態監聽 callback 必須是函式。'
      );
    }

    return auth.onAuthStateChanged(
      callback,
      errorCallback
    );
  }

  /**
   * 取得目前登入會員的 Firebase ID Token。
   *
   * @param {boolean} forceRefresh 是否強制刷新
   * @returns {Promise<string>}
   */
  async function getIdToken(forceRefresh) {
    const user = getCurrentUser();

    if (!user) {
      throw createFirebaseError(
        'not-authenticated',
        '目前沒有登入中的會員。'
      );
    }

    if (typeof user.getIdToken !== 'function') {
      throw createFirebaseError(
        'token-unavailable',
        '目前會員無法取得 Firebase ID Token。'
      );
    }

    const token = await user.getIdToken(
      Boolean(forceRefresh)
    );

    if (!token) {
      throw createFirebaseError(
        'empty-token',
        'Firebase 回傳空白 ID Token。'
      );
    }

    return token;
  }

  /**
   * 建立 Google 登入 Provider。
   *
   * @param {{
   *   scopes?: string[],
   *   prompt?: string
   * }} options Provider 選項
   * @returns {object}
   */
  function createGoogleProvider(options) {
    const sdk = getFirebaseSdk();

    if (
      !sdk.auth ||
      typeof sdk.auth.GoogleAuthProvider !== 'function'
    ) {
      throw createFirebaseError(
        'google-provider-unavailable',
        'Firebase Google 登入 Provider 尚未載入。'
      );
    }

    const provider = new sdk.auth.GoogleAuthProvider();

    const providerOptions =
      options && typeof options === 'object'
        ? options
        : {};

    const scopes = Array.isArray(providerOptions.scopes)
      ? providerOptions.scopes
      : ['email', 'profile'];

    scopes.forEach(function addScope(scope) {
      const normalizedScope = normalizeString(scope);

      if (
        normalizedScope &&
        typeof provider.addScope === 'function'
      ) {
        provider.addScope(normalizedScope);
      }
    });

    if (
      typeof provider.setCustomParameters === 'function'
    ) {
      provider.setCustomParameters({
        prompt: normalizeString(
          providerOptions.prompt || 'select_account'
        )
      });
    }

    return provider;
  }

  /**
   * 取得模組目前狀態。
   *
   * 不回傳 Token 或敏感登入資訊。
   *
   * @returns {{
   *   initialized: boolean,
   *   hasApp: boolean,
   *   hasAuth: boolean,
   *   hasCurrentUser: boolean
   * }}
   */
  function getStatus() {
    return {
      initialized: state.initialized,
      hasApp: Boolean(state.app),
      hasAuth: Boolean(state.auth),
      hasCurrentUser: Boolean(
        state.auth && state.auth.currentUser
      )
    };
  }

  const publicApi = Object.freeze({
    initialize: initialize,
    validateConfig: validateFirebaseConfig,
    getApp: getApp,
    getAuth: getAuth,
    waitForPersistence: waitForPersistence,
    waitForAuthReady: waitForAuthReady,
    getCurrentUser: getCurrentUser,
    onAuthStateChanged: onAuthStateChanged,
    getIdToken: getIdToken,
    createGoogleProvider: createGoogleProvider,
    getStatus: getStatus,
    createError: createFirebaseError
  });

  global[MODULE_NAME] = publicApi;
})(globalThis);
