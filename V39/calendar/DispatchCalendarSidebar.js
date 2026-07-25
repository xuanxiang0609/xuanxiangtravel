function openDispatchCalendarSidebar(){

  const html=HtmlService
      .createHtmlOutputFromFile("V39/calendar/DispatchDayView")
      .setTitle("Dispatch Calendar");

  SpreadsheetApp
      .getUi()
      .showSidebar(html);

}
