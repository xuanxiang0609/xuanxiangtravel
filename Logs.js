/**
 * ======================================================
 * 玹翔旅遊 V38.1 Enterprise
 * Logs.gs｜完整操作與稽核紀錄
 * 第一階段：日誌基礎核心
 * ======================================================
 */

const LOGS_CONFIG = Object.freeze({
  SHEET_NAME: '系統日誌',
  INITIAL_ROWS: 1000,
  MAX_ROWS: 20000,

  LEVELS: Object.freeze({
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    AUDIT: 'AUDIT'
  }),

  HEADERS: Object.freeze([
    '日誌ID',
    '建立時間',
    '等級',
    '模組',
    '動作',
    '結果',
    '執行者',
    '執行者Email',
    '來源',
    '關聯ID',
    '訊息',
    '資料JSON',
    '錯誤名稱',
    '錯誤訊息',
    '錯誤堆疊',
    '執行時間毫秒'
  ])
});


/**
 * 建立或升級系統日誌工作表。
 */
function upgradeLogs_(ss) {
  const spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('找不到目前的 Google 試算表。');
  }

  const sheet = getOrCreateSheet_(
    spreadsheet,
    LOGS_CONFIG.SHEET_NAME
  );

  ensureCols_(sheet, LOGS_CONFIG.HEADERS.length);
  ensureRows_(sheet, LOGS_CONFIG.INITIAL_ROWS);

  const headerRange = sheet.getRange(
    1,
    1,
    1,
    LOGS_CONFIG.HEADERS.length
  );

  headerRange.setValues([LOGS_CONFIG.HEADERS]);
  styleHeader_(headerRange);

  sheet.setFrozenRows(1);
  sheet.getRange('B:B').setNumberFormat(
    'yyyy-mm-dd hh:mm:ss'
  );
  sheet.getRange('P:P').setNumberFormat('0');

  const widths = [
    190,
    150,
    90,
    120,
    150,
    100,
    120,
    190,
    110,
    150,
    260,
    380,
    130,
    260,
    420,
    120
  ];

  widths.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  applyLogsConditionalFormats_(sheet);
  applyLogsFilter_(sheet);

  return sheet;
}


/**
 * 統一日誌寫入入口。
 */
function writeLog_(data) {
  const input = data || {};
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    throw new Error(
      '系統日誌目前忙碌，無法取得寫入鎖。'
    );
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      throw new Error(
        '找不到目前的 Google 試算表。'
      );
    }

    const sheet = upgradeLogs_(ss);
    const errorInfo = normalizeLogError_(
      input.error
    );
    const actor = resolveLogActor_(input);
    const now = new Date();
    const logId = makeLogId_();

    const row = [
      logId,
      now,
      normalizeLogLevel_(input.level),
      String(input.module || 'SYSTEM'),
      String(input.action || 'UNKNOWN'),
      String(input.result || 'SUCCESS'),
      actor.name,
      actor.email,
      String(input.source || 'APPS_SCRIPT'),
      String(
        input.referenceId ||
        input.refId ||
        ''
      ),
      String(input.message || ''),
      safeJsonStringify_(sanitizeLogData_(input.data || {})),
      errorInfo.name,
      errorInfo.message,
      errorInfo.stack,
      toLogNumber_(input.durationMs)
    ];

    const targetRow = sheet.getLastRow() + 1;

    sheet
      .getRange(
        targetRow,
        1,
        1,
        row.length
      )
      .setValues([row]);

    trimLogsIfNeeded_(sheet);

    return {
      success: true,
      logId: logId,
      timestamp: now.toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}


function logInfo_(
  moduleName,
  action,
  message,
  data
) {
  return writeLog_({
    level: LOGS_CONFIG.LEVELS.INFO,
    module: moduleName,
    action: action,
    message: message,
    data: data,
    result: 'SUCCESS'
  });
}


function logWarning_(
  moduleName,
  action,
  message,
  data
) {
  return writeLog_({
    level: LOGS_CONFIG.LEVELS.WARNING,
    module: moduleName,
    action: action,
    message: message,
    data: data,
    result: 'WARNING'
  });
}


