from pathlib import Path
from datetime import datetime

p = Path("booking.html")
s = p.read_text(encoding="utf-8")
backup = Path(f"backup/booking_before_service_upgrade_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html")
backup.parent.mkdir(exist_ok=True)
backup.write_text(s, encoding="utf-8")

inject = r'''
<style id="xx-booking-service-visibility-css">
.xx-service-hidden{
  display:none !important;
}
</style>

<script id="xx-booking-service-visibility-js">
(function(){
  const SERVICE_OPTIONS = [
    "機場接送",
    "港口接送",
    "長途接送",
    "旅遊包車",
    "登山包車",
    "演唱會接送",
    "商城（一日遊、三天兩夜）"
  ];

  const FIELD_RULES = {
    "機場接送": ["日期","時間","上車地址","下車地址","航班編號"],
    "港口接送": ["日期","時間","上車地址","下車地址","航班編號","船班梯次","船班編號"],
    "長途接送": ["日期","時間","上車地址","下車地址"],
    "旅遊包車": ["日期","時間","包車天數","用車天數","用車時數","包車時數","上車地址","行程","中途點","下車地址"],
    "登山包車": ["日期","時間","包車天數","用車天數","用車時數","包車時數","上車地址","行程","中途點","下車地址"],
    "演唱會接送": ["日期","時間","上車地址","下車地址","活動名稱"],
    "商城（一日遊、三天兩夜）": ["日期","時間","上車地址","下車地址","人數","行李","備註","加購項目"]
  };

  const ALWAYS_SHOW = ["服務項目","服務細項","乘客姓名","聯絡方式","聯絡電話","LINE","WhatsApp","車款","付款方式","備註","加購項目","加購服務","預估總額","送出","確認"];

  function textOf(el){
    return (el.innerText || el.textContent || "").replace(/\s+/g,"").trim();
  }

  function findServiceSelect(){
    const selects = Array.from(document.querySelectorAll("select"));
    return selects.find(sel=>{
      const wrapText = textOf(sel.closest("label") || sel.closest("div") || sel.parentElement || sel);
      const idName = ((sel.id||"") + " " + (sel.name||"")).toLowerCase();
      return wrapText.includes("服務項目") || idName.includes("service");
    }) || selects[0];
  }

  function resetServiceOptions(sel){
    if(!sel) return;
    const old = sel.value;
    sel.innerHTML = '<option value="">請選擇服務項目</option>' + SERVICE_OPTIONS.map(v=>`<option value="${v}">${v}</option>`).join("");
    if(SERVICE_OPTIONS.includes(old)) sel.value = old;
  }

  function fieldBox(el){
    return el.closest(".form-row,.form-group,.field,.input-group,.booking-field,.xx-field,label") || el.closest("div") || el.parentElement;
  }

  function allCandidateFields(){
    const nodes = Array.from(document.querySelectorAll("label,input,select,textarea"));
    const boxes = new Set();
    nodes.forEach(n=>{
      const box = fieldBox(n);
      if(box) boxes.add(box);
    });
    return Array.from(boxes);
  }

  function shouldShowField(box, service){
    const t = textOf(box);
    if(!t) return true;
    if(ALWAYS_SHOW.some(k=>t.includes(k))) return true;
    const rules = FIELD_RULES[service] || [];
    return rules.some(k=>t.includes(k));
  }

  function applyVisibility(){
    const sel = findServiceSelect();
    if(!sel) return;
    resetServiceOptions(sel);
    const service = sel.value || "機場接送";

    allCandidateFields().forEach(box=>{
      if(!box || box.contains(sel)) return;
      if(shouldShowField(box, service)){
        box.classList.remove("xx-service-hidden");
      }else{
        box.classList.add("xx-service-hidden");
      }
    });
  }

  function bind(){
    const sel = findServiceSelect();
    if(!sel) return;
    resetServiceOptions(sel);
    sel.removeEventListener("change", applyVisibility);
    sel.addEventListener("change", applyVisibility);
    applyVisibility();
  }

  document.addEventListener("DOMContentLoaded", bind);
  window.addEventListener("load", bind);
  setTimeout(bind, 500);
})();
</script>
'''

if 'id="xx-booking-service-visibility-js"' not in s:
    s = s.replace("</body>", inject + "\n</body>")
else:
    print("已存在升級碼，略過重複插入")

p.write_text(s, encoding="utf-8")
print("DONE｜booking.html 服務項目欄位顯示規則已升級")
