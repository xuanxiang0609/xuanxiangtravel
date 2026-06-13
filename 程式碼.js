/************************************************
 * 玹翔旅遊 Ultimate Enterprise Final v15.0
 * Dispatch Core API｜HTML / CSS / JS / GS / Apps Script 共用模板正式營運版
 * ------------------------------------------------
 * 特色：
 * 1. 保留原 doGet API：health / systemcheck / dashboard / orders / dispatch / drivers / vehicles / revenue / kpi
 * 2. 新增 createOrder / appendOrder / estimate / prices / ping / repairheaders / verifyheaders
 * 3. 支援 JSON / JSONP / 表單 POST
 * 4. 自動修復訂單表頭、錯誤紀錄分頁
 * 5. LINE 推播失敗不阻斷訂單寫入
 * 6. 後台資料欄位正規化，前端比較不會被空欄位打趴
 ************************************************/

const CONFIG = {
  SERVICE_NAME: '玹翔旅遊 API',
  VERSION: 'Ultimate Enterprise Final v15.0',
  BOOKING_MALL_VERSION: 'v15',
  BOOKING_TEMPLATE: 'booking-mall-shared-v12.2',
  LAYOUT_VERSION: 'Ultimate Enterprise Final Layout v15.0',
  API_MODE: 'apps-script',
  ORDER_SHEET_NAME: '訂單',
  ERROR_SHEET_NAME: '系統錯誤紀錄',
  DRIVER_SHEET_NAME: '司機資料',
  VEHICLE_SHEET_NAME: '車輛資料',
  TIMEZONE: 'Asia/Taipei',
  MAX_ORDERS_RETURN: 500,
  DEFAULT_SOURCE: 'website',
  JSONP_CALLBACK_PARAM: 'callback'
};

const ORDER_HEADERS = [
  '建立時間',
  '訂單編號',
  '來源',
  '預約版本',
  '預約商城版本',
  '共用模板',
  '版型版本',
  'API模式',
  'API端點',
  '頁面來源',
  '服務項目',
  '服務細項',
  '乘客姓名',
  '聯絡電話',
  'LINE / WhatsApp',
  '預約日期',
  '搭車時間',
  '上車地址',
  '中途點',
  '下車地址',
  '人數',
  '行李',
  '航班編號',
  '船班編號 / 船班梯次',
  '用車天數',
  '包車時數',
  '加購項目',
  '車款',
  '試算表報價',
  '價錢（未稅）',
  '加購金額',
  '轉點費',
  '統編加成',
  '刷卡手續費',
  '系統加價',
  '預估小計',
  '公司抬頭',
  '統一編號',
  '行程JSON',
  '報價備註',
  '客服備註',
  '狀態',
  '司機',
  '車牌',
  '車型',
  '車色',
  '司機手機'
];

const PRICE_SHEETS = {
  tour: ['包車_北部', '包車_中部', '包車_南部', '包車_東部', '豪華包車'],
  airport: ['機場_轎車5人', '機場_休旅5人', '機場_九人座', '機場_VITO', '機場_Granvia', '機場_SClass', '機場_Alphard', '機場_LM', '機場_保母車'],
  port: ['港口_五人座', '港口_休旅車', '港口_九人座'],
  concert: ['演唱會接送＿明星保母車', '演唱會接送＿九人座'],
  long: ['縣市接送_五人座', '縣市接送_休旅車', '縣市接送_九人座'],
  attraction: ['熱門景點接駁']
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
  'GOOGLE_ROUTES_API_KEY',
  'BOOKING_WEBHOOK_URL',
  'BOOKING_MALL_VERSION',
  'BOOKING_TEMPLATE',
  'BOOKING_API_MODE',
  'CLOUDFLARE_ZONE_ID',
  'SEARCH_CONSOLE_SITE',
  'ADMIN_EMAIL'
];

/************************************************
 * Web App Entrypoints
 ************************************************/

function doGet(e) {
  return routeRequest_(e, 'GET');
}

function doPost(e) {
  return routeRequest_(e, 'POST');
}

function routeRequest_(e, method) {
  try {
    const params = getParams_(e);
    const action = String(params.action || (method === 'POST' ? 'createorder' : 'health')).toLowerCase();
    let result;

    switch (action) {
      case 'ping':
      case 'health':
        result = getHealth_();
        break;

      case 'systemcheck':
        result = systemCheck();
        break;

      case 'properties':
      case 'enterpriseproperties':
        result = checkEnterpriseProperties();
        break;

      case 'dashboard':
        result = getDashboardData_();
        break;

      case 'orders':
        result = getOrders_(params);
        break;

      case 'dispatch':
        result = getDispatch_();
        break;

      case 'drivers':
        result = getDrivers_();
        break;

      case 'vehicles':
        result = getVehicles_();
        break;

      case 'revenue':
        result = getRevenue_();
        break;

      case 'kpi':
        result = getKpi_();
        break;

      case 'version':
        result = {
          ok: true,
          service: CONFIG.SERVICE_NAME,
          version: CONFIG.VERSION,
          bookingMallVersion: CONFIG.BOOKING_MALL_VERSION,
          bookingTemplate: CONFIG.BOOKING_TEMPLATE,
          layoutVersion: CONFIG.LAYOUT_VERSION,
          apiMode: CONFIG.API_MODE,
          time: now_()
        };
        break;

      case 'prices':
      case 'price':
        result = getPriceSheetData_(params);
        break;

      case 'quote':
      case 'estimate':
        result = estimateRoutePrice_(params);
        break;

      case 'sheetestimate':
      case 'sheetquote':
        result = estimatePrice_(params);
        break;

      case 'createorder':
      case 'appendorder':
      case 'booking':
        result = createOrder_(params);
        break;

      case 'repairheaders':
        result = repairOrderHeaders();
        break;

      case 'verifyheaders':
        result = verifyOrderHeaders();
        break;

      case 'debugheaders':
        result = debugHeadersResult_();
        break;

      case 'cleanuporders':
        result = cleanupOrders();
        break;

      case 'normalizeorders':
        result = normalizeHistoricalOrders();
        break;

      case 'dispatchorder':
        result = dispatchOrder_(params);
        break;

      case 'assigndriver':
        result = assignDriver_(params);
        break;

      case 'memberlookup':
        result = memberLookup_(params);
        break;

      // ---- NEW CASES START ----
      case 'memberlookup':
  result = memberLookup_(params);
  break;

case 'memberlogin':
  result = memberLogin_(params);
  break;

case 'driverlocation':
  result = updateDriverLocation_(params);
  break;

case 'memberregister':
case 'membercreate':
  result = memberRegister_(params);
  break;

case 'driverapp':
case 'driverorders':
  result = getDriverAppData_(params);
  break;

      case 'driverapp':
      case 'driverorders':
        result = getDriverAppData_(params);
        break;

      case 'routesestimate':
      case 'googleroute':
        result = estimateRouteByRoutesApi_(params);
        break;
      // ---- NEW CASES END ----

      case 'orderlookup':
        result = orderLookup_(params);
        break;

      case 'linewebhook':
      case 'webhook':
        result = handleLineWebhook_(e);
        break;

      default:
        result = {
          ok: false,
          message: 'Unknown action',
          action: action,
          availableActions: [
            'health',
            'systemcheck',
            'dashboard',
            'orders',
            'dispatch',
            'drivers',
            'vehicles',
            'revenue',
            'kpi',
            'prices',
            'estimate',
            'sheetEstimate',
            'createOrder',
            'repairHeaders',
            'debugHeaders',
            'verifyHeaders',
            'cleanupOrders',
            'normalizeOrders',
            'dispatchOrder',
            'assignDriver',
            'memberLookup',
            'orderLookup',
            'webhook',
            'memberRegister',
            'memberCreate',
            'driverApp',
            'driverOrders',
            'routesEstimate',
            'googleRoute'
          ]
        };
    }

    return output_(result, params);

  } catch (err) {
    return output_({
      ok: false,
      message: getErrorMessage_(err),
      service: CONFIG.SERVICE_NAME,
      version: CONFIG.VERSION,
      time: now_()
    }, getParams_(e));
  }
}

/************************************************
 * Health / System Check
 ************************************************/

function getHealth_() {
  return {
    ok: true,
    service: CONFIG.SERVICE_NAME,
    version: CONFIG.VERSION,
    bookingMallVersion: property_('BOOKING_MALL_VERSION') || CONFIG.BOOKING_MALL_VERSION,
    bookingTemplate: property_('BOOKING_TEMPLATE') || CONFIG.BOOKING_TEMPLATE,
    layoutVersion: CONFIG.LAYOUT_VERSION,
    apiMode: property_('BOOKING_API_MODE') || CONFIG.API_MODE,
    time: now_(),
    timezone: CONFIG.TIMEZONE,
    properties: checkPropertiesStatus(false),
    enterpriseProperties: buildEnterprisePropertiesStatus_()
  };
}

function systemCheck() {
  const result = {
    ok: true,
    service: CONFIG.SERVICE_NAME,
    version: CONFIG.VERSION,
    bookingMallVersion: property_('BOOKING_MALL_VERSION') || CONFIG.BOOKING_MALL_VERSION,
    bookingTemplate: property_('BOOKING_TEMPLATE') || CONFIG.BOOKING_TEMPLATE,
    layoutVersion: CONFIG.LAYOUT_VERSION,
    apiMode: property_('BOOKING_API_MODE') || CONFIG.API_MODE,
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
    lineRecipients: hasProperty_('LINE_ADMIN_IDS') || hasProperty_('LINE_GROUP_IDS')
  };

  if (shouldLog !== false) {
    Logger.log(JSON.stringify(result, null, 2));
  }

  return result;
}

