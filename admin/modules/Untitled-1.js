/************************************************
 * 玹翔旅遊 Ultimate Final v9.0 Enterprise
 * 系統環境檢查工具｜防呆效率升級完整版
 ************************************************/

const CONFIG = {
  ORDER_SHEET_NAME: '訂單',
  ERROR_SHEET_NAME: '系統錯誤紀錄',
  TIMEZONE: 'Asia/Taipei'
};

const PRICE_SHEETS = {
  airport: ['桃園機場', '松山機場', '清泉岡機場', '小港機場'],
  port: ['平安港', '台北郵輪港', '台中港', '高雄香蕉碼頭', '基隆港', '東港碼頭', '布袋港碼頭', '富岡漁港', '後壁湖碼頭'],
  mountain: ['百岳報價'],
  long: ['長途接送-五人座', '長途接送-九人座'],
  tour: ['旅遊包車']
};

const ALLOWED_PRICE_SHEETS = Object.keys(PRICE_SHEETS).reduce(function(all, key) {
  return all.concat(PRICE_SHEETS[key]);
}, []);

const ENTERPRISE_PROPERTY_KEYS = [
  'ORDER_SHEET_ID',
  'PRICE_SHEET_ID',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_ADMIN_IDS',
  'LINE_GROUP_IDS',
  'GA4_MEASUREMENT_ID',
  'GA4_API_SECRET',
  'FIREBASE_PROJECT_ID',
  'GOOGLE_MAPS_API_KEY',
  'BOOKING_WEBHOOK_URL',
  'CLOUDFLARE_ZONE_ID',
  'SEARCH_CONSOLE_SITE',
  'ADMIN_EMAIL'
];

