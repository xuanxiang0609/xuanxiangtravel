/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * Members.gs｜會員中心
 * ======================================================
 */


function upgradeMembers_(ss) {
  const sh = getOrCreateSheet_(ss, '會員資料');
  ensureCols_(sh, 10);
  ensureRows_(sh, 2000);
  const headers = ['會員編號','LINE User ID','姓名','手機','Email','會員等級','點數','累積消費','加入日期','狀態'];
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  styleHeader_(sh.getRange(1,1,1,headers.length));
  sh.setFrozenRows(1);
  sh.getRange('G2:H2000').setNumberFormat('#,##0');
  sh.getRange('I2:I2000').setNumberFormat('yyyy-mm-dd');
  applyMemberValidations_(sh, ss.getSheetByName('系統選項'));
}

function applyMemberValidations_(sh, options) {
  if (!sh || !options) return;
  sh.getRange('F2:F2000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(options.getRange('G2:G5'), true).setAllowInvalid(false).build());
  sh.getRange('J2:J2000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(options.getRange('H2:H4'), true).setAllowInvalid(false).build());
}
