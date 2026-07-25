/**
 * ======================================================
 * 玹翔旅遊 V39.1.2 Enterprise
 * DispatchGuardEngine.js｜派車衝突偵測核心
 * ======================================================
 */

const V3912_DISPATCH_CONFIG = Object.freeze({
  ORDER_SHEET: '訂單',
  LOG_SHEET: 'DispatchConflictLog',
  DEFAULT_DURATION_MINUTES: 120,
  TIMEZONE: 'Asia/Taipei'
});

/**
 * Dashboard、Calendar、AI Dispatch 共用衝突查詢 API。
 *
 * @param {Object} request 查詢條件
 * @return {Object} 查詢結果
 */
function getDriverConflicts_(request) {
  if (!request || !String(request.driverName || '').trim()) {
    return {
      ok: false,
      conflict: false,
      conflicts: [],
      message: '缺少司機姓名'
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = request.sheet ||
    ss.getSheetByName(V3912_DISPATCH_CONFIG.ORDER_SHEET);

  if (!sheet || sheet.getLastRow() < 2) {
    return {
      ok: true,
      conflict: false,
      conflicts: []
    };
  }

  const values = sheet.getDataRange().getDisplayValues();
  const headerMap = v3912BuildHeaderMap_(values[0]);

  [
    '訂單編號',
    '乘客姓名',
    '預約日期',
    '預約時間',
    '司機姓名'
  ].forEach(function (header) {
    if (headerMap[header] == null) {
      throw new Error(
        'getDriverConflicts_：訂單表缺少「' +
        header +
        '」欄位'
      );
    }
  });

  const requestedStart = v3912BuildDateTime_(
    request.date,
    request.startTime
  );

  const requestedEnd = v3912BuildDateTime_(
    request.date,
    request.endTime
  );

  if (
    !requestedStart ||
    !requestedEnd ||
    requestedEnd <= requestedStart
  ) {
    return {
      ok: false,
      conflict: false,
      conflicts: [],
      message: '開始或結束時間不正確'
    };
  }

  const driverName = String(request.driverName).trim();
  const conflicts = [];

  for (let index = 1; index < values.length; index += 1) {
    const rowNumber = index + 1;
    const row = values[index];

    if (
      request.excludeRow &&
      Number(request.excludeRow) === rowNumber
    ) {
      continue;
    }

    const existingDriver = v3912GetRowValue_(
      row,
      headerMap,
      '司機姓名'
    );

    if (existingDriver !== driverName) {
      continue;
    }

    const existingOrderNo = v3912GetRowValue_(
      row,
      headerMap,
      '訂單編號'
    );

    if (
      request.excludeOrderNo &&
      existingOrderNo === String(request.excludeOrderNo).trim()
    ) {
      continue;
    }

    const existingDate = v3912GetRowValue_(
      row,
      headerMap,
      '預約日期'
    );

    const existingStartText = v3912GetRowValue_(
      row,
      headerMap,
      '預約時間'
    );

    if (!existingDate || !existingStartText) {
      continue;
    }

    const existingEndText = v3912ResolveRecordEndTime_(
      row,
      headerMap,
      existingDate,
      existingStartText
    );

    const existingStart = v3912BuildDateTime_(
      existingDate,
      existingStartText
    );

    const existingEnd = v3912BuildDateTime_(
      existingDate,
      existingEndText
    );

    if (
      !existingStart ||
      !existingEnd ||
      existingEnd <= existingStart
    ) {
      continue;
    }

    if (
      requestedStart < existingEnd &&
      requestedEnd > existingStart
    ) {
      conflicts.push({
        row: rowNumber,
        orderNo: existingOrderNo,
        customer: v3912GetRowValue_(
          row,
          headerMap,
          '乘客姓名'
        ),
        driverName: existingDriver,
        date: existingDate,
        startTime: existingStartText,
        endTime: existingEndText
      });
    }
  }

  return {
    ok: true,
    conflict: conflicts.length > 0,
    conflicts: conflicts
  };
}

/**
 * 相容舊 V39.1 函式名稱。
 */
function checkDriverConflict_(
  sheet,
  driverName,
  date,
  startTime,
  endTime,
  excludeRow,
  excludeOrderNo
) {
  return getDriverConflicts_({
    sheet: sheet,
    driverName: driverName,
    date: date,
    startTime: startTime,
    endTime: endTime,
    excludeRow: excludeRow,
    excludeOrderNo: excludeOrderNo
  });
}

function v3912BuildHeaderMap_(headers) {
  const map = {};

  headers.forEach(function (header, index) {
    const name = String(header || '').trim();

    if (name && map[name] == null) {
      map[name] = index;
    }
  });

  return map;
}

function v3912GetRowValue_(row, headerMap, header) {
  const index = headerMap[header];

  if (index == null) {
    return '';
  }

  return String(row[index] || '').trim();
}

function v3912ResolveRecordEndTime_(
  row,
  headerMap,
  dateValue,
  startValue
) {
  const explicitHeaders = [
    '結束時間',
    '預估結束時間',
    '服務結束時間'
  ];

  for (
    let index = 0;
    index < explicitHeaders.length;
    index += 1
  ) {
    const value = v3912GetRowValue_(
      row,
      headerMap,
      explicitHeaders[index]
    );

    if (value) {
      return value;
    }
  }

  const service = v3912GetRowValue_(
    row,
    headerMap,
    '服務項目'
  );

  const detail = v3912GetRowValue_(
    row,
    headerMap,
    '服務細項'
  );

  return v3912CalculateEndTime_(
    dateValue,
    startValue,
    v3912EstimateDurationMinutes_(service, detail)
  );
}

function v3912EstimateDurationMinutes_(service, detail) {
  const text =
    String(service || '') +
    ' ' +
    String(detail || '');

  const hourMatch = text.match(
    /(\d+(?:\.\d+)?)\s*小時/
  );

  if (hourMatch) {
    return Math.max(
      Math.round(Number(hourMatch[1]) * 60),
      30
    );
  }

  if (
    /旅遊包車|一日包車|宮廟包車|登山包車/.test(text)
  ) {
    return 480;
  }

  if (
    /機場接送|港口接送|長途接送/.test(text)
  ) {
    return 180;
  }

  if (/市區接送/.test(text)) {
    return 90;
  }

  return V3912_DISPATCH_CONFIG.DEFAULT_DURATION_MINUTES;
}

function v3912CalculateEndTime_(
  dateValue,
  startValue,
  durationMinutes
) {
  const start = v3912BuildDateTime_(
    dateValue,
    startValue
  );

  if (!start) {
    return '';
  }

  const end = new Date(
    start.getTime() +
    Number(durationMinutes) * 60000
  );

  return Utilities.formatDate(
    end,
    Session.getScriptTimeZone() ||
      V3912_DISPATCH_CONFIG.TIMEZONE,
    'HH:mm'
  );
}

function v3912BuildDateTime_(dateValue, timeValue) {
  const dateText = String(dateValue || '')
    .trim()
    .replace(/\//g, '-');

  let timeText = String(timeValue || '').trim();

  if (!dateText || !timeText) {
    return null;
  }

  if (/^\d{1,2}:\d{2}$/.test(timeText)) {
    timeText += ':00';
  }

  const result = new Date(
    dateText + 'T' + timeText
  );

  return isNaN(result.getTime())
    ? null
    : result;
}