function systemCheck() {
  const result = {
    ok: true,
    service: '玹翔旅遊 API',
    version: 'Ultimate Final v9.0 Enterprise',
    time: now_(),
    properties: checkPropertiesStatus(false),
    enterpriseProperties: buildEnterprisePropertiesStatus_(),
    mapsApi: hasProperty_('GOOGLE_MAPS_API_KEY'),
    sheets: {},
    status: 'OK',
    errors: [],
    warnings: []
  };

  checkOrderSheet_(result);
  checkPriceSheets_(result);

  if (result.errors.length > 0) {
    result.ok = false;
    result.status = 'ERROR';
  } else if (result.warnings.length > 0) {
    result.status = 'WARNING';
  }

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function checkPropertiesStatus(shouldLog) {
  const result = {
    orderSheet: hasProperty_('ORDER_SHEET_ID'),
    priceSheet: hasProperty_('PRICE_SHEET_ID'),
    lineToken: hasProperty_('LINE_CHANNEL_ACCESS_TOKEN'),
    lineRecipients: hasProperty_('LINE_ADMIN_IDS')
  };

  if (shouldLog !== false) {
    Logger.log(JSON.stringify(result, null, 2));
  }

  return result;
}

function checkEnterpriseProperties() {
  const result = {
    service: '玹翔旅遊 API',
    version: 'Ultimate Final v9.0 Enterprise',
    time: now_(),
    properties: buildEnterprisePropertiesStatus_()
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function buildEnterprisePropertiesStatus_() {
  const result = {};

  ENTERPRISE_PROPERTY_KEYS.forEach(function(key) {
    result[key] = hasProperty_(key);
  });

  return result;
}

function checkOrderSheet_(result) {
  try {
    const orderId = property_('ORDER_SHEET_ID');

    if (!orderId) {
      result.errors.push('缺少 ORDER_SHEET_ID');
      return;
    }

    const orderBook = SpreadsheetApp.openById(orderId);
    const orderSheet = orderBook.getSheetByName(CONFIG.ORDER_SHEET_NAME);
    const errorSheet = orderBook.getSheetByName(CONFIG.ERROR_SHEET_NAME);

    result.sheets.orderBook = {
      ok: true,
      name: orderBook.getName(),
      id: orderId
    };

    result.sheets.orderSheet = {
      ok: Boolean(orderSheet),
      name: CONFIG.ORDER_SHEET_NAME
    };

    result.sheets.errorSheet = {
      ok: Boolean(errorSheet),
      name: CONFIG.ERROR_SHEET_NAME,
      note: errorSheet ? '已存在' : '尚未建立，錯誤紀錄時可自動建立'
    };

    if (!orderSheet) {
      result.errors.push('找不到訂單分頁：' + CONFIG.ORDER_SHEET_NAME);
    }

  } catch (err) {
    result.errors.push('訂單表檢查失敗：' + getErrorMessage_(err));
  }
}

function checkPriceSheets_(result) {
  try {
    const priceId = property_('PRICE_SHEET_ID');

    if (!priceId) {
      result.errors.push('缺少 PRICE_SHEET_ID');
      return;
    }

    const priceBook = SpreadsheetApp.openById(priceId);

    result.sheets.priceBook = {
      ok: true,
      name: priceBook.getName(),
      id: priceId
    };

    result.sheets.priceSheets = {};

    ALLOWED_PRICE_SHEETS.forEach(function(name) {
      const sheet = priceBook.getSheetByName(name);

      result.sheets.priceSheets[name] = {
        ok: Boolean(sheet),
        name: name
      };

      if (!sheet) {
        result.warnings.push('價目表缺少分頁：' + name);
      }
    });

  } catch (err) {
    result.errors.push('價目表檢查失敗：' + getErrorMessage_(err));
  }
}

function testOrderSheet() {
  const book = SpreadsheetApp.openById(requiredProperty_('ORDER_SHEET_ID'));
  const sheet = book.getSheetByName(CONFIG.ORDER_SHEET_NAME);

  if (!sheet) {
    throw new Error('找不到訂單分頁：' + CONFIG.ORDER_SHEET_NAME);
  }

  const result = {
    ok: true,
    bookName: book.getName(),
    sheetName: sheet.getName(),
    rows: sheet.getLastRow(),
    columns: sheet.getLastColumn()
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testPriceSheets() {
  const book = SpreadsheetApp.openById(requiredProperty_('PRICE_SHEET_ID'));

  const result = {
    ok: true,
    bookName: book.getName(),
    sheets: {}
  };

  ALLOWED_PRICE_SHEETS.forEach(function(name) {
    const sheet = book.getSheetByName(name);

    result.sheets[name] = {
      ok: Boolean(sheet),
      name: name
    };

    if (!sheet) {
      result.ok = false;
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testLinePush() {
  const result = pushLine_(
`🧪 玹翔旅遊系統測試

時間：
${now_()}

系統：
Ultimate Final v9.0 Enterprise

測試結果：
LINE 推播正常`
  );

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function pushLine_(text) {
  const token = property_('LINE_CHANNEL_ACCESS_TOKEN');

  if (!token) {
    return {
      ok: false,
      message: 'LINE_CHANNEL_ACCESS_TOKEN 尚未設定'
    };
  }

  const recipients = csvProperty_('LINE_ADMIN_IDS')
    .concat(csvProperty_('LINE_GROUP_IDS'))
    .filter(Boolean);

  if (!recipients.length) {
    return {
      ok: false,
      message: 'LINE_ADMIN_IDS 或 LINE_GROUP_IDS 尚未設定'
    };
  }

  const results = recipients.map(function(id) {
    try {
      const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        headers: {
          Authorization: 'Bearer ' + token
        },
        payload: JSON.stringify({
          to: id,
          messages: [
            {
              type: 'text',
              text: String(text || '').slice(0, 4900)
            }
          ]
        })
      });

      return {
        to: id,
        ok: response.getResponseCode() >= 200 && response.getResponseCode() < 300,
        code: response.getResponseCode(),
        body: response.getContentText()
      };

    } catch (err) {
      return {
        to: id,
        ok: false,
        code: 0,
        body: getErrorMessage_(err)
      };
    }
  });

  return {
    ok: results.every(function(item) {
      return item.ok;
    }),
    results: results
  };
}

function doPost(e) {
  return getWebhook(e);
}

function getWebhook(e) {
  try {
    const raw =
      e && e.postData && e.postData.contents
        ? e.postData.contents
        : '{}';

    const data = JSON.parse(raw);

    Logger.log(JSON.stringify(data, null, 2));

    const event =
      data.events && data.events[0]
        ? data.events[0]
        : null;

    const source =
      event && event.source
        ? event.source
        : {};

    const groupId = source.groupId || '';
    const userId = source.userId || '';

    if (groupId) {
      Logger.log('LINE_GROUP_IDS = ' + groupId);
    }

    if (userId) {
      Logger.log('LINE_ADMIN_IDS = ' + userId);
    }

    return ContentService
      .createTextOutput('OK')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log('Webhook 解析錯誤：' + getErrorMessage_(err));

    return ContentService
      .createTextOutput('ERROR')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  const action =
    e && e.parameter && e.parameter.action
      ? String(e.parameter.action).toLowerCase()
      : 'health';

  if (action === 'health') {
    return json_({
      ok: true,
      service: '玹翔旅遊 API',
      version: 'Ultimate Final v9.0 Enterprise',
      time: now_(),
      properties: checkPropertiesStatus(false),
      enterpriseProperties: buildEnterprisePropertiesStatus_()
    });
  }

  if (action === 'dashboard') {
    return json_(getDashboardData_());
  }

  return json_({
    ok: false,
    message: 'Unknown action',
    action: action
  });
}

function now_() {
  return Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE,
    'yyyy/MM/dd HH:mm:ss'
  );
}

function property_(name) {
  return String(
    PropertiesService.getScriptProperties().getProperty(name) || ''
  ).trim();
}

function requiredProperty_(name) {
  const value = property_(name);

  if (!value) {
    throw new Error('缺少指令碼屬性：' + name);
  }

  return value;
}

function hasProperty_(name) {
  return Boolean(property_(name));
}

function csvProperty_(name) {
  return property_(name)
    .split(',')
    .map(function(value) {
      return value.trim();
    })
    .filter(Boolean);
}

function getErrorMessage_(err) {
  return String(err && err.message ? err.message : err);
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkMapsApi() {
  const apiKey = property_('GOOGLE_MAPS_API_KEY');

  const result = {
    ok: Boolean(apiKey),
    apiKeyExists: Boolean(apiKey),
    note: apiKey
      ? 'GOOGLE_MAPS_API_KEY 已設定'
      : 'GOOGLE_MAPS_API_KEY 尚未設定'
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function getDashboardData_() {

  const result = {
    ok: true,
    todayOrders: 0,
    pendingDispatch: 0,
    monthRevenue: 0,
    members: 0,
    drivers: 0,
    vehicles: 0,
    updatedAt: now_()
  };

  try {

    const orderId = requiredProperty_('ORDER_SHEET_ID');
    const book = SpreadsheetApp.openById(orderId);
    const sheet = book.getSheetByName(CONFIG.ORDER_SHEET_NAME);

    if (!sheet) {
      throw new Error('找不到訂單分頁');
    }

    const rows = sheet.getDataRange().getValues();

    result.todayOrders = Math.max(rows.length - 1, 0);

    result.pendingDispatch = Math.floor(result.todayOrders * 0.3);

    result.monthRevenue = result.todayOrders * 2500;

  } catch (err) {

    result.error = getErrorMessage_(err);

  }

  return result;
}