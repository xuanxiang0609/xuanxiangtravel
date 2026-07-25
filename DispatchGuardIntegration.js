/**
 * ======================================================
 * 玹翔旅遊 V39.1.2 Enterprise
 * DispatchGuardIntegration.js｜派車防撞整合
 * ======================================================
 */

/**
 * 司機姓名欄位異動處理器。
 *
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e
 * @return {Object}
 */
function onDriverChanged_(e) {
  if (!e || !e.range) {
    return {
      ok: false,
      handled: false,
      message: '缺少 onEdit 事件'
    };
  }

  const sheet = e.range.getSheet();

  if (
    sheet.getName() !==
    V3912_DISPATCH_CONFIG.ORDER_SHEET
  ) {
    return {
      ok: true,
      handled: false
    };
  }

  const row = e.range.getRow();

  if (row <= 1) {
    return {
      ok: true,
      handled: false
    };
  }

  const headerMap = v3912GetSheetHeaderMap_(sheet);
  const driverColumn = headerMap['司機姓名'];

  if (
    !driverColumn ||
    e.range.getColumn() !== driverColumn
  ) {
    return {
      ok: true,
      handled: false
    };
  }

  const driverName = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '司機姓名'
  );

  if (!driverName) {
    v3912ClearDriverFields_(
      sheet,
      row,
      headerMap
    );

    return {
      ok: true,
      handled: true,
      conflict: false
    };
  }

  const orderNo = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '訂單編號'
  );

  const customer = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '乘客姓名'
  );

  const dateValue = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '預約日期'
  );

  const startValue = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '預約時間'
  );

  const endValue = v3912ResolveCurrentEndTime_(
    sheet,
    row,
    headerMap,
    dateValue,
    startValue
  );

  if (!dateValue || !startValue || !endValue) {
    SpreadsheetApp
      .getActiveSpreadsheet()
      .toast(
        '缺少預約日期或時間，暫時無法檢查排班衝突。',
        '⚠️ Dispatch Guard',
        7
      );

    return {
      ok: false,
      handled: true,
      conflict: false,
      message: '缺少日期或時間'
    };
  }

  const result = getDriverConflicts_({
    sheet: sheet,
    driverName: driverName,
    date: dateValue,
    startTime: startValue,
    endTime: endValue,
    excludeRow: row,
    excludeOrderNo: orderNo
  });

  if (!result.conflict) {
    return {
      ok: true,
      handled: true,
      conflict: false,
      conflicts: []
    };
  }

  const message = formatConflictMessage_(
    result.conflicts,
    {
      orderNo: orderNo,
      customer: customer,
      driverName: driverName
    }
  );

  v3912WriteConflictLog_({
    currentOrderNo: orderNo,
    currentCustomer: customer,
    currentRow: row,
    driverName: driverName,
    date: dateValue,
    startTime: startValue,
    endTime: endValue,
    conflicts: result.conflicts,
    message: message
  });

  v3912ClearDriverFields_(
    sheet,
    row,
    headerMap
  );

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      message,
      '🚫 已阻擋重複派車',
      10
    );

  return {
    ok: true,
    handled: true,
    conflict: true,
    cleared: true,
    conflicts: result.conflicts,
    message: message
  };
}

function formatConflictMessage_(
  conflicts,
  currentOrder
) {
  if (!conflicts || conflicts.length === 0) {
    return '';
  }

  const first = conflicts[0];

  let message =
    '司機：' +
    first.driverName +
    '\n衝突訂單：' +
    (first.orderNo || '未填訂單編號') +
    '\n乘客：' +
    (first.customer || '未填乘客') +
    '\n時段：' +
    first.date +
    ' ' +
    first.startTime +
    '～' +
    first.endTime;

  if (conflicts.length > 1) {
    message +=
      '\n另有 ' +
      (conflicts.length - 1) +
      ' 筆衝突';
  }

  if (currentOrder && currentOrder.orderNo) {
    message +=
      '\n目前訂單：' +
      currentOrder.orderNo;
  }

  return message;
}

function v3912GetConflictLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(
    V3912_DISPATCH_CONFIG.LOG_SHEET
  );

  if (!sheet) {
    sheet = ss.insertSheet(
      V3912_DISPATCH_CONFIG.LOG_SHEET
    );
  }

  const headers = [
    '偵測時間',
    '目前訂單編號',
    '目前乘客',
    '目前列號',
    '司機姓名',
    '預約日期',
    '開始時間',
    '結束時間',
    '衝突訂單編號',
    '衝突乘客',
    '衝突時段',
    '衝突列號',
    '處理結果',
    '訊息'
  ];

  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers]);

  sheet.setFrozenRows(1);

  return sheet;
}

function v3912WriteConflictLog_(event) {
  const sheet = v3912GetConflictLogSheet_();

  const now = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() ||
      V3912_DISPATCH_CONFIG.TIMEZONE,
    'yyyy-MM-dd HH:mm:ss'
  );

  event.conflicts.forEach(function (conflict) {
    sheet.appendRow([
      now,
      event.currentOrderNo || '',
      event.currentCustomer || '',
      event.currentRow || '',
      event.driverName || '',
      event.date || '',
      event.startTime || '',
      event.endTime || '',
      conflict.orderNo || '',
      conflict.customer || '',
      conflict.date +
        ' ' +
        conflict.startTime +
        '～' +
        conflict.endTime,
      conflict.row || '',
      '已阻擋並清除司機',
      event.message || ''
    ]);
  });
}

function v3912ClearDriverFields_(
  sheet,
  row,
  headerMap
) {
  [
    '司機姓名',
    '車號',
    '車型',
    '顏色',
    '手機號碼'
  ].forEach(function (header) {
    const column = headerMap[header];

    if (column) {
      sheet
        .getRange(row, column)
        .clearContent();
    }
  });
}

function v3912GetSheetHeaderMap_(sheet) {
  const headers = sheet
    .getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getDisplayValues()[0];

  const map = {};

  headers.forEach(function (header, index) {
    const name = String(header || '').trim();

    if (name && !map[name]) {
      map[name] = index + 1;
    }
  });

  return map;
}

function v3912ReadSheetValue_(
  sheet,
  row,
  headerMap,
  header
) {
  const column = headerMap[header];

  if (!column) {
    return '';
  }

  return String(
    sheet
      .getRange(row, column)
      .getDisplayValue() ||
    ''
  ).trim();
}

function v3912ResolveCurrentEndTime_(
  sheet,
  row,
  headerMap,
  dateValue,
  startValue
) {
  const endHeaders = [
    '結束時間',
    '預估結束時間',
    '服務結束時間'
  ];

  for (
    let index = 0;
    index < endHeaders.length;
    index += 1
  ) {
    const value = v3912ReadSheetValue_(
      sheet,
      row,
      headerMap,
      endHeaders[index]
    );

    if (value) {
      return value;
    }
  }

  const service = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '服務項目'
  );

  const detail = v3912ReadSheetValue_(
    sheet,
    row,
    headerMap,
    '服務細項'
  );

  return v3912CalculateEndTime_(
    dateValue,
    startValue,
    v3912EstimateDurationMinutes_(
      service,
      detail
    )
  );
}

/**
 * Dashboard 2.0 共用 API。
 */
function v3912GetConflictDashboardData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(
    V3912_DISPATCH_CONFIG.LOG_SHEET
  );

  if (!logSheet || logSheet.getLastRow() < 2) {
    return {
      totalConflicts: 0,
      records: []
    };
  }

  const values = logSheet
    .getDataRange()
    .getDisplayValues();

  return {
    totalConflicts: values.length - 1,
    records: values.slice(1)
  };
}
