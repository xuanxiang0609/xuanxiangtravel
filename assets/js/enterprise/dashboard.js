
const API =
APP_CONFIG.API_URL;

async function loadDashboard(){

const data =
await fetch(
API+"?action=dashboard"
).then(r=>r.json());

document.getElementById(
"todayOrders"
).innerText =
data.todayOrders || 0;

document.getElementById(
"pendingDispatch"
).innerText =
data.pendingDispatch || 0;

document.getElementById(
"todayRevenue"
).innerText =
(data.todayRevenue || 0)
.toLocaleString();

document.getElementById(
"activeDrivers"
).innerText =
data.activeDrivers || 0;

}

loadDashboard();

setInterval(
loadDashboard,
30000
);

