/**
 * ======================================================
 * V39.2.2.2 Dispatch Calendar Sidebar
 * ======================================================
 */

function getTodayDispatchCards_() {

  const events = getDispatchEventsToday();

  return events.map(function(event) {

    return {
      orderNo: event.orderNo || "",
      driver: event.driver || "",
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      pickup: event.pickup || "",
      dropoff: event.dropoff || "",
      vehicle: event.vehicle || "",
      amount: event.amount || "",
      status: event.status || "待確認",
      statusColor:
        typeof getStatusColor_ === "function"
          ? getStatusColor_(event.status)
          : "#9E9E9E",
      conflict: event.conflict || false
    };

  });

}
