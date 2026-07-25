/**
 * ======================================================
 * 玹翔旅遊 V38.3 Enterprise Final
 * Code.gs｜系統主入口（SSOT Clean Build）
 * ======================================================
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚖 玹翔旅遊')
    .addItem('系統全面升級 V38.3', 'upgradeV383Enterprise')
    .addSeparator()
    .addItem('重建資料驗證', 'rebuildValidations')
    .addItem('重建條件格式', 'rebuildConditionalFormats')
    .addItem('重建保護欄位', 'rebuildProtections')
    .addItem('刷新司機資料', 'refreshDriverData')
    .addToUi();
}

function onEdit(e) {
  handleOrderDriverEdit_(e);
}

function upgradeV383Enterprise() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到目前試算表。');

  ss.toast('開始升級 V38.3 Enterprise Final…', '玹翔旅遊', 5);

  createBackup_(ss);
  buildOptionsSheet_(ss);
  upgradeDrivers_(ss);
  upgradeOrders_(ss);
  upgradeMembers_(ss);
  upgradeDispatch_(ss);
  upgradeRevenue_(ss);
  upgradeLogs_(ss);
  upgradePermissions_(ss);
  upgradeErrorLog_(ss);
  upgradeGps_(ss);
  buildDashboard_(ss);

  rebuildValidations();
  rebuildConditionalFormats();
  rebuildProtections();
  refreshDriverData();

  SpreadsheetApp.flush();
  ss.toast(getVersion() + ' 升級完成', APP.NAME, 8);

  if (typeof logAudit_ === 'function') {
    logAudit_('SYSTEM', 'UPGRADE_V383', 'SUCCESS', {version: getVersion()});
  }
}

function upgradeV38Enterprise() { return upgradeV383Enterprise(); }
function upgradeXuanXiangV37() { return upgradeV383Enterprise(); }

function rebuildValidations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到目前試算表。');

  const orderSheet = ss.getSheetByName('訂單');
  const optionsSheet = ss.getSheetByName('系統選項');
  const permissionSheet = ss.getSheetByName('權限設定');
  const memberSheet = ss.getSheetByName('會員資料');
  const dispatchSheet = ss.getSheetByName('派遣紀錄');

  if (orderSheet) applyOrderValidations_(orderSheet, optionsSheet);
  if (memberSheet) applyMemberValidations_(memberSheet, optionsSheet);
  if (dispatchSheet) applyDispatchValidations_(dispatchSheet, optionsSheet);
  if (permissionSheet) applyPermissionValidations_(permissionSheet);

  SpreadsheetApp.flush();
  ss.toast('資料驗證已重建', '玹翔旅遊', 4);
}

function rebuildConditionalFormats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到目前試算表。');
  const orderSheet = ss.getSheetByName('訂單');
  if (orderSheet) applyOrderConditionalFormats_(orderSheet);
  SpreadsheetApp.flush();
  ss.toast('條件格式已重建', '玹翔旅遊', 4);
}

function rebuildProtections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到目前試算表。');
  const orderSheet = ss.getSheetByName('訂單');
  if (orderSheet) applyOrderProtections_(orderSheet);
  SpreadsheetApp.flush();
  ss.toast('保護欄位已重建', '玹翔旅遊', 4);
}

function refreshDriverData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('找不到目前試算表。');
  upgradeDrivers_(ss);
  rebuildValidations();
  backfillOrderDriverData_(ss);
  SpreadsheetApp.flush();
  ss.toast('司機資料與訂單快照已刷新', '玹翔旅遊', 5);
}
