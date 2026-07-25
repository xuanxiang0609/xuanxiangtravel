/**
 * ======================================================
 * 玹翔旅遊 V39.2.4.2 Enterprise
 * WeekViewService.js｜週派車資料服務
 * ======================================================
 *
 * 職責：
 * 1. 計算指定日期所在週的週一至週日
 * 2. 重用 DayViewService 取得每日事件
 * 3. 建立標準週事件陣列
 * 4. 依日期與時間排序
 * 5. 將事件依日期分組
 * 6. 建立週摘要資料
 *
 * 不負責：
 * - 直接建立 HTML
 * - 操作 DOM
 * - HtmlService
 * - Sidebar／Dialog
 * - 拖曳排班
 * - 衝突阻擋
 */


/* ======================================================
 * Configuration
 * ====================================================== */

const V39242_WEEK_VIEW_CONFIG = Object.freeze({
  VERSION: 'V39.2.4.2 WeekViewService',

  DEFAULT_TIME_ZONE: 'Asia/Taipei',

  DATE_FORMAT: 'yyyy-MM-dd',

  WEEK_START_DAY: 1,

  WEEK_LENGTH: 7
});


/* ======================================================
 * Public Service API
 * ====================================================== */

/**
 * 取得指定日期所在週的日期範圍。
 *
 * 週期固定為：
 * 週一 00:00 ～ 週日
 *
 * @param {Date|string=} date 指定日期
 * @return {Object}
 */
function getWeekRange_(date) {
  const sourceDate =
    normalizeWeekViewDateObject_(date);

  const startDate =
    getWeekMonday_(sourceDate);

  const endDate =
    addWeekViewDays_(startDate, 6);

  const days = [];

  for (
    let index = 0;
    index < V39242_WEEK_VIEW_CONFIG.WEEK_LENGTH;
    index += 1
  ) {
    const currentDate =
      addWeekViewDays_(startDate, index);

    days.push({
      index: index,

      date:
        formatWeekViewDate_(currentDate),

      dayOfWeek:
        index + 1,

      dayLabel:
        getWeekViewDayLabel_(index),

      shortLabel:
        getWeekViewShortDayLabel_(index),

      month:
        currentDate.getMonth() + 1,

      day:
        currentDate.getDate(),

      isToday:
        formatWeekViewDate_(currentDate) ===
        formatWeekViewDate_(new Date())
    });
  }

  return {
    startDate:
      formatWeekViewDate_(startDate),

    endDate:
      formatWeekViewDate_(endDate),

    days: days,

    weekKey:
      formatWeekViewDate_(startDate) +
      '_' +
      formatWeekViewDate_(endDate),

    version:
      V39242_WEEK_VIEW_CONFIG.VERSION
  };
}


/**
 * 取得指定日期所在週的所有派車事件。
 *
 * 本函式重用 DayViewService.getDayEvents_()，
 * 不重新解析「訂單」工作表。
 *
 * @param {Date|string=} date 指定日期
 * @return {Object[]}
 */
function getWeekEvents_(date) {
  if (typeof getDayEvents_ !== 'function') {
    throw new Error(
      '找不到 DayViewService.getDayEvents_()。'
    );
  }

  const weekRange =
    getWeekRange_(date);

  const events = [];

  weekRange.days.forEach(function (day) {
    const dayEvents =
      getDayEvents_(day.date);

    if (!Array.isArray(dayEvents)) {
      return;
    }

    dayEvents.forEach(function (event) {
      events.push(
        normalizeWeekViewEvent_(
          event,
          day.date
        )
      );
    });
  });

  return sortWeekViewEvents_(events);
}


/**
 * 將週事件依日期分組。
 *
 * 即使某日沒有事件，也會保留空陣列，
 * 方便 Week View 穩定建立七日欄位。
 *
 * @param {Object[]} events 週事件
 * @param {Object=} weekRange 週日期範圍
 * @return {Object}
 */
