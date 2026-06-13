
const API =
'https://script.google.com/macros/s/YOUR_DEPLOYMENT/exec';

let map;
let markers=[];

function initMap(){

  map=new google.maps.Map(
    document.getElementById('map'),
    {
      center:{
        lat:24.1477,
        lng:120.6736
      },
      zoom:8
    }
  );

  loadDrivers();

  setInterval(
    loadDrivers,
    10000
  );
}

async function loadDrivers(){

  try{

    const res=
      await fetch(
        API+'?action=driverLocations'
      );

    const data=
      await res.json();

    markers.forEach(
      m=>m.setMap(null)
    );

    markers=[];

    data.locations.forEach(driver=>{

      const marker=
      new google.maps.Marker({
        map:map,
        position:{
          lat:Number(driver.Latitude),
          lng:Number(driver.Longitude)
        },
        title:driver['司機']
      });

      const info=
      new google.maps.InfoWindow({
        content:
        '<b>'+driver['司機']+'</b><br>'+
        driver['時間']
      });

      marker.addListener(
        'click',
        ()=>info.open(map,marker)
      );

      markers.push(marker);

    });

  }catch(err){

    console.error(err);

  }

}

window.onload=initMap;