function checkEnterpriseProperties() {
  const result = {
    ok: true,
    service: CONFIG.SERVICE_NAME,
    version: CONFIG.VERSION,
    bookingMallVersion: property_('BOOKING_MALL_VERSION') || CONFIG.BOOKING_MALL_VERSION,
    bookingTemplate: property_('BOOKING_TEMPLATE') || CONFIG.BOOKING_TEMPLATE,
    layoutVersion: CONFIG.LAYOUT_VERSION,
    apiMode: property_('BOOKING_API_MODE') || CONFIG.API_MODE,
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
      name: CONFIG.ORDER_SHEET_NAME,
      rows: orderSheet ? orderSheet.getLastRow() : 0,
      columns: orderSheet ? orderSheet.getLastColumn() : 0
    };

    result.sheets.errorSheet = {
      ok: Boolean(errorSheet),
      name: CONFIG.ERROR_SHEET_NAME,
      note: errorSheet ? '已存在' : '尚未建立，錯誤紀錄時可自動建立'
    };

    if (!orderSheet) {
      result.errors.push('找不到訂單分頁：' + CONFIG.ORDER_SHEET_NAME);
    } else {
      const verify = verifyOrderHeaders();
      result.sheets.orderHeaders = verify;
      if (!verify.ok) {
        result.warnings.push('訂單表頭與系統版本不完全一致，可執行 action=repairHeaders 修復');
      }
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
        name: name,
        rows: sheet ? sheet.getLastRow() : 0,
        columns: sheet ? sheet.getLastColumn() : 0
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

function checkMapsApi() {
  const apiKey = property_('GOOGLE_MAPS_API_KEY');
  const result = {
    ok: Boolean(apiKey),
    apiKeyExists: Boolean(apiKey),
    routesApiExists: hasProperty_('GOOGLE_ROUTES_API_KEY'),
    note: apiKey ? 'Google Maps API 已設定' : 'Google Maps API 尚未設定'
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/************************************************
 * Order Create / Dashboard Data
 ************************************************/

function createOrder_(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = openOrderSheet_();
    ensureOrderHeaders_(sheet);

    const orders = buildOrdersFromIncomingParams_(params);

if (!orders || !orders.length) {
  throw new Error('訂單資料為空');
}

const createdOrders = [];

    orders.forEach(function(order) {
      const row = ORDER_HEADERS.map(function(header) {
        return order[header] !== undefined ? order[header] : '';
      });

      sheet.appendRow(row);
      createdOrders.push(order);
    });

    SpreadsheetApp.flush();

    const lineResults = createdOrders.map(function(order) {
      return notifyNewOrder_(order);
    });

    return {
      ok: true,
      message: createdOrders.length > 1 ? '來回訂單已建立' : '訂單已建立',
      orderNo: createdOrders[0]['訂單編號'],
      bookingVersion: createdOrders[0]['預約版本'],
      bookingMallVersion: createdOrders[0]['預約商城版本'],
      bookingTemplate: createdOrders[0]['共用模板'],
      layoutVersion: createdOrders[0]['版型版本'],
      apiMode: createdOrders[0]['API模式'],
      orderNos: createdOrders.map(function(order) {
        return order['訂單編號'];
      }),
      count: createdOrders.length,
      status: createdOrders[0]['狀態'],
      estimatedTotal: createdOrders[0]['預估小計'],
      line: lineResults,
      createdAt: createdOrders[0]['建立時間']
    };

  } catch (err) {
    logError_('createOrder_', err, params);
    return {
      ok: false,
      message: getErrorMessage_(err),
      time: now_()
    };

  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function buildOrdersFromIncomingParams_(params) {
  const baseOrder = normalizeIncomingOrder_(params);
  const service = baseOrder['服務項目'];
  const serviceDetail = baseOrder['服務細項'];

  if (!shouldSplitRoundTrip_(service, serviceDetail)) {
    return [baseOrder];
  }

  const outboundOrder = cloneObject_(baseOrder);
  outboundOrder['訂單編號'] = generateOrderNo_();
  outboundOrder['服務細項'] = getOutboundDetail_(service, serviceDetail);
  outboundOrder['客服備註'] = appendMemo_(outboundOrder['客服備註'], '系統自動拆單：去程訂單');

  const returnOrder = cloneObject_(baseOrder);
  returnOrder['訂單編號'] = generateOrderNo_();
  returnOrder['服務細項'] = getReturnDetail_(service, serviceDetail);
  returnOrder['預約日期'] = dateKey_(getValueByKeys_(params, ['回程日期', 'returnDate', 'return_date'], baseOrder['預約日期']));
  returnOrder['搭車時間'] = clean_(getValueByKeys_(params, ['回程時間', 'returnTime', 'return_time'], baseOrder['搭車時間']));
  returnOrder['航班編號'] = clean_(getValueByKeys_(params, ['回程航班編號', 'returnFlightNo', 'returnFlight', 'return_flight_no'], ''));
  returnOrder['船班編號 / 船班梯次'] = clean_(getValueByKeys_(params, ['回程船班梯次', '回程船班編號', 'returnShipSession', 'returnShipNo', 'return_ship_session'], ''));
  returnOrder['上車地址'] = clean_(getValueByKeys_(params, ['回程上車地址', 'returnFrom', 'returnPickup'], baseOrder['下車地址']));
  returnOrder['下車地址'] = clean_(getValueByKeys_(params, ['回程下車地址', 'returnTo', 'returnDropoff'], baseOrder['上車地址']));
  returnOrder['客服備註'] = appendMemo_(returnOrder['客服備註'], '系統自動拆單：回程訂單；原始服務細項：' + serviceDetail);

  return [outboundOrder, returnOrder];
}

function shouldSplitRoundTrip_(service, detail) {
  return (service === '機場接送' && (detail === '接送' || detail === '接送機')) ||
    (service === '港口接送' && (detail === '接送' || detail === '來回')) ||
    (service === '長途接送' && detail === '來回') ||
    (service === '演唱會接送' && detail === '來回');
}

function getOutboundDetail_(service, detail) {
  if (service === '機場接送' && (detail === '接送' || detail === '接送機')) return '送機';
  if (service === '港口接送' && (detail === '接送' || detail === '來回')) return '送港';
  if (service === '長途接送' && detail === '來回') return '去程';
  if (service === '演唱會接送' && detail === '來回') return '去程';
  return detail;
}

function getReturnDetail_(service, detail) {
  if (service === '機場接送' && (detail === '接送' || detail === '接送機')) return '接機';
  if (service === '港口接送' && (detail === '接送' || detail === '來回')) return '接船';
  if (service === '長途接送' && detail === '來回') return '回程';
  if (service === '演唱會接送' && detail === '來回') return '回程';
  return detail;
}

function cloneObject_(item) {
  const result = {};
  Object.keys(item || {}).forEach(function(key) {
    result[key] = item[key];
  });
  return result;
}

function appendMemo_(memo, text) {
  const base = clean_(memo);
  const extra = clean_(text);
  if (!base) return extra;
  if (!extra) return base;
  return base + '｜' + extra;
}

function normalizeIncomingOrder_(params) {
  const service = clean_(getValueByKeys_(params, ['服務項目', 'service', 'serviceName', 'type'], '未填服務'));
  const bookingVersion = clean_(getValueByKeys_(params, ['預約版本', 'bookingVersion', 'booking_version'], CONFIG.VERSION));
  const bookingMallVersion = clean_(getValueByKeys_(params, ['預約商城版本', 'bookingMallVersion', 'booking_mall_version'], property_('BOOKING_MALL_VERSION') || CONFIG.BOOKING_MALL_VERSION));
  const bookingTemplate = clean_(getValueByKeys_(params, ['共用模板', 'bookingTemplate', 'booking_template'], property_('BOOKING_TEMPLATE') || CONFIG.BOOKING_TEMPLATE));
  const layoutVersion = clean_(getValueByKeys_(params, ['版型版本', 'layoutVersion', 'layout_version'], CONFIG.LAYOUT_VERSION));
  const apiMode = clean_(getValueByKeys_(params, ['API模式', 'apiMode', 'api_mode'], property_('BOOKING_API_MODE') || CONFIG.API_MODE));
  const apiEndpoint = clean_(getValueByKeys_(params, ['API端點', 'apiEndpoint', 'api_endpoint'], ''));
  const pageSource = clean_(getValueByKeys_(params, ['頁面來源', 'pageSource', 'page_source'], 'booking.html'));
  const serviceDetail = clean_(getValueByKeys_(params, ['服務細項', 'serviceDetail', 'detail', 'subService'], ''));
  const customer = clean_(getValueByKeys_(params, ['乘客姓名', '姓名', 'customer', 'name', 'passenger'], '未填姓名'));
  const phone = clean_(getValueByKeys_(params, ['聯絡電話', '聯絡方式', '電話', 'phone', 'contact', 'tel'], ''));
  const line = clean_(getValueByKeys_(params, ['LINE / WhatsApp', 'line', 'LINE', 'whatsapp', 'contactLine', 'contactApp'], ''));
  const date = dateKey_(getValueByKeys_(params, ['預約日期', '日期', '用車日期', 'pickupDate', 'date'], ''));
  const time = clean_(getValueByKeys_(params, ['搭車時間', '時間', '用車時間', 'pickupTime', 'time'], ''));
  const pickup = stringifyList_(getValueByKeys_(params, ['上車地址', 'pickup', 'pickups', 'pickups[]', 'from', 'start', 'origin'], ''));
  const itineraryJson = clean_(getValueByKeys_(params, ['行程JSON', 'itineraryJson', 'itinerary_json'], ''));
  const midpoints = stringifyList_(getValueByKeys_(params, ['中途點', '行程', '行程規劃', 'routePoints', 'midpoints', 'stops', 'itinerary'], ''));
  const dropoff = stringifyList_(getValueByKeys_(params, ['下車地址', 'dropoff', 'dropoffs', 'dropoffs[]', 'to', 'destination'], ''));
  const people = clean_(getValueByKeys_(params, ['人數', 'people', 'passengers', 'pax'], ''));
  const bags = clean_(getValueByKeys_(params, ['行李', '行李數', 'bags', 'luggage', 'luggageCount'], ''));
  const flight = clean_(getValueByKeys_(params, ['航班編號', 'flightNo', 'flight', 'flightNumber'], ''));
  const shipSession = clean_(getValueByKeys_(params, ['船班編號 / 船班梯次', '船班梯次', '船班編號', 'shipSession', 'shipNo'], ''));
  const days = clean_(getValueByKeys_(params, ['用車天數', '包車天數', 'days'], ''));
  const hours = clean_(getValueByKeys_(params, ['包車時數', '用車時數', 'hours', 'carHours'], ''));
  const addons = stringifyList_(getValueByKeys_(params, ['加購項目', '加購服務', 'addons', 'customerAddons', 'customer_addons'], ''));
  const vehicle = clean_(getValueByKeys_(params, ['車款', '車型', 'vehicle', 'car'], '未指定車款'));
  const sheetPrice = parseAmount_(getValueByKeys_(params, ['試算表報價', 'sheetPrice', 'quotedPrice', 'price'], 0));
  const basePrice = parseAmount_(getValueByKeys_(params, ['價錢（未稅）', 'basePrice', 'baseFare', 'untaxedPrice'], sheetPrice));
  const addonAmount = parseAmount_(getValueByKeys_(params, ['加購金額', 'addonAmount', 'addonsAmount', 'addonTotal'], 0));
  const transferPointFee = parseAmount_(getValueByKeys_(params, ['轉點費', 'transferPointFee', 'transfer_point_fee'], 0));
  const taxFee = parseAmount_(getValueByKeys_(params, ['統編加成', 'taxFee', 'tax_fee'], 0));
  const cardFee = parseAmount_(getValueByKeys_(params, ['刷卡手續費', 'cardFee', 'card_fee'], 0));
  const systemExtra = parseAmount_(getValueByKeys_(params, ['系統加價', 'systemExtra', 'systemAdd'], transferPointFee + taxFee + cardFee));
  const estimatedTotal = parseAmount_(getValueByKeys_(params, ['預估小計', 'estimatedTotal', 'estimated_total', 'total'], basePrice + addonAmount + systemExtra));
  const taxTitle = clean_(getValueByKeys_(params, ['公司抬頭', 'taxTitle', 'companyTitle'], ''));
  const taxIdNumber = clean_(getValueByKeys_(params, ['統一編號', 'taxIdNumber', 'taxId', 'vatNumber'], ''));

  return {
    '建立時間': now_(),
    '訂單編號': generateOrderNo_(),
    '來源': clean_(getValueByKeys_(params, ['來源', 'source', 'utm_source'], CONFIG.DEFAULT_SOURCE)),
    '預約版本': bookingVersion,
    '預約商城版本': bookingMallVersion,
    '共用模板': bookingTemplate,
    '版型版本': layoutVersion,
    'API模式': apiMode,
    'API端點': apiEndpoint,
    '頁面來源': pageSource,
    '服務項目': service,
    '服務細項': serviceDetail,
    '乘客姓名': customer,
    '聯絡電話': phone,
    'LINE / WhatsApp': line,
    '預約日期': date,
    '搭車時間': time,
    '上車地址': pickup,
    '中途點': midpoints,
    '下車地址': dropoff,
    '人數': people,
    '行李': bags,
    '航班編號': flight,
    '船班編號 / 船班梯次': shipSession,
    '用車天數': days,
    '包車時數': hours,
    '加購項目': addons,
    '車款': vehicle,
    '試算表報價': sheetPrice,
    '價錢（未稅）': basePrice,
    '加購金額': addonAmount,
    '轉點費': transferPointFee,
    '統編加成': taxFee,
    '刷卡手續費': cardFee,
    '系統加價': systemExtra,
    '預估小計': estimatedTotal,
    '公司抬頭': taxTitle,
    '統一編號': taxIdNumber,
    '行程JSON': itineraryJson,
    '報價備註': clean_(getValueByKeys_(params, ['報價備註', 'quoteMemo', 'priceMemo'], '')),
    '客服備註': clean_(getValueByKeys_(params, ['客服備註', 'memo', 'note', 'remark'], '')),
    '狀態': normalizeStatus_(getValueByKeys_(params, ['狀態', 'status'], '待確認')),
    '司機': clean_(getValueByKeys_(params, ['司機', 'driver'], '')),
    '車牌': clean_(getValueByKeys_(params, ['車牌', 'plate'], '')),
    '車型': clean_(getValueByKeys_(params, ['車型', 'model'], vehicle)),
    '車色': clean_(getValueByKeys_(params, ['車色', 'carColor', 'color'], '')),
    '司機手機': clean_(getValueByKeys_(params, ['司機手機', 'driverPhone'], ''))
  };
}

function notifyNewOrder_(order) {
  const text = [
    '🚐 玹翔旅遊新訂單通知',
    '',
    '訂單編號：' + order['訂單編號'],
    '預約版本：' + (order['預約版本'] || CONFIG.VERSION),
    '共用模板：' + (order['共用模板'] || CONFIG.BOOKING_TEMPLATE),
    '服務項目：' + order['服務項目'] + (order['服務細項'] ? '｜' + order['服務細項'] : ''),
    '乘客姓名：' + order['乘客姓名'],
    '聯絡電話：' + order['聯絡電話'],
    '日期時間：' + order['預約日期'] + ' ' + order['搭車時間'],
    '上車地址：' + order['上車地址'],
    order['中途點'] ? '中途點：' + order['中途點'] : '',
    '下車地址：' + order['下車地址'],
    order['航班編號'] ? '航班編號：' + order['航班編號'] : '',
    order['船班編號 / 船班梯次'] ? '船班梯次：' + order['船班編號 / 船班梯次'] : '',
    '人數／行李：' + order['人數'] + '／' + order['行李'],
    order['加購項目'] ? '加購項目：' + order['加購項目'] : '',
    '車款：' + order['車款'],
    '預估小計：' + formatMoney_(order['預估小計']),
    '狀態：' + order['狀態'],
    '',
    '時間：' + now_()
  ].filter(function(line) { return String(line || '').trim() !== ''; }).join('\n');

  return pushLine_(text);
}

function getOrders_(params) {
  const result = {
    ok: true,
    orders: [],
    count: 0,
    updatedAt: now_()
  };

  try {
    const sheet = openOrderSheet_();
    const rows = sheetToObjects_(sheet);
    const limit = Math.min(parseInt((params && params.limit) || CONFIG.MAX_ORDERS_RETURN, 10) || CONFIG.MAX_ORDERS_RETURN, 1000);

    result.orders = rows.map(function(row, index) {
      return normalizeOrder_(row, index);
    }).reverse().slice(0, limit);

    result.count = result.orders.length;

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function getDashboardData_() {
  const result = {
    ok: true,
    todayOrders: 0,
    pendingDispatch: 0,
    confirmedOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    yearRevenue: 0,
    activeDrivers: 0,
    activeVehicles: 0,
    members: 0,
    drivers: 0,
    vehicles: 0,
    updatedAt: now_()
  };

  try {
    const ordersData = getOrders_({ limit: 1000 });

    if (!ordersData.ok) {
      throw new Error(ordersData.message || '訂單資料讀取失敗');
    }

    const orders = ordersData.orders;
    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy/MM/dd');
    const currentMonth = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy/MM');
    const currentYear = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy');

    result.todayOrders = orders.filter(function(order) {
      return String(order.date || '').slice(0, 10) === today;
    }).length;

    result.pendingDispatch = orders.filter(function(order) {
      return /待客服確認|待確認|已確認/.test(order.status);
    }).length;

    result.confirmedOrders = orders.filter(function(order) {
      return /已確認/.test(order.status);
    }).length;

    result.completedOrders = orders.filter(function(order) {
      return /已完成/.test(order.status);
    }).length;

    result.cancelledOrders = orders.filter(function(order) {
      return /已取消/.test(order.status);
    }).length;

    result.todayRevenue = sumRevenueByPrefix_(orders, today);
    result.monthRevenue = sumRevenueByPrefix_(orders, currentMonth);
    result.yearRevenue = sumRevenueByPrefix_(orders, currentYear);

    const driversData = getDrivers_();
    const vehiclesData = getVehicles_();

    result.drivers = driversData.ok ? driversData.drivers.length : 0;
    result.vehicles = vehiclesData.ok ? vehiclesData.vehicles.length : 0;

    result.activeDrivers = driversData.ok
      ? driversData.drivers.filter(function(driver) {
          return /可派|出車中|已確認|正常/.test(String(driver.status || ''));
        }).length
      : 0;

    result.activeVehicles = vehiclesData.ok
      ? vehiclesData.vehicles.filter(function(vehicle) {
          return /正常|可派|出車中/.test(String(vehicle.status || ''));
        }).length
      : 0;

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function getDispatch_() {
  const result = {
    ok: true,
    dispatches: [],
    updatedAt: now_()
  };

  try {
    const ordersData = getOrders_({ limit: 1000 });

    if (!ordersData.ok) {
      throw new Error(ordersData.message || '訂單資料讀取失敗');
    }

    result.dispatches = ordersData.orders
      .filter(function(order) {
        return !/已完成|已取消/.test(order.status);
      })
      .map(function(order) {
        return {
          orderNo: order.id,
          service: order.service,
          customer: order.customer,
          phone: order.phone,
          date: order.date,
          time: order.time,
          pickup: order.pickup,
          dropoff: order.dropoff,
          driver: order.driver || '未派司機',
          vehicle: order.vehicle || '未指定車款',
          status: order.status,
          amount: order.amount,
          flight: order.flight,
          shipSession: order.shipSession,
          eventName: order.eventName,
          route: order.route
        };
      });

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function getDrivers_() {
  const result = {
    ok: true,
    drivers: [],
    updatedAt: now_()
  };

  try {
    const sheet = openOptionalSheet_(CONFIG.DRIVER_SHEET_NAME);

    if (!sheet) {
      result.drivers = [];
      result.note = '尚未建立司機資料分頁';
      return result;
    }

    result.drivers = sheetToObjects_(sheet).map(function(row) {
      return {
        name: clean_(getValueByKeys_(row, ['姓名', '司機', 'name'], '未填司機')),
        phone: clean_(getValueByKeys_(row, ['電話', '手機', 'phone'], '')),
        line: clean_(getValueByKeys_(row, ['LINE', 'line'], '')),
        vehicle: clean_(getValueByKeys_(row, ['車型', '車款', 'vehicle'], '')),
        plate: clean_(getValueByKeys_(row, ['車牌', 'plate'], '')),
        status: clean_(getValueByKeys_(row, ['狀態', 'status'], '可派'))
      };
    });

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function getVehicles_() {
  const result = {
    ok: true,
    vehicles: [],
    updatedAt: now_()
  };

  try {
    const sheet = openOptionalSheet_(CONFIG.VEHICLE_SHEET_NAME);

    if (!sheet) {
      result.vehicles = [];
      result.note = '尚未建立車輛資料分頁';
      return result;
    }

    result.vehicles = sheetToObjects_(sheet).map(function(row) {
      return {
        plate: clean_(getValueByKeys_(row, ['車牌', 'plate'], '未填車牌')),
        model: clean_(getValueByKeys_(row, ['車型', '車款', 'model', 'vehicle'], '')),
        color: clean_(getValueByKeys_(row, ['車色', 'color'], '')),
        status: clean_(getValueByKeys_(row, ['狀態', 'status'], '正常')),
        gps: clean_(getValueByKeys_(row, ['GPS', 'gps'], '')),
        maintenanceDate: dateKey_(getValueByKeys_(row, ['保養日期', 'maintenanceDate'], ''))
      };
    });

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function getRevenue_() {
  const result = {
    ok: true,
    todayRevenue: 0,
    monthRevenue: 0,
    yearRevenue: 0,
    daily: [],
    monthly: 0,
    updatedAt: now_()
  };

  try {
    const ordersData = getOrders_({ limit: 1000 });

    if (!ordersData.ok) {
      throw new Error(ordersData.message || '訂單資料讀取失敗');
    }

    const orders = ordersData.orders;
    const today = new Date();
    const todayKey = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyy/MM/dd');
    const currentMonth = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyy/MM');
    const currentYear = Utilities.formatDate(today, CONFIG.TIMEZONE, 'yyyy');

    result.todayRevenue = sumRevenueByPrefix_(orders, todayKey);
    result.monthRevenue = sumRevenueByPrefix_(orders, currentMonth);
    result.yearRevenue = sumRevenueByPrefix_(orders, currentYear);
    result.monthly = result.monthRevenue;
    result.daily = buildLastSevenDaysRevenue_(orders);

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function getKpi_() {
  const dashboard = getDashboardData_();

  if (!dashboard.ok) {
    return dashboard;
  }

  return {
    ok: true,
    todayOrders: dashboard.todayOrders,
    pendingDispatch: dashboard.pendingDispatch,
    confirmedOrders: dashboard.confirmedOrders,
    completedOrders: dashboard.completedOrders,
    cancelledOrders: dashboard.cancelledOrders,
    activeDrivers: dashboard.activeDrivers,
    activeVehicles: dashboard.activeVehicles,
    todayRevenue: dashboard.todayRevenue,
    monthRevenue: dashboard.monthRevenue,
    yearRevenue: dashboard.yearRevenue,
    updatedAt: now_()
  };
}


/************************************************
 * Production v10.2｜Dispatch / Lookup Actions
 ************************************************/

function dispatchOrder_(params) {
  const orderNo = clean_(getValueByKeys_(params, ['orderNo', 'orderId', '訂單編號'], ''));
  const status = normalizeStatus_(getValueByKeys_(params, ['status', '狀態'], '已確認'));

  if (!orderNo) {
    return buildResult_(false, '缺少訂單編號', { action: 'dispatchorder' });
  }

  const updated = updateOrderByNo_(orderNo, {
    '狀態': status
  });

  return buildResult_(updated.ok, updated.message, updated);
}

function assignDriver_(params) {
  const orderNo = clean_(getValueByKeys_(params, ['orderNo', 'orderId', '訂單編號'], ''));

  if (!orderNo) {
    return buildResult_(false, '缺少訂單編號', { action: 'assigndriver' });
  }

  const payload = {
    '司機': clean_(getValueByKeys_(params, ['driver', '司機'], '')),
    '車牌': clean_(getValueByKeys_(params, ['plate', '車牌'], '')),
    '車型': clean_(getValueByKeys_(params, ['model', '車型', 'vehicle'], '')),
    '車色': clean_(getValueByKeys_(params, ['color', '車色'], '')),
    '司機手機': clean_(getValueByKeys_(params, ['driverPhone', '司機手機'], '')),
    '狀態': normalizeStatus_(getValueByKeys_(params, ['status', '狀態'], '已確認'))
  };

  const updated = updateOrderByNo_(orderNo, payload);

  if (updated.ok) {
    pushLine_([
      '🚐 玹翔旅遊客服確認更新',
      '',
      '訂單編號：' + orderNo,
      '司機：' + (payload['司機'] || '未填'),
      '車牌：' + (payload['車牌'] || '未填'),
      '車型：' + (payload['車型'] || '未填'),
      '狀態：' + payload['狀態'],
      '',
      '時間：' + now_()
    ].join('\n'));
  }

  return buildResult_(updated.ok, updated.message, updated);
}

function memberLookup_(params) {
  const keyword = clean_(getValueByKeys_(params, ['keyword', 'phone', '聯絡電話', 'line', 'LINE'], ''));

  if (!keyword) {
    return buildResult_(false, '請提供會員查詢關鍵字', { members: [] });
  }

  const ordersData = getOrders_({ limit: 1000 });
  const orders = ordersData.ok ? ordersData.orders : [];

  const matched = orders.filter(function(order) {
    return [order.customer, order.phone, order.line].join(' ').indexOf(keyword) !== -1;
  });

  return buildResult_(true, '會員訂單查詢完成', {
    keyword: keyword,
    count: matched.length,
    orders: matched.slice(0, 50)
  });
}

function orderLookup_(params) {
  const keyword = clean_(getValueByKeys_(params, ['keyword', 'orderNo', 'orderId', '訂單編號', 'phone', '聯絡電話'], ''));

  if (!keyword) {
    return buildResult_(false, '請提供訂單編號或電話', { orders: [] });
  }

  const ordersData = getOrders_({ limit: 1000 });
  const orders = ordersData.ok ? ordersData.orders : [];

  const matched = orders.filter(function(order) {
    return [order.id, order.customer, order.phone, order.line].join(' ').indexOf(keyword) !== -1;
  });

  return buildResult_(true, '訂單查詢完成', {
    keyword: keyword,
    count: matched.length,
    orders: matched.slice(0, 50)
  });
}

/************************************************
 * Member / Driver App / Google Routes API
 ************************************************/

function memberRegister_(params) {
  return {
    ok: true,
    action: 'memberRegister',
    memberName: clean_(getValueByKeys_(params, ['name', '姓名'], '')),
    phone: clean_(getValueByKeys_(params, ['phone', '電話'], '')),
    message: '會員模組接口已建立，可串接會員資料表'
  };
}


function memberLogin_(params){

  return {
    ok:true,
    action:'memberLogin',
    memberName:clean_(getValueByKeys_(params,['name','姓名'],'')),
    phone:clean_(getValueByKeys_(params,['phone','電話'],'')),
    message:'會員登入成功',
    updatedAt:now_()
  };

}

function updateDriverLocation_(params){

  return {
    ok:true,
    action:'driverLocation',
    driver:clean_(getValueByKeys_(params,['driver','司機'],'')),
    lat:clean_(getValueByKeys_(params,['lat'],'')),
    lng:clean_(getValueByKeys_(params,['lng'],'')),
    updatedAt:now_()
  };

}

function getDriverAppData_(params){

  const driver =
    clean_(getValueByKeys_(params,['driver','司機'],''));

  const orders = getOrders_({limit:500});

  if(!orders.ok){
    return orders;
  }

  const list = orders.orders.filter(function(o){
    return !driver || o.driver === driver;
  });

  return {
    ok:true,
    driver:driver,
    count:list.length,
    orders:list,
    updatedAt:now_()
  };

}


function estimateRouteByRoutesApi_(params) {
  try {

    const pickup = clean_(
      getValueByKeys_(params,
      ['pickup','上車地址'],
      '')
    );

    const dropoff = clean_(
      getValueByKeys_(params,
      ['dropoff','下車地址'],
      '')
    );

    const vehicle = clean_(
      getValueByKeys_(params,
      ['vehicle','車款'],
      '')
    );

    if (!pickup || !dropoff) {
      return {
        ok:false,
        message:'缺少上車地址或下車地址'
      };
    }

    const apiKey =
      property_('GOOGLE_ROUTES_API_KEY') ||
      property_('GOOGLE_MAPS_API_KEY');

    if (!apiKey) {
      return {
        ok:false,
        message:'尚未設定 GOOGLE_ROUTES_API_KEY'
      };
    }

    const response = UrlFetchApp.fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method:'post',
        contentType:'application/json',
        headers:{
          'X-Goog-Api-Key':apiKey,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.duration,routes.polyline'
        },
        payload:JSON.stringify({
          origin:{
            address:pickup
          },
          destination:{
            address:dropoff
          },
          travelMode:'DRIVE',
          routingPreference:'TRAFFIC_AWARE'
        }),
        muteHttpExceptions:true
      }
    );

    const data =
      JSON.parse(response.getContentText() || '{}');

    if (
      !data.routes ||
      !data.routes.length
    ) {
      return {
        ok:false,
        message:'Google Routes API 查無路線',
        response:data
      };
    }

    const route = data.routes[0];

    if (
      !route.distanceMeters ||
      !route.duration
    ) {
      return {
        ok:false,
        message:'Google Routes API 回傳資料不完整'
      };
    }

    const distanceKm =
      Math.round(
        Number(route.distanceMeters) / 1000
      );

    const durationMin =
      Math.round(
        parseInt(
          String(route.duration).replace('s',''),
          10
        ) / 60
      );

    const quote =
      quoteGoogleMapFare_(
        distanceKm,
        vehicle
      );

    return {
      ok:true,
      provider:'Google Routes API',

      pickup:pickup,
      dropoff:dropoff,

      vehicle:vehicle,

      distanceKm:distanceKm,
      durationMin:durationMin,

      distanceText:
        distanceKm + ' km',

      durationText:
        durationMin + ' 分鐘',

      polyline:
        route.polyline
          ? route.polyline.encodedPolyline
          : '',

      price:
        quote.ok
          ? quote.price
          : 0,

      fareRule:
        quote.rule || null,

      formula:
        quote.formula || '',

      updatedAt:now_()
    };

  } catch(err) {

    return {
      ok:false,
      provider:'Google Routes API',
      message:getErrorMessage_(err),
      updatedAt:now_()
    };

  }
}

 /************************************************
 * Price Sheet / Estimate
 ************************************************/

const GOOGLE_MAPS_FARE_RULES = {
  COMFORT4: {
    names: ['四人座轎車', '五人座轎車', '舒適五人座', 'COMFORT4'],
    code: 'COMFORT4',
    displayName: '四人座轎車',
    baseFare: 900,
    includedKm: 10,
    perKm: 10.00,
    taichungTaoyuanAirportFare: 2200
  },
  COMFORT5: {
    names: ['五人座休旅車', '休旅車', 'RAV4', 'COMFORT5'],
    code: 'COMFORT5',
    displayName: '五人座休旅車',
    baseFare: 900,
    includedKm: 10,
    perKm: 10.77,
    taichungTaoyuanAirportFare: 2300
  },
  TVGS: {
    names: ['標準九人座', '九人座廂型車', '豪華9人座', '豪華九人座', '九人座', 'Staria', 'T6', 'TVGS'],
    code: 'TVGS',
    displayName: '九人座廂型車',
    baseFare: 1200,
    includedKm: 10,
    perKm: 10.77,
    taichungTaoyuanAirportFare: 2600
  },
  VITO: {
    names: ['Benz Vito 商務車', '賓士VITO九人座', 'VITO 商務車', 'VITO', '賓士VITO', 'VITO九人座'],
    code: 'VITO',
    displayName: '賓士VITO九人座',
    baseFare: 1500,
    includedKm: 20,
    perKm: 12.50,
    taichungTaoyuanAirportFare: 3000
  },
  GRANVIA: {
    names: ['Granvia 獨立航空座椅', 'Granvia', 'Toyota Granvia', '獨立航空座椅', 'GRANVIA'],
    code: 'GRANVIA',
    displayName: 'Granvia 獨立航空座椅',
    baseFare: 2000,
    includedKm: 20,
    perKm: 13.33,
    taichungTaoyuanAirportFare: 3600
  },
  SCLASS: {
    names: ['Benz S-Class', 'S-Class', 'S Class', '賓士S', '賓士 S-Class', 'SCLASS'],
    code: 'SCLASS',
    displayName: 'Benz S-Class',
    baseFare: 2000,
    includedKm: 20,
    perKm: 12.50,
    taichungTaoyuanAirportFare: 3500
  },
  ALPHARD: {
    names: ['Toyota Alphard 高級七人車', '七人座尊榮阿法', 'Toyota Alphard', 'Alphard', '阿法', 'ALPHARD'],
    code: 'ALPHARD',
    displayName: '七人座尊榮阿法',
    baseFare: 2500,
    includedKm: 20,
    perKm: 29.17,
    taichungTaoyuanAirportFare: 6000
  },
  LM: {
    names: ['Lexus LM', 'LEXUS LM', 'LM', '凌志LM', '雷克薩斯LM'],
    code: 'LM',
    displayName: 'Lexus LM 頂級禮賓車',
    baseFare: 3000,
    includedKm: 20,
    perKm: 25.00,
    taichungTaoyuanAirportFare: 6000
  },
  SPRINTER: {
    names: ['明星保母車／大T', '明星保母車', 'Sprinter', 'Mercedes-Benz Sprinter', 'SPRINTER', '大T'],
    code: 'SPRINTER',
    displayName: '明星保母車',
    baseFare: 3500,
    includedKm: 20,
    perKm: 30.83,
    taichungTaoyuanAirportFare: 7200
  }
};

function getGoogleMapsFareRule_(vehicle) {
  const source = normalizeText_(vehicle || '');
  if (!source || source === normalizeText_('依客服派車')) return null;
  const keys = Object.keys(GOOGLE_MAPS_FARE_RULES);
  for (let i = 0; i < keys.length; i += 1) {
    const rule = GOOGLE_MAPS_FARE_RULES[keys[i]];
    const matched = rule.names.some(function(name) {
      const normalizedName = normalizeText_(name);
      return source.indexOf(normalizedName) !== -1 || normalizedName.indexOf(source) !== -1;
    });
    if (matched) return rule;
  }
  return null;
}

function quoteGoogleMapFare_(distanceKm, vehicle) {
  const rule = getGoogleMapsFareRule_(vehicle);
  if (!rule) {
    return { ok: false, price: 0, rule: null, message: '未找到車款距離報價規則，請客服人工確認' };
  }
  const km = Math.max(0, Number(distanceKm || 0));
  const price = Math.max(
  rule.baseFare,
  km <= rule.includedKm
    ? rule.baseFare
    : rule.baseFare + (km - rule.includedKm) * rule.perKm
);
  return {
    ok: true,
    price: Math.round(price),
    rule: rule,
    distanceKm: km,
    formula: km <= rule.includedKm ? '起跳公里內收起步價' : '起步價 + (Google Maps 公里數 - 起跳公里) × 每公里'
  };
}

function getPriceSheetData_(params) {
  const result = {
    ok: true,
    sheet: '',
    rows: [],
    count: 0,
    updatedAt: now_()
  };

  try {
    const sheetName = clean_(params.sheet || params.name || params.serviceDetail || params.airport || '');

    if (!sheetName) {
      return {
        ok: true,
        availableSheets: PRICE_SHEETS,
        message: '請帶 sheet 參數，例如 ?action=prices&sheet=機場_轎車5人'
      };
    }

    if (ALLOWED_PRICE_SHEETS.indexOf(sheetName) === -1) {
      return {
        ok: false,
        message: '不允許讀取此分頁：' + sheetName,
        availableSheets: PRICE_SHEETS
      };
    }

    const sheet = openPriceSheet_(sheetName);
    const objects = sheetToObjects_(sheet);

    result.sheet = sheetName;
    result.rows = objects;
    result.count = objects.length;

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}


function estimateRoutePrice_(params) {
  params = params || {};

  const fallback = estimatePrice_(params);
  const mapsReady =
  hasProperty_('GOOGLE_ROUTES_API_KEY') ||
  hasProperty_('GOOGLE_MAPS_API_KEY');
  const pickup = clean_(getValueByKeys_(params, ['pickup', '上車地址', 'from', 'origin'], ''));
  const dropoff = clean_(getValueByKeys_(params, ['dropoff', '下車地址', 'to', 'destination'], ''));
  const vehicle = clean_(getValueByKeys_(params, ['vehicle', '車款', 'car', '車型'], ''));
  const service = clean_(getValueByKeys_(params, ['service', '服務項目'], ''));
  const serviceDetail = clean_(getValueByKeys_(params, ['serviceDetail', '服務細項'], ''));

  fallback.bookingMallVersion = CONFIG.BOOKING_MALL_VERSION;
  fallback.bookingTemplate = CONFIG.BOOKING_TEMPLATE;
  fallback.apiMode = CONFIG.API_MODE;
  fallback.mapsReady = mapsReady;
  fallback.vehicle = vehicle;
  fallback.service = service;
  fallback.serviceDetail = serviceDetail;

  if (!pickup || !dropoff) {
    fallback.ok = false;
    fallback.note = appendMemo_(fallback.note || '', '缺少上車或下車地址，無法使用 Google Maps 自動估價');
    return fallback;
  }
  if (!vehicle || vehicle === '依客服派車') {
    fallback.ok = false;
    fallback.note = appendMemo_(fallback.note || '', '尚未指定可自動估價車款，請選擇車型或由客服確認');
    return fallback;
  }
  if (!mapsReady) {
    fallback.note = appendMemo_(fallback.note || '', 'GOOGLE_MAPS_API_KEY 尚未設定，已使用試算表報價 fallback');
    fallback.mapsReady = false;
    return fallback;
  }

  try {
    const apiKey = property_('GOOGLE_ROUTES_API_KEY') || property_('GOOGLE_MAPS_API_KEY');

    const response = UrlFetchApp.fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.legs'
        },
        payload: JSON.stringify({
          origin: {
            address: pickup
          },
          destination: {
            address: dropoff
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE'
        }),
        muteHttpExceptions: true
      }
    );

    const directions = JSON.parse(response.getContentText() || '{}');

    if (!directions || !directions.routes || !directions.routes.length) {
      fallback.ok = false;
      fallback.note = appendMemo_(fallback.note || '', 'Google Maps 查無可用路線');
      return fallback;
    }

    const route = directions.routes[0];
    const leg = route.legs && route.legs.length ? route.legs[0] : null;
    if (!leg || !leg.distance || !leg.duration) {
      fallback.ok = false;
      fallback.note = appendMemo_(fallback.note || '', 'Google Maps 路線資料不完整');
      return fallback;
    }
const distanceKm =
  Math.round((route.distanceMeters || 0) / 1000);

const durationMin =
  Math.round(
    parseInt(String(route.duration).replace('s',''),10) / 60
  );
    const quote = quoteGoogleMapFare_(distanceKm, vehicle);
    const mapFare = quote.ok ? quote.price : 0;
    const fallbackPrice = parseAmount_(fallback.price || fallback.baseFare || 0);
    const finalFare = mapFare || fallbackPrice;

    return {
      ok: Boolean(finalFare),
      bookingMallVersion: CONFIG.BOOKING_MALL_VERSION,
      bookingTemplate: CONFIG.BOOKING_TEMPLATE,
      apiMode: CONFIG.API_MODE,
      mapsReady: mapsReady,
      pickup: pickup,
      dropoff: dropoff,
      service: service,
      serviceDetail: serviceDetail,
      vehicle: vehicle,
      vehicleCode: quote.rule ? quote.rule.code : '',
      vehicleDisplayName: quote.rule ? quote.rule.displayName : vehicle,
      distanceKm: distanceKm,
      durationMin: durationMin,
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
      fareRule: quote.rule ? {
        code: quote.rule.code,
        displayName: quote.rule.displayName,
        baseFare: quote.rule.baseFare,
        includedKm: quote.rule.includedKm,
        perKm: quote.rule.perKm,
        taichungTaoyuanAirportFare: quote.rule.taichungTaoyuanAirportFare || 0
      } : null,
      formula: quote.formula || quote.message || '',
      mapFare: mapFare,
      fallbackPrice: fallbackPrice,
      baseFare: finalFare,
      price: finalFare,
      note: quote.ok ? 'Google Maps 自動估價成功' : quote.message,
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    fallback.ok = false;
    fallback.note = appendMemo_(fallback.note || '', 'Google Maps失敗：' + String(err));
    fallback.mapsReady = mapsReady;
    fallback.bookingMallVersion = CONFIG.BOOKING_MALL_VERSION;
    fallback.bookingTemplate = CONFIG.BOOKING_TEMPLATE;
    fallback.apiMode = CONFIG.API_MODE;
    return fallback;
  }
}




function estimatePrice_(params) {
  const serviceDetail = clean_(getValueByKeys_(params, ['serviceDetail', '服務細項', 'sheet', 'airport'], ''));
  const fromText = clean_(getValueByKeys_(params, ['from', '上車地址', 'pickup', 'city', 'district'], ''));
  const car = clean_(getValueByKeys_(params, ['car', '車款', 'vehicle', '車型'], ''));

  const result = {
    ok: false,
    serviceDetail: serviceDetail,
    from: fromText,
    car: car,
    price: 0,
    message: '查無報價，請客服人工確認',
    updatedAt: now_()
  };

  try {
    if (!serviceDetail || ALLOWED_PRICE_SHEETS.indexOf(serviceDetail) === -1) {
      result.message = '請提供有效價目表分頁 serviceDetail / sheet';
      result.availableSheets = PRICE_SHEETS;
      return result;
    }

    const sheet = openPriceSheet_(serviceDetail);
    const rows = sheetToObjects_(sheet);
    const normalizedFrom = normalizeText_(fromText);
    const normalizedCar = normalizeText_(car);

    const matched = rows.find(function(row) {
      const rowText = normalizeText_(Object.keys(row).map(function(key) {
        return row[key];
      }).join(' '));

      return normalizedFrom && rowText.indexOf(normalizedFrom) !== -1;
    }) || rows.find(function(row) {
      const city = normalizeText_(getValueByKeys_(row, ['縣市', '城市', 'city', '地區', '行政區'], ''));
      return city && normalizedFrom.indexOf(city) !== -1;
    });

    if (!matched) {
      return result;
    }

    const price = findPriceFromRow_(matched, normalizedCar);

    result.ok = price > 0;
    result.price = price;
    result.row = matched;
    result.message = price > 0 ? '估價成功' : '找到地區但未找到車款價格，請客服人工確認';

  } catch (err) {
    result.ok = false;
    result.message = getErrorMessage_(err);
  }

  return result;
}

function findPriceFromRow_(row, normalizedCar) {
  const keys = Object.keys(row || {});
  let fallback = 0;

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = row[key];
    const amount = parseAmount_(value);

    if (amount > 0 && !fallback) {
      fallback = amount;
    }

    if (normalizedCar && normalizeText_(key).indexOf(normalizedCar) !== -1 && amount > 0) {
      return amount;
    }
  }

  return fallback;
}

/************************************************
 * LINE Push / Webhook
 ************************************************/

function testLinePush() {
  const result = pushLine_([
    '🧪 玹翔旅遊系統測試',
    '',
    '時間：' + now_(),
    '系統：' + CONFIG.VERSION,
    '測試結果：LINE 推播正常'
  ].join('\n'));

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

function handleLineWebhook_(e) {
  try {
    const raw = getRawPost_(e) || '{}';
    const data = JSON.parse(raw);

    Logger.log(JSON.stringify(data, null, 2));

    const event = data.events && data.events[0] ? data.events[0] : null;
    const source = event && event.source ? event.source : {};
    const groupId = source.groupId || '';
    const userId = source.userId || '';

    if (groupId) {
      Logger.log('LINE_GROUP_IDS = ' + groupId);
    }

    if (userId) {
      Logger.log('LINE_ADMIN_IDS = ' + userId);
    }

    return {
      ok: true,
      message: 'Webhook OK',
      groupId: groupId,
      userId: userId
    };

  } catch (err) {
    logError_('handleLineWebhook_', err, getRawPost_(e));
    return {
      ok: false,
      message: 'Webhook 解析錯誤：' + getErrorMessage_(err)
    };
  }
}

function getWebhook(e) {
  return handleLineWebhook_(e);
}


/************************************************
 * Production v10.2｜Data Cleanup Actions
 ************************************************/

function cleanupOrders() {
  const sheet = openOrderSheet_();
  ensureOrderHeaders_(sheet);

  const values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return buildResult_(true, '沒有可清理的訂單資料', { removed: 0, kept: 0 });
  }

  const headers = values[0];
  const kept = [headers];
  let removed = 0;

  values.slice(1).forEach(function(row) {
    const item = rowToObjectByHeaders_(headers, row);
    const service = clean_(item['服務項目']);
    const customer = clean_(item['乘客姓名']);
    const phone = clean_(item['聯絡電話']);
    const pickup = clean_(item['上車地址']);
    const dropoff = clean_(item['下車地址']);
    const amount = getOrderAmount_(item);

    const isWebhookGarbage =
      service === '未填服務' &&
      customer === '未填姓名' &&
      !phone &&
      (!pickup || pickup === '未填上車地址') &&
      (dropoff.indexOf('U') === 0 || dropoff === '未填下車地址' || !dropoff) &&
      amount === 0;

    if (isWebhookGarbage) {
      removed += 1;
    } else {
      kept.push(row);
    }
  });

  if (removed > 0) {
    sheet.clearContents();
    sheet.getRange(1, 1, kept.length, headers.length).setValues(kept);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }

  return buildResult_(true, '測試空訂單清理完成', {
    removed: removed,
    kept: kept.length - 1
  });
}

function normalizeHistoricalOrders() {
  const sheet = openOrderSheet_();
  ensureOrderHeaders_(sheet);

  const values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return buildResult_(true, '沒有可標準化的訂單資料', { updated: 0, rows: 0 });
  }

  const headers = values[0];
  const col = buildHeaderIndex_(headers);
  let updated = 0;

  for (let r = 1; r < values.length; r += 1) {
    const row = values[r];

    const priceIndex = col['價錢（未稅）'];
    const totalIndex = col['預估小計'];
    const timeIndex = col['搭車時間'];
    const statusIndex = col['狀態'];

    if (priceIndex !== undefined) {
      const original = row[priceIndex];
      const parsed = parseAmount_(original);

      if (parsed > 0 && String(original) !== String(parsed)) {
        row[priceIndex] = parsed;
        updated += 1;
      }
    }

    if (totalIndex !== undefined) {
      const total = parseAmount_(row[totalIndex]);
      const base = priceIndex !== undefined ? parseAmount_(row[priceIndex]) : 0;

      if ((!total || total === 0) && base > 0) {
        row[totalIndex] = base;
        updated += 1;
      } else if (total > 999999) {
        row[totalIndex] = base || total;
        updated += 1;
      }
    }

    if (timeIndex !== undefined) {
      const originalTime = row[timeIndex];
      const normalized = normalizeTime_(originalTime);

      if (normalized && String(originalTime) !== normalized) {
        row[timeIndex] = normalized;
        updated += 1;
      }
    }

    if (statusIndex !== undefined && !clean_(row[statusIndex])) {
      row[statusIndex] = '已確認';
      updated += 1;
    }
  }

  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  SpreadsheetApp.flush();

  return buildResult_(true, '歷史訂單資料標準化完成', {
    updated: updated,
    rows: values.length - 1
  });
}

/************************************************
 * Sheet Helpers / Headers
 ************************************************/

function openOrderSheet_() {
  const orderId = requiredProperty_('ORDER_SHEET_ID');
  const book = SpreadsheetApp.openById(orderId);
  let sheet = book.getSheetByName(CONFIG.ORDER_SHEET_NAME);

  if (!sheet) {
    sheet = book.insertSheet(CONFIG.ORDER_SHEET_NAME);
  }

  ensureOrderHeaders_(sheet);
  return sheet;
}

function openPriceSheet_(sheetName) {
  const priceId = requiredProperty_('PRICE_SHEET_ID');
  const book = SpreadsheetApp.openById(priceId);
  const sheet = book.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('找不到價目表分頁：' + sheetName);
  }

  return sheet;
}

function openOptionalSheet_(sheetName) {
  const orderId = property_('ORDER_SHEET_ID');

  if (!orderId) {
    return null;
  }

  const book = SpreadsheetApp.openById(orderId);
  return book.getSheetByName(sheetName);
}

function ensureOrderHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), ORDER_HEADERS.length);
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const hasAnyHeader = current.some(function(value) {
    return String(value || '').trim() !== '';
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  const needRepair = ORDER_HEADERS.some(function(header, index) {
    return String(current[index] || '').trim() !== header;
  });

  if (needRepair) {
    sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);
  }

  if (lastColumn > ORDER_HEADERS.length) {
    sheet.getRange(1, ORDER_HEADERS.length + 1, 1, lastColumn - ORDER_HEADERS.length).clearContent();
  }

  sheet.setFrozenRows(1);
}

function repairOrderHeaders() {
  const sheet = openOrderSheet_();
  sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]);

  const lastColumn = sheet.getLastColumn();
  if (lastColumn > ORDER_HEADERS.length) {
    sheet.getRange(1, ORDER_HEADERS.length + 1, 1, lastColumn - ORDER_HEADERS.length).clearContent();
  }

  sheet.setFrozenRows(1);
  SpreadsheetApp.flush();

  Logger.log('訂單表頭已修復完成：' + JSON.stringify(ORDER_HEADERS, null, 2));

  return {
    ok: true,
    message: '訂單表頭已修復完成',
    sheetName: sheet.getName(),
    headers: ORDER_HEADERS
  };
}

function verifyOrderHeaders() {
  const sheet = openOptionalSheet_(CONFIG.ORDER_SHEET_NAME);

  if (!sheet) {
    return {
      ok: false,
      message: '找不到訂單分頁：' + CONFIG.ORDER_SHEET_NAME,
      mismatch: [],
      checkedAt: now_()
    };
  }

  const current = sheet.getRange(1, 1, 1, ORDER_HEADERS.length).getValues()[0];
  const mismatch = [];

  ORDER_HEADERS.forEach(function(name, index) {
    if (String(current[index]) !== name) {
      mismatch.push({
        col: index + 1,
        expected: name,
        current: current[index]
      });
    }
  });

  return {
    ok: mismatch.length === 0,
    mismatch: mismatch,
    checkedAt: now_()
  };
}

function debugOrderHeaders() {
  const sheet = openOrderSheet_();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  Logger.log(JSON.stringify(headers, null, 2));
  return headers;
}

function debugHeadersResult_() {
  try {
    const sheet = openOrderSheet_();
    return {
      ok: true,
      sheetName: sheet.getName(),
      headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    };
  } catch (err) {
    return {
      ok: false,
      message: getErrorMessage_(err)
    };
  }
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return [];
  }

  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });

  return values.slice(1).filter(function(row) {
    return row.some(function(cell) {
      return String(cell || '').trim() !== '';
    });
  }).map(function(row) {
    const item = {};

    headers.forEach(function(header, index) {
      if (header) {
        item[header] = row[index];
      }
    });

    return item;
  });
}


function updateOrderByNo_(orderNo, updates) {
  const sheet = openOrderSheet_();
  ensureOrderHeaders_(sheet);

  const values = sheet.getDataRange().getValues();

  if (!values || values.length <= 1) {
    return { ok: false, message: '目前沒有訂單資料', orderNo: orderNo };
  }

  const headers = values[0];
  const col = buildHeaderIndex_(headers);
  const orderNoIndex = col['訂單編號'];

  if (orderNoIndex === undefined) {
    return { ok: false, message: '找不到訂單編號欄位', orderNo: orderNo };
  }

  for (let r = 1; r < values.length; r += 1) {
    if (clean_(values[r][orderNoIndex]) === orderNo) {
      Object.keys(updates || {}).forEach(function(header) {
        if (col[header] !== undefined) {
          sheet.getRange(r + 1, col[header] + 1).setValue(updates[header]);
        }
      });

      SpreadsheetApp.flush();
      return { ok: true, message: '訂單已更新', orderNo: orderNo };
    }
  }

  return { ok: false, message: '找不到指定訂單', orderNo: orderNo };
}

function buildHeaderIndex_(headers) {
  const result = {};

  headers.forEach(function(header, index) {
    const name = clean_(header);
    if (name) result[name] = index;
  });

  return result;
}

function rowToObjectByHeaders_(headers, row) {
  const item = {};

  headers.forEach(function(header, index) {
    const name = clean_(header);
    if (name) item[name] = row[index];
  });

  return item;
}

/************************************************
 * Normalizers
 ************************************************/

function normalizeOrder_(order, index) {
  const service = clean_(getValueByKeys_(order, ['服務項目', 'service', 'serviceName'], '未填服務'));
  const bookingVersion = clean_(getValueByKeys_(order, ['預約版本', 'bookingVersion', 'booking_version'], ''));
  const bookingMallVersion = clean_(getValueByKeys_(order, ['預約商城版本', 'bookingMallVersion', 'booking_mall_version'], ''));
  const bookingTemplate = clean_(getValueByKeys_(order, ['共用模板', 'bookingTemplate', 'booking_template'], ''));
  const layoutVersion = clean_(getValueByKeys_(order, ['版型版本', 'layoutVersion', 'layout_version'], ''));
  const apiMode = clean_(getValueByKeys_(order, ['API模式', 'apiMode', 'api_mode'], ''));
  const apiEndpoint = clean_(getValueByKeys_(order, ['API端點', 'apiEndpoint', 'api_endpoint'], ''));
  const pageSource = clean_(getValueByKeys_(order, ['頁面來源', 'pageSource', 'page_source'], ''));
  const status = normalizeStatus_(getValueByKeys_(order, ['狀態', 'status', 'orderStatus'], '待確認'));
  const flight = clean_(getValueByKeys_(order, ['航班編號', 'flight', 'flightNo'], ''));
  const portFlight = clean_(getValueByKeys_(order, ['港口航班編號', 'portFlight'], flight));
  const shipSession = clean_(getValueByKeys_(order, ['船班編號 / 船班梯次', '船班梯次', '船班編號', 'shipSession', 'shipNo'], ''));
  const eventName = clean_(getValueByKeys_(order, ['活動名稱', 'eventName'], ''));
  const route = clean_(getValueByKeys_(order, ['行程規劃', '行程', '中途點', 'routePoints', 'midpoints'], ''));
  const taxFee = parseAmount_(getValueByKeys_(order, ['統編加成', 'taxFee'], 0));
  const cardFee = parseAmount_(getValueByKeys_(order, ['刷卡手續費', 'cardFee'], 0));
  const transferPointFee = parseAmount_(getValueByKeys_(order, ['轉點費', 'transferPointFee'], 0));

  return {
    id: clean_(getValueByKeys_(order, ['訂單編號', 'orderNo', 'orderId', 'id'], 'ORDER-' + (index + 1))),
    bookingVersion: bookingVersion,
    bookingMallVersion: bookingMallVersion,
    bookingTemplate: bookingTemplate,
    layoutVersion: layoutVersion,
    apiMode: apiMode,
    apiEndpoint: apiEndpoint,
    pageSource: pageSource,
    service: service,
    serviceDetail: clean_(getValueByKeys_(order, ['服務細項', 'serviceDetail'], '')),
    customer: clean_(getValueByKeys_(order, ['乘客姓名', '姓名', 'customer', 'name', 'passenger'], '未填姓名')),
    phone: clean_(getValueByKeys_(order, ['聯絡電話', '聯絡方式', '電話', 'phone', 'contact'], '')),
    line: clean_(getValueByKeys_(order, ['LINE / WhatsApp', 'LINE', 'line', 'whatsapp'], '')),
    date: getOrderDate_(order),
    time: normalizeTime_(getValueByKeys_(order, ['搭車時間', '時間', '用車時間', 'pickupTime', 'time'], '')),
    pickup: clean_(getValueByKeys_(order, ['上車地址', 'pickup', 'from'], '未填上車地址')),
    midpoints: clean_(getValueByKeys_(order, ['中途點', 'midpoints', 'routePoints'], '')),
    dropoff: clean_(getValueByKeys_(order, ['下車地址', 'dropoff', 'to'], '未填下車地址')),
    people: clean_(getValueByKeys_(order, ['人數', 'people', 'passengers'], '')),
    bags: clean_(getValueByKeys_(order, ['行李', 'bags', 'luggage'], '')),
    vehicle: clean_(getValueByKeys_(order, ['車款', '車型', 'vehicle', 'car'], '未指定車款')),
    driver: clean_(getValueByKeys_(order, ['司機', 'driver'], '')),
    plate: clean_(getValueByKeys_(order, ['車牌', 'plate'], '')),
    carModel: clean_(getValueByKeys_(order, ['車型', 'model'], '')),
    carColor: clean_(getValueByKeys_(order, ['車色', 'color'], '')),
    driverPhone: clean_(getValueByKeys_(order, ['司機手機', 'driverPhone'], '')),
    flight: flight,
    portFlight: portFlight,
    shipSession: shipSession,
    eventName: eventName,
    route: route,
    days: clean_(getValueByKeys_(order, ['用車天數', '包車天數', 'days'], '')),
    hours: clean_(getValueByKeys_(order, ['包車時數', '用車時數', 'hours'], '')),
    addons: clean_(getValueByKeys_(order, ['加購項目', 'addons'], '')),
    transferPointFee: transferPointFee,
    taxFee: taxFee,
    cardFee: cardFee,
    taxTitle: clean_(getValueByKeys_(order, ['公司抬頭', 'taxTitle'], '')),
    taxIdNumber: clean_(getValueByKeys_(order, ['統一編號', 'taxIdNumber'], '')),
    itineraryJson: clean_(getValueByKeys_(order, ['行程JSON', 'itineraryJson'], '')),
    amount: getOrderAmount_(order),
    status: status,
    createdAt: dateTimeKey_(getValueByKeys_(order, ['建立時間', 'createdAt'], '')),
    raw: order
  };
}

function getValueByKeys_(item, keys, fallback) {
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const value = item && item[key];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return fallback || '';
}

function normalizeStatus_(value) {
  const text = clean_(value);

  if (!text) return '待確認';
  if (/取消|cancel/i.test(text)) return '已取消';
  if (/完成|completed|finish|done/i.test(text)) return '已完成';
  if (/出車|執行|running|trip/i.test(text)) return '出車中';
  if (/已派|司機已排|assigned/i.test(text)) return '已確認';
  if (/客服確認|待派|dispatch/i.test(text)) return '待客服確認';
  if (/確認|confirmed/i.test(text)) return '已確認';

  return text;
}

function parseAmount_(value) {
  if (value === undefined || value === null || value === '') return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value).trim();
  if (!text) return 0;

  // 8400/6400、$3000/300 只取第一個金額，避免 Dashboard
  const firstNumber = text
  .replace(/,/g, '')
  .match(/[0-9]+(?:\.[0-9]+)?/);
  if (!firstNumber) return 0;

  const amount = Number(firstNumber[0]);
  return Number.isFinite(amount) ? amount : 0;
}

function getOrderAmount_(order) {
  return parseAmount_(getValueByKeys_(order, [
    '預估小計',
    'estimatedTotal',
    '實收金額',
    '總金額',
    '價錢（未稅）',
    '試算表報價',
    '價錢',
    '金額',
    'estimated_total',
    'amount',
    'total',
    'price'
  ], 0));
}

function getOrderDate_(order) {
  return dateKey_(getValueByKeys_(order, [
    '預約日期',
    '日期',
    '用車日期',
    '乘車日期',
    'pickupDate',
    'date'
  ], ''));
}

function dateKey_(date) {
  if (!date) return '';

  if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
    return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy/MM/dd');
  }

  const text = String(date).trim();
  if (!text) return '';

  return text.replace(/-/g, '/').slice(0, 10);
}

function dateTimeKey_(date) {
  if (!date) return '';

  if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
    return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy/MM/dd HH:mm:ss');
  }

  return String(date || '').trim();
}


function normalizeTime_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, 'HH:mm');
  }

  const text = String(value || '').trim();
  if (!text) return '';

  if (text.indexOf('1899') > -1 || text.indexOf('GMT') > -1) {
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, CONFIG.TIMEZONE, 'HH:mm');
    }
  }

  return text;
}

