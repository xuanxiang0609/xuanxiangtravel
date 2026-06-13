const API = APP_CONFIG.API_URL;

async function loadDashboard(){

const data =
await fetch(API+"?action=dashboard")
.then(r=>r.json());

document.getElementById("todayOrders").textContent =
data.todayOrders || 0;

document.getElementById("pendingDispatch").textContent =
data.pendingDispatch || 0;

document.getElementById("todayRevenue").textContent =
(data.todayRevenue || 0).toLocaleString();

document.getElementById("monthRevenue").textContent =
(data.monthRevenue || 0).toLocaleString();

document.getElementById("activeDrivers").textContent =
data.activeDrivers || 0;

document.getElementById("activeVehicles").textContent =
data.activeVehicles || 0;

}

loadDashboard();

setInterval(loadDashboard,30000);
