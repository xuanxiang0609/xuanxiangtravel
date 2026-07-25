/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * CRM.gs｜GPS 與 LINE CRM
 * ======================================================
 */


function upgradeGps_(ss) {
  const sh = getOrCreateSheet_(ss, '司機定位');
  ensureCols_(sh, 4);
  sh.getRange(1,1,1,4).setValues([['時間','司機','Latitude','Longitude']]);
  styleHeader_(sh.getRange(1,1,1,4));
  sh.setFrozenRows(1);
  sh.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
}
