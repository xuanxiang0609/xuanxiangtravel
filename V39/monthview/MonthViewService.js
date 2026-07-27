/**
 * ======================================================
 * 玹翔旅遊 V39.2.5.2.3 Enterprise
 * MonthViewService.js｜Order Allocation & Daily Statistics Service
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
    'V39.2.5.2.3 Month View Order Allocation & Statistics';

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
  function getMonthView(targetMonth, orders) {
    try {
      var request =
        normalizeMonthViewRequest_(
          targetMonth,
          orders
        );

      var normalizedMonth =
        normalizeMonth(
          request.targetMonth
        );

      var monthRange =
        getMonthRange(normalizedMonth);

      var grid =
        buildMonthGrid(normalizedMonth);

      var allocation =
        assignOrdersToCalendarDays_(
          grid.days,
          request.orders
        );

      updateMonthWeekSummaries_(
        grid.weeks
      );

      var monthSummary =
        calculateMonthSummary_(
          grid.days
        );

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
          monthSummary,

        allocation: {
          receivedOrders:
            allocation.receivedOrders,
          assignedOrders:
            allocation.assignedOrders,
          invalidOrders:
            allocation.invalidOrders,
          outOfGridOrders:
            allocation.outOfGridOrders
        },

        invalidOrders:
          allocation.invalidOrderItems,

        outOfGridOrders:
          allocation.outOfGridOrderItems,

        weeks:
          grid.weeks,

        days:
          grid.days,

        calendarDays:
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
        allocation: {
          receivedOrders: 0,
          assignedOrders: 0,
          invalidOrders: 0,
          outOfGridOrders: 0
        },
        invalidOrders: [],
        outOfGridOrders: [],
        weeks: [],
        days: [],
        calendarDays: [],
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

  function normalizeMonthViewRequest_(
    targetMonth,
    orders
  ) {
    if (
      targetMonth &&
      typeof targetMonth === 'object' &&
      !Array.isArray(targetMonth) &&
      !isValidDate_(targetMonth)
    ) {
      return {
        targetMonth:
          Object.prototype.hasOwnProperty.call(
            targetMonth,
            'targetMonth'
          )
            ? targetMonth.targetMonth
            : (
                Object.prototype.hasOwnProperty.call(
                  targetMonth,
                  'month'
                )
                  ? targetMonth.month
                  : targetMonth.date
              ),

        orders:
          normalizeMonthOrders_(
            Object.prototype.hasOwnProperty.call(
              targetMonth,
              'orders'
            )
              ? targetMonth.orders
              : orders
          )
      };
    }

    return {
      targetMonth: targetMonth,
      orders:
        normalizeMonthOrders_(orders)
    };
  }

  function normalizeMonthOrders_(orders) {
    if (
      orders === undefined ||
      orders === null ||
      orders === ''
    ) {
      return [];
    }

    if (!Array.isArray(orders)) {
      throw new Error(
        'Month View 訂單資料必須為陣列。'
      );
    }

    return orders.filter(function (order) {
      return (
        order &&
        typeof order === 'object' &&
        !Array.isArray(order)
      );
    });
  }

  function assignOrdersToCalendarDays_(
    calendarDays,
    orders
  ) {
    var dayMap = Object.create(null);
    var invalidOrderItems = [];
    var outOfGridOrderItems = [];
    var assignedOrders = 0;

    calendarDays.forEach(function (day) {
      day.orders = [];
      day.events = day.orders;
      day.summary =
        createEmptyDaySummary_();

      dayMap[day.date] = day;
    });

    orders.forEach(function (
      order,
      sourceIndex
    ) {
      var dateKey =
        normalizeMonthOrderDate_(order);

      if (!dateKey) {
        invalidOrderItems.push({
          sourceIndex: sourceIndex,
          reason:
            '缺少或無法辨識預約日期',
          order: order
        });
        return;
      }

      var day = dayMap[dateKey];

      if (!day) {
        outOfGridOrderItems.push({
          sourceIndex: sourceIndex,
          date: dateKey,
          reason:
            '訂單日期不在目前 42 格顯示範圍',
          order: order
        });
        return;
      }

      var normalizedOrder =
        normalizeMonthOrder_(
          order,
          dateKey,
          sourceIndex
        );

      day.orders.push(normalizedOrder);
      assignedOrders += 1;
    });

    calendarDays.forEach(function (day) {
      day.orders.sort(
        compareMonthOrders_
      );

      day.events = day.orders;

      day.summary =
        calculateMonthDaySummary_(
          day.orders
        );
    });

    return {
      receivedOrders:
        orders.length,
      assignedOrders:
        assignedOrders,
      invalidOrders:
        invalidOrderItems.length,
      outOfGridOrders:
        outOfGridOrderItems.length,
      invalidOrderItems:
        invalidOrderItems,
      outOfGridOrderItems:
        outOfGridOrderItems
    };
  }

  function normalizeMonthOrder_(
    order,
    dateKey,
    sourceIndex
  ) {
    var normalized = {};
    var key;

    for (key in order) {
      if (
        Object.prototype.hasOwnProperty.call(
          order,
          key
        )
      ) {
        normalized[key] = order[key];
      }
    }

    normalized.sourceIndex =
      sourceIndex;

    normalized.serviceDate =
      dateKey;

    normalized.date =
      dateKey;

    normalized.driverName =
      firstNonEmptyMonthValue_([
        order.driverName,
        order.assignedDriverName,
        order.assignedDriver,
        order['司機姓名'],
        order['司機']
      ]);

    normalized.dispatchStatus =
      firstNonEmptyMonthValue_([
        order.dispatchStatus,
        order.status,
        order['派遣狀態'],
        order['派車狀態']
      ]);

    normalized.isDispatched =
      isMonthOrderDispatched_(order);

    normalized.conflict =
      hasMonthOrderConflict_(order);

    normalized.amount =
      getMonthOrderRevenue_(order);

    return normalized;
  }

  function calculateMonthDaySummary_(orders) {
    var summary =
      createEmptyDaySummary_();

    var drivers =
      Object.create(null);

    orders.forEach(function (order) {
      summary.totalOrders += 1;

      if (
        isMonthOrderDispatched_(order)
      ) {
        summary.dispatchedOrders += 1;
      } else {
        summary.undispatchedOrders += 1;
      }

      if (
        hasMonthOrderConflict_(order)
      ) {
        summary.totalConflicts += 1;
      }

      var driverKey =
        getMonthOrderDriverKey_(order);

      if (driverKey) {
        drivers[driverKey] = true;
      }

      summary.totalRevenue +=
        getMonthOrderRevenue_(order);
    });

    summary.totalDrivers =
      Object.keys(drivers).length;

    summary.totalRevenue =
      roundMonthMoney_(
        summary.totalRevenue
      );

    validateMonthSummary_(
      summary,
      '每日'
    );

    return summary;
  }

  function updateMonthWeekSummaries_(weeks) {
    weeks.forEach(function (week) {
      var weekOrders = [];

      week.days.forEach(function (day) {
        Array.prototype.push.apply(
          weekOrders,
          day.orders
        );
      });

      week.summary =
        calculateMonthDaySummary_(
          weekOrders
        );
    });
  }

  function calculateMonthSummary_(
    calendarDays
  ) {
    var monthOrders = [];

    calendarDays.forEach(function (day) {
      if (!day.isCurrentMonth) {
        return;
      }

      Array.prototype.push.apply(
        monthOrders,
        day.orders
      );
    });

    return calculateMonthDaySummary_(
      monthOrders
    );
  }

  function normalizeMonthOrderDate_(order) {
    var value =
      firstDefinedMonthValue_([
        order.serviceDate,
        order.bookingDate,
        order.reservationDate,
        order.pickupDate,
        order.orderDate,
        order.dateKey,
        order.date,
        order['預約日期']
      ]);

    return normalizeMonthDateValue_(
      value
    );
  }

  function normalizeMonthDateValue_(value) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return '';
    }

    if (isValidDate_(value)) {
      return formatDate_(value);
    }

    if (
      typeof value === 'number' &&
      isFinite(value)
    ) {
      var numericDate =
        new Date(value);

      return isValidDate_(numericDate)
        ? formatDate_(numericDate)
        : '';
    }

    var text =
      String(value).trim();

    if (!text) {
      return '';
    }

    text = text
      .replace(/[年月]/g, '-')
      .replace(/日/g, '')
      .replace(/\//g, '-')
      .replace(/\./g, '-')
      .replace(/\s+.*/, '');

    var match =
      text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/
      );

    if (!match) {
      return '';
    }

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);

    try {
      validateYear_(year);
      validateMonth_(month);
      validateDateParts_(
        year,
        month,
        day
      );
    } catch (error) {
      return '';
    }

    return (
      padYear_(year) +
      '-' +
      pad2_(month) +
      '-' +
      pad2_(day)
    );
  }

  function getMonthOrderDriverKey_(order) {
    var driver =
      firstNonEmptyMonthValue_([
        order.driverId,
        order['司機編號'],
        order.driverName,
        order.assignedDriverName,
        order.assignedDriver,
        order['司機姓名'],
        order['司機']
      ]);

    return normalizeMonthText_(driver)
      .toLowerCase();
  }

  function getMonthOrderRevenue_(order) {
    var value =
      firstDefinedMonthValue_([
        order.amount,
        order.finalPrice,
        order.totalAmount,
        order.quotedPrice,
        order.revenue,
        order.fare,
        order.price,
        order['最終報價'],
        order['車資'],
        order['營收'],
        order['金額']
      ]);

    return normalizeMonthMoney_(
      value
    );
  }

  function hasMonthOrderConflict_(order) {
    if (
      order.conflict === true ||
      order.hasConflict === true
    ) {
      return true;
    }

    if (
      Array.isArray(order.conflicts) &&
      order.conflicts.length > 0
    ) {
      return true;
    }

    if (
      Array.isArray(
        order.conflictOrders
      ) &&
      order.conflictOrders.length > 0
    ) {
      return true;
    }

    var value =
      firstNonEmptyMonthValue_([
        order['衝突檢查'],
        order.conflictStatus,
        order.conflictResult
      ]);

    var text =
      normalizeMonthText_(value);

    if (!text) {
      return false;
    }

    if (
      /^(否|無|正常|通過|false|0)$/i
        .test(text)
    ) {
      return false;
    }

    return (
      /衝突|重疊|阻擋|conflict/i
        .test(text)
    );
  }

  function isMonthOrderDispatched_(order) {
    if (
      typeof order.isDispatched ===
        'boolean'
    ) {
      return order.isDispatched;
    }

    var status =
      normalizeMonthText_(
        firstNonEmptyMonthValue_([
          order.dispatchStatus,
          order['派遣狀態'],
          order['派車狀態']
        ])
      );

    if (status) {
      if (
        /未派|待派|待司機|尚未|取消|作廢/
          .test(status)
      ) {
        return false;
      }

      if (
        /已派|已指派|已接受|執勤|進行中|已完成|完成/
          .test(status)
      ) {
        return true;
      }
    }

    return Boolean(
      getMonthOrderDriverKey_(order)
    );
  }

  function compareMonthOrders_(a, b) {
    var timeA =
      normalizeMonthText_(
        firstNonEmptyMonthValue_([
          a.serviceTime,
          a.pickupTime,
          a.time,
          a['預約時間']
        ])
      );

    var timeB =
      normalizeMonthText_(
        firstNonEmptyMonthValue_([
          b.serviceTime,
          b.pickupTime,
          b.time,
          b['預約時間']
        ])
      );

    if (timeA !== timeB) {
      return timeA < timeB ? -1 : 1;
    }

    var orderA =
      normalizeMonthText_(
        firstNonEmptyMonthValue_([
          a.orderNo,
          a.orderId,
          a['訂單編號']
        ])
      );

    var orderB =
      normalizeMonthText_(
        firstNonEmptyMonthValue_([
          b.orderNo,
          b.orderId,
          b['訂單編號']
        ])
      );

    if (orderA === orderB) {
      return (
        Number(a.sourceIndex || 0) -
        Number(b.sourceIndex || 0)
      );
    }

    return orderA < orderB ? -1 : 1;
  }

  function validateMonthSummary_(
    summary,
    label
  ) {
    if (
      summary.totalOrders !==
      summary.dispatchedOrders +
      summary.undispatchedOrders
    ) {
      throw new Error(
        label +
        '統計不一致：總訂單數不等於已派車加未派車。'
      );
    }
  }

  function normalizeMonthMoney_(value) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return 0;
    }

    if (
      typeof value === 'number'
    ) {
      return isFinite(value)
        ? value
        : 0;
    }

    var normalized =
      String(value)
        .replace(/NT\$/gi, '')
        .replace(/TWD/gi, '')
        .replace(/[,$，\s]/g, '')
        .replace(/[^\d.-]/g, '');

    if (
      !normalized ||
      normalized === '-' ||
      normalized === '.'
    ) {
      return 0;
    }

    var amount =
      Number(normalized);

    return isFinite(amount)
      ? amount
      : 0;
  }

  function roundMonthMoney_(value) {
    return Math.round(
      Number(value || 0) * 100
    ) / 100;
  }

  function normalizeMonthText_(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return '';
    }

    return String(value).trim();
  }

  function firstDefinedMonthValue_(
    values
  ) {
    for (
      var index = 0;
      index < values.length;
      index += 1
    ) {
      if (
        values[index] !== undefined &&
        values[index] !== null &&
        values[index] !== ''
      ) {
        return values[index];
      }
    }

    return '';
  }

  function firstNonEmptyMonthValue_(
    values
  ) {
    for (
      var index = 0;
      index < values.length;
      index += 1
    ) {
      var value =
        normalizeMonthText_(
          values[index]
        );

      if (value) {
        return value;
      }
    }

    return '';
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
      getNextMonth,

    assignOrdersToCalendarDays:
      assignOrdersToCalendarDays_,

    calculateMonthDaySummary:
      calculateMonthDaySummary_,

    calculateMonthSummary:
      calculateMonthSummary_,

    normalizeMonthOrderDate:
      normalizeMonthOrderDate_,

    getMonthOrderDriverKey:
      getMonthOrderDriverKey_,

    getMonthOrderRevenue:
      getMonthOrderRevenue_,

    hasMonthOrderConflict:
      hasMonthOrderConflict_,

    isMonthOrderDispatched:
      isMonthOrderDispatched_
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
