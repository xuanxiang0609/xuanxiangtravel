/**
 * ======================================================
 * 玹翔旅遊 V39.2.3.8 Enterprise Final
 * WeekViewController.js｜Dispatch Day View Controller
 * ======================================================
 *
 * 職責：
 * 1. 提供 Day View 對外 API
 * 2. 呼叫 WeekViewService
 * 3. 建立標準 Payload
 * 4. 建立 HtmlService Template
 * 5. 開啟 Sidebar／Modeless Dialog
 * 6. 引入 Day View CSS／JavaScript
 *
 * 不負責：
 * - 直接讀取訂單工作表
 * - 排序派車事件
 * - 建立前端 DOM
 * - 狀態 Badge Render
 * - 衝突演算法
 */


/* ======================================================
 * Configuration
 * ====================================================== */

const V39235_DAY_VIEW_CONFIG = Object.freeze({
  VERSION:
    'V39.2.3.8 Dispatch Day View Controller',

  TEMPLATE_FILE:
    'V39/dayview/DispatchWeekView',

  DAY_VIEW_CSS_PARTIAL:
    'V39/dayview/DispatchWeekViewCss',

  DAY_VIEW_JS_PARTIAL:
    'V39/dayview/DispatchWeekViewJs',

  SHARED_CARD_TEMPLATE:
    'V39/shared/DispatchCard',

  SHARED_CARD_CSS_PARTIAL:
    'V39/shared/DispatchCardCss',

  SHARED_CARD_JS_PARTIAL:
    'V39/shared/DispatchCardJs',

  TITLE:
    '🚖 玹翔旅遊｜單日派車',

  SIDEBAR_TITLE:
    '🚖 今日派車',

  DIALOG_TITLE:
    '🚖 Dispatch Day View',

  DIALOG_WIDTH: 1080,
  DIALOG_HEIGHT: 760,

  TIME_ZONE:
    'Asia/Taipei',

  DATE_FORMAT:
    'yyyy-MM-dd',

  DATETIME_FORMAT:
    'yyyy-MM-dd HH:mm:ss'
});

/**
 * 引入 Day View／Shared HTML Partial。
 *
 * @param {string} filename Partial 名稱
 * @return {string} Partial HTML
 */
function includeWeekViewFile_(filename) {
  const safeFilename =
    validateWeekViewIncludeFile_(filename);

  return HtmlService
    .createHtmlOutputFromFile(safeFilename)
    .getContent();
}
/* ======================================================
 * Payload API
 * ====================================================== */

/**
 * 取得指定日期的 Day View 標準 Payload。
 *
 * 此函式提供給：
 * - google.script.run
 * - Dashboard 2.0
 * - Week View
 * - Month View
 * - AI Dispatch
 *
 * @param {Date|string=} date 指定日期
 * @return {Object} Day View Payload
 */
function getWeekViewPayload(date) {
  const normalizedDate =
    normalizeWeekViewControllerDate_(date);

  try {
    if (typeof getDayEvents_ !== 'function') {
      throw new Error(
        '找不到 WeekViewService.getDayEvents_()。'
      );
    }

    if (typeof getDaySummary_ !== 'function') {
      throw new Error(
        '找不到 WeekViewService.getDaySummary_()。'
      );
    }

    const events = getDayEvents_(normalizedDate);
    const summary = getDaySummary_(normalizedDate);

    return {
      ok: true,

      action: 'getWeekViewPayload',

      date: normalizedDate,

      events: Array.isArray(events)
        ? events
        : [],

      summary: summary || {
        date: normalizedDate,
        totalOrders: 0,
        totalDrivers: 0,
        totalConflicts: 0
      },

      generatedAt:
        formatWeekViewControllerDateTime_(
          new Date()
        ),

      version:
        V39235_DAY_VIEW_CONFIG.VERSION
    };
  } catch (error) {
console.error(
  'V39.2.3.8 getWeekViewPayload 失敗：' +
  getWeekViewControllerErrorMessage_(error)
);

    return {
      ok: false,

      action: 'getWeekViewPayload',

      date: normalizedDate,

      events: [],

      summary: {
        date: normalizedDate,
        totalOrders: 0,
        totalDrivers: 0,
        totalConflicts: 0
      },

      generatedAt:
        formatWeekViewControllerDateTime_(
          new Date()
        ),

      message:
        getWeekViewControllerErrorMessage_(
          error
        ),

      version:
        V39235_DAY_VIEW_CONFIG.VERSION
    };
  }
}


