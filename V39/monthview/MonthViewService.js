/**
 * ======================================================
 * 玹翔旅遊 V39.2.5.2.1 Enterprise
 * MonthViewService.js｜Month View Date Core
 * ======================================================
 *
 * 本階段職責：
 * 1. 標準化目標月份
 * 2. 計算月份第一天與最後一天
 * 3. 計算上一月與下一月
 * 4. 建立月份導覽資料
 * 5. 提供後續 42 格月曆模型共用的日期工具
 *
 * 本階段不負責：
 * - 訂單資料讀取
 * - SpreadsheetApp
 * - 月曆 42 格資料模型
 * - 每日統計
 * - 整月統計
 * - Renderer
 * - Controller
 */

var MonthViewService = (function () {
  'use strict';

  var VERSION =
    'V39.2.5.2.1 Month View Date Core';

  var MONTH_PATTERN =
    /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/;

  var MIN_YEAR = 1900;
  var MAX_YEAR = 2100;

  /**
   * 取得 Month View 日期核心資料。
   *
   * @param {Date|string|number|Object=} targetMonth
   * @return {Object}
   */
  function getMonthView(targetMonth) {
    try {
      var normalizedMonth =
        normalizeMonth(targetMonth);

      var monthRange =
        getMonthRange(normalizedMonth);

      return {
        ok: true,
        version: VERSION,
        targetMonth: normalizedMonth,
        monthRange: monthRange,
        navigation:
          buildNavigation(normalizedMonth),
        generatedAt:
          formatDateTime_(new Date())
      };
    } catch (error) {
      return {
        ok: false,
        version: VERSION,
        targetMonth: '',
        monthRange: null,
        navigation: null,
        generatedAt:
          formatDateTime_(new Date()),
        message:
          getErrorMessage_(error)
      };
    }
  }

  /**
   * 將輸入標準化為 YYYY-MM。
   *
   * 支援：
   * - undefined／null／空字串：目前月份
   * - Date
   * - YYYY-MM
   * - YYYY-MM-DD
   * - 年份數字，例如 2026
   * - { targetMonth: '2026-07' }
   * - { month: '2026-07' }
   * - { date: '2026-07-15' }
   *
   * @param {Date|string|number|Object=} value
   * @return {string}
   */
  function normalizeMonth(value) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return formatMonth_(new Date());
    }

    if (isValidDate_(value)) {
      return formatMonth_(value);
    }

    if (
      typeof value === 'number' &&
      isFinite(value)
    ) {
      var numericYear =
        Math.trunc(value);

      validateYear_(numericYear);

      return padYear_(numericYear) + '-01';
    }

    if (
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          value,
          'targetMonth'
        )
      ) {
        return normalizeMonth(
          value.targetMonth
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          value,
          'month'
        )
      ) {
        return normalizeMonth(value.month);
      }

      if (
        Object.prototype.hasOwnProperty.call(
          value,
          'date'
        )
      ) {
        return normalizeMonth(value.date);
      }
    }

    var text =
      String(value).trim();

    if (!text) {
      return formatMonth_(new Date());
    }

    var match =
      text.match(MONTH_PATTERN);

    if (!match) {
      throw new Error(
        '月份格式錯誤，請使用 YYYY-MM 或 YYYY-MM-DD。'
      );
    }

    var year =
      Number(match[1]);

    var month =
      Number(match[2]);

    var day =
      match[3]
        ? Number(match[3])
        : 1;

    validateYear_(year);
    validateMonth_(month);
    validateDateParts_(
      year,
      month,
      day
    );

    return (
      padYear_(year) +
      '-' +
      pad2_(month)
    );
  }

  /**
   * 計算月份第一天、最後一天。
   *
   * @param {Date|string|number|Object=} targetMonth
   * @return {Object}
   */
  function getMonthRange(targetMonth) {
    var normalizedMonth =
      normalizeMonth(targetMonth);

    var parts =
      parseMonth_(normalizedMonth);

    var startDate =
      createLocalDate_(
        parts.year,
        parts.month,
        1
      );

    var endDate =
      createLocalDate_(
        parts.year,
        parts.month + 1,
        0
      );

    return {
      startDate:
        formatDate_(startDate),
      endDate:
        formatDate_(endDate),
      daysInMonth:
        endDate.getDate(),
      year:
        parts.year,
      month:
        parts.month,
      monthLabel:
        parts.year +
        ' 年 ' +
        parts.month +
        ' 月'
    };
  }

  /**
   * 取得上一月份。
   *
   * @param {Date|string|number|Object=} targetMonth
   * @return {string}
   */
  function getPreviousMonth(targetMonth) {
    return shiftMonth_(
      normalizeMonth(targetMonth),
      -1
    );
  }

  /**
   * 取得下一月份。
   *
   * @param {Date|string|number|Object=} targetMonth
   * @return {string}
   */
  function getNextMonth(targetMonth) {
    return shiftMonth_(
      normalizeMonth(targetMonth),
      1
    );
  }

  /**
   * 建立 Renderer 使用的月份導覽資料。
   *
   * @param {Date|string|number|Object=} targetMonth
   * @return {Object}
   */
  function buildNavigation(targetMonth) {
    var currentMonth =
      normalizeMonth(targetMonth);

    return {
      previousMonth:
        getPreviousMonth(currentMonth),
      currentMonth:
        currentMonth,
      nextMonth:
        getNextMonth(currentMonth),
      todayMonth:
        formatMonth_(new Date())
    };
  }

  /**
   * 月份位移。
   *
   * @param {string} normalizedMonth
   * @param {number} offset
   * @return {string}
   */
  function shiftMonth_(
    normalizedMonth,
    offset
  ) {
    var parts =
      parseMonth_(normalizedMonth);

    var shiftedDate =
      createLocalDate_(
        parts.year,
        parts.month - 1 + offset,
        1
      );

    return formatMonth_(shiftedDate);
  }

  /**
   * 解析標準月份。
   *
   * @param {string} normalizedMonth
   * @return {{year:number, month:number}}
   */
  function parseMonth_(normalizedMonth) {
    var match =
      String(normalizedMonth)
        .match(/^(\d{4})-(\d{2})$/);

    if (!match) {
      throw new Error(
        '內部月份格式錯誤：' +
        normalizedMonth
      );
    }

    var year =
      Number(match[1]);

    var month =
      Number(match[2]);

    validateYear_(year);
    validateMonth_(month);

    return {
      year: year,
      month: month
    };
  }

  /**
   * 建立本地日期，避免 UTC 時區造成日期偏移。
   *
   * @param {number} year
   * @param {number} monthIndex
   * @param {number} day
   * @return {Date}
   */
  function createLocalDate_(
    year,
    monthIndex,
    day
  ) {
    var date =
      new Date(
        year,
        monthIndex,
        day,
        12,
        0,
        0,
        0
      );

    if (!isValidDate_(date)) {
      throw new Error(
        '無法建立有效日期。'
      );
    }

    return date;
  }

  /**
   * 驗證年月日組合。
   *
   * @param {number} year
   * @param {number} month
   * @param {number} day
   */
  function validateDateParts_(
    year,
    month,
    day
  ) {
    if (
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    ) {
      throw new Error(
        '日期日數不正確：' + day
      );
    }

    var date =
      createLocalDate_(
        year,
        month - 1,
        day
      );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error(
        '不存在的日期：' +
        padYear_(year) +
        '-' +
        pad2_(month) +
        '-' +
        pad2_(day)
      );
    }
  }

  /**
   * 驗證年份。
   *
   * @param {number} year
   */
  function validateYear_(year) {
    if (
      !Number.isInteger(year) ||
      year < MIN_YEAR ||
      year > MAX_YEAR
    ) {
      throw new Error(
        '年份必須介於 ' +
        MIN_YEAR +
        ' 至 ' +
        MAX_YEAR +
        ' 之間。'
      );
    }
  }

  /**
   * 驗證月份。
   *
   * @param {number} month
   */
  function validateMonth_(month) {
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error(
        '月份必須介於 1 至 12 之間。'
      );
    }
  }

  /**
   * 判斷是否為有效 Date。
   *
   * @param {*} value
   * @return {boolean}
   */
  function isValidDate_(value) {
    return (
      Object.prototype.toString.call(
        value
      ) === '[object Date]' &&
      !isNaN(value.getTime())
    );
  }

  /**
   * 格式化 YYYY-MM。
   *
   * @param {Date} date
   * @return {string}
   */
  function formatMonth_(date) {
    return (
      padYear_(date.getFullYear()) +
      '-' +
      pad2_(date.getMonth() + 1)
    );
  }

  /**
   * 格式化 YYYY-MM-DD。
   *
   * @param {Date} date
   * @return {string}
   */
  function formatDate_(date) {
    return (
      formatMonth_(date) +
      '-' +
      pad2_(date.getDate())
    );
  }

  /**
   * 格式化產生時間。
   *
   * @param {Date} date
   * @return {string}
   */
  function formatDateTime_(date) {
    return (
      formatDate_(date) +
      ' ' +
      pad2_(date.getHours()) +
      ':' +
      pad2_(date.getMinutes()) +
      ':' +
      pad2_(date.getSeconds())
    );
  }

  /**
   * 年份補零。
   *
   * @param {number} value
   * @return {string}
   */
  function padYear_(value) {
    return String(value)
      .padStart(4, '0');
  }

  /**
   * 兩位數補零。
   *
   * @param {number} value
   * @return {string}
   */
  function pad2_(value) {
    return String(value)
      .padStart(2, '0');
  }

  /**
   * 統一錯誤訊息。
   *
   * @param {*} error
   * @return {string}
   */
  function getErrorMessage_(error) {
    if (
      error &&
      typeof error.message === 'string' &&
      error.message.trim()
    ) {
      return error.message.trim();
    }

    return String(
      error ||
      'Month View 日期服務發生未知錯誤。'
    );
  }

  return Object.freeze({
    VERSION: VERSION,
    getMonthView: getMonthView,
    normalizeMonth: normalizeMonth,
    getMonthRange: getMonthRange,
    buildNavigation: buildNavigation,
    getPreviousMonth: getPreviousMonth,
    getNextMonth: getNextMonth
  });
})();

/**
 * Node.js 本機測試支援。
 * Google Apps Script 執行時會自動略過。
 */
if (
  typeof module !== 'undefined' &&
  module.exports
) {
  module.exports = MonthViewService;
}
