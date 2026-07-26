/**
 * ============================================================
 * 玹翔旅遊 V39 Member Center
 * guard.js｜會員頁面登入保護模組
 * ============================================================
 *
 * 職責：
 * 1. 保護需要登入的會員頁面
 * 2. 未登入時導回 login.html
 * 3. 保存會員原本想前往的頁面
 * 4. 登入成功後安全回跳
 * 5. 已登入會員進入登入頁時導向 Dashboard
 * 6. 防止外部網址 Open Redirect
 * 7. 監聽登入與登出狀態
 *
 * 建議載入順序：
 * 1. Firebase App Compat SDK
 * 2. Firebase Auth Compat SDK
 * 3. config.js
 * 4. firebase.js
 * 5. api.js
 * 6. auth.js
 * 7. guard.js
 */

(function initializeXuanXiangMemberGuard(global) {
  'use strict';

  const MODULE_NAME = 'XuanXiangMemberGuard';

  const MODES = Object.freeze({
    PROTECTED: 'protected',
    GUEST: 'guest',
    PUBLIC: 'public'
  });

  const state = {
    initialized: false,
    mode: MODES.PUBLIC,
    status: 'idle',
    redirecting: false,
    unsubscribe: null,
    lastDecision: null,
    lastError: null
  };

  /**
   * 建立標準 Guard 錯誤。
   *
   * @param {string} code 錯誤代碼
   * @param {string} message 顯示訊息
   * @param {object} details 額外資訊
   * @param {unknown} cause 原始錯誤
   * @returns {Error}
   */
  function createGuardError(
    code,
    message,
    details,
    cause
  ) {
    const error = new Error(
      message || '會員頁面驗證發生錯誤。'
    );

    error.name = 'XuanXiangMemberGuardError';
    error.code = `member/guard/${code || 'unknown'}`;

    if (details && typeof details === 'object') {
      Object.keys(details).forEach(
        function assignDetail(key) {
          error[key] = details[key];
        }
      );
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
   * 取得會員中心設定。
   *
   * @returns {object}
   */
  function getConfig() {
    const config =
      global.XuanXiangMemberConfig ||
      global.MEMBER_CONFIG;

    if (!config || typeof config !== 'object') {
      throw createGuardError(
        'config-not-loaded',
        '尚未載入會員中心 config.js。'
      );
    }

    return config;
  }

  /**
   * 取得登入模組。
   *
   * @returns {object}
   */
  function getAuthModule() {
    const authModule =
      global.XuanXiangMemberAuth;

    if (!authModule) {
      throw createGuardError(
        'auth-module-not-loaded',
        '尚未載入會員登入 auth.js。'
      );
    }

    return authModule;
  }

  /**
   * 安全取得 localStorage。
   *
   * @returns {Storage|null}
   */
  function getStorage() {
    try {
      if (
        global.localStorage &&
        typeof global.localStorage.getItem ===
          'function'
      ) {
        return global.localStorage;
      }
    } catch (error) {
      console.warn(
        '[XuanXiangMemberGuard] 無法使用 localStorage：',
        error
      );
    }

    return null;
  }

  /**
   * 取得回跳網址的儲存鍵。
   *
   * @returns {string}
   */
  function getReturnUrlStorageKey() {
    const config = getConfig();

    return normalizeString(
      config.storage &&
        config.storage.returnUrl,
      'xx_member_return_url'
    );
  }

  /**
   * 取得目前頁面 URL。
   *
   * @returns {URL}
   */
  function getCurrentUrl() {
    const href =
      global.location &&
      global.location.href
        ? String(global.location.href)
        : 'https://member.local/member/login.html';

    return new URL(href);
  }

  /**
   * 取得目前網站 Origin。
   *
   * @returns {string}
   */
  function getCurrentOrigin() {
    return getCurrentUrl().origin;
  }

  /**
   * 取得目前頁面的站內相對網址。
   *
   * @returns {string}
   */
  function getCurrentRelativeUrl() {
    const currentUrl = getCurrentUrl();

    return (
      currentUrl.pathname +
      currentUrl.search +
      currentUrl.hash
    );
  }

  /**
   * 取得設定中的會員頁面路由。
   *
   * @param {string} routeName 路由名稱或網址
   * @returns {string}
   */
  function resolveRoute(routeName) {
    const config = getConfig();
    const routes = config.routes || {};

    const normalizedRoute =
      normalizeString(routeName, '');

    const configuredRoute =
      routes[normalizedRoute] ||
      normalizedRoute ||
      routes.login ||
      './login.html';

    return new URL(
      configuredRoute,
      getCurrentUrl()
    ).toString();
  }

  /**
   * 將網址限制為目前網站內部網址。
   *
   * 防止：
   * login.html?returnUrl=https://惡意網站.example
   *
   * @param {string} candidate 候選網址
   * @returns {string}
   */
  function sanitizeReturnUrl(candidate) {
    const normalizedCandidate =
      normalizeString(candidate, '');

    if (!normalizedCandidate) {
      return '';
    }

    try {
      const currentUrl = getCurrentUrl();

      const targetUrl = new URL(
        normalizedCandidate,
        currentUrl
      );

      if (
        targetUrl.origin !== currentUrl.origin
      ) {
        return '';
      }

      if (
        !['http:', 'https:'].includes(
          targetUrl.protocol
        )
      ) {
        return '';
      }

      return (
        targetUrl.pathname +
        targetUrl.search +
        targetUrl.hash
      );
    } catch (error) {
      return '';
    }
  }

  /**
   * 判斷指定網址是否為登入頁。
   *
   * @param {string} candidate 候選網址
   * @returns {boolean}
   */
  function isLoginPage(candidate) {
    try {
      const targetUrl = new URL(
        candidate || getCurrentUrl(),
        getCurrentUrl()
      );

      const loginUrl = new URL(
        resolveRoute('login')
      );

      return (
        targetUrl.origin === loginUrl.origin &&
        targetUrl.pathname === loginUrl.pathname
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 判斷指定網址是否為 Dashboard。
   *
   * @param {string} candidate 候選網址
   * @returns {boolean}
   */
  function isDashboardPage(candidate) {
    try {
      const targetUrl = new URL(
        candidate || getCurrentUrl(),
        getCurrentUrl()
      );

      const dashboardUrl = new URL(
        resolveRoute('dashboard')
      );

      return (
        targetUrl.origin === dashboardUrl.origin &&
        targetUrl.pathname ===
          dashboardUrl.pathname
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 儲存登入後回跳網址。
   *
   * @param {string} returnUrl 回跳網址
   * @returns {string}
   */
  function saveReturnUrl(returnUrl) {
    const safeReturnUrl =
      sanitizeReturnUrl(returnUrl);

    if (
      !safeReturnUrl ||
      isLoginPage(safeReturnUrl)
    ) {
      return '';
    }

    const storage = getStorage();

    if (!storage) {
      return safeReturnUrl;
    }

    try {
      storage.setItem(
        getReturnUrlStorageKey(),
        safeReturnUrl
      );
    } catch (error) {
      console.warn(
        '[XuanXiangMemberGuard] 無法儲存回跳網址：',
        error
      );
    }

    return safeReturnUrl;
  }

  /**
   * 讀取已儲存回跳網址。
   *
   * @returns {string}
   */
  function readStoredReturnUrl() {
    const storage = getStorage();

    if (!storage) {
      return '';
    }

    try {
      return sanitizeReturnUrl(
        storage.getItem(
          getReturnUrlStorageKey()
        )
      );
    } catch (error) {
      return '';
    }
  }

  /**
   * 清除回跳網址。
   */
  function clearStoredReturnUrl() {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    try {
      storage.removeItem(
        getReturnUrlStorageKey()
      );
    } catch (error) {
      console.warn(
        '[XuanXiangMemberGuard] 無法清除回跳網址：',
        error
      );
    }
  }

  /**
   * 從登入頁網址取得 returnUrl。
   *
   * @returns {string}
   */
  function readQueryReturnUrl() {
    try {
      const currentUrl = getCurrentUrl();

      return sanitizeReturnUrl(
        currentUrl.searchParams.get(
          'returnUrl'
        )
      );
    } catch (error) {
      return '';
    }
  }

  /**
   * 取得登入成功後目的地。
   *
   * 優先順序：
   * 1. 明確指定網址
   * 2. 網址中的 returnUrl
   * 3. localStorage 的 returnUrl
   * 4. dashboard.html
   *
   * @param {string} preferredUrl 指定網址
   * @returns {string}
   */
  function getReturnDestination(
    preferredUrl
  ) {
    const candidates = [
      preferredUrl,
      readQueryReturnUrl(),
      readStoredReturnUrl()
    ];

    for (
      let index = 0;
      index < candidates.length;
      index += 1
    ) {
      const safeUrl =
        sanitizeReturnUrl(
          candidates[index]
        );

      if (
        safeUrl &&
        !isLoginPage(safeUrl)
      ) {
        return safeUrl;
      }
    }

    const dashboardUrl =
      new URL(resolveRoute('dashboard'));

    return (
      dashboardUrl.pathname +
      dashboardUrl.search +
      dashboardUrl.hash
    );
  }

  /**
   * 更新頁面的 Guard 狀態。
   *
   * HTML 可用以下 CSS 避免登入檢查期間畫面閃爍：
   *
   * html[data-member-guard="checking"] body {
   *   visibility: hidden;
   * }
   *
   * @param {string} status 狀態
   * @param {object} details 詳細資訊
   */
  function updateDocumentState(
    status,
    details
  ) {
    const documentObject =
      global.document;

    if (!documentObject) {
      return;
    }

    const root =
      documentObject.documentElement;

    if (
      root &&
      typeof root.setAttribute ===
        'function'
    ) {
      root.setAttribute(
        'data-member-guard',
        status
      );

      if (
        details &&
        details.reason
      ) {
        root.setAttribute(
          'data-member-guard-reason',
          details.reason
        );
      } else if (
        typeof root.removeAttribute ===
          'function'
      ) {
        root.removeAttribute(
          'data-member-guard-reason'
        );
      }
    }
  }

  /**
   * 執行頁面導向。
   *
   * @param {string} targetUrl 目的地
   * @param {boolean} replace 是否取代歷史紀錄
   * @returns {boolean}
   */
  function navigate(targetUrl, replace) {
    const safeTarget =
      sanitizeReturnUrl(targetUrl);

    if (
      !safeTarget ||
      !global.location
    ) {
      return false;
    }

    state.redirecting = true;
    state.status = 'redirecting';

    updateDocumentState(
      'redirecting',
      {
        reason: state.lastDecision
          ? state.lastDecision.reason
          : ''
      }
    );

    if (
      replace !== false &&
      typeof global.location.replace ===
        'function'
    ) {
      global.location.replace(
        new URL(
          safeTarget,
          getCurrentUrl()
        ).toString()
      );

      return true;
    }

    if (
      typeof global.location.assign ===
        'function'
    ) {
      global.location.assign(
        new URL(
          safeTarget,
          getCurrentUrl()
        ).toString()
      );

      return true;
    }

    global.location.href =
      new URL(
        safeTarget,
        getCurrentUrl()
      ).toString();

    return true;
  }

  /**
   * 導回登入頁。
   *
   * @param {{
   *   returnUrl?: string,
   *   navigate?: boolean,
   *   replace?: boolean,
   *   reason?: string
   * }} options 導向選項
   * @returns {object}
   */
  function redirectToLogin(options) {
    const redirectOptions =
      isPlainObject(options)
        ? options
        : {};

    const requestedReturnUrl =
      normalizeString(
        redirectOptions.returnUrl,
        getCurrentRelativeUrl()
      );

    const safeReturnUrl =
      saveReturnUrl(
        requestedReturnUrl
      );

    const loginUrl =
      new URL(resolveRoute('login'));

    if (safeReturnUrl) {
      loginUrl.searchParams.set(
        'returnUrl',
        safeReturnUrl
      );
    }

    const reason = normalizeString(
      redirectOptions.reason,
      'authentication-required'
    );

    loginUrl.searchParams.set(
      'reason',
      reason
    );

    const result = {
      redirected:
        redirectOptions.navigate !== false,
      reason: reason,
      returnUrl: safeReturnUrl,
      targetUrl: loginUrl.toString()
    };

    state.lastDecision = result;

    if (
      redirectOptions.navigate !== false
    ) {
      navigate(
        loginUrl.toString(),
        redirectOptions.replace !== false
      );
    }

    return result;
  }

  /**
   * 登入成功後導回原頁面。
   *
   * @param {{
   *   destination?: string,
   *   navigate?: boolean,
   *   replace?: boolean
   * }} options 導向選項
   * @returns {object}
   */
  function redirectAfterLogin(options) {
    const redirectOptions =
      isPlainObject(options)
        ? options
        : {};

    const destination =
      getReturnDestination(
        redirectOptions.destination
      );

    clearStoredReturnUrl();

    const result = {
      redirected:
        redirectOptions.navigate !== false,
      reason: 'already-authenticated',
      destination: destination,
      targetUrl: new URL(
        destination,
        getCurrentUrl()
      ).toString()
    };

    state.lastDecision = result;

    if (
      redirectOptions.navigate !== false
    ) {
      navigate(
        result.targetUrl,
        redirectOptions.replace !== false
      );
    }

    return result;
  }

  /**
   * 取得會員角色清單。
   *
   * @param {object|null} session 會員 Session
   * @returns {string[]}
   */
  function getMemberRoles(session) {
    if (!session || typeof session !== 'object') {
      return [];
    }

    const member =
      session.member &&
      typeof session.member === 'object'
        ? session.member
        : {};

    const rawRoles =
      member.roles ||
      member.role ||
      session.roles ||
      [];

    const roles = Array.isArray(rawRoles)
      ? rawRoles
      : [rawRoles];

    return roles
      .map(function normalizeRole(role) {
        return normalizeString(
          role,
          ''
        ).toLowerCase();
      })
      .filter(Boolean);
  }

  /**
   * 檢查會員是否具備指定角色。
   *
   * @param {object|null} session 會員 Session
   * @param {string[]} requiredRoles 必要角色
   * @returns {boolean}
   */
  function hasRequiredRole(
    session,
    requiredRoles
  ) {
    if (
      !Array.isArray(requiredRoles) ||
      requiredRoles.length === 0
    ) {
      return true;
    }

    const memberRoles =
      getMemberRoles(session);

    return requiredRoles.some(
      function matchRole(role) {
        return memberRoles.includes(
          normalizeString(
            role,
            ''
          ).toLowerCase()
        );
      }
    );
  }

  /**
   * 執行單次頁面權限檢查。
   *
   * @param {'protected'|'guest'|'public'} mode Guard 模式
   * @param {object} options 選項
   * @returns {Promise<object>}
   */
  async function checkAccess(mode, options) {
    const guardOptions =
      isPlainObject(options)
        ? options
        : {};

    const normalizedMode =
      Object.values(MODES).includes(mode)
        ? mode
        : MODES.PROTECTED;

    state.mode = normalizedMode;
    state.status = 'checking';
    state.lastError = null;
    state.redirecting = false;

    updateDocumentState('checking');

    try {
      const auth =
        getAuthModule();

      await auth.initialize({
        persistence: normalizeString(
          guardOptions.persistence,
          'local'
        ),
        strictSession:
          guardOptions.strictSession === true
      });

      const authenticated =
        auth.isAuthenticated();

      const session =
        typeof auth.getSession === 'function'
          ? auth.getSession()
          : null;

      if (
        normalizedMode ===
          MODES.PROTECTED &&
        !authenticated
      ) {
        const decision =
          redirectToLogin({
            navigate:
              guardOptions.redirect !== false,
            replace:
              guardOptions.replace !== false,
            reason:
              guardOptions.reason ||
              'authentication-required'
          });

        state.status = 'denied';
        state.lastDecision =
          Object.assign(
            {
              allowed: false,
              authenticated: false,
              mode: normalizedMode
            },
            decision
          );

        updateDocumentState(
          'denied',
          state.lastDecision
        );

        return state.lastDecision;
      }

      if (
        normalizedMode ===
          MODES.GUEST &&
        authenticated
      ) {
        const decision =
          redirectAfterLogin({
            navigate:
              guardOptions.redirect !== false,
            replace:
              guardOptions.replace !== false,
            destination:
              guardOptions.destination
          });

        state.status = 'redirecting';
        state.lastDecision =
          Object.assign(
            {
              allowed: false,
              authenticated: true,
              mode: normalizedMode
            },
            decision
          );

        return state.lastDecision;
      }

      if (
        normalizedMode ===
          MODES.PROTECTED &&
        !hasRequiredRole(
          session,
          guardOptions.requiredRoles
        )
      ) {
        state.status = 'forbidden';

        state.lastDecision = {
          allowed: false,
          authenticated: true,
          mode: normalizedMode,
          reason: 'insufficient-role',
          requiredRoles:
            guardOptions.requiredRoles || [],
          memberRoles:
            getMemberRoles(session)
        };

        updateDocumentState(
          'forbidden',
          state.lastDecision
        );

        if (
          typeof guardOptions.onForbidden ===
            'function'
        ) {
          guardOptions.onForbidden(
            state.lastDecision
          );
        }

        return state.lastDecision;
      }

      state.status = 'allowed';

      state.lastDecision = {
        allowed: true,
        authenticated:
          authenticated,
        mode: normalizedMode,
        reason: 'access-granted',
        session: session
      };

      updateDocumentState(
        'allowed',
        state.lastDecision
      );

      if (
        typeof guardOptions.onAllowed ===
          'function'
      ) {
        guardOptions.onAllowed(
          state.lastDecision
        );
      }

      return state.lastDecision;
    } catch (error) {
      const guardError =
        error &&
        error.name ===
          'XuanXiangMemberGuardError'
          ? error
          : createGuardError(
              'access-check-failed',
              '無法完成會員登入狀態驗證。',
              {
                mode: normalizedMode
              },
              error
            );

      state.status = 'error';
      state.lastError = guardError;

      updateDocumentState(
        'error',
        {
          reason:
            guardError.code
        }
      );

      if (
        typeof guardOptions.onError ===
          'function'
      ) {
        guardOptions.onError(
          guardError
        );
      }

      if (
        normalizedMode ===
          MODES.PROTECTED &&
        guardOptions.failOpen !== true
      ) {
        redirectToLogin({
          navigate:
            guardOptions.redirect !== false,
          replace: true,
          reason: 'authentication-error'
        });
      }

      throw guardError;
    }
  }

  /**
   * 保護會員頁面。
   *
   * @param {object} options 設定
   * @returns {Promise<object>}
   */
  function requireAuth(options) {
    return checkAccess(
      MODES.PROTECTED,
      options
    );
  }

  /**
   * 保護登入頁。
   *
   * 已登入會員會直接導回 Dashboard
   * 或原本希望前往的會員頁面。
   *
   * @param {object} options 設定
   * @returns {Promise<object>}
   */
  function requireGuest(options) {
    return checkAccess(
      MODES.GUEST,
      options
    );
  }

  /**
   * 公開頁面，只初始化登入狀態。
   *
   * @param {object} options 設定
   * @returns {Promise<object>}
   */
  function allowPublic(options) {
    return checkAccess(
      MODES.PUBLIC,
      options
    );
  }

  /**
   * 啟動登入狀態監聽。
   *
   * protected：
   * 登出後導回 login.html
   *
   * guest：
   * 登入後導向 Dashboard
   *
   * @param {object} options 設定
   * @returns {Function}
   */
  function watch(options) {
    const watchOptions =
      isPlainObject(options)
        ? options
        : {};

    if (
      typeof state.unsubscribe ===
        'function'
    ) {
      state.unsubscribe();
    }

    const auth = getAuthModule();

    state.unsubscribe = auth.onChange(
      function handleAuthChange(
        snapshot,
        eventName
      ) {
        if (state.redirecting) {
          return;
        }

        if (
          state.mode ===
            MODES.PROTECTED &&
          !snapshot.authenticated &&
          [
            'signed-out',
            'subscribe'
          ].includes(eventName)
        ) {
          redirectToLogin({
            navigate:
              watchOptions.redirect !== false,
            replace: true,
            reason: 'signed-out'
          });

          return;
        }

        if (
          state.mode ===
            MODES.GUEST &&
          snapshot.authenticated
        ) {
          redirectAfterLogin({
            navigate:
              watchOptions.redirect !== false,
            replace: true
          });
        }
      },
      false
    );

    return state.unsubscribe;
  }

  /**
   * 初始化 Guard 並開始監聽。
   *
   * @param {'protected'|'guest'|'public'} mode Guard 模式
   * @param {object} options 設定
   * @returns {Promise<object>}
   */
  async function initialize(mode, options) {
    const initializeOptions =
      isPlainObject(options)
        ? options
        : {};

    const result =
      await checkAccess(
        mode,
        initializeOptions
      );

    state.initialized = true;

    if (
      initializeOptions.watch !== false
    ) {
      watch(initializeOptions);
    }

    return result;
  }

  /**
   * 根據 HTML data-member-guard 自動啟動。
   *
   * 範例：
   *
   * <html data-member-guard="protected">
   *
   * <html data-member-guard="guest">
   *
   * @param {object} options 設定
   * @returns {Promise<object>}
   */
  function autoStart(options) {
    const documentObject =
      global.document;

    let mode = MODES.PROTECTED;

    if (
      documentObject &&
      documentObject.documentElement &&
      typeof documentObject.documentElement
        .getAttribute === 'function'
    ) {
      mode = normalizeString(
        documentObject.documentElement
          .getAttribute(
            'data-member-guard-mode'
          ) ||
        documentObject.documentElement
          .getAttribute(
            'data-member-guard'
          ),
        MODES.PROTECTED
      ).toLowerCase();
    }

    if (!Object.values(MODES).includes(mode)) {
      mode = MODES.PROTECTED;
    }

    return initialize(
      mode,
      options
    );
  }

  /**
   * 取得 Guard 狀態。
   *
   * @returns {object}
   */
  function getStatus() {
    return {
      initialized: state.initialized,
      mode: state.mode,
      status: state.status,
      redirecting: state.redirecting,
      lastDecision: state.lastDecision,
      lastError: state.lastError
        ? {
            name:
              state.lastError.name,
            code:
              state.lastError.code,
            message:
              state.lastError.message
          }
        : null
    };
  }

  /**
   * 停止 Guard 監聽。
   */
  function destroy() {
    if (
      typeof state.unsubscribe ===
        'function'
    ) {
      state.unsubscribe();
    }

    state.unsubscribe = null;
    state.initialized = false;
    state.redirecting = false;
    state.status = 'destroyed';
  }

  const publicApi = Object.freeze({
    MODES: MODES,
    initialize: initialize,
    autoStart: autoStart,
    checkAccess: checkAccess,
    requireAuth: requireAuth,
    requireGuest: requireGuest,
    allowPublic: allowPublic,
    watch: watch,
    redirectToLogin:
      redirectToLogin,
    redirectAfterLogin:
      redirectAfterLogin,
    getReturnDestination:
      getReturnDestination,
    saveReturnUrl: saveReturnUrl,
    readStoredReturnUrl:
      readStoredReturnUrl,
    clearStoredReturnUrl:
      clearStoredReturnUrl,
    sanitizeReturnUrl:
      sanitizeReturnUrl,
    resolveRoute: resolveRoute,
    isLoginPage: isLoginPage,
    isDashboardPage:
      isDashboardPage,
    getStatus: getStatus,
    createError: createGuardError,
    destroy: destroy
  });

  global[MODULE_NAME] = publicApi;
})(globalThis);
