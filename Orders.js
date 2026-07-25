/**
 * 建立／升級訂單工作表。
 */
function upgradeOrders_(ss) {
  if (!ss) {
    throw new Error('upgradeOrders_：找不到試算表物件。');
  }

  const orderSheet = getOrCreateSheet_(ss, '訂單');

  ensureCols_(orderSheet, 33);
  ensureRows_(orderSheet, 2000);

  /*
   * 升級前先清除舊版資料驗證。
   * 避免舊驗證規則阻擋：
   * 1. 新版標題寫入
   * 2. 自動公式寫入
   * 3. 預設狀態寫入
   */
  orderSheet
    .getRange(
      1,
      1,
      orderSheet.getMaxRows(),
      33
    )
    .clearDataValidations();

  const headers = [
    '建立時間',
    '訂單編號',
    '來源',
    '服務項目',
    '服務細項',
    '乘客姓名',
    '聯絡電話',
    '預約日期',
    '預約時間',
    '上車地址',
    '中途停靠地點',
    '下車地址',
    '乘車人數',
    '行李數量及尺寸',
    '航班編號（機場接送）',
    '船班／梯次（港口接送）',
    '包車天數／每日時數／超時費',
    '加購需求',
    '指定車款',
    '最終報價',
    '其他需求或備註',
    '狀態',
    '付款狀態',
    '款項',
    '派車狀態',
    '司機姓名',
    '車號',
    '車型',
    '顏色',
    '手機號碼',
    '款項進度',
    '車資',
    '資料狀態'
  ];

  orderSheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers]);

  // 清除正式 33 欄右側殘留的舊版表頭與資料。
  const extraColumnCount =
    orderSheet.getMaxColumns() -
    headers.length;

  if (extraColumnCount > 0) {
    orderSheet
      .getRange(
        1,
        headers.length + 1,
        orderSheet.getMaxRows(),
        extraColumnCount
      )
      .clearContent()
      .clearDataValidations();
  }

  /*
   * Google 試算表新版「表格／輸入欄」相容模式。
   *
   * 表格內執行 setFrozenRows()、setFrozenColumns()
   * 或重新套用標題格式時，Google 可能在背景修改
   * 輸入欄數字格式並拋出例外。
   *
   * V38.3.3 起保留現有試算表外觀與凍結設定，
   * 升級程式不再強制修改。
   */
  console.log(
    'upgradeOrders_: 已保留既有標題樣式與凍結設定。'
  );

  /*
   * Google 試算表「表格／輸入欄」不允許 Apps Script
   * 對其欄位呼叫 setNumberFormat()。
   *
   * 此錯誤可能延遲到 upgradeOrders_ 結束時才拋出，
   * 因此即使 setNumberFormat() 外層有 try/catch，
   * 仍可能中斷整體升級。
   *
   * V38.3.2 起，升級流程不再自動修改訂單表數字格式。
   */
  console.log(
    'upgradeOrders_: 已略過訂單數字格式設定（輸入欄相容模式）。'
  );

  const optionsSheet = ss.getSheetByName('系統選項');

  // 依最新版系統選項重新建立驗證
  applyOrderValidations_(
    orderSheet,
    optionsSheet
  );

  // 建立司機、車輛自動帶入公式
  applyOrderFormulas_(
    ss,
    orderSheet
  );

  // 條件格式
  applyOrderConditionalFormats_(
    orderSheet
  );

  // 自動欄位警告保護
  applyOrderProtections_(
    orderSheet
  );

  // 欄寬與版面
  applyOrderLayout_(
    orderSheet
  );

  SpreadsheetApp.flush();
}

/**
 * 套用訂單工作表欄位格式。
 * 依表頭名稱動態尋找欄位，避免欄位順序調整後格式錯位。
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 訂單工作表
 */
function applyOrderNumberFormats_(sheet) {
  if (!sheet) {
    throw new Error('applyOrderNumberFormats_: 缺少訂單工作表');
  }

  const lastColumn = sheet.getLastColumn();
  const maxRows = sheet.getMaxRows();

  if (lastColumn < 1 || maxRows < 2) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || '').trim();
    });

  const headerMap = {};

  headers.forEach(function (header, index) {
    if (header) {
      headerMap[header] = index + 1;
    }
  });

  const dataRowCount = Math.max(maxRows - 1, 1);

  function setFormat_(header, format) {
    const column = headerMap[header];

    if (!column) {
      return;
    }

    const range = sheet.getRange(
      2,
      column,
      dataRowCount,
      1
    );

    /*
     * Google 試算表「表格／輸入欄」可能禁止 Apps Script
     * 直接設定數字格式。格式失敗不應中斷整體升級。
     */
    try {
      range.setNumberFormat(format);
    } catch (error) {
      console.warn(
        'applyOrderNumberFormats_: 無法設定「' +
          header +
          '」格式，已安全略過。原因：' +
          String(
            error && error.message
              ? error.message
              : error
          )
      );
    }
  }

  // 文字型欄位：保留前導零、英文字母及特殊符號。
  [
    '訂單編號',
    '聯絡電話',
    '航班編號（機場接送）',
    '船班／梯次（港口接送）',
    '車號',
    '手機號碼',
    '資料狀態'
  ].forEach(function (header) {
    setFormat_(header, '@');
  });

  // 日期及時間欄位。
  setFormat_('建立時間', 'yyyy-MM-dd HH:mm:ss');
  setFormat_('預約日期', 'yyyy-MM-dd');
  setFormat_('預約時間', 'HH:mm');
  setFormat_('更新時間', 'yyyy-MM-dd HH:mm:ss');

  // 金額欄位。
  setFormat_('最終報價', 'NT$#,##0');
  setFormat_('款項', 'NT$#,##0');
  setFormat_('車資', 'NT$#,##0');
}


