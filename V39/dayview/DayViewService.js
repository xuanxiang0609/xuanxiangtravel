/**
 * ======================================================
 * 玹翔旅遊 V39.2.3.2 Enterprise
 * DayViewService.js
 * ------------------------------------------------------
 * Day View 資料層
 * ======================================================
 */

/**
 * 取得指定日期派車事件
 *
 * @param {Date|string} date
 * @return {Object[]}
 */
function getDayEvents_(date) {
  const events =
    typeof getDispatchEventsByDate_ === 'function'
      ? getDispatchEventsByDate_(date)
      : [];

  return events.sort(function (a, b) {
    return timeToMinutes_(a.startTime) - timeToMinutes_(b.startTime);
  });
}

/**
 * 取得指定日期摘要
 *
 * @param {Date|string} date
 * @return {Object}
 */
function getDaySummary_(date) {
  const events = getDayEvents_(date);

  return {
    date: date,
    totalOrders: events.length,
    totalDrivers: new Set(events.map(e => e.driver).filter(Boolean)).size,
    totalConflicts: events.filter(e => e.conflict).length
  };
}
