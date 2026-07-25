/**
 * ======================================================
 * 玹翔旅遊 V38.3 Enterprise Final
 * Version.gs｜系統版本資訊
 * ======================================================
 */

const APP = Object.freeze({

  // 系統資訊
  NAME: "玹翔旅遊 Enterprise",
  SHORT_NAME: "V38.3 Enterprise Final",

  // 版本資訊
  VERSION: "38.3.0",
  BUILD: "2026.07.25",
  STAGE: "Production",

  // 作者
  AUTHOR: "玹翔旅遊",

  // 網站
  WEBSITE: "https://9ovan.com",

  // 平台
  PLATFORM: "Google Apps Script",

  // 時區
  TIMEZONE: "Asia/Taipei"

});

/**
 * 回傳 APP 資訊
 */
function getAppInfo() {
  return APP;
}

/**
 * 回傳版本字串
 */
function getVersion() {
  return `${APP.SHORT_NAME} Build ${APP.BUILD}`;
}

/**
 * 顯示版本資訊
 */
function printVersion() {
  Logger.log(getVersion());
}