function groupWeekEventsByDate_(
  events,
  weekRange
) {
  const range =
    weekRange &&
    Array.isArray(weekRange.days)
      ? weekRange
      : getWeekRange_(new Date());

  const groups = {};

  range.days.forEach(function (day) {
    groups[day.date] = [];
  });

  if (!Array.isArray(events)) {
    return groups;
  }

  events.forEach(function (event) {
    const normalizedEvent =
      normalizeWeekViewEvent_(event);

    const eventDate =
      normalizedEvent.date;

    if (!eventDate) {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(
      groups,
      eventDate
    )) {
      return;
    }

    groups[eventDate].push(
      normalizedEvent
    );
  });

  Object.keys(groups).forEach(function (dateKey) {
    groups[dateKey] =
      sortWeekViewEvents_(
        groups[dateKey]
      );
  });

  return groups;
}


/**
 * 取得週摘要。
 *
 * @param {Date|string=} date 指定日期
 * @return {Object}
 */
function getWeekSummary_(date) {
  const weekRange =
    getWeekRange_(date);

  const events =
    getWeekEvents_(date);

  const groupedEvents =
    groupWeekEventsByDate_(
      events,
      weekRange
    );

  const drivers = new Set();

  let totalConflicts = 0;
  let totalRevenue = 0;
  let assignedOrders = 0;
  let unassignedOrders = 0;
  let activeDays = 0;

  events.forEach(function (event) {
    if (event.driver) {
      drivers.add(event.driver);
      assignedOrders += 1;
    } else {
      unassignedOrders += 1;
    }

    if (event.conflict) {
      totalConflicts += 1;
    }

    totalRevenue +=
      parseWeekViewAmount_(event.amount);
  });

  Object.keys(groupedEvents).forEach(function (dateKey) {
    if (groupedEvents[dateKey].length > 0) {
      activeDays += 1;
    }
  });

  return {
    startDate:
      weekRange.startDate,

    endDate:
      weekRange.endDate,

    weekKey:
      weekRange.weekKey,

    totalOrders:
      events.length,

    totalDrivers:
      drivers.size,

    totalConflicts:
      totalConflicts,

    totalRevenue:
      totalRevenue,

    assignedOrders:
      assignedOrders,

    unassignedOrders:
      unassignedOrders,

    activeDays:
      activeDays,

    emptyDays:
      V39242_WEEK_VIEW_CONFIG.WEEK_LENGTH -
      activeDays,

    averageOrdersPerActiveDay:
      activeDays > 0
        ? Number(
            (
              events.length /
              activeDays
            ).toFixed(2)
          )
        : 0,

    version:
      V39242_WEEK_VIEW_CONFIG.VERSION
  };
}


/**
 * 建立完整 Week View 資料模型。
 *
 * 供 WeekViewController 直接組成 Payload。
 *
 * @param {Date|string=} date 指定日期
 * @return {Object}
 */
function getWeekViewData_(date) {
  const weekRange =
    getWeekRange_(date);

  const events =
    getWeekEvents_(date);

  const groupedEvents =
    groupWeekEventsByDate_(
      events,
      weekRange
    );

  const summary =
    getWeekSummaryFromEvents_(
      weekRange,
      events,
      groupedEvents
    );

  const days =
    weekRange.days.map(function (day) {
      const dayEvents =
        groupedEvents[day.date] || [];

      return Object.assign(
        {},
        day,
        {
          events: dayEvents,

          eventCount:
            dayEvents.length,

          conflictCount:
            dayEvents.filter(
              function (event) {
                return event.conflict;
              }
            ).length
        }
      );
    });

  return {
    weekRange:
      weekRange,

    days:
      days,

    events:
      events,

    groupedEvents:
      groupedEvents,

    summary:
      summary,

    version:
      V39242_WEEK_VIEW_CONFIG.VERSION
  };
}


/* ======================================================
 * Summary Helper
 * ====================================================== */

