/**
 * ======================================================
 * 玹翔旅遊 V38 Enterprise
 * Dashboard.gs｜營運儀表板
 * ======================================================
 */


function buildDashboard() {
  buildDashboard_(SpreadsheetApp.getActiveSpreadsheet());
}

function buildDashboard_(ss) {
  const sh = getOrCreateSheet_(ss, '營運儀表板');
  sh.clear();
  ensureCols_(sh, 8);
  ensureRows_(sh, 30);

  sh.getRange('A1:H2').merge()
    .setValue('玹翔旅遊｜企業營運儀表板')
    .setBackground('#111111')
    .setFontColor('#C9A227')
    .setFontWeight('bold')
    .setFontSize(20)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sh.getRange('A4:H4').setValues([['總訂單數','本月訂單','本月營收','未付款','未派車','今日行程','可派遣司機','系統錯誤數']]);
  styleHeader_(sh.getRange('A4:H4'));

  sh.getRange('A5').setFormula('=COUNTA(訂單!B2:B)');
  sh.getRange('B5').setFormula('=COUNTIFS(訂單!H2:H,">="&EOMONTH(TODAY(),-1)+1,訂單!H2:H,"<="&EOMONTH(TODAY(),0))');
  sh.getRange('C5').setFormula('=SUMIFS(營收資料!G2:G,營收資料!A2:A,">="&EOMONTH(TODAY(),-1)+1,營收資料!A2:A,"<"&EOMONTH(TODAY(),0)+1)');
  sh.getRange('D5').setFormula('=COUNTIF(訂單!W2:W,"未付款")');
  sh.getRange('E5').setFormula('=COUNTIF(訂單!Y2:Y,"未派車")');
  sh.getRange('F5').setFormula('=COUNTIF(訂單!H2:H,TODAY())');
  sh.getRange('G5').setFormula('=COUNTA(司機資料!A2:A)');
  sh.getRange('H5').setFormula('=COUNTA(系統錯誤紀錄!C2:C)');
  sh.getRange('A5:H5')
    .setBackground('#F6EBC7')
    .setFontWeight('bold')
    .setFontSize(16)
    .setHorizontalAlignment('center');
  sh.getRange('C5').setNumberFormat('#,##0');

  sh.getRange('A8:D8').setValues([['訂單狀態','數量','付款狀態','數量']]);
  styleHeader_(sh.getRange('A8:D8'));
  sh.getRange('A9:A13').setValues([['待確認'],['已確認'],['進行中'],['已完成'],['已取消']]);
  sh.getRange('C9:C13').setValues([['未付款'],['已付訂金'],['已付款'],['退款中'],['已退款']]);
 sh.getRange('B9:B13').setFormulas([
  ['=COUNTIF(訂單!V:V,A9)'],
  ['=COUNTIF(訂單!V:V,A10)'],
  ['=COUNTIF(訂單!V:V,A11)'],
  ['=COUNTIF(訂單!V:V,A12)'],
  ['=COUNTIF(訂單!V:V,A13)']
]);

sh.getRange('D9:D13').setFormulas([
  ['=COUNTIF(訂單!W:W,C9)'],
  ['=COUNTIF(訂單!W:W,C10)'],
  ['=COUNTIF(訂單!W:W,C11)'],
  ['=COUNTIF(訂單!W:W,C12)'],
  ['=COUNTIF(訂單!W:W,C13)']
]);

sh.getRange('F8:H8').setValues([['派車狀態','數量','提醒']]);
styleHeader_(sh.getRange('F8:H8'));

sh.getRange('F9:F14').setValues([
  ['未派車'],
  ['待司機確認'],
  ['已派車'],
  ['執行中'],
  ['已完成'],
  ['已取消']
]);

sh.getRange('G9:G14').setFormulas([
  ['=COUNTIF(訂單!Y:Y,F9)'],
  ['=COUNTIF(訂單!Y:Y,F10)'],
  ['=COUNTIF(訂單!Y:Y,F11)'],
  ['=COUNTIF(訂單!Y:Y,F12)'],
  ['=COUNTIF(訂單!Y:Y,F13)'],
  ['=COUNTIF(訂單!Y:Y,F14)']
]);

sh.getRange('H9:H14').setFormulas([
  ['=IF(G9>0,"需處理","正常")'],
  ['=IF(G10>0,"需處理","正常")'],
  ['=IF(G11>0,"需處理","正常")'],
  ['=IF(G12>0,"需處理","正常")'],
  ['=IF(G13>0,"需處理","正常")'],
  ['=IF(G14>0,"需處理","正常")']
]);

sh.getRange('A17:D17').setValues([
  ['資料品質檢查','數量','判定','建議']
]);
styleHeader_(sh.getRange('A17:D17'));

sh.getRange('A18:A20').setValues([
  ['缺少電話'],
  ['缺少報價'],
  ['已派車但無司機']
]);

sh.getRange('D18:D20').setValues([
  ['補齊聯絡方式'],
  ['完成報價後再確認訂單'],
  ['重新指派司機']
]);

sh.getRange('B18:B20').setFormulas([
  ['=COUNTIFS(訂單!B2:B,"<>",訂單!G2:G,"")'],
  ['=COUNTIFS(訂單!B2:B,"<>",訂單!T2:T,"")'],
  ['=COUNTIFS(訂單!Y2:Y,"已派車",訂單!AA2:AA,"")']
]);

sh.getRange('C18:C20').setFormulas([
  ['=IF(B18=0,"正常","需處理")'],
  ['=IF(B19=0,"正常","需處理")'],
  ['=IF(B20=0,"正常","需處理")']
]);
  sh.setFrozenRows(4);
  for (let c = 1; c <= 8; c++) sh.setColumnWidth(c, 130);
  sh.setColumnWidth(4, 220);
}
