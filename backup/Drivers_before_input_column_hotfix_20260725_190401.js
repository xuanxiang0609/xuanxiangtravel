/**
 * ======================================================
 * 玹翔旅遊 V38.3 Enterprise Final
 * Drivers.gs｜司機資料單一來源服務（SSOT）
 * ======================================================
 */

const DRIVER_SHEET_NAME = '司機資料';
const DRIVER_HEADERS = ['司機姓名','車號','車型','顏色','手機號碼'];

function upgradeDrivers_(ss) {
  if (!ss) throw new Error('upgradeDrivers_：找不到試算表。');

  let sheet = ss.getSheetByName(DRIVER_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(DRIVER_SHEET_NAME);

  ensureCols_(sheet, DRIVER_HEADERS.length);
  ensureRows_(sheet, 1000);
  sheet.getRange(1,1,1,5).setValues([DRIVER_HEADERS]);
  styleHeader_(sheet.getRange(1,1,1,5));
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1,140);
  sheet.setColumnWidth(2,120);
  sheet.setColumnWidth(3,160);
  sheet.setColumnWidth(4,100);
  sheet.setColumnWidth(5,150);
  sheet.getRange('A:E').setVerticalAlignment('middle').setWrap(true);
  sheet.getRange('B:B').setNumberFormat('@');
  sheet.getRange('E:E').setNumberFormat('@');

  return sheet;
}

function getDriverMap_(ss) {
  const sheet = upgradeDrivers_(ss);
  const lastRow = sheet.getLastRow();
  const map = {};
  if (lastRow < 2) return map;

  sheet.getRange(2,1,lastRow-1,5).getDisplayValues().forEach(function(row) {
    const name = String(row[0] || '').trim();
    if (!name) return;
    map[name] = {
      name: name,
      plateNo: String(row[1] || '').trim(),
      vehicleType: String(row[2] || '').trim(),
      color: String(row[3] || '').trim(),
      phone: String(row[4] || '').trim()
    };
  });
  return map;
}

function getDriverByName_(ss, name) {
  const key = String(name || '').trim();
  return key ? (getDriverMap_(ss)[key] || null) : null;
}

function handleOrderDriverEdit_(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== '訂單' || e.range.getRow() < 2) return;

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1,1,1,lastColumn).getDisplayValues()[0].map(v => String(v || '').trim());
  const map = {};
  headers.forEach((h,i) => { if (h) map[h] = i + 1; });

  if (e.range.getColumn() !== map['司機姓名']) return;

  const row = e.range.getRow();
  const driver = getDriverByName_(sheet.getParent(), e.value || e.range.getDisplayValue());
  const values = driver
    ? [driver.plateNo, driver.vehicleType, driver.color, driver.phone]
    : ['', '', '', ''];

  ['車號','車型','顏色','手機號碼'].forEach(function(header,index) {
    if (map[header]) sheet.getRange(row,map[header]).setValue(values[index]);
  });
}

function backfillOrderDriverData_(ss) {
  const sheet = ss.getSheetByName('訂單');
  if (!sheet || sheet.getLastRow() < 2) return;

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(v => String(v || '').trim());
  const map = {};
  headers.forEach((h,i) => { if (h) map[h] = i + 1; });
  const required = ['司機姓名','車號','車型','顏色','手機號碼'];
  if (required.some(h => !map[h])) return;

  const rowCount = sheet.getLastRow() - 1;
  const names = sheet.getRange(2,map['司機姓名'],rowCount,1).getDisplayValues();
  const drivers = getDriverMap_(ss);
  const output = names.map(function(r) {
    const d = drivers[String(r[0] || '').trim()];
    return d ? [d.plateNo,d.vehicleType,d.color,d.phone] : ['','','',''];
  });

  sheet.getRange(2,map['車號'],rowCount,4).clearContent().setValues(output);
}


