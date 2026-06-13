
const API = APP_CONFIG.API_URL;

async function loadDrivers(){

const data=
await fetch(
API+"?action=driverLocations"
).then(r=>r.json());

console.log(data);

}

loadDrivers();

setInterval(
loadDrivers,
10000
);

