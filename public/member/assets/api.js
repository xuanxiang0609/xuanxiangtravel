/**
 * ============================================================
 * 玹翔旅遊 V39 Member Center
 * api.js｜會員中心 API 通訊模組
 * ============================================================
 *
 * 職責：
 * 1. 統一呼叫 Apps Script Web App API
 * 2. 自動附加 Firebase ID Token
 * 3. 提供 GET／POST 請求
 * 4. 管理請求逾時與取消
 * 5. 統一解析 JSON 與 JSONP 回應
 * 6. 統一處理 HTTP 與後端業務錯誤
 * 7. 提供會員中心各功能 API 方法
 *
 * 建議載入順序：
 * 1. config.js
 * 2. firebase.js
 * 3. api.js
 */

(function initializeXuanXiangMemberApi(global) {
  'use strict';

  const MODULE_NAME = 'XuanXiangMemberApi';

  const state = {
    baseUrlOverride: '',
    requestSequence: 0,
    activeRequests: new Map()
  };

  /**
   * 建立統一 API 錯誤。
   *
   * @param {string} code 錯誤代碼
   * @param {string} message 錯誤訊息
   * @param {object} details 錯誤資訊
   * @param {unknown} cause 原始錯誤
   * @returns {Error}
   */
  function createApiError(code, message, details, cause) {
    const error = new Error(message || '會員 API 發生錯誤。');

    error.name = 'XuanXiangMemberApiError';
    error.code = `member/api/${code || 'unknown'}`;

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
   * 將數值轉為正整數。
   *
   * @param {unknown} value 原始內容
   * @param {number} fallback 預設值
   * @returns {number}
   */
  function toPositiveInteger(value, fallback) {
    const parsed = Number(value);

    if (
      Number.isFinite(parsed) &&
      parsed > 0 &&
      Number.isInteger(parsed)
    ) {
      return parsed;
    }

    return fallback;
  }

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
      throw createApiError(
        'config-not-loaded',
        '尚未載入會員中心 config.js。'
      );
    }

    return config;
  }

  /**
   * 取得 API 基礎網址。
   *
   * @returns {string}
   */
  function getBaseUrl() {
    if (state.baseUrlOverride) {
      return state.baseUrlOverride;
    }

    const config = getMemberConfig();
    const baseUrl = normalizeString(
      config.api && config.api.baseUrl,
      ''
    ).replace(/\/+$/, '');

    return baseUrl;
  }

  /**
   * 暫時覆寫 API 網址。
   *
   * 適用於測試環境或尚未重新產生 config.js 時。
   *
   * @param {string} url Apps Script Web App URL
   * @returns {string}
   */
  function setBaseUrl(url) {
    const normalizedUrl = normalizeString(url, '')
      .replace(/\/+$/, '');

    if (
      normalizedUrl &&
      !/^https?:\/\//i.test(normalizedUrl)
    ) {
      throw createApiError(
        'invalid-base-url',
        'API 網址必須以 http:// 或 https:// 開頭。'
      );
    }

    state.baseUrlOverride = normalizedUrl;

    return state.baseUrlOverride;
  }

  /**
   * 取得 API Action。
   *
   * 可傳入 config.js 內的鍵名，例如 profile，
   * 也可直接傳入後端 Action，例如 memberProfile。
   *
   * @param {string} actionName Action 鍵名或實際名稱
   * @returns {string}
   */
  function resolveAction(actionName) {
    const normalizedAction = normalizeString(actionName, '');

    if (!normalizedAction) {
      throw createApiError(
        'missing-action',
        'API Action 不可為空白。'
      );
    }

    const config = getMemberConfig();
    const actions =
      config.api &&
      config.api.actions &&
      typeof config.api.actions === 'object'
        ? config.api.actions
        : {};

    return normalizeString(
      actions[normalizedAction],
      normalizedAction
    );
  }

  /**
   * 建立唯一請求編號。
   *
   * @returns {string}
   */
  function createRequestId() {
    state.requestSequence += 1;

    const timestamp = Date.now().toString(36);
    const sequence = state.requestSequence
      .toString(36)
      .padStart(3, '0');

    return `member-${timestamp}-${sequence}`;
  }

  /**
   * 檢查是否為一般物件。
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
   * 複製請求資料，避免直接修改呼叫端物件。
   *
   * @param {unknown} payload 原始資料
   * @returns {object}
   */
  function clonePayload(payload) {
    if (!isPlainObject(payload)) {
      return {};
    }

    return Object.assign({}, payload);
  }

  /**
   * 判斷欄位是否屬於敏感資料。
   *
   * @param {string} key 欄位名稱
   * @returns {boolean}
   */
  function isSensitiveKey(key) {
    const normalizedKey = normalizeString(key, '')
      .toLowerCase()
      .replace(/[_-]/g, '');

    return [
      'token',
      'idtoken',
      'refreshtoken',
      'authorization',
      'password',
      'accesstoken'
    ].includes(normalizedKey);
  }

  /**
   * 遮蔽敏感資料，用於除錯輸出。
   *
   * @param {unknown} value 原始資料
   * @param {number} depth 遞迴深度
   * @returns {unknown}
   */
  function redactSensitiveData(value, depth) {
    const currentDepth = Number(depth) || 0;

    if (currentDepth > 5) {
      return '[MAX_DEPTH]';
    }

    if (Array.isArray(value)) {
      return value.map(function redactArrayItem(item) {
        return redactSensitiveData(item, currentDepth + 1);
      });
    }

    if (!isPlainObject(value)) {
      return value;
    }

    const output = {};

    Object.keys(value).forEach(function redactKey(key) {
      if (isSensitiveKey(key)) {
        output[key] = '[REDACTED]';
        return;
      }

      output[key] = redactSensitiveData(
        value[key],
        currentDepth + 1
      );
    });

    return output;
  }

  /**
   * 取得 Firebase ID Token。
   *
   * @param {boolean} forceRefresh 是否強制更新
   * @returns {Promise<string>}
   */
  async function getFirebaseIdToken(forceRefresh) {
    const firebaseModule = global.XuanXiangFirebase;

    if (
      !firebaseModule ||
      typeof firebaseModule.getIdToken !== 'function'
    ) {
      throw createApiError(
        'firebase-module-unavailable',
        '尚未載入 Firebase Authentication 模組。'
      );
    }

    try {
      return await firebaseModule.getIdToken(
        Boolean(forceRefresh)
      );
    } catch (error) {
      throw createApiError(
        'token-unavailable',
        '無法取得會員登入憑證，請重新登入。',
        {},
        error
      );
    }
  }

  /**
   * 將物件轉換成網址查詢參數。
   *
   * @param {object} params 查詢參數
   * @returns {string}
   */
  function serializeQuery(params) {
    const searchParams = new URLSearchParams();

    Object.keys(params || {}).forEach(function appendQuery(key) {
      const value = params[key];

      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return;
      }

      if (
        typeof value === 'object'
      ) {
        searchParams.append(
          key,
          JSON.stringify(value)
        );

        return;
      }

      searchParams.append(key, String(value));
    });

    return searchParams.toString();
  }

  /**
   * 建立完整 API URL。
   *
   * @param {object} query 查詢參數
   * @returns {string}
   */
  function buildUrl(query) {
    const baseUrl = getBaseUrl();

    if (!baseUrl) {
      throw createApiError(
        'missing-base-url',
        '尚未設定 Apps Script API 網址。'
      );
    }

    const serializedQuery = serializeQuery(query);

    if (!serializedQuery) {
      return baseUrl;
    }

    return `${baseUrl}${
      baseUrl.includes('?') ? '&' : '?'
    }${serializedQuery}`;
  }

  /**
   * 解析 API 文字回應。
   *
   * 支援：
   * JSON
   * JSONP
   * 空白回應
   *
   * @param {string} text 回應文字
   * @returns {unknown}
   */
  function parseResponseText(text) {
    const normalizedText = normalizeString(text, '');

    if (!normalizedText) {
      return {};
    }

    try {
      return JSON.parse(normalizedText);
    } catch (jsonError) {
      const jsonpMatch = normalizedText.match(
        /^[A-Za-z_$][\w$.[\]]*\s*\(([\s\S]*)\)\s*;?$/
      );

      if (jsonpMatch && jsonpMatch[1]) {
        try {
          return JSON.parse(jsonpMatch[1]);
        } catch (jsonpError) {
          throw createApiError(
            'invalid-jsonp',
            'API 回傳的 JSONP 格式無法解析。',
            {
              responseText: normalizedText.slice(0, 500)
            },
            jsonpError
          );
        }
      }

      throw createApiError(
        'invalid-json',
        'API 回傳內容不是有效 JSON。',
        {
          responseText: normalizedText.slice(0, 500)
        },
        jsonError
      );
    }
  }

  /**
   * 將回應標準化並檢查業務錯誤。
   *
   * @param {unknown} data 回應資料
   * @param {object} context 請求資訊
   * @returns {unknown}
   */
  function normalizeResponse(data, context) {
    if (
      isPlainObject(data) &&
      data.ok === false
    ) {
      throw createApiError(
        normalizeString(data.code, 'business-error'),
        normalizeString(
          data.message,
          '會員 API 執行失敗。'
        ),
        {
          action: context.action,
          status: context.status,
          requestId:
            data.requestId ||
            context.requestId,
          response: data
        }
      );
    }

    return data;
  }

  /**
   * 取得預設逾時時間。
   *
   * @returns {number}
   */
  function getDefaultTimeoutMs() {
    const config = getMemberConfig();

    return toPositiveInteger(
      config.api && config.api.timeoutMs,
      15000
    );
  }

  /**
   * 統一呼叫會員 API。
   *
   * @param {string} actionName Action 鍵名或實際名稱
   * @param {object} payload 請求資料
   * @param {{
   *   method?: 'GET'|'POST',
   *   auth?: boolean,
   *   token?: string,
   *   forceTokenRefresh?: boolean,
   *   timeoutMs?: number,
   *   debug?: boolean
   * }} options 請求選項
   * @returns {Promise<unknown>}
   */
  async function request(actionName, payload, options) {
    const requestOptions =
      isPlainObject(options)
        ? options
        : {};

    const action = resolveAction(actionName);
    const method = normalizeString(
      requestOptions.method,
      'POST'
    ).toUpperCase();

    if (!['GET', 'POST'].includes(method)) {
      throw createApiError(
        'unsupported-method',
        `不支援的 API 方法：${method}`
      );
    }

    if (typeof global.fetch !== 'function') {
      throw createApiError(
        'fetch-unavailable',
        '目前瀏覽器不支援 Fetch API。'
      );
    }

    const requestId = createRequestId();
    const bodyPayload = clonePayload(payload);

    bodyPayload.action = action;
    bodyPayload.requestId = requestId;
    bodyPayload.client = Object.assign(
      {
        app: 'XuanXiangMemberCenter',
        version:
          getMemberConfig().app &&
          getMemberConfig().app.version
            ? getMemberConfig().app.version
            : 'V39',
        locale: 'zh-TW',
        timezone: 'Asia/Taipei'
      },
      isPlainObject(bodyPayload.client)
        ? bodyPayload.client
        : {}
    );

    const shouldAuthenticate =
      requestOptions.auth !== false;

    if (shouldAuthenticate) {
      bodyPayload.token = normalizeString(
        requestOptions.token,
        ''
      );

      if (!bodyPayload.token) {
        bodyPayload.token =
          await getFirebaseIdToken(
            requestOptions.forceTokenRefresh
          );
      }
    }

    const timeoutMs = toPositiveInteger(
      requestOptions.timeoutMs,
      getDefaultTimeoutMs()
    );

    const supportsAbortController =
      typeof global.AbortController === 'function';

    const controller = supportsAbortController
      ? new global.AbortController()
      : null;

    let timeoutHandle = null;

    if (controller) {
      timeoutHandle = global.setTimeout(
        function abortTimedOutRequest() {
          controller.abort();
        },
        timeoutMs
      );
    }

    let url;
    const fetchOptions = {
      method: method,
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/json'
      }
    };

    if (controller) {
      fetchOptions.signal = controller.signal;
    }

    if (method === 'GET') {
      url = buildUrl(bodyPayload);
    } else {
      url = buildUrl({});

      /*
       * 使用 text/plain 可降低瀏覽器向 Apps Script
       * 發出 CORS 預檢請求的機率。
       */
      fetchOptions.headers['Content-Type'] =
        'text/plain;charset=UTF-8';

      fetchOptions.body = JSON.stringify(bodyPayload);
    }

    state.activeRequests.set(requestId, {
      action: action,
      method: method,
      startedAt: Date.now(),
      controller: controller
    });

    if (requestOptions.debug === true) {
      console.info(
        '[XuanXiangMemberApi] Request',
        {
          requestId: requestId,
          action: action,
          method: method,
          url: url,
          payload: redactSensitiveData(
            bodyPayload,
            0
          )
        }
      );
    }

    try {
      const response = await global.fetch(
        url,
        fetchOptions
      );

      const responseText =
        await response.text();

      const responseData =
        parseResponseText(responseText);

      if (!response.ok) {
        throw createApiError(
          'http-error',
          `API HTTP 錯誤：${response.status}`,
          {
            action: action,
            status: response.status,
            requestId: requestId,
            response: responseData
          }
        );
      }

      const normalizedResponse =
        normalizeResponse(responseData, {
          action: action,
          status: response.status,
          requestId: requestId
        });

      if (requestOptions.debug === true) {
        console.info(
          '[XuanXiangMemberApi] Response',
          {
            requestId: requestId,
            action: action,
            status: response.status,
            durationMs:
              Date.now() -
              state.activeRequests.get(requestId).startedAt,
            response: redactSensitiveData(
              normalizedResponse,
              0
            )
          }
        );
      }

      return normalizedResponse;
    } catch (error) {
      if (
        error &&
        (
          error.name === 'AbortError' ||
          error.code === 20
        )
      ) {
        throw createApiError(
          'timeout',
          `API 請求逾時，已等待 ${timeoutMs} 毫秒。`,
          {
            action: action,
            requestId: requestId,
            timeoutMs: timeoutMs
          },
          error
        );
      }

      if (
        error &&
        error.name === 'XuanXiangMemberApiError'
      ) {
        throw error;
      }

      throw createApiError(
        'network-error',
        '無法連線至會員 API，請檢查網路後重試。',
        {
          action: action,
          requestId: requestId
        },
        error
      );
    } finally {
      if (timeoutHandle !== null) {
        global.clearTimeout(timeoutHandle);
      }

      state.activeRequests.delete(requestId);
    }
  }

  /**
   * 系統健康檢查。
   *
   * @returns {Promise<unknown>}
   */
  function health() {
    return request(
      'health',
      {},
      {
        method: 'GET',
        auth: false
      }
    );
  }

  /**
   * Firebase 登入後建立會員工作階段。
   *
   * @param {object} profile 補充會員資料
   * @returns {Promise<unknown>}
   */
  function memberLogin(profile) {
    return request(
      'login',
      clonePayload(profile),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 登出後端會員工作階段。
   *
   * @returns {Promise<unknown>}
   */
  function logout() {
    return request(
      'logout',
      {},
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得或更新會員資料。
   *
   * @param {object} params 查詢或更新資料
   * @returns {Promise<unknown>}
   */
  function profile(params) {
    return request(
      'profile',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得會員訂單。
   *
   * @param {object} params 篩選條件
   * @returns {Promise<unknown>}
   */
  function orders(params) {
    return request(
      'orders',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得會員點數。
   *
   * @param {object} params 篩選條件
   * @returns {Promise<unknown>}
   */
  function points(params) {
    return request(
      'points',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得會員優惠券。
   *
   * @param {object} params 篩選條件
   * @returns {Promise<unknown>}
   */
  function coupons(params) {
    return request(
      'coupons',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得或維護常用乘車人。
   *
   * @param {object} params 操作資料
   * @returns {Promise<unknown>}
   */
  function passengers(params) {
    return request(
      'passengers',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得或維護常用地址。
   *
   * @param {object} params 操作資料
   * @returns {Promise<unknown>}
   */
  function addresses(params) {
    return request(
      'addresses',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取得會員通知。
   *
   * @param {object} params 篩選條件
   * @returns {Promise<unknown>}
   */
  function notifications(params) {
    return request(
      'notifications',
      clonePayload(params),
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 建立再次預約資料。
   *
   * @param {string} orderId 原訂單編號
   * @param {object} overrides 欄位覆寫
   * @returns {Promise<unknown>}
   */
  function repeatBooking(orderId, overrides) {
    const normalizedOrderId =
      normalizeString(orderId, '');

    if (!normalizedOrderId) {
      return Promise.reject(
        createApiError(
          'missing-order-id',
          '再次預約必須提供原訂單編號。'
        )
      );
    }

    return request(
      'repeatBooking',
      {
        orderId: normalizedOrderId,
        overrides:
          isPlainObject(overrides)
            ? overrides
            : {}
      },
      {
        method: 'POST',
        auth: true
      }
    );
  }

  /**
   * 取消指定的進行中請求。
   *
   * @param {string} requestId 請求編號
   * @returns {boolean}
   */
  function cancelRequest(requestId) {
    const requestState =
      state.activeRequests.get(requestId);

    if (
      !requestState ||
      !requestState.controller ||
      typeof requestState.controller.abort !== 'function'
    ) {
      return false;
    }

    requestState.controller.abort();

    return true;
  }

  /**
   * 取消所有進行中請求。
   *
   * @returns {number}
   */
  function cancelAllRequests() {
    let cancelledCount = 0;

    state.activeRequests.forEach(
      function cancelActiveRequest(requestState) {
        if (
          requestState.controller &&
          typeof requestState.controller.abort === 'function'
        ) {
          requestState.controller.abort();
          cancelledCount += 1;
        }
      }
    );

    return cancelledCount;
  }

  /**
   * 取得模組狀態。
   *
   * @returns {object}
   */
  function getStatus() {
    return {
      baseUrlConfigured: Boolean(getBaseUrl()),
      baseUrl: getBaseUrl(),
      activeRequestCount: state.activeRequests.size,
      requestSequence: state.requestSequence
    };
  }

  const publicApi = Object.freeze({
    request: request,
    health: health,
    memberLogin: memberLogin,
    logout: logout,
    profile: profile,
    orders: orders,
    points: points,
    coupons: coupons,
    passengers: passengers,
    addresses: addresses,
    notifications: notifications,
    repeatBooking: repeatBooking,
    getBaseUrl: getBaseUrl,
    setBaseUrl: setBaseUrl,
    resolveAction: resolveAction,
    cancelRequest: cancelRequest,
    cancelAllRequests: cancelAllRequests,
    getStatus: getStatus,
    createError: createApiError
  });

  global[MODULE_NAME] = publicApi;
})(globalThis);
