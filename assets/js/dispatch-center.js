const API='YOUR_APPS_SCRIPT_URL';

async function loadDispatchOrders(){
  const res=await fetch(API+'?action=dispatch');
  const data=await res.json();

  console.log(data);
}

document.addEventListener(
  'DOMContentLoaded',
  loadDispatchOrders
);