/**
 * 套用訂單工作表資料驗證。
 * 依表頭名稱動態尋找欄位，避免欄位順序調整後套錯欄位。
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 訂單工作表
 */
function applyOrderValidations_(sheet, optionsSheet) {
  if (!sheet) throw new Error('applyOrderValidations_：缺少訂單工作表');

  const ss = sheet.getParent();
  const driverSheet = upgradeDrivers_(ss);
  const lastColumn = sheet.getLastColumn();
  const maxRows = sheet.getMaxRows();
  if (lastColumn < 1 || maxRows < 2) return;

  const headers = sheet.getRange(1,1,1,lastColumn).getDisplayValues()[0].map(v => String(v || '').trim());
  const map = {};
  headers.forEach((h,i) => { if (h) map[h] = i + 1; });
  const rows = maxRows - 1;

  function list(header, values, allowInvalid) {
    if (!map[header]) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(values,true)
      .setAllowInvalid(Boolean(allowInvalid))
      .setHelpText('請從下拉式選單中選擇')
      .build();
    sheet.getRange(2,map[header],rows,1).setDataValidation(rule);
  }

  list('服務項目',['機場接送','港口接送','市區接送','長途接送','旅遊包車','登山包車','商務包車','宮廟包車','婚禮用車','其他'],true);
  list('狀態',['待確認','已確認','進行中','已完成','已取消'],false);
  list('付款狀態',['未付款','部分付款','已付款','退款中','已退款'],false);
  list('派車狀態',['待派車','已派車','已出車','已完成','已取消'],false);
  list('資料狀態',['正常','待確認','異常','封存'],true);

  if (map['司機姓名']) {
    const sourceRows = Math.max(driverSheet.getLastRow()-1,1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInRange(driverSheet.getRange(2,1,sourceRows,1),true)
      .setAllowInvalid(false)
      .setHelpText('請從「司機資料」選擇司機姓名')
      .build();
    sheet.getRange(2,map['司機姓名'],rows,1).setDataValidation(rule);
  }
}


/**
 * 建立訂單工作表的司機與車輛自動帶入公式。
 *
 * 依「司機姓名」從「司機資料」工作表帶入：
 * 司機姓名、車號、車型、顏色、手機號碼。
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss 試算表
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 訂單工作表
 */
function applyOrderFormulas_(ss, sheet) {
  if (!ss || !sheet) throw new Error('applyOrderFormulas_：缺少試算表或訂單工作表');
  // V38.3 起不再使用公式；改由 onEdit 寫入固定快照，並在升級時回填。
  backfillOrderDriverData_(ss);
}


/**
 * 套用訂單工作表條件格式。
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 訂單工作表
 */
function applyOrderConditionalFormats_(sheet) {
  if (!sheet) {
    throw new Error(
      'applyOrderConditionalFormats_: 缺少訂單工作表'
    );
  }

  const lastColumn = sheet.getLastColumn();
  const maxRows = sheet.getMaxRows();

  if (lastColumn < 1 || maxRows < 2) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || '').trim();
    });

  const headerMap = {};

  headers.forEach(function (header, index) {
    if (header) {
      headerMap[header] = index + 1;
    }
  });

  const rules = [];
  const rowCount = maxRows - 1;

  /**
   * 建立文字等於指定值的條件格式。
   */
  function addTextRule_(
    header,
    text,
    background
  ) {
    const column = headerMap[header];

    if (!column) {
      return;
    }

    const range = sheet.getRange(
      2,
      column,
      rowCount,
      1
    );

    rules.push(
      SpreadsheetApp
        .newConditionalFormatRule()
        .whenTextEqualTo(text)
        .setBackground(background)
        .setRanges([range])
        .build()
    );
  }

  // 訂單狀態
  addTextRule_(
    '狀態',
    '待確認',
    '#FFF2CC'
  );

  addTextRule_(
    '狀態',
    '已確認',
    '#D9EAD3'
  );

  addTextRule_(
    '狀態',
    '已完成',
    '#D0E0E3'
  );

  addTextRule_(
    '狀態',
    '已取消',
    '#F4CCCC'
  );

  // 付款狀態
  addTextRule_(
    '付款狀態',
    '未付款',
    '#F4CCCC'
  );

  addTextRule_(
    '付款狀態',
    '部分付款',
    '#FFF2CC'
  );

  addTextRule_(
    '付款狀態',
    '已付款',
    '#D9EAD3'
  );

  addTextRule_(
    '付款狀態',
    '已退款',
    '#D9D2E9'
  );

  // 派車狀態
  addTextRule_(
    '派車狀態',
    '待派車',
    '#FCE5CD'
  );

  addTextRule_(
    '派車狀態',
    '已派車',
    '#D9EAD3'
  );

  addTextRule_(
    '派車狀態',
    '已出車',
    '#CFE2F3'
  );

  addTextRule_(
    '派車狀態',
    '已完成',
    '#D0E0E3'
  );

  /*
   * 本函式只管理 V38 訂單條件格式。
   * 升級時重建規則，避免舊版規則重複累積。
   */
  sheet.setConditionalFormatRules(rules);
}