function logError_(
  moduleName,
  action,
  error,
  data
) {
  const errorInfo = normalizeLogError_(error);

  return writeLog_({
    level: LOGS_CONFIG.LEVELS.ERROR,
    module: moduleName,
    action: action,
    message: errorInfo.message,
    error: error,
    data: data,
    result: 'FAILED'
  });
}


function logAudit_(
  moduleName,
  action,
  result,
  data
) {
  const detail = data || {};

  return writeLog_({
    level: LOGS_CONFIG.LEVELS.AUDIT,
    module: moduleName,
    action: action,
    result: result || 'SUCCESS',
    message: detail.message || '',
    referenceId:
      detail.referenceId ||
      detail.refId ||
      '',
    data: detail,
    source: 'AUDIT'
  });
}


function resolveLogActor_(input) {
  const activeEmail = safeGetActiveUserEmail_();

  return {
    name: String(
      input.actorName ||
      input.actor ||
      activeEmail ||
      'SYSTEM'
    ),

    email: String(
      input.actorEmail ||
      activeEmail ||
      ''
    )
  };
}


function safeGetActiveUserEmail_() {
  try {
    return Session
      .getActiveUser()
      .getEmail() || '';
  } catch (error) {
    return '';
  }
}


function normalizeLogError_(error) {
  if (!error) {
    return {
      name: '',
      message: '',
      stack: ''
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: ''
    };
  }

  return {
    name: String(error.name || 'Error'),

    message: String(
      error.message ||
      error.toString() ||
      ''
    ),

    stack: String(error.stack || '')
  };
}


function normalizeLogLevel_(level) {
  const value = String(
    level || LOGS_CONFIG.LEVELS.INFO
  ).toUpperCase();

  const allowed = Object.keys(
    LOGS_CONFIG.LEVELS
  ).map(function(key) {
    return LOGS_CONFIG.LEVELS[key];
  });

  return allowed.indexOf(value) >= 0
    ? value
    : LOGS_CONFIG.LEVELS.INFO;
}


function safeJsonStringify_(value) {
  try {
    return JSON.stringify(value || {});
  } catch (error) {
    return JSON.stringify({
      serializationError:
        error.message ||
        String(error)
    });
  }
}


function trimLogsIfNeeded_(sheet) {
  const dataRows = sheet.getLastRow() - 1;

  if (dataRows <= LOGS_CONFIG.MAX_ROWS) {
    return;
  }

  const excess =
    dataRows - LOGS_CONFIG.MAX_ROWS;

  sheet.deleteRows(2, excess);
}


function applyLogsFilter_(sheet) {
  const existingFilter = sheet.getFilter();

  if (existingFilter) {
    existingFilter.remove();
  }

  sheet
    .getRange(
      1,
      1,
      Math.max(sheet.getLastRow(), 2),
      LOGS_CONFIG.HEADERS.length
    )
    .createFilter();
}


function applyLogsConditionalFormats_(sheet) {
  const range = sheet.getRange(
    2,
    1,
    Math.max(
      sheet.getMaxRows() - 1,
      1
    ),
    LOGS_CONFIG.HEADERS.length
  );

  const rules = [
    SpreadsheetApp
      .newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=$C2="ERROR"'
      )
      .setBackground('#f4cccc')
      .setRanges([range])
      .build(),

    SpreadsheetApp
      .newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=$C2="WARNING"'
      )
      .setBackground('#fff2cc')
      .setRanges([range])
      .build(),

    SpreadsheetApp
      .newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=$C2="AUDIT"'
      )
      .setBackground('#d9ead3')
      .setRanges([range])
      .build()
  ];

  sheet.setConditionalFormatRules(rules);
}


function toLogNumber_(value) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
}


function makeLogId_() {
  return 'LOG-' + Utilities.getUuid();
}

/**
 * Auth 專用日誌入口。
 */
