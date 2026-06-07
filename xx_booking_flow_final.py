from pathlib import Path
from datetime import datetime
import re

p = Path("booking.html")
s = p.read_text(encoding="utf-8")

Path("backup").mkdir(exist_ok=True)
Path(f"backup/booking_before_flow_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html").write_text(s, encoding="utf-8")

s = re.sub(r'\n?<style id="xx-booking-service-visibility-css">.*?</style>\s*', '\n', s, flags=re.S)
s = re.sub(r'\n?<script id="xx-booking-service-visibility-js">.*?</script>\s*', '\n', s, flags=re.S)

inject = r'''
<style id="xx-booking-service-visibility-css">
.xx-service-hidden{display:none!important}
.xx-return-mini,.xx-day-plan{
  margin:18px 0;padding:18px;border:1px solid rgba(212,175,55,.35);
  border-radius:20px;background:rgba(255,255,255,.045)
}
.xx-return-mini h3,.xx-day-plan h3{margin:0 0 14px;color:#f8e7a1}
.xx-mini-grid,.xx-day-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.xx-mini-grid label,.xx-day-grid label{display:grid;gap:6px;color:#f8e7a1;font-weight:900}
.xx-mini-grid input,.xx-day-grid input{
  width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.35);
  border-radius:12px;background:#151515;color:#fff;padding:12px
}
.xx-add-day{
  margin-top:12px;border:0;border-radius:999px;padding:12px 18px;
  background:linear-gradient(135deg,#fff1a8,#d4af37);font-weight:950;color:#080808
}
@media(max-width:760px){.xx-mini-grid,.xx-day-grid{grid-template-columns:1fr}}
</style>

<script id="xx-booking-service-visibility-js">
(function(){
  const SERVICES=["機場接送","港口接送","長途接送","旅遊包車","登山包車","演唱會接送"];

  const DETAILS={
    "機場接送":["送機","接機","接送機"],
    "港口接送":["送港","接船","來回"],
    "長途接送":["去程","回程","來回"],
    "旅遊包車":["一日包車","兩天一夜","三天兩夜"],
    "登山包車":["去程","回程","一日包車","兩天一夜","三天兩夜"],
    "演唱會接送":["去程","回程","來回","一日包車","兩天一夜","三天兩夜"]
  };

  const RULES={
    "機場接送":["日期","時間","上車地址","下車地址","人數","行李","航班編號","加購項目"],
    "港口接送":["日期","時間","上車地址","下車地址","人數","行李","航班編號","船班梯次","船班編號","加購項目"],
    "長途接送":["日期","時間","上車地址","下車地址","人數","行李","加購項目"],
    "旅遊包車":["日期","時間","包車天數","用車天數","用車時數","包車時數","上車地址","行程","中途點","下車地址","人數","行李","加購項目"],
    "登山包車":["預約日期","日期","時間","加購項目"],
    "演唱會接送":["日期","時間","上車地址","下車地址","活動名稱","加購項目"]
  };

  const ALWAYS=["服務項目","服務細項","乘客姓名","聯絡方式","聯絡電話","LINE","WhatsApp","車款","備註","送出","確認"];

  function t(el){return (el?.innerText||el?.textContent||"").replace(/\s+/g,"").trim()}
  function esc(v){return String(v||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

  function serviceSelect(){
    return Array.from(document.querySelectorAll("select")).find(sel=>{
      const text=t(sel.closest("label")||sel.closest("div")||sel.parentElement||sel);
      const id=((sel.id||"")+" "+(sel.name||"")).toLowerCase();
      return text.includes("服務項目")||id.includes("service");
    })||document.querySelector("select");
  }

  function detailSelect(){
    const ss=serviceSelect();
    return Array.from(document.querySelectorAll("select")).find(sel=>{
      if(sel===ss)return false;
      return t(sel.closest("label")||sel.closest("div")||sel.parentElement||sel).includes("服務細項");
    })||Array.from(document.querySelectorAll("select")).find(sel=>sel!==ss);
  }

  function setOptions(sel,arr,ph){
    if(!sel)return;
    const old=sel.value;
    sel.innerHTML=`<option value="">${ph}</option>`+arr.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(arr.includes(old))sel.value=old;
  }

  function box(el){
    return el.closest(".form-row,.form-group,.field,.input-group,.booking-field,.xx-field,label")||el.closest("div")||el.parentElement;
  }

  function boxes(){
    const set=new Set();
    document.querySelectorAll("label,input,select,textarea").forEach(el=>{const b=box(el);if(b)set.add(b)});
    return Array.from(set);
  }

  function isVisible(b,service){
    const text=t(b);
    if(!text)return true;
    if(ALWAYS.some(k=>text.includes(k)))return true;
    return (RULES[service]||[]).some(k=>text.includes(k));
  }

  function ensureReturnMini(){
    let card=document.getElementById("xx-return-mini");
    if(card)return card;
    card=document.createElement("div");
    card.id="xx-return-mini";
    card.className="xx-return-mini xx-service-hidden";
    card.innerHTML=`
      <h3>回程資訊</h3>
      <div class="xx-mini-grid">
        <label>回程日期<input name="returnDate" type="date"></label>
        <label>回程時間<input name="returnTime" type="time"></label>
        <label class="xx-return-flight">回程航班編號<input name="returnFlightNo" placeholder="例：CI123"></label>
        <label class="xx-return-ship">回程船班梯次<input name="returnShipSession" placeholder="例：第 2 梯／船班時間"></label>
      </div>`;
    const target=box(detailSelect())||box(serviceSelect())||document.querySelector("form");
    target.insertAdjacentElement("afterend",card);
    return card;
  }

  function ensureDayPlan(){
    let card=document.getElementById("xx-day-plan");
    if(card)return card;
    card=document.createElement("div");
    card.id="xx-day-plan";
    card.className="xx-day-plan xx-service-hidden";
    card.innerHTML=`
      <h3>登山包車每日行程</h3>
      <div id="xx-day-list"></div>
      <button type="button" class="xx-add-day" id="xx-add-day">＋ 新增一日</button>`;
    const form=document.querySelector("form");
    form.appendChild(card);
    document.getElementById("xx-add-day").onclick=()=>addDay();
    addDay();
    return card;
  }

  function addDay(){
    const list=document.getElementById("xx-day-list");
    if(!list)return;
    const n=list.children.length+1;
    const row=document.createElement("div");
    row.className="xx-day-grid";
    row.style.marginTop="12px";
    row.innerHTML=`
      <label>第 ${n} 日用車時數<input name="day${n}Hours" placeholder="例：10 小時"></label>
      <label>第 ${n} 日上車地址<input name="day${n}From" placeholder="可填多個上車點"></label>
      <label>第 ${n} 日下車地址<input name="day${n}To" placeholder="可填多個下車點"></label>
      <label>第 ${n} 日備註<input name="day${n}Memo" placeholder="路線／登山口／住宿點"></label>`;
    list.appendChild(row);
  }

  function needReturn(service,detail){
    return (service==="機場接送"&&detail==="接送機")||
           (service==="港口接送"&&detail==="來回")||
           (service==="長途接送"&&detail==="來回")||
           (service==="演唱會接送"&&detail==="來回");
  }

  function apply(){
    const ss=serviceSelect(); if(!ss)return;
    setOptions(ss,SERVICES,"請選擇服務項目");
    const service=ss.value||"機場接送";
    const ds=detailSelect();
    setOptions(ds,DETAILS[service]||[],"請選擇服務細項");
    const detail=ds?ds.value:"";

    boxes().forEach(b=>{
      if(b.contains(ss)||(ds&&b.contains(ds)))return;
      b.classList.toggle("xx-service-hidden",!isVisible(b,service));
    });

    const ret=ensureReturnMini();
    ret.classList.toggle("xx-service-hidden",!needReturn(service,detail));
    ret.querySelector(".xx-return-flight").classList.toggle("xx-service-hidden",service!=="機場接送"&&service!=="港口接送");
    ret.querySelector(".xx-return-ship").classList.toggle("xx-service-hidden",service!=="港口接送");

    const day=ensureDayPlan();
    day.classList.toggle("xx-service-hidden",service!=="登山包車");
  }

  function bind(){
    const ss=serviceSelect(); const ds=detailSelect();
    if(!ss)return;
    ss.onchange=apply;
    if(ds)ds.onchange=apply;
    apply();
  }

  document.addEventListener("DOMContentLoaded",bind);
  window.addEventListener("load",bind);
  setTimeout(bind,500);
})();
</script>
'''

s=s.replace("</body>",inject+"\n</body>")
p.write_text(s,encoding="utf-8")
print("DONE｜booking.html 最終預約欄位流程已升級")
