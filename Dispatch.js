/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * Dispatch.gs｜派車中心
 * ======================================================
 */


function upgradeDispatch_(ss) {
  const sh = getOrCreateSheet_(ss, '派遣紀錄');
  ensureCols_(sh, 12);
  ensureRows_(sh, 5000);
  const headers = ['派遣時間','訂單編號','預約日期','預約時間','司機編號','司機姓名','車號','派遣狀態','指派人','是否強制派遣','衝突檢查','備註'];
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  styleHeader_(sh.getRange(1,1,1,headers.length));
  sh.setFrozenRows(1);
  sh.getRange('A2:A5000').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange('C2:C5000').setNumberFormat('yyyy-mm-dd');
  sh.getRange('D2:D5000').setNumberFormat('hh:mm');
  applyDispatchValidations_(sh, ss.getSheetByName('系統選項'));
}

function applyDispatchValidations_(sh, options) {
  if (!sh || !options) return;
  sh.getRange('H2:H5000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(options.getRange('I2:I6'), true).setAllowInvalid(false).build());
  sh.getRange('J2:J5000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(options.getRange('E2:E3'), true).setAllowInvalid(false).build());
  sh.getRange('K2:K5000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(options.getRange('J2:J5'), true).setAllowInvalid(false).build());
}
