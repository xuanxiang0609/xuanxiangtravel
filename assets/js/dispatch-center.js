
const API = APP_CONFIG.API_URL;

async function loadOrders(){

const data=
await fetch(
API+"?action=orders"
).then(r=>r.json());

console.log(data);

}

loadOrders();

