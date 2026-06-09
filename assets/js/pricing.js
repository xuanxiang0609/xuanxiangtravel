let priceData={};

async function loadPricing(){
 try{
   const r=await fetch('/data/airport.json');
   priceData=await r.json();
 }catch(e){
   console.error(e);
 }
}

document.addEventListener('DOMContentLoaded',()=>{

 loadPricing();

 document.getElementById('getPrice')
 ?.addEventListener('click',()=>{

   const from=document.getElementById('fromCity').value;
   const to=document.getElementById('toCity').value;
   const vehicle=document.getElementById('vehicleType').value;

   let price='請洽客服';

   try{
      price=priceData[from][to][vehicle];
   }catch(err){}

   document.getElementById('result').innerHTML=
   `
   <div class="price-card">
      <h3>預估價格</h3>
      <div class="amount">NT$ ${price}</div>
   </div>
   `;
 });

});
