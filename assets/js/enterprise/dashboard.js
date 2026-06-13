
const API = APP_CONFIG.API_URL;

async function loadDashboard(){

const dashboard =
await fetch(API+"?action=dashboard")
.then(r=>r.json());

const revenue =
await fetch(API+"?action=revenue")
.then(r=>r.json());

const kpi =
await fetch(API+"?action=kpi")
.then(r=>r.json());

console.log({
dashboard,
revenue,
kpi
});

}

loadDashboard();

setInterval(
loadDashboard,
30000
);

