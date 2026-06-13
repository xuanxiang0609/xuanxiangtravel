
const API = APP_CONFIG.API_URL;

let map;
let markers=[];

async function loadDashboard(){

const data=
await fetch(
API+"?action=dashboard"
).then(r=>r.json());

document.getElementById(
"todayOrders"
).innerText=
data.todayOrders || 0;

document.getElementById(
"pendingDispatch"
).innerText=
data.pendingDispatch || 0;

document.getElementById(
"todayRevenue"
).innerText=
(data.todayRevenue || 0)
.toLocaleString();

document.getElementById(
"monthRevenue"
).innerText=
(data.monthRevenue || 0)
.toLocaleString();

document.getElementById(
"activeDrivers"
).innerText=
data.activeDrivers || 0;

document.getElementById(
"activeVehicles"
).innerText=
data.activeVehicles || 0;

}

async function loadGps(){

const data=
await fetch(
API+"?action=driverLocations"
).then(r=>r.json());

markers.forEach(
m=>m.setMap(null)
);

markers=[];

(data.locations||[])
.forEach(driver=>{

const marker=
new google.maps.Marker({

position:{
lat:Number(driver.Latitude),
lng:Number(driver.Longitude)
},

map,

title:driver["司機"]

});

markers.push(marker);

});

}

function initTower(){

map=
new google.maps.Map(
document.getElementById("map"),
{
center:{
lat:24.1477,
lng:120.6736
},
zoom:9
}
);

loadDashboard();
loadGps();

setInterval(
loadDashboard,
30000
);

setInterval(
loadGps,
10000
);

}

