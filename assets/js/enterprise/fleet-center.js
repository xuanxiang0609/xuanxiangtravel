
const API = APP_CONFIG.API_URL;

async function loadFleetCenter(){

const drivers =
await fetch(
API+"?action=drivers"
).then(r=>r.json());

const vehicles =
await fetch(
API+"?action=vehicles"
).then(r=>r.json());

console.log({
drivers,
vehicles
});

}

loadFleetCenter();

