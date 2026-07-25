/**
 * ======================================================
 * 玹翔旅遊 V39.1.3 Enterprise
 * DispatchGuard.js｜派車防撞相容層
 * ======================================================
 *
 * 核心職責分工：
 *
 * DispatchGuardEngine.js
 * - checkDriverConflict_
 * - getDriverConflicts_
 * - 時間重疊判斷
 *
 * DispatchGuardIntegration.js
 * - onDriverChanged_
 * - formatConflictMessage_
 * - DispatchConflictLog
 *
 * 本檔不再重複宣告上述函式，避免 Apps Script
 * 全域命名空間出現 Duplicate Function。
 */

/**
 * 車輛衝突查詢預留入口。
 *
 * V39.1 目前採「司機資料」為唯一派車來源，
 * 尚未啟用獨立車輛排程，因此暫時回傳無衝突。
 *
 * @param {string} vehicleNo 車號
 * @param {string} date 日期
 * @param {string} startTime 開始時間
 * @param {string} endTime 結束時間
 * @return {Object} 查詢結果
 */
function checkVehicleConflict_(
  vehicleNo,
  date,
  startTime,
  endTime
) {
  return {
    ok: true,
    conflict: false,
    conflicts: [],
    vehicleNo: String(vehicleNo || '').trim(),
    date: String(date || '').trim(),
    startTime: String(startTime || '').trim(),
    endTime: String(endTime || '').trim(),
    message: 'V39.1 尚未啟用獨立車輛衝突檢查'
  };
}

/**
 * 通用衝突查詢相容入口。
 *
 * @param {Object} criteria 查詢條件
 * @return {Object} 查詢結果
 */
function findConflictOrders_(criteria) {
  const request = criteria || {};

  if (
    request.driverName &&
    typeof getDriverConflicts_ === 'function'
  ) {
    return getDriverConflicts_(request);
  }

  return {
    ok: true,
    conflict: false,
    conflicts: [],
    message: '未提供司機衝突查詢條件'
  };
}