function getWeekSummaryFromEvents_(
  weekRange,
  events,
  groupedEvents
) {
  const drivers = new Set();

  let totalConflicts = 0;
  let totalRevenue = 0;
  let assignedOrders = 0;
  let unassignedOrders = 0;
  let activeDays = 0;

  events.forEach(function (event) {
    if (event.driver) {
      drivers.add(event.driver);
      assignedOrders += 1;
    } else {
      unassignedOrders += 1;
    }

    if (event.conflict) {
      totalConflicts += 1;
    }

    totalRevenue +=
      parseWeekViewAmount_(event.amount);
  });

  Object.keys(groupedEvents).forEach(function (dateKey) {
    if (groupedEvents[dateKey].length > 0) {
      activeDays += 1;
    }
  });

  return {
    startDate:
      weekRange.startDate,

    endDate:
      weekRange.endDate,

    weekKey:
      weekRange.weekKey,

    totalOrders:
      events.length,

    totalDrivers:
      drivers.size,

    totalConflicts:
      totalConflicts,

    totalRevenue:
      totalRevenue,

    assignedOrders:
      assignedOrders,

    unassignedOrders:
      unassignedOrders,

    activeDays:
      activeDays,

    emptyDays:
      V39242_WEEK_VIEW_CONFIG.WEEK_LENGTH -
      activeDays,

    averageOrdersPerActiveDay:
      activeDays > 0
        ? Number(
            (
              events.length /
              activeDays
            ).toFixed(2)
          )
        : 0
  };
}


/* ======================================================
 * Event Normalization
 * ====================================================== */

function normalizeWeekViewEvent_(
  event,
  fallbackDate
) {
  const data = event || {};

  return {
    orderNo:
      normalizeWeekViewText_(
        data.orderNo ||
        data.orderNumber
      ),

    date:
      normalizeWeekViewDateValue_(
        data.date ||
        data.serviceDate ||
        fallbackDate
      ),

    startTime:
      normalizeWeekViewText_(
        data.startTime ||
        data.start
      ),

    endTime:
      normalizeWeekViewText_(
        data.endTime ||
        data.end
      ),

    driver:
      normalizeWeekViewText_(
        data.driver ||
        data.driverName
      ),

    customer:
      normalizeWeekViewText_(
        data.customer ||
        data.customerName ||
        data.passengerName ||
        data.name
      ),

    pickup:
      normalizeWeekViewText_(
        data.pickup ||
        data.pickupAddress
      ),

    dropoff:
      normalizeWeekViewText_(
        data.dropoff ||
        data.dropoffAddress
      ),

    vehicle:
      normalizeWeekViewText_(
        data.vehicle ||
        data.vehicleType ||
        data.carType
      ),

    vehicleNo:
      normalizeWeekViewText_(
        data.vehicleNo ||
        data.plateNo
      ),

    amount:
      data.amount === null ||
      typeof data.amount === 'undefined'
        ? ''
        : data.amount,

    status:
      normalizeWeekViewText_(
        data.status || '待確認'
      ) || '待確認',

    conflict:
      Boolean(data.conflict),

    conflictOrders:
      Array.isArray(data.conflictOrders)
        ? data.conflictOrders
            .map(normalizeWeekViewText_)
            .filter(Boolean)
        : []
  };
}


/* ======================================================
 * Sorting
 * ====================================================== */

function sortWeekViewEvents_(events) {
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .slice()
    .sort(function (a, b) {
      const dateCompare =
        String(a.date || '')
          .localeCompare(
            String(b.date || '')
          );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      const timeCompare =
        weekViewTimeToMinutes_(a.startTime) -
        weekViewTimeToMinutes_(b.startTime);

      if (timeCompare !== 0) {
        return timeCompare;
      }

      const driverCompare =
        String(a.driver || '')
          .localeCompare(
            String(b.driver || ''),
            'zh-Hant'
          );

      if (driverCompare !== 0) {
        return driverCompare;
      }

      return String(a.orderNo || '')
        .localeCompare(
          String(b.orderNo || ''),
          'zh-Hant'
        );
    });
}


