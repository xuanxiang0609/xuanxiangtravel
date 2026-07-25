/**
 * ======================================================
 * V39.1 Enterprise
 * Dispatch Guard
 * ======================================================
 */

/**
 * 檢查司機是否有衝突
 */
function checkDriverConflict_(driverName, date, startTime, endTime) {
  return {
    ok: true,
    conflict: false,
    orders: []
  };
}

/**
 * 檢查車輛是否衝突
 */
function checkVehicleConflict_(vehicleNo, date, startTime, endTime) {
  return {
    ok: true,
    conflict: false,
    orders: []
  };
}

/**
 * 查詢衝突訂單
 */
function findConflictOrders_(criteria) {
  return [];
}

/**
 * 格式化衝突訊息
 */
function formatConflictMessage_(conflicts) {
  if (!conflicts || conflicts.length === 0) {
    return '';
  }

  return conflicts.map(function(item) {
    return (
      item.orderNo +
      ' (' +
      item.start +
      ' ~ ' +
      item.end +
      ')'
    );
  }).join('\n');
}