/**
 * 套用訂單自動欄位警告保護。
 *
 * 使用警告模式，不會完全禁止管理者修改。
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 訂單工作表
 */
function applyOrderProtections_(sheet) {
  if (!sheet) {
    throw new Error(
      'applyOrderProtections_: 缺少訂單工作表'
    );
  }

  const lastColumn = sheet.getLastColumn();
  const maxRows = sheet.getMaxRows();

  if (lastColumn < 1 || maxRows < 2) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || '').trim();
    });

  const headerMap = {};

  headers.forEach(function (header, index) {
    if (header) {
      headerMap[header] = index + 1;
    }
  });

  /*
   * 先移除舊的 V38 訂單欄位保護，
   * 避免每次升級都產生重複保護規則。
   */
  const protections = sheet.getProtections(
    SpreadsheetApp.ProtectionType.RANGE
  );

  protections.forEach(function (protection) {
    const description = String(
      protection.getDescription() || ''
    );

    if (
      description.indexOf(
        'V38_ORDER_AUTO_'
      ) === 0
    ) {
      protection.remove();
    }
  });

  const protectedHeaders = [
    '車號',
    '車型',
    '顏色',
    '手機號碼'
  ];

  protectedHeaders.forEach(function (header) {
    const column = headerMap[header];

    if (!column) {
      return;
    }

    const range = sheet.getRange(
      2,
      column,
      maxRows - 1,
      1
    );

    const protection = range
      .protect()
      .setDescription(
        'V38_ORDER_AUTO_' + header
      );

    protection.setWarningOnly(true);
  });
}


/**
 * 套用訂單工作表欄寬、對齊與換行。
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet 訂單工作表
 */
function applyOrderLayout_(sheet) {
  if (!sheet) {
    throw new Error(
      'applyOrderLayout_: 缺少訂單工作表'
    );
  }

  const lastColumn = sheet.getLastColumn();
  const maxRows = sheet.getMaxRows();

  if (lastColumn < 1 || maxRows < 1) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || '').trim();
    });

  const headerMap = {};

  headers.forEach(function (header, index) {
    if (header) {
      headerMap[header] = index + 1;
    }
  });

  const widths = {
    '建立時間': 150,
    '訂單編號': 180,
    '來源': 110,
    '服務項目': 110,
    '服務細項': 120,
    '乘客姓名': 150,
    '聯絡電話': 160,
    '預約日期': 110,
    '預約時間': 90,
    '上車地址': 260,
    '中途停靠地點': 300,
    '下車地址': 260,
    '乘車人數': 110,
    '行李數量及尺寸': 180,
    '航班編號（機場接送）': 160,
    '船班／梯次（港口接送）': 170,
    '包車天數／每日時數／超時費': 220,
    '加購需求': 160,
    '指定車款': 160,
    '最終報價': 120,
    '其他需求或備註': 280,
    '狀態': 100,
    '付款狀態': 100,
    '已收費用': 120,
    '派車狀態': 100,
    '司機姓名': 120,
    '車號': 110,
    '車型': 150,
    '顏色': 90,
    '手機號碼': 150,
    '更新時間': 150,
    '資料狀態': 100
  };

  Object.keys(widths).forEach(
    function (header) {
      const column = headerMap[header];

      if (column) {
        sheet.setColumnWidth(
          column,
          widths[header]
        );
      }
    }
  );

  // 全表垂直置中
  sheet
    .getRange(
      1,
      1,
      maxRows,
      lastColumn
    )
    .setVerticalAlignment('middle');

  // 資料區自動換行
  if (maxRows > 1) {
    sheet
      .getRange(
        2,
        1,
        maxRows - 1,
        lastColumn
      )
      .setWrap(true);
  }

  // 指定欄位置中
  const centerHeaders = [
    '建立時間',
    '預約日期',
    '預約時間',
    '狀態',
    '付款狀態',
    '派車狀態',
    '資料狀態'
  ];

  centerHeaders.forEach(function (header) {
    const column = headerMap[header];

    if (column && maxRows > 1) {
      sheet
        .getRange(
          2,
          column,
          maxRows - 1,
          1
        )
        .setHorizontalAlignment('center');
    }
  });

  // 標題列高度
  sheet.setRowHeight(1, 36);

  // 資料列預設高度
  if (maxRows > 1) {
    sheet.setRowHeights(
      2,
      maxRows - 1,
      28
    );
  }
}