function weekViewTimeToMinutes_(value) {
  const match =
    String(value || '')
      .trim()
      .match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hour * 60 + minute;
}


/* ======================================================
 * Date Helpers
 * ====================================================== */

function normalizeWeekViewDateObject_(value) {
  if (value instanceof Date) {
    const clonedDate =
      new Date(value.getTime());

    if (Number.isNaN(clonedDate.getTime())) {
      throw new Error(
        'Week View 收到無效 Date。'
      );
    }

    clonedDate.setHours(12, 0, 0, 0);

    return clonedDate;
  }

  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  ) {
    const parts =
      value.trim().split('-');

    const localDate = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      12,
      0,
      0,
      0
    );

    if (Number.isNaN(localDate.getTime())) {
      throw new Error(
        'Week View 收到無效日期：' +
        value
      );
    }

    return localDate;
  }

  if (
    value === null ||
    typeof value === 'undefined' ||
    String(value).trim() === ''
  ) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  }

  const parsedDate =
    new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(
      'Week View 收到無效日期：' +
      String(value)
    );
  }

  parsedDate.setHours(12, 0, 0, 0);

  return parsedDate;
}


function normalizeWeekViewDateValue_(value) {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  ) {
    return value.trim();
  }

  if (
    value === null ||
    typeof value === 'undefined' ||
    String(value).trim() === ''
  ) {
    return '';
  }

  return formatWeekViewDate_(
    normalizeWeekViewDateObject_(value)
  );
}


function getWeekMonday_(date) {
  const result =
    new Date(date.getTime());

  const currentDay =
    result.getDay();

  const distanceFromMonday =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  result.setDate(
    result.getDate() +
    distanceFromMonday
  );

  result.setHours(12, 0, 0, 0);

  return result;
}


function addWeekViewDays_(date, days) {
  const result =
    new Date(date.getTime());

  result.setDate(
    result.getDate() + days
  );

  result.setHours(12, 0, 0, 0);

  return result;
}


function formatWeekViewDate_(date) {
  return Utilities.formatDate(
    date,
    getWeekViewTimeZone_(),
    V39242_WEEK_VIEW_CONFIG.DATE_FORMAT
  );
}


function getWeekViewTimeZone_() {
  return (
    Session.getScriptTimeZone() ||
    V39242_WEEK_VIEW_CONFIG.DEFAULT_TIME_ZONE
  );
}


function getWeekViewDayLabel_(index) {
  const labels = [
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
    '星期日'
  ];

  return labels[index] || '';
}


function getWeekViewShortDayLabel_(index) {
  const labels = [
    '一',
    '二',
    '三',
    '四',
    '五',
    '六',
    '日'
  ];

  return labels[index] || '';
}


/* ======================================================
 * Value Helpers
 * ====================================================== */

function parseWeekViewAmount_(value) {
  if (
    value === '' ||
    value === null ||
    typeof value === 'undefined'
  ) {
    return 0;
  }

  const amount = Number(
    String(value)
      .replace(/[^\d.-]/g, '')
  );

  return Number.isFinite(amount)
    ? amount
    : 0;
}


function normalizeWeekViewText_(value) {
  return String(
    value === null ||
    typeof value === 'undefined'
      ? ''
      : value
  ).trim();
}


/* ======================================================
 * Manual Tests
 * ====================================================== */

/**
 * 測試今日所在週日期範圍。
 *
 * @return {Object}
 */
function testWeekRangeToday() {
  const result =
    getWeekRange_(new Date());

  console.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}


/**
 * 測試跨年週次。
 *
 * @return {Object}
 */
function testWeekRangeCrossYear() {
  const result =
    getWeekRange_('2026-01-01');

  console.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}


/**
 * 測試今日所在週完整資料。
 *
 * @return {Object}
 */
function testWeekViewDataToday() {
  const result =
    getWeekViewData_(new Date());

  console.log(
    JSON.stringify(result, null, 2)
  );

  return result;
}
