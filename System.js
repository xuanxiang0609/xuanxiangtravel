/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * System.gs｜系統管理
 * ======================================================
 */


function upgradeErrorLog_(ss) {
  const sh = getOrCreateSheet_(ss, '系統錯誤紀錄');
  ensureCols_(sh, 4);
  const headers = ['時間','來源','錯誤','原始資料'];
  sh.getRange(1,1,1,4).setValues([headers]);
  styleHeader_(sh.getRange(1,1,1,4));
  sh.setFrozenRows(1);
  sh.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.setColumnWidth(4, 520);
}