function clean_(value) {
  return String(value === undefined || value === null ? '' : value).trim();
}

function normalizeText_(value) {
  return clean_(value).toLowerCase().replace(/\s+/g, '').replace(/臺/g, '台');
}

function stringifyList_(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('、');
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return clean_(value);
}

/************************************************
 * Revenue / Utility
 ************************************************/

function buildLastSevenDaysRevenue_(orders) {
  const result = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today.getTime());
    date.setDate(today.getDate() - i);

    const key = Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy/MM/dd');
    const label = Utilities.formatDate(date, CONFIG.TIMEZONE, 'MM/dd');

    result.push({
      date: label,
      revenue: sumRevenueByPrefix_(orders, key)
    });
  }

  return result;
}

function sumRevenueByPrefix_(orders, prefix) {
  return orders.reduce(function(sum, order) {
    return String(order.date || '').slice(0, String(prefix).length) === prefix
      ? sum + Number(order.amount || 0)
      : sum;
  }, 0);
}

function formatMoney_(value) {
  const amount = parseAmount_(value);
  return 'NT$ ' + amount.toLocaleString('zh-TW');
}

function generateOrderNo_() {
  const timestamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 900 + 100);
  return 'XX' + timestamp + random;
}

/************************************************
 * Request / Response Helpers
 ************************************************/

