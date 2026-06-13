
const API = APP_CONFIG.API_URL;

async function loadRevenue(){

const data =
await fetch(
API+"?action=revenue"
).then(r=>r.json());

console.log(data);

}

loadRevenue();

