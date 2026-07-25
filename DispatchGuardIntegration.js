/**
 * ======================================================
 * V39.1.1 Enterprise
 * Dispatch Guard Integration
 * ======================================================
 */

/**
 * 當司機欄位異動時呼叫
 */
function onDriverChanged_(e) {

  if (!e || !e.range) return;

  const sheet = e.range.getSheet();

  if (sheet.getName() !== '訂單') return;

  const row = e.range.getRow();

  if (row <= 1) return;

  const DRIVER_COL = 26;

  if (e.range.getColumn() !== DRIVER_COL) return;

  const driver = sheet.getRange(row, DRIVER_COL).getValue();

  if (!driver) {
    clearDriverInfo_(sheet, row);
    return;
  }

  const date = sheet.getRange(row, 8).getDisplayValue();
  const start = sheet.getRange(row, 9).getDisplayValue();
  const end = sheet.getRange(row, 10).getDisplayValue();

  const conflicts = checkDriverConflict_(
    sheet,
    driver,
    date,
    start,
    end
  );

  if (!conflicts.length) return;

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "司機已有重複派車",
    "Dispatch Guard",
    5
  );

  clearDriverInfo_(sheet, row);

  Logger.log(JSON.stringify(conflicts));
}

/**
 * 清除司機資訊
 */
function clearDriverInfo_(sheet, row){

  sheet.getRange(row,26,1,5).clearContent();

}

/**
 * 共用 API
 */
function getDriverConflicts_(sheet,driver,date,start,end){

    return checkDriverConflict_(
        sheet,
        driver,
        date,
        start,
        end
    );

}
