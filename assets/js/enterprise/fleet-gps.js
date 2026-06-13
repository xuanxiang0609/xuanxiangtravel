
const API = APP_CONFIG.API_URL;

async function loadFleet(){

const data =
await fetch(
API+"?action=driverLocations"
).then(r=>r.json());

console.log(data);

}

loadFleet();

setInterval(
loadFleet,
10000
);