/* ======================================================
 * Public Entry
 * ====================================================== */

/**
 * 開啟單日派車視圖。
 *
 * mode：
 * - sidebar：側邊欄
 * - dialog：Modeless Dialog
 *
 * @param {Date|string=} date 指定日期
 * @param {string=} mode 顯示模式
 * @return {Object} 開啟結果
 */
function showWeekView(date, mode) {
  const displayMode =
    normalizeWeekViewDisplayMode_(mode);

  if (displayMode === 'dialog') {
    return showWeekViewDialog(date);
  }

  return showWeekViewSidebar(date);
}


/**
 * 以 Sidebar 開啟 Day View。
 *
 * @param {Date|string=} date 指定日期
 * @return {Object} 開啟結果
 */
function showWeekViewSidebar(date) {
  const normalizedDate =
    normalizeWeekViewControllerDate_(date);

  const html =
    createWeekViewHtmlOutput_(
      normalizedDate
    )
      .setTitle(
        V39235_DAY_VIEW_CONFIG.SIDEBAR_TITLE
      );

  SpreadsheetApp
    .getUi()
    .showSidebar(html);

  return {
    ok: true,

    action: 'showWeekViewSidebar',

    mode: 'sidebar',

    date: normalizedDate,

    version:
      V39235_DAY_VIEW_CONFIG.VERSION
  };
}


/**
 * 以 Modeless Dialog 開啟 Day View。
 *
 * @param {Date|string=} date 指定日期
 * @return {Object} 開啟結果
 */
function showWeekViewDialog(date) {
  const normalizedDate =
    normalizeWeekViewControllerDate_(date);

  const html =
    createWeekViewHtmlOutput_(
      normalizedDate
    )
      .setWidth(
        V39235_DAY_VIEW_CONFIG.DIALOG_WIDTH
      )
      .setHeight(
        V39235_DAY_VIEW_CONFIG.DIALOG_HEIGHT
      );

  SpreadsheetApp
    .getUi()
    .showModelessDialog(
      html,
      V39235_DAY_VIEW_CONFIG.DIALOG_TITLE
    );

  return {
    ok: true,

    action: 'showWeekViewDialog',

    mode: 'dialog',

    date: normalizedDate,

    width:
      V39235_DAY_VIEW_CONFIG.DIALOG_WIDTH,

    height:
      V39235_DAY_VIEW_CONFIG.DIALOG_HEIGHT,

    version:
      V39235_DAY_VIEW_CONFIG.VERSION
  };
}


/* ======================================================
 * HTML Template
 * ====================================================== */

/**
 * 建立 Day View HtmlOutput。
 *
 * @param {string} normalizedDate yyyy-MM-dd
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function createWeekViewHtmlOutput_(normalizedDate) {
  const template =
    HtmlService.createTemplateFromFile(
      V39235_DAY_VIEW_CONFIG.TEMPLATE_FILE
    );

  template.initialDate =
    normalizedDate;

  template.controllerVersion =
    V39235_DAY_VIEW_CONFIG.VERSION;

  template.generatedAt =
    formatWeekViewControllerDateTime_(
      new Date()
    );

  return template
    .evaluate()
    .setTitle(
      V39235_DAY_VIEW_CONFIG.TITLE
    )
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}


/**
 * 引入 Day View CSS／JavaScript。
 *
 * HTML 使用方式：
 *
<?!= includeWeekViewFile_('V39/dayview/DispatchWeekViewCss'); ?>
<?!= includeWeekViewFile_('V39/dayview/DispatchWeekViewJs'); ?>
 *
 * 
 */



