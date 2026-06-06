(function(){

"use strict";

const CONFIG =
window.XUANXIANG_CONFIG || {};

const API =
CONFIG.APPS_SCRIPT_URL;

async function loadDashboard(){

try{

await loadHealth();

await loadOrders();

}
catch(error){

console.error(error);

}

}

async function loadHealth(){

const response =
await fetch(
`${API}?action=health`
);

const data =
await response.json();

document.getElementById(
"apiHealth"
).textContent =
data.ok ? "正常" : "異常";

}

async function loadOrders(){

const response =
await fetch(
`${API}?action=dashboard`
);

const data =
await response.json();

document.getElementById(
"todayOrders"
).textContent =
data.todayOrders || 0;

document.getElementById(
"pendingOrders"
).textContent =
data.pendingOrders || 0;

document.getElementById(
"todayRevenue"
).textContent =
(data.todayRevenue || 0)
.toLocaleString();

const tbody =
document.getElementById(
"orderTable"
);

tbody.innerHTML = "";

(data.orders || [])
.forEach(order=>{

tbody.insertAdjacentHTML(
"beforeend",

`
<tr>
<td>${order.orderNo}</td>
<td>${order.customer}</td>
<td>${order.service}</td>
<td>${order.date}</td>
<td>${order.price}</td>
<td>${order.status}</td>
</tr>
`

);

});

}

document
.getElementById("refreshBtn")
?.addEventListener(
"click",
loadDashboard
);

loadDashboard();

})();