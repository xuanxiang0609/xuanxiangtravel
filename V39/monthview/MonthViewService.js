/**
 * ======================================================
 * 玹翔旅遊 V39.2.5.2.2 Enterprise
 * MonthViewService.js｜42-Day Month Grid Service
 * ======================================================
 *
 * 本階段職責：
 * 1. 標準化目標月份
 * 2. 計算月份第一天與最後一天
 * 3. 計算固定 6 × 7，共 42 天顯示範圍
 * 4. 建立 Month View 每日標準資料
 * 5. 建立六週資料模型
 * 6. 標記本月、跨月、今日與週末
 * 7. 建立月份導覽資料
 *
 * 本階段暫不負責：
 * - SpreadsheetApp
 * - 訂單讀取
 * - 訂單日期分組
 * - 衝突判定
 * - 營收計算
 * - Renderer
 * - Controller
 */

var MonthViewService = (function () {
  'use strict';

  var VERSION =
    'V39.2.5.2.2 Month View 42-Day Grid';

  var GRID_WEEK_COUNT = 6;
  var DAYS_PER_WEEK = 7;
  var GRID_DAY_COUNT =
    GRID_WEEK_COUNT * DAYS_PER_WEEK;

  var MIN_YEAR = 1900;
  var MAX_YEAR = 2100;

  var MONTH_PATTERN =
    /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/;

  var WEEKDAY_LABELS = Object.freeze([
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六'
  ]);

  var SHORT_WEEKDAY_LABELS = Object.freeze([
    '日',
    '一',
    '二',
    '三',
    '四',
    '五',
    '六'
  ]);

  /**
   * 取得 Month View 標準資料。
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

      var grid =
        buildMonthGrid(normalizedMonth);

      return {
        ok: true,
        version: VERSION,
        targetMonth: normalizedMonth,

        monthRange: {
          startDate:
            monthRange.startDate,
          endDate:
            monthRange.endDate,
          gridStartDate:
            grid.gridStartDate,
          gridEndDate:
            grid.gridEndDate,
          daysInMonth:
            monthRange.daysInMonth
        },

        navigation:
          buildNavigation(normalizedMonth),

        summary:
          createEmptyMonthSummary_(),

        weeks:
          grid.weeks,

        days:
          grid.days,

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
        summary:
          createEmptyMonthSummary_(),
        weeks: [],
        days: [],
        generatedAt:
          formatDateTime_(new Date()),
        message:
          getErrorMessage_(error)
      };
    }
  }

  /**
   * 建立固定 42 天 Month Grid。
   *
   * 週一為每週第一天。
   *
   * @param {Date|string|number|Object=} targetMonth
   * @return {Object}
   */
  function buildMonthGrid(targetMonth) {
    var normalizedMonth =
      normalizeMonth(targetMonth);

    var monthParts =
      parseMonth_(normalizedMonth);

    var monthStart =
      createLocalDate_(
        monthParts.year,
        monthParts.month - 1,
        1
      );

    var gridStart =
      getMondayOnOrBefore_(monthStart);

    var gridEnd =
      addDays_(
        gridStart,
        GRID_DAY_COUNT - 1
      );

    var todayKey =
      formatDate_(new Date());

    var days = [];

    for (
      var index = 0;
      index < GRID_DAY_COUNT;
      index += 1
    ) {
      var date =
        addDays_(gridStart, index);

      days.push(
        buildMonthDay_({
          date: date,
          index: index,
          targetMonth:
            normalizedMonth,
          targetYear:
            monthParts.year,
          targetMonthNumber:
            monthParts.month,
          todayKey:
            todayKey
        })
      );
    }

    var weeks =
      buildMonthWeeks_(days);

    validateMonthGrid_(
      days,
      weeks,
      gridStart,
      gridEnd
    );

    return {
      targetMonth:
        normalizedMonth,
      gridStartDate:
        formatDate_(gridStart),
      gridEndDate:
        formatDate_(gridEnd),
      totalDays:
        days.length,
      totalWeeks:
        weeks.length,
      days: days,
      weeks: weeks
    };
  }

  /**
   * 建立單一日期格。
   *
   * @param {Object} options
   * @return {Object}
   */
  function buildMonthDay_(options) {
    var date =
      options.date;

    var index =
      options.index;

    var weekday =
      date.getDay();

    var isoWeekday =
      weekday === 0
        ? 7
        : weekday;

    var dateKey =
      formatDate_(date);

    var monthKey =
      formatMonth_(date);

    var isCurrentMonth =
      monthKey === options.targetMonth;

    return {
      index: index,

      weekIndex:
        Math.floor(
          index / DAYS_PER_WEEK
        ),

      dayIndex:
        index % DAYS_PER_WEEK,

      date:
        dateKey,

      year:
        date.getFullYear(),

      month:
        date.getMonth() + 1,

      dayNumber:
        date.getDate(),

      weekday:
        isoWeekday,

      nativeWeekday:
        weekday,

      weekdayLabel:
        WEEKDAY_LABELS[weekday],

      shortWeekdayLabel:
        SHORT_WEEKDAY_LABELS[weekday],

      isCurrentMonth:
        isCurrentMonth,

      isPreviousMonth:
        monthKey <
        options.targetMonth,

      isNextMonth:
        monthKey >
        options.targetMonth,

      isToday:
        dateKey === options.todayKey,

      isWeekend:
        weekday === 0 ||
        weekday === 6,

      isMonday:
        isoWeekday === 1,

      isSunday:
        isoWeekday === 7,

      monthPosition:
        isCurrentMonth
          ? 'current'
          : (
              monthKey <
              options.targetMonth
                ? 'previous'
                : 'next'
            ),

      events: [],

      orders: [],

      summary:
        createEmptyDaySummary_()
    };
  }

  /**
   * 將 42 天切成六週。
   *
   * @param {Object[]} days
   * @return {Object[]}
   */
  function buildMonthWeeks_(days) {
    var weeks = [];

    for (
      var weekIndex = 0;
      weekIndex < GRID_WEEK_COUNT;
      weekIndex += 1
    ) {
      var startIndex =
        weekIndex * DAYS_PER_WEEK;

      var weekDays =
        days.slice(
          startIndex,
          startIndex +
          DAYS_PER_WEEK
        );

      weeks.push({
        weekIndex:
          weekIndex,

        weekNumber:
          weekIndex + 1,

        startDate:
          weekDays.length
            ? weekDays[0].date
            : '',

        endDate:
          weekDays.length
            ? weekDays[
                weekDays.length - 1
              ].date
            : '',

        days:
          weekDays,

        summary:
          createEmptyWeekSummary_()
      });
    }

    return weeks;
  }

  /**
   * 計算月份第一天與最後一天。
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
        parts.month - 1,
        1
      );

    var endDate =
      createLocalDate_(
        parts.year,
        parts.month,
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
   * 標準化為 YYYY-MM。
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

      return (
        padYear_(numericYear) +
        '-01'
      );
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
        return normalizeMonth(
          value.month
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          value,
          'date'
        )
      ) {
        return normalizeMonth(
          value.date
        );
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
   * 建立月份導覽資料。
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
   * 建立空的每日摘要。
   *
   * @return {Object}
   */
  function createEmptyDaySummary_() {
    return {
      totalOrders: 0,
      totalConflicts: 0,
      dispatchedOrders: 0,
      undispatchedOrders: 0,
      totalDrivers: 0,
      totalRevenue: 0
    };
  }

  /**
   * 建立空的每週摘要。
   *
   * @return {Object}
   */
  function createEmptyWeekSummary_() {
    return {
      totalOrders: 0,
      totalConflicts: 0,
      dispatchedOrders: 0,
      undispatchedOrders: 0,
      totalDrivers: 0,
      totalRevenue: 0
    };
  }

  /**
   * 建立空的整月摘要。
   *
   * @return {Object}
   */
  function createEmptyMonthSummary_() {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalDrivers: 0,
      totalConflicts: 0,
      dispatchedOrders: 0,
      undispatchedOrders: 0
    };
  }

  /**
   * 找到指定日期當週星期一。
   *
   * @param {Date} date
   * @return {Date}
   */
  function getMondayOnOrBefore_(date) {
    var copy =
      cloneDate_(date);

    var weekday =
      copy.getDay();

    var offset =
      weekday === 0
        ? -6
        : 1 - weekday;

    return addDays_(copy, offset);
  }

  /**
   * 日期加減天數。
   *
   * @param {Date} date
   * @param {number} amount
   * @return {Date}
   */
  function addDays_(date, amount) {
    var result =
      cloneDate_(date);

    result.setDate(
      result.getDate() + amount
    );

    result.setHours(
      12,
      0,
      0,
      0
    );

    return result;
  }

  /**
   * 複製 Date。
   *
   * @param {Date} date
   * @return {Date}
   */
  function cloneDate_(date) {
    if (!isValidDate_(date)) {
      throw new Error(
        '無法複製無效日期。'
      );
    }

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0,
      0
    );
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
   * 解析 YYYY-MM。
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
   * 建立本地中午日期，避免 UTC 日期偏移。
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
   * 驗證日期組合。
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
   * 驗證 Grid 完整性。
   *
   * @param {Object[]} days
   * @param {Object[]} weeks
   * @param {Date} gridStart
   * @param {Date} gridEnd
   */
  function validateMonthGrid_(
    days,
    weeks,
    gridStart,
    gridEnd
  ) {
    if (
      !Array.isArray(days) ||
      days.length !== GRID_DAY_COUNT
    ) {
      throw new Error(
        'Month Grid 必須固定包含 42 天。'
      );
    }

    if (
      !Array.isArray(weeks) ||
      weeks.length !== GRID_WEEK_COUNT
    ) {
      throw new Error(
        'Month Grid 必須固定包含 6 週。'
      );
    }

    for (
      var index = 0;
      index < weeks.length;
      index += 1
    ) {
      if (
        !Array.isArray(
          weeks[index].days
        ) ||
        weeks[index].days.length !==
          DAYS_PER_WEEK
      ) {
        throw new Error(
          'Month Grid 每週必須固定包含 7 天。'
        );
      }
    }

    if (
      days[0].date !==
      formatDate_(gridStart)
    ) {
      throw new Error(
        'Month Grid 起始日期不一致。'
      );
    }

    if (
      days[days.length - 1].date !==
      formatDate_(gridEnd)
    ) {
      throw new Error(
        'Month Grid 結束日期不一致。'
      );
    }

    if (days[0].weekday !== 1) {
      throw new Error(
        'Month Grid 必須從星期一開始。'
      );
    }

    if (
      days[days.length - 1]
        .weekday !== 7
    ) {
      throw new Error(
        'Month Grid 必須於星期日結束。'
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
   * 是否為有效 Date。
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
   * 格式化時間。
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

  function padYear_(value) {
    return String(value)
      .padStart(4, '0');
  }

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
      'Month View 服務發生未知錯誤。'
    );
  }

  return Object.freeze({
    VERSION: VERSION,

    GRID_WEEK_COUNT:
      GRID_WEEK_COUNT,

    DAYS_PER_WEEK:
      DAYS_PER_WEEK,

    GRID_DAY_COUNT:
      GRID_DAY_COUNT,

    getMonthView:
      getMonthView,

    normalizeMonth:
      normalizeMonth,

    getMonthRange:
      getMonthRange,

    buildMonthGrid:
      buildMonthGrid,

    buildNavigation:
      buildNavigation,

    getPreviousMonth:
      getPreviousMonth,

    getNextMonth:
      getNextMonth
  });
})();

/**
 * Node.js 本機測試支援。
 * Google Apps Script 執行時自動略過。
 */
if (
  typeof module !== 'undefined' &&
  module.exports
) {
  module.exports =
    MonthViewService;
}
