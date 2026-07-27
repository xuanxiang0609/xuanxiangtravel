/**
 * ============================================================
 * 玹翔旅遊 V39 Member Center
 * config.js｜會員中心統一設定模組
 * ============================================================
 *
 * 功能：
 * 1. 集中管理會員中心頁面路由
 * 2. 集中管理 Apps Script API
 * 3. 集中管理 Firebase Authentication 設定
 * 4. 集中管理登入狀態與瀏覽器儲存鍵值
 * 5. 提供設定檢查與頁面路由工具
 *
 * 建議載入順序：
 * config.js
 * firebase.js
 * api.js
 * auth.js
 * guard.js
 */

(function initializeMemberConfig(global) {
  'use strict';

  /**
   * 可由 HTML 在載入 config.js 前覆寫的執行環境設定。
   *
   * 範例：
   *
   * window.__XUANXIANG_MEMBER_ENV__ = {
   *   environment: 'production',
   *   apiUrl: 'https://script.google.com/macros/s/部署ID/exec',
   *   firebase: {
   *     apiKey: 'Firebase API Key',
   *     authDomain: 'xuanxiang-travel.firebaseapp.com',
   *     projectId: 'xuanxiang-travel',
   *     appId: 'Firebase App ID',
   *     messagingSenderId: ''
   *   }
   * };
   */
  const runtimeEnvironment =
    global.__XUANXIANG_MEMBER_ENV__ &&
    typeof global.__XUANXIANG_MEMBER_ENV__ === 'object'
      ? global.__XUANXIANG_MEMBER_ENV__
      : {};

  const runtimeFirebase =
    runtimeEnvironment.firebase &&
    typeof runtimeEnvironment.firebase === 'object'
      ? runtimeEnvironment.firebase
      : {};

  /**
   * 將內容轉換為安全字串。
   */
  function toSafeString(value, fallback) {
    if (value === undefined || value === null) {
      return fallback || '';
    }

    return String(value).trim();
  }

  /**
   * 移除網址結尾多餘的斜線。
   */
  function normalizeBaseUrl(value) {
    return toSafeString(value, '').replace(/\/+$/, '');
  }

  /**
   * 將數值限制為有效正整數。
   */
  function toPositiveInteger(value, fallback) {
    const parsedValue = Number(value);

    if (
      Number.isFinite(parsedValue) &&
      parsedValue > 0 &&
      Number.isInteger(parsedValue)
    ) {
      return parsedValue;
    }

    return fallback;
  }

  const MEMBER_CONFIG = Object.freeze({
    app: Object.freeze({
      brandName: '玹翔旅遊',
      appName: '玹翔旅遊會員中心',
      version: 'V39 Member Center',
      locale: 'zh-TW',
      timezone: 'Asia/Taipei',
      environment: toSafeString(
        runtimeEnvironment.environment,
        'production'
      )
    }),

    api: Object.freeze({
      baseUrl: normalizeBaseUrl(runtimeEnvironment.apiUrl),

      timeoutMs: toPositiveInteger(
        runtimeEnvironment.apiTimeoutMs,
        15000
      ),

      actions: Object.freeze({
        health: 'health',
        login: 'memberLogin',
        logout: 'logout',
        profile: 'memberProfile',
        orders: 'memberOrders',
        points: 'memberPoints',
        coupons: 'memberCoupons',
        passengers: 'memberPassengers',
        addresses: 'memberAddresses',
        notifications: 'memberNotifications',
        repeatBooking: 'repeatBooking'
      })
    }),

    firebase: Object.freeze({
      apiKey: toSafeString(runtimeFirebase.apiKey, ''),
      authDomain: toSafeString(
        runtimeFirebase.authDomain,
        'xuanxiang-travel.firebaseapp.com'
      ),
      projectId: toSafeString(
        runtimeFirebase.projectId,
        'xuanxiang-travel'
      ),
      appId: toSafeString(runtimeFirebase.appId, ''),
      messagingSenderId: toSafeString(
        runtimeFirebase.messagingSenderId,
        ''
      ),
      measurementId: toSafeString(
        runtimeFirebase.measurementId,
        ''
      )
    }),

    routes: Object.freeze({
      login: './login.html',
      dashboard: './dashboard.html',
      profile: './profile.html',
      orders: './orders.html',
      coupons: './coupons.html',
      points: './points.html',
      passengers: './passengers.html',
      addresses: './addresses.html',
      notifications: './notifications.html',
      booking: './booking.html',
      settings: './settings.html'
    }),

    storage: Object.freeze({
      idToken: 'xx_member_id_token',
      refreshToken: 'xx_member_refresh_token',
      session: 'xx_member_session',
      profile: 'xx_member_profile',
      returnUrl: 'xx_member_return_url',
      loginProvider: 'xx_member_login_provider'
    }),

    session: Object.freeze({
      maximumAgeMs: 8 * 60 * 60 * 1000,
      refreshBeforeExpiryMs: 5 * 60 * 1000
    }),

    features: Object.freeze({
      lineLogin: true,
      googleLogin: true,
      emailLogin: true,
      appleLogin: false,
      points: true,
      coupons: true,
      passengers: true,
      addresses: true,
      notifications: true,
      repeatBooking: true
    })
  });

  /**
   * 取得會員中心頁面網址。
   *
   * @param {string} routeName 路由名稱
   * @returns {string}
   */
  function getMemberRoute(routeName) {
    const normalizedRouteName = toSafeString(routeName, '');

    if (!normalizedRouteName) {
      return MEMBER_CONFIG.routes.login;
    }

    return (
      MEMBER_CONFIG.routes[normalizedRouteName] ||
      MEMBER_CONFIG.routes.login
    );
  }

  /**
   * 取得 API Action 名稱。
   *
   * @param {string} actionName Action 設定名稱
   * @returns {string}
   */
  function getApiAction(actionName) {
    const normalizedActionName = toSafeString(actionName, '');

    if (!normalizedActionName) {
      return '';
    }

    return MEMBER_CONFIG.api.actions[normalizedActionName] || '';
  }

  /**
   * 檢查會員中心必要設定。
   *
   * 不會主動拋出錯誤，方便畫面顯示明確提示。
   *
   * @returns {{
   *   ok: boolean,
   *   errors: string[],
   *   warnings: string[]
   * }}
   */
  function validateMemberConfig() {
    const errors = [];
    const warnings = [];

    if (!MEMBER_CONFIG.api.baseUrl) {
      errors.push('尚未設定 Apps Script API 網址。');
    }

    if (!MEMBER_CONFIG.firebase.apiKey) {
      errors.push('尚未設定 Firebase apiKey。');
    }

    if (!MEMBER_CONFIG.firebase.authDomain) {
      errors.push('尚未設定 Firebase authDomain。');
    }

    if (!MEMBER_CONFIG.firebase.projectId) {
      errors.push('尚未設定 Firebase projectId。');
    }

    if (!MEMBER_CONFIG.firebase.appId) {
      errors.push('尚未設定 Firebase appId。');
    }

    if (
      MEMBER_CONFIG.features.appleLogin &&
      !runtimeFirebase.appleProviderEnabled
    ) {
      warnings.push(
        'Apple 登入已開啟，但尚未確認 Firebase Apple Provider。'
      );
    }

    if (
      MEMBER_CONFIG.api.timeoutMs < 5000
    ) {
      warnings.push('API timeoutMs 低於 5 秒，可能造成行動網路誤判。');
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * 將公開介面掛載至全域。
   */
  const MEMBER_UTILS = Object.freeze({
    config: MEMBER_CONFIG,
    getRoute: getMemberRoute,
    getApiAction: getApiAction,
    validate: validateMemberConfig
  });

  global.MEMBER_CONFIG = MEMBER_CONFIG;
  global.XuanXiangMemberConfig = MEMBER_CONFIG;
  global.XuanXiangMember = MEMBER_UTILS;
})(globalThis);