/**
 * 限制 Day View 只能 include 白名單檔案。
 *
 * @param {string} filename 檔案名稱
 * @return {string} HTML 內容
 */
function validateWeekViewIncludeFile_(filename) {
  const value =
    String(filename || '').trim();

  const allowedFiles = [
    V39235_DAY_VIEW_CONFIG.DAY_VIEW_CSS_PARTIAL,
    V39235_DAY_VIEW_CONFIG.DAY_VIEW_JS_PARTIAL,
    V39235_DAY_VIEW_CONFIG.SHARED_CARD_TEMPLATE,
    V39235_DAY_VIEW_CONFIG.SHARED_CARD_CSS_PARTIAL,
    V39235_DAY_VIEW_CONFIG.SHARED_CARD_JS_PARTIAL
  ];

  if (allowedFiles.indexOf(value) === -1) {
    throw new Error(
      '不允許引入 Day View 檔案：' +
      value
    );
  }

  return value;
}


/* ======================================================
 * Date Helpers
 * ====================================================== */

/**
 * 將日期正規化為 yyyy-MM-dd。
 *
 * @param {Date|string=} value
 * @return {string}
 */
function normalizeWeekViewControllerDate_(value) {
  const timeZone =
    getWeekViewControllerTimeZone_();

  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  ) {
    return value.trim();
  }

  let date;

  if (value instanceof Date) {
    date = value;
  } else if (
    value !== null &&
    typeof value !== 'undefined' &&
    String(value).trim() !== ''
  ) {
    date = new Date(value);
  } else {
    date = new Date();
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      '無效日期：' + String(value)
    );
  }

  return Utilities.formatDate(
    date,
    timeZone,
    V39235_DAY_VIEW_CONFIG.DATE_FORMAT
  );
}


/**
 * 格式化日期時間。
 *
 * @param {Date} date
 * @return {string}
 */
function formatWeekViewControllerDateTime_(date) {
  return Utilities.formatDate(
    date,
    getWeekViewControllerTimeZone_(),
    V39235_DAY_VIEW_CONFIG.DATETIME_FORMAT
  );
}


/**
 * 取得 Apps Script 時區。
 *
 * @return {string}
 */
function getWeekViewControllerTimeZone_() {
  return (
    Session.getScriptTimeZone() ||
    V39235_DAY_VIEW_CONFIG.TIME_ZONE
  );
}


/**
 * 正規化 Sidebar／Dialog 模式。
 *
 * @param {string=} mode
 * @return {string}
 */
function normalizeWeekViewDisplayMode_(mode) {
  return String(mode || '')
    .toLowerCase() === 'dialog'
      ? 'dialog'
      : 'sidebar';
}


/* ======================================================
 * Error Helper
 * ====================================================== */

/**
 * 取得可讀錯誤訊息。
 *
 * @param {*} error
 * @return {string}
 */
function getWeekViewControllerErrorMessage_(
  error
) {
  if (
    error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return String(
    error || '未知錯誤'
  );
}


/* ======================================================
 * Manual Tests
 * ====================================================== */

/**
 * Apps Script 編輯器手動測試：
 * 測試今日 Payload。
 *
 * @return {Object}
 */
function testGetWeekViewPayloadToday() {
  const result =
    getWeekViewPayload(new Date());

  console.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}


/**
 * Apps Script 編輯器手動測試：
 * 開啟今日 Day View Sidebar。
 *
 * @return {Object}
 */
function testShowWeekViewSidebar() {
  return showWeekViewSidebar(
    new Date()
  );
}


/**
 * Apps Script 編輯器手動測試：
 * 開啟今日 Day View Dialog。
 *
 * @return {Object}
 */
function testShowWeekViewDialog() {
  return showWeekViewDialog(
    new Date()
  );
}