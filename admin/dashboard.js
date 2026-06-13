window.XXAdmin = window.XXAdmin || {};
window.XXAdmin.state = {
  orders:[
    {id:'XX20260606001',service:'桃園機場接送',customer:'王小姐',time:'今天 18:30',status:'待派車'},
    {id:'XX20260606002',service:'S2O 三天兩夜包車',customer:'林先生',time:'明天 09:00',status:'已確認'},
    {id:'XX20260606003',service:'商務接待',customer:'陳經理',time:'週一 07:40',status:'司機已排'}
  ],
  drivers:['張司機｜九人座｜可派','李司機｜五人座｜休息','王司機｜Sprinter｜可派'],
  vehicles:['RAV4｜舒適五人座｜正常','VITO｜九人座商務車｜保養提醒','Sprinter｜明星保母車｜正常'],
  members:['今日新增 6 位','本月活躍 128 位','LINE 綁定 82 位'],
  kpis:[['今日訂單','18'],['待派車','7'],['本月營收','NT$ 386,000'],['LINE 詢問','42']]
};
window.XXAdmin.mountList=function(id,items,cls='order-row'){const el=document.getElementById(id);if(!el)return;el.innerHTML=items.map(x=>`<div class="${cls}"><div><b>${x}</b><span>系統示範資料，可改接 Firebase / Apps Script</span></div><em class="status-pill">正常</em></div>`).join('');};
document.addEventListener('DOMContentLoaded',()=>{
  const kpi=document.getElementById('kpiGrid'); if(kpi) kpi.innerHTML=XXAdmin.state.kpis.map(([a,b])=>`<div class="kpi-card"><span>${a}</span><strong>${b}</strong></div>`).join('');
  const permission=document.getElementById('permissionBoard'); if(permission) permission.innerHTML='<p class="module-note">建議正式上線時接 Firebase Auth Custom Claims：owner / dispatcher / accountant / driver。</p>';
});
