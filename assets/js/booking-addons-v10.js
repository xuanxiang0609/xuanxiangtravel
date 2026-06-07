
(function(){
  const ADDONS = [
    { id:"childSeatForward", label:"正向安全座椅", unit:"張", price:200, type:"qty" },
    { id:"childSeatRear", label:"反向安全座椅", unit:"張", price:200, type:"qty" },
    { id:"boosterSeat", label:"增高墊", unit:"張", price:200, type:"qty" },
    { id:"pet", label:"寶貝寵物", unit:"隻", price:200, type:"qty" },
    { id:"luggageCarryLow", label:"行李搬運 1~2樓", unit:"趟", price:100, type:"qty" },
    { id:"luggageCarryHigh", label:"行李搬運 3樓以上", unit:"趟", price:200, type:"qty" },
    { id:"signService", label:"舉牌服務", unit:"次", price:200, type:"check" },
    { id:"receipt", label:"收據", unit:"張", price:0, type:"qty" }
  ];

  const RATES = [
    { id:"taxId", label:"開立統編", rate:0.10 },
    { id:"cardFee", label:"刷卡服務", rate:0.06 }
  ];

  function money(n){ return "NT$ " + Math.round(Number(n||0)).toLocaleString("zh-TW"); }

  function parseAmount(v){
    const nums = String(v || "").match(/\d+/g);
    if(!nums) return 0;
    return Number(nums.join(""));
  }

  function getBaseTotal(){
    const candidates = [
      "#estimatedTotal",
      "#quoteTotal",
      "#bookingTotal",
      "[data-estimated-total]",
      "[data-total]"
    ];
    for(const sel of candidates){
      const el = document.querySelector(sel);
      if(el){
        const n = parseAmount(el.value || el.textContent);
        if(n) return n;
      }
    }
    const priceInputs = ["price","basePrice","quotedPrice","estimatedTotal"];
    for(const name of priceInputs){
      const el = document.querySelector(`[name="${name}"]`);
      if(el){
        const n = parseAmount(el.value);
        if(n) return n;
      }
    }
    return 0;
  }

  function buildPanel(){
    const host =
      document.querySelector("#addonsPanel") ||
      document.querySelector("#bookingAddons") ||
      document.querySelector("[data-booking-addons]");

    if(!host) return;

    host.innerHTML = `
      <section class="xx-booking-addons" aria-label="加購項目">
        <h3>加購項目</h3>
        <p class="xx-addon-note">數量填 0 或空白代表不加購；統編與刷卡會依「基本估價＋加購金額」計算。</p>
        <div class="xx-addon-grid">
          ${ADDONS.map(a => `
            <label class="xx-addon-card">
              <span class="xx-addon-title">${a.label}</span>
              <span class="xx-addon-price">+${a.price}/${a.unit}</span>
              ${a.type === "qty"
                ? `<input type="number" min="0" step="1" value="0" data-addon-id="${a.id}" data-addon-label="${a.label}" data-addon-unit="${a.unit}" data-addon-price="${a.price}">`
                : `<input type="checkbox" data-addon-id="${a.id}" data-addon-label="${a.label}" data-addon-unit="${a.unit}" data-addon-price="${a.price}">`
              }
            </label>
          `).join("")}
          ${RATES.map(r => `
            <label class="xx-addon-card xx-addon-rate">
              <span class="xx-addon-title">${r.label}</span>
              <span class="xx-addon-price">+${Math.round(r.rate*100)}%</span>
              <input type="checkbox" data-rate-id="${r.id}" data-rate-label="${r.label}" data-rate="${r.rate}">
            </label>
          `).join("")}
        </div>
        <div class="xx-addon-summary">
          <div>加購金額：<b data-addon-amount>NT$ 0</b></div>
          <div>費率加成：<b data-rate-amount>NT$ 0</b></div>
          <div class="xx-addon-total">預估小計：<b data-addon-total>NT$ 0</b></div>
        </div>
        <input type="hidden" name="加購項目" data-addon-hidden-list>
        <input type="hidden" name="加購金額" data-addon-hidden-amount>
        <input type="hidden" name="系統加價" data-addon-hidden-extra>
        <input type="hidden" name="預估小計" data-addon-hidden-total>
      </section>
    `;
  }

  function calculate(){
    const base = getBaseTotal();
    let addonAmount = 0;
    const addonTexts = [];

    document.querySelectorAll("[data-addon-id]").forEach(el=>{
      const label = el.dataset.addonLabel;
      const unit = el.dataset.addonUnit;
      const price = Number(el.dataset.addonPrice || 0);
      let qty = 0;

      if(el.type === "checkbox"){
        qty = el.checked ? 1 : 0;
      }else{
        qty = Math.max(0, Number(el.value || 0));
      }

      if(qty > 0){
        const amount = qty * price;
        addonAmount += amount;
        addonTexts.push(`${label} x${qty}${unit}（${money(amount)}）`);
      }
    });

    let rateAmount = 0;
    const rateBase = base + addonAmount;

    document.querySelectorAll("[data-rate-id]").forEach(el=>{
      if(!el.checked) return;
      const label = el.dataset.rateLabel;
      const rate = Number(el.dataset.rate || 0);
      const amount = Math.round(rateBase * rate);
      rateAmount += amount;
      addonTexts.push(`${label} +${Math.round(rate*100)}%（${money(amount)}）`);
    });

    const total = base + addonAmount + rateAmount;

    const setText = (sel, val) => {
      const el = document.querySelector(sel);
      if(el) el.textContent = money(val);
    };

    setText("[data-addon-amount]", addonAmount);
    setText("[data-rate-amount]", rateAmount);
    setText("[data-addon-total]", total);

    const list = addonTexts.join("、") || "無";
    const setVal = (sel, val) => {
      const el = document.querySelector(sel);
      if(el) el.value = val;
    };

    setVal("[data-addon-hidden-list]", list);
    setVal("[data-addon-hidden-amount]", addonAmount);
    setVal("[data-addon-hidden-extra]", rateAmount);
    setVal("[data-addon-hidden-total]", total);

    window.XX_BOOKING_ADDONS = {
      baseAmount: base,
      addonAmount,
      rateAmount,
      estimatedTotal: total,
      addonsText: list
    };

    window.dispatchEvent(new CustomEvent("xx:addons:updated", { detail: window.XX_BOOKING_ADDONS }));
  }

  function injectStyle(){
    if(document.querySelector("#xx-booking-addons-style")) return;
    const style = document.createElement("style");
    style.id = "xx-booking-addons-style";
    style.textContent = `
      .xx-booking-addons{margin:28px 0;padding:24px;border:1px solid rgba(216,181,109,.28);border-radius:24px;background:linear-gradient(145deg,rgba(18,14,8,.96),rgba(5,5,5,.9));box-shadow:0 22px 60px rgba(0,0,0,.28)}
      .xx-booking-addons h3{margin:0 0 8px;color:#fff0b8;font-size:1.35rem}
      .xx-addon-note{margin:0 0 16px;color:#d7c9aa;line-height:1.8}
      .xx-addon-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .xx-addon-card{display:grid;gap:8px;padding:16px;border:1px solid rgba(216,181,109,.22);border-radius:18px;background:rgba(255,255,255,.045)}
      .xx-addon-title{color:#fff8e8;font-weight:900}
      .xx-addon-price{color:#fff0b8;font-weight:900}
      .xx-addon-card input[type="number"]{width:100%;min-height:42px;border-radius:12px;border:1px solid rgba(216,181,109,.25);background:#080808;color:#fff;padding:8px 12px;font-size:1rem}
      .xx-addon-card input[type="checkbox"]{width:22px;height:22px;accent-color:#d8b56d}
      .xx-addon-summary{display:grid;gap:8px;margin-top:18px;padding:16px;border-radius:18px;background:rgba(216,181,109,.08);color:#eadfca}
      .xx-addon-summary b{color:#fff0b8}
      .xx-addon-total{font-size:1.18rem}
      @media(max-width:900px){.xx-addon-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function init(){
    injectStyle();
    buildPanel();
    calculate();
    document.addEventListener("input", e=>{
      if(e.target.matches("[data-addon-id],[data-rate-id]")) calculate();
    });
    document.addEventListener("change", e=>{
      if(e.target.matches("[data-addon-id],[data-rate-id]")) calculate();
    });
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();


(function(){
  function mergeAddonPayload(form){
    if(!form || !window.XX_BOOKING_ADDONS) return;

    const data = window.XX_BOOKING_ADDONS;
    const fields = {
      "加購項目": data.addonsText || "無",
      "addons": data.addonsText || "無",
      "customerAddons": data.addonsText || "無",
      "加購金額": data.addonAmount || 0,
      "addonAmount": data.addonAmount || 0,
      "addonsAmount": data.addonAmount || 0,
      "系統加價": data.rateAmount || 0,
      "systemExtra": data.rateAmount || 0,
      "預估小計": data.estimatedTotal || 0,
      "estimatedTotal": data.estimatedTotal || 0,
      "total": data.estimatedTotal || 0
    };

    Object.keys(fields).forEach(function(name){
      let input = form.querySelector(`[name="${name}"]`);
      if(!input){
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form.appendChild(input);
      }
      input.value = fields[name];
    });
  }

  document.addEventListener("submit", function(e){
    mergeAddonPayload(e.target);
  }, true);

  const oldFetch = window.fetch;
  window.fetch = function(input, init){
    try{
      if(init && init.body && window.XX_BOOKING_ADDONS){
        const data = window.XX_BOOKING_ADDONS;

        if(init.body instanceof FormData){
          init.body.set("加購項目", data.addonsText || "無");
          init.body.set("addons", data.addonsText || "無");
          init.body.set("customerAddons", data.addonsText || "無");
          init.body.set("加購金額", data.addonAmount || 0);
          init.body.set("addonAmount", data.addonAmount || 0);
          init.body.set("addonsAmount", data.addonAmount || 0);
          init.body.set("系統加價", data.rateAmount || 0);
          init.body.set("systemExtra", data.rateAmount || 0);
          init.body.set("預估小計", data.estimatedTotal || 0);
          init.body.set("estimatedTotal", data.estimatedTotal || 0);
          init.body.set("total", data.estimatedTotal || 0);
        }

        if(typeof init.body === "string" && init.headers && String(init.headers["Content-Type"] || init.headers["content-type"] || "").includes("application/json")){
          const obj = JSON.parse(init.body || "{}");
          Object.assign(obj, {
            "加購項目": data.addonsText || "無",
            "addons": data.addonsText || "無",
            "customerAddons": data.addonsText || "無",
            "加購金額": data.addonAmount || 0,
            "addonAmount": data.addonAmount || 0,
            "addonsAmount": data.addonAmount || 0,
            "系統加價": data.rateAmount || 0,
            "systemExtra": data.rateAmount || 0,
            "預估小計": data.estimatedTotal || 0,
            "estimatedTotal": data.estimatedTotal || 0,
            "total": data.estimatedTotal || 0
          });
          init.body = JSON.stringify(obj);
        }
      }
    }catch(err){
      console.warn("XX addon API merge skipped", err);
    }

    return oldFetch.apply(this, arguments);
  };
})();

