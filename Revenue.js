/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * Revenue.gs｜營收與財務分析
 * ======================================================
 */


function upgradeRevenue_(ss) {
  const sh = getOrCreateSheet_(ss, '營收資料');
  ensureCols_(sh, 7);
  ensureRows_(sh, 2000);
  const headers = ['建立時間','訂單編號','服務項目','機場代碼','車款','司機','營收'];
  sh.getRange(1,1,1,7).setValues([headers]);
  styleHeader_(sh.getRange(1,1,1,7));
  sh.setFrozenRows(1);

  sh.getRange('A2:G2000').clearContent();

  const formulas = [
    '=ARRAYFORMULA(IF(訂單!B2:B="","",訂單!A2:A))',
    '=ARRAYFORMULA(IF(訂單!B2:B="","",訂單!B2:B))',
    '=ARRAYFORMULA(IF(訂單!B2:B="","",訂單!D2:D))',
    '=ARRAYFORMULA(IF(訂單!B2:B="","",IFERROR(LEFT(訂單!O2:O,3),"")))',
    '=ARRAYFORMULA(IF(訂單!B2:B="","",訂單!S2:S))',
    '=ARRAYFORMULA(IF(訂單!B2:B="","",訂單!AA2:AA))',
    '=ARRAYFORMULA(IF(訂單!B2:B="","",IFERROR(VALUE(REGEXREPLACE(TO_TEXT(訂單!T2:T),"[^0-9.-]","")),0)))'
  ];
  formulas.forEach((f,i) => sh.getRange(2,i+1).setFormula(f));
  sh.getRange('A2:A2000').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sh.getRange('G2:G2000').setNumberFormat('#,##0');
}