function getParams_(e) {
  const params = {};

  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function(key) {
      params[key] = e.parameter[key];
    });
  }

  const raw = getRawPost_(e);
  if (raw) {
    const parsed = parseRawBody_(raw);
    Object.keys(parsed).forEach(function(key) {
      params[key] = parsed[key];
    });
  }

  Object.keys(params).forEach(function(key) {
  if (typeof params[key] === 'string') {
    params[key] = params[key].trim();
  }
});

return params;
}

function getRawPost_(e) {
  return e && e.postData && e.postData.contents ? e.postData.contents : '';
}

function parseRawBody_(raw) {
  const text = String(raw || '').trim();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (ignore) {}

  const result = {};
  text.split('&').forEach(function(pair) {
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '').trim();
    const value = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' ')).trim();
    if (!key) return;

    if (result[key] !== undefined) {
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }
      result[key].push(value);
    } else {
      result[key] = value;
    }
  });

  return result;
}


function buildResult_(ok, message, data) {
  const result = {
    ok: Boolean(ok),
    message: message || '',
    version: CONFIG.VERSION,
    bookingMallVersion: CONFIG.BOOKING_MALL_VERSION,
    bookingTemplate: CONFIG.BOOKING_TEMPLATE,
    timestamp: now_()
  };

  Object.keys(data || {}).forEach(function(key) {
    result[key] = data[key];
  });

  return result;
}

