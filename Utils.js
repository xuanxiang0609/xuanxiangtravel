/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * Utils.gs｜共用工具函式
 * ======================================================
 */


function createBackup_(ss) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMdd_HHmmss');
  const source = ss.getSheetByName('訂單');
  if (!source) return;
  const backupName = ('備份_訂單_' + stamp).slice(0, 99);
  source.copyTo(ss).setName(backupName);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureRows_(sheet, neededRows) {
  if (sheet.getMaxRows() < neededRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows());
  }
}

function ensureCols_(sheet, neededCols) {
  if (sheet.getMaxColumns() < neededCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), neededCols - sheet.getMaxColumns());
  }
}

function styleHeader_(range) {
  range
    .setBackground('#111111')
    .setFontColor('#C9A227')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}
