const API = APP_CONFIG.API_URL;

let map;
let markers = [];

function initMap(){

  map = new google.maps.Map(
    document.getElementById("map"),
    {
      center:{
        lat:24.1477,
        lng:120.6736
      },
      zoom:10
    }
  );

  loadDrivers();

  setInterval(
    loadDrivers,
    10000
  );
}

async function loadDrivers(){

  const data =
  await fetch(
    API+"?action=driverLocations"
  ).then(r=>r.json());

  markers.forEach(
    m=>m.setMap(null)
  );

  markers=[];

  (data.locations||[]).forEach(driver=>{

    const marker =
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
