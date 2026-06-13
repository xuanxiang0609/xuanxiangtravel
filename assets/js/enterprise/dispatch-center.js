const API = APP_CONFIG.API_URL;

async function loadOrders(){

  const data =
  await fetch(
    API+"?action=orders"
  ).then(r=>r.json());

  console.log("Orders",data);

}

async function loadDrivers(){

  const data =
  await fetch(
    API+"?action=drivers"
  ).then(r=>r.json());

  console.log("Drivers",data);

}

loadOrders();
loadDrivers();

setInterval(loadOrders,30000);