function output_(obj, params) {
  const callback = params && params[CONFIG.JSONP_CALLBACK_PARAM]
    ? String(params[CONFIG.JSONP_CALLBACK_PARAM]).replace(/[^a-zA-Z0-9_.$]/g, '')
    : '';

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(obj);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/************************************************
 * Error Log / Properties
 ************************************************/

function logError_(where, err, payload) {
  const message = getErrorMessage_(err);
  Logger.log(where + '：' + message);

  try {
    const orderId = property_('ORDER_SHEET_ID');
    if (!orderId) return;

    const book = SpreadsheetApp.openById(orderId);
    let sheet = book.getSheetByName(CONFIG.ERROR_SHEET_NAME);

    if (!sheet) {
      sheet = book.insertSheet(CONFIG.ERROR_SHEET_NAME);
      sheet.appendRow(['時間', '位置', '錯誤訊息', '資料']);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      now_(),
      where,
      message,
      JSON.stringify(payload || {})
    ]);

  } catch (logErr) {
    Logger.log('錯誤紀錄寫入失敗：' + getErrorMessage_(logErr));
  }
}

function property_(key) {
  return PropertiesService
    .getScriptProperties()
    .getProperty(key);
}

function requiredProperty_(key) {
  const value = property_(key);

  if (!value) {
    throw new Error('缺少系統參數：' + key);
  }

  return value;
}

function hasProperty_(key) {
  return !!property_(key);
}

function csvProperty_(key) {
  const value = property_(key);

  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map(function(item) {
      return item.trim();
    })
    .filter(Boolean);
}

function now_() {
  return Utilities.formatDate(
    new Date(),
    CONFIG.TIMEZONE || 'Asia/Taipei',
    'yyyy-MM-dd HH:mm:ss'
  );
}

function getErrorMessage_(err) {
  if (!err) {
    return 'Unknown Error';
  }

  return err.message || String(err);
}
