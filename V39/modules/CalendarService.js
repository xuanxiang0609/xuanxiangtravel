/**
 * ======================================================
 * V39.2.2.1 Calendar Service
 * ======================================================
 */

function getDispatchEventsToday() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName('訂單');

  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values.shift();

  const index = {};

  headers.forEach(function(h, i) {
    index[h] = i;
  });

  const today = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );

  const events = [];

  values.forEach(function(row) {

    const date = String(row[index["預約日期"]] || "").trim();

    if (date !== today) return;

    const status = String(row[index["狀態"]] || "").trim();

    if (status === "已取消" || status === "已完成") {
      return;
    }

    events.push({

      orderNo:
        row[index["訂單編號"]] || "",

      driver:
        row[index["司機姓名"]] || "",

      customer:
        row[index["乘客姓名"]] || "",

      vehicle:
        row[index["車型"]] || row[index["指定車款"]] || "",

      date:

        date,

      start:

        row[index["預約時間"]] || "",

      pickup:

        row[index["上車地址"]] || "",

      dropoff:

        row[index["下車地址"]] || "",

      status:

        status,

      payment:

        row[index["付款狀態"]] || ""

    });

  });

  events.sort(function(a, b) {

    return String(a.start).localeCompare(String(b.start));

  });

  return events;

}
