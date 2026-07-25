/**
 * ======================================================
 * 玹翔旅遊 V39 Enterprise
 * V39_Conflict.js｜排班衝突偵測
 * ======================================================
 */

/**
 * 檢查指定司機是否在同一時間區間已有訂單。
 *
 * @param {Object} request 排班資料
 * @param {string} request.driverName 司機姓名
 * @param {Date|string} request.startTime 開始時間
 * @param {Date|string} request.endTime 結束時間
 * @param {string=} request.orderNo 排除的訂單編號
 * @return {Object} 衝突結果
 */
function v39CheckDriverConflict_(request) {
  if (!request || !request.driverName) {
    return {
      ok: false,
      conflict: false,
      message: '缺少司機姓名'
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(V39_CONFIG.SHEETS.ORDERS);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      ok: true,
      conflict: false,
      conflicts: []
    };
  }

  const values = sheet
    .getDataRange()
    .getDisplayValues();

  const headers = values[0].map(function (value) {
    return String(value || '').trim();
  });

  const map = {};

  headers.forEach(function (header, index) {
    if (header) {
      map[header] = index;
    }
  });

  const required = [
    '訂單編號',
    '預約日期',
    '預約時間',
    '司機姓名'
  ];

  required.forEach(function (header) {
    if (map[header] == null) {
      throw new Error(
        'v39CheckDriverConflict_：訂單表缺少「' +
          header +
          '」欄位'
      );
    }
  });

  const requestedStart = new Date(request.startTime);
  const requestedEnd = new Date(request.endTime);

  if (
    isNaN(requestedStart.getTime()) ||
    isNaN(requestedEnd.getTime())
  ) {
    return {
      ok: false,
      conflict: false,
      message: '開始或結束時間格式不正確'
    };
  }

  const conflicts = [];

  for (let row = 1; row < values.length; row += 1) {
    const record = values[row];
    const driverName = String(
      record[map['司機姓名']] || ''
    ).trim();

    const orderNo = String(
      record[map['訂單編號']] || ''
    ).trim();

    if (
      driverName !== request.driverName ||
      (request.orderNo && orderNo === request.orderNo)
    ) {
      continue;
    }

    const dateValue = String(
      record[map['預約日期']] || ''
    ).trim();

    const timeValue = String(
      record[map['預約時間']] || ''
    ).trim();

    if (!dateValue || !timeValue) {
      continue;
    }

    const existingStart = new Date(
      dateValue + 'T' + timeValue + ':00'
    );

    if (isNaN(existingStart.getTime())) {
      continue;
    }

    const existingEnd = new Date(
      existingStart.getTime() +
      V39_CONFIG.DEFAULTS.SERVICE_DURATION_MINUTES *
        60 *
        1000
    );

    const overlap =
      requestedStart < existingEnd &&
      requestedEnd > existingStart;

    if (overlap) {
      conflicts.push({
        row: row + 1,
        orderNo: orderNo,
        driverName: driverName,
        startTime: existingStart,
        endTime: existingEnd
      });
    }
  }

  return {
    ok: true,
    conflict: conflicts.length > 0,
    conflicts: conflicts
  };
}