function logAuthEvent_(action, result, user, data) {
  const identity = user || {};
  const detail = sanitizeLogData_(data || {});
  const normalizedResult = String(
    result || 'UNKNOWN'
  ).toUpperCase();

  return writeLog_({
    level: normalizedResult === 'SUCCESS'
      ? LOGS_CONFIG.LEVELS.AUDIT
      : LOGS_CONFIG.LEVELS.WARNING,

    module: 'AUTH',
    action: action || 'UNKNOWN',
    result: normalizedResult,

    actorName:
      identity.displayName ||
      identity.name ||
      identity.uid ||
      'UNKNOWN',

    actorEmail: identity.email || '',

    referenceId:
      identity.uid ||
      identity.lineUserId ||
      '',

    message: detail.message || '',
    source: detail.provider || 'AUTH',

    data: {
      user: sanitizeLogData_(identity),
      detail: detail
    }
  });
}


/**
 * API 請求日誌入口。
 */
function logApiRequest_(
  request,
  response,
  durationMs
) {
  const req = sanitizeLogData_(request || {});
  const res = sanitizeLogData_(response || {});

  const success = !(
    res &&
    res.success === false
  );

  return writeLog_({
    level: success
      ? LOGS_CONFIG.LEVELS.INFO
      : LOGS_CONFIG.LEVELS.WARNING,

    module: 'API',

    action:
      req.action ||
      req.path ||
      req.route ||
      'REQUEST',

    result: success
      ? 'SUCCESS'
      : 'FAILED',

    referenceId:
      req.requestId ||
      req.traceId ||
      '',

    message: res.message || '',
    source: 'API',
    durationMs: durationMs,

    data: {
      request: req,
      response: res
    }
  });
}


/**
 * 車隊異動日誌入口。
 */



/**
 * 遞迴清理並遮罩日誌資料。
 */
function sanitizeLogData_(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    Object.prototype.toString.call(value) ===
    '[object Date]'
  ) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(function(item) {
      return sanitizeLogData_(item);
    });
  }

  if (typeof value === 'object') {
    const output = {};

    Object.keys(value).forEach(function(key) {
      output[key] = maskSensitiveValue_(
        key,
        value[key]
      );
    });

    return output;
  }

  return value;
}


/**
 * 依欄位名稱遮罩敏感資料。
 */
function maskSensitiveValue_(key, value) {
  const normalizedKey = String(key || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  const sensitiveKeys = [
    'password',
    'passwd',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'authorization',
    'apikey',
    'secret',
    'clientsecret',
    'sessiontoken',
    'lineaccesstoken',
    'firebasetoken',
    'jwt',
    'cvv',
    'cardnumber',
    'creditcard'
  ];

  const isSensitive = sensitiveKeys.some(
    function(sensitiveKey) {
      return (
        normalizedKey === sensitiveKey ||
        normalizedKey.indexOf(
          sensitiveKey
        ) >= 0
      );
    }
  );

  if (isSensitive) {
    return maskLogText_(value);
  }

  if (
    normalizedKey === 'phone' ||
    normalizedKey === 'mobile' ||
    normalizedKey === 'telephone'
  ) {
    return maskLogPhone_(value);
  }

  if (normalizedKey === 'email') {
    return maskLogEmail_(value);
  }

  if (
    normalizedKey === 'identitynumber' ||
    normalizedKey === 'idnumber' ||
    normalizedKey === 'nationalid'
  ) {
    return maskLogText_(value);
  }

  return sanitizeLogData_(value);
}


function maskLogText_(value) {
  const text = String(value || '');

  if (!text) {
    return '';
  }

  if (text.length <= 4) {
    return '****';
  }

  return (
    text.slice(0, 2) +
    '****' +
    text.slice(-2)
  );
}


function maskLogPhone_(value) {
  const text = String(value || '');

  if (text.length < 7) {
    return maskLogText_(text);
  }

  return (
    text.slice(0, 2) +
    '****' +
    text.slice(-2)
  );
}


function maskLogEmail_(value) {
  const text = String(value || '');
  const atIndex = text.indexOf('@');

  if (atIndex <= 1) {
    return maskLogText_(text);
  }

  const account = text.slice(0, atIndex);
  const domain = text.slice(atIndex);

  return (
    account.slice(0, 2) +
    '****' +
    domain
  );
}

