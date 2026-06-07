from pathlib import Path
from datetime import datetime
import re

p = Path("booking.html")
s = p.read_text(encoding="utf-8")

Path("backup").mkdir(exist_ok=True)
Path(f"backup/booking_before_service_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html").write_text(s, encoding="utf-8")

s = re.sub(r'\n?<style id="xx-booking-service-visibility-css">.*?</style>\s*', '\n', s, flags=re.S)
s = re.sub(r'\n?<script id="xx-booking-service-visibility-js">.*?</script>\s*', '\n', s, flags=re.S)

inject = r'''
<style id="xx-booking-service-visibility-css">
.xx-service-hidden{display:none!important}
.xx-return-card{margin:18px 0;padding:18px;border:1px solid rgba(212,175,55,.35);border-radius:18px;background:rgba(255,255,255,.04)}
.xx-return-card h3{margin:0 0 12px;color:#f8e7a1;font-size:18px}
.xx-return-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.xx-return-grid label{display:grid;gap:6px;color:#f8e7a1;font-weight:900}
.xx-return-grid input{width:100%;box-sizing:border-box;border:1px solid rgba(212,175,55,.35);border-radius:12px;background:#151515;color:#fff;padding:12px}
@media(max-width:760px){.xx-return-grid{grid-template-columns:1fr}}
</style>

<script id="xx-booking-service-visibility-js">
(function(){
  const SERVICES = ["機場接送","港口接送","長途接送","旅遊包車","登山包車","演唱會接送"];

  const DETAILS = {
    "機場接送":["送機","接機","接送機"],
    "港口接送":["送港","接船","來回"],
    "長途接送":["去程","回程","來回"],
    "旅遊包車":["一日包車","兩天一夜","三天兩夜"],
    "登山包車":["去程","回程","一日包車","兩天一夜","三天兩夜"],
    "演唱會接送":["去程","回程","來回","一日包車","兩天一夜","三天兩夜"]
  };

  const RULES = {
    "機場接送":["日期","時間","上車地址","下車地址","人數","行李","行李數","航班編號","加購項目","加購服務"],
    "港口接送":["日期","時間","上車地址","下車地址","人數","行李","行李數","航班編號","船班梯次","船班編號","加購項目","加購服務"],
    "長途接送":["日期","時間","上車地址","下車地址","人數","行李","行李數","加購項目","加購服務"],
    "旅遊包車":["日期","時間","包車天數","用車天數","用車時數","包車時數","上車地址","行程","中途點","下車地址","人數","行李","行李數","加購項目","加購服務"],
    "登山包車":["日期","時間","包車天數","用車天數","用車時數","包車時數","上車地址","下車地址","加購項目","加購服務"],
    "演唱會接送":["日期","時間","上車地址","下車地址","活動名稱","加購項目","加購服務"]
  };

  const ALWAYS = ["服務項目","服務細項","乘客姓名","聯絡方式","聯絡電話","LINE","WhatsApp","車款","付款方式","付款","備註","預估","總額","送出","確認"];

  function txt(el){return (el?.innerText||el?.textContent||"").replace(/\s+/g,"").trim();}
  function esc(v){return String(v||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

  function selectByText(keyword){
    return Array.from(document.querySelectorAll("select")).find(sel=>{
      const t = txt(sel.closest("label")||sel.closest("div")||sel.parentElement||sel);
      const id = ((sel.id||"")+" "+(sel.name||"")).toLowerCase();
      return t.includes(keyword) || id.includes(keyword.toLowerCase()) || (keyword==="服務項目" && id.includes("service"));
    });
  }

  function serviceSelect(){return selectByText("服務項目") || document.querySelector("select");}
  function detailSelect(){
    const all = Array.from(document.querySelectorAll("select"));
    const ss = serviceSelect();
    return all.find(x=>x!==ss && txt(x.closest("label")||x.closest("div")||x.parentElement||x).includes("服務細項")) || all.find(x=>x!==ss);
  }

  function setOptions(sel, arr, placeholder){
    if(!sel)return;
    const old = sel.value;
    sel.innerHTML = `<option value="">${placeholder}</option>` + arr.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
    if(arr.includes(old)) sel.value = old;
  }

  function box(el){return el.closest(".form-row,.form-group,.field,.input-group,.booking-field,.xx-field,label") || el.closest("div") || el.parentElement;}
  function boxes(){
    const set = new Set();
    document.querySelectorAll("label,input,select,textarea").forEach(el=>{
      const b = box(el);
      if(b) set.add(b);
    });
    return Array.from(set);
  }

  function visible(b, service){
    const t = txt(b);
    if(!t)return true;
    if(ALWAYS.some(k=>t.includes(k)))return true;
    return (RULES[service]||[]).some(k=>t.includes(k));
  }

  function needReturn(service, detail){
    if(service==="機場接送" && detail==="接送機")return true;
    if(["港口接送","長途接送","演唱會接送"].includes(service) && detail==="來回")return true;
    return false;
  }

  function ensureReturnCard(){
    let card = document.getElementById("xx-return-order-card");
    if(card)return card;
    card = document.createElement("div");
    card.id = "xx-return-order-card";
    card.className = "xx-return-card xx-service-hidden";
    card.innerHTML = `
      <h3>回程訂單資訊</h3>
      <div class="xx-return-grid">
        <label>回程日期<input name="returnDate" type="date"></label>
        <label>回程時間<input name="returnTime" type="time"></label>
        <label>回程上車地址<input name="returnFrom" placeholder="請輸入回程上車地址"></label>
        <label>回程下車地址<input name="returnTo" placeholder="請輸入回程下車地址"></label>
        <label>回程航班／船班／活動備註<input name="returnNo" placeholder="例如：航班、船班梯次、活動散場時間"></label>
        <label>回程備註<input name="returnMemo" placeholder="其他回程需求"></label>
      </div>`;
    const ds = detailSelect();
    const target = box(ds) || box(serviceSelect()) || document.querySelector("form");
    target.insertAdjacentElement("afterend", card);
    return card;
  }

  function apply(){
    const ss = serviceSelect();
    if(!ss)return;
    setOptions(ss, SERVICES, "請選擇服務項目");
    const service = ss.value || "機場接送";
    const ds = detailSelect();
    setOptions(ds, DETAILS[service] || [], "請選擇服務細項");
    const detail = ds ? ds.value : "";

    boxes().forEach(b=>{
      if(b.contains(ss) || (ds && b.contains(ds)))return;
      if(visible(b, service)) b.classList.remove("xx-service-hidden");
      else b.classList.add("xx-service-hidden");
    });

    const card = ensureReturnCard();
    if(needReturn(service, detail)) card.classList.remove("xx-service-hidden");
    else card.classList.add("xx-service-hidden");
  }

  function bind(){
    const ss = serviceSelect();
    const ds = detailSelect();
    if(!ss)return;
    ss.onchange = apply;
    if(ds) ds.onchange = apply;
    apply();
  }

  document.addEventListener("DOMContentLoaded", bind);
  window.addEventListener("load", bind);
  setTimeout(bind, 500);
})();
</script>
'''

s = s.replace("</body>", inject + "\n</body>")
p.write_text(s, encoding="utf-8")
print("DONE｜booking.html 服務項目與欄位規則已升級為最終版")
