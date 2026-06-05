/*
 * 玹翔旅遊 Ultimate Final v9.3｜Google Maps API 即時報價引擎
 * 功能：輸入框防遮罩、地址提示、距離計算、車型倍率、夜間加價、行李提醒、LINE 一鍵送出、GA4 事件。
 */
(function () {
  "use strict";

  const CONFIG = window.XUANXIANG_CONFIG || {};
  const CONTACT = CONFIG.CONTACT || {};

  const PRICE = {
    base: 500,
    min: {
      sedan: 1200,
      van: 1800,
      vip: 2600,
      sprinter: 3600
    },
    perKm: {
      sedan: 35,
      van: 45,
      vip: 58,
      sprinter: 72
    },
    nightExtra: 300,
    luggageExtraThreshold: 6,
    luggageExtra: 300,
    roundUnit: 100
  };

  const VEHICLE_NAME = {
    sedan: "舒適五人座",
    van: "九人座商務車",
    vip: "尊榮專車｜Alphard / Lexus LM",
    sprinter: "明星保母車｜Sprinter"
  };

  const state = {
    pickupAutocomplete: null,
    dropoffAutocomplete: null,
    mapsLoaded: false,
    eventsBound: false,
    styleReady: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function getValue(id) {
    return String(byId(id)?.value || "").trim();
  }

  function setValue(id, value) {
    const el = byId(id);
    if (el) el.value = value;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function money(num) {
    return `NT$ ${Number(num || 0).toLocaleString("zh-TW")}`;
  }

  function getMapsKey() {
    return String(
      CONFIG.GOOGLE_MAPS_API_KEY ||
      CONFIG.googleMapsApiKey ||
      window.GOOGLE_MAPS_API_KEY ||
      ""
    ).trim();
  }

  function isRealMapsKey(key) {
    return /^AIza[0-9A-Za-z_-]{20,}$/.test(key);
  }

  function todayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function timeString() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  function track(eventKey, params = {}) {
    const eventName = CONFIG.CONVERSION?.[eventKey] || eventKey;

    if (window.XXAnalytics?.trackEvent) {
      window.XXAnalytics.trackEvent(eventName, params);
      return;
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
  }

  function injectQuoteSafetyStyle() {
    if (state.styleReady || document.getElementById("xx-quote-safety-style")) return;
    state.styleReady = true;

    const style = document.createElement("style");
    style.id = "xx-quote-safety-style";
    style.textContent = `
      .quote-page,
      .quote-panel,
      #quoteForm,
      #quoteForm label{
        position:relative !important;
      }
      #quoteForm{
        z-index:3 !important;
      }
      #quoteForm label{
        z-index:6 !important;
      }
      #quotePickup,
      #quoteDropoff,
      #quoteDate,
      #quoteTime,
      #quoteVehicle,
      #quoteLuggage{
        position:relative !important;
        z-index:20 !important;
        pointer-events:auto !important;
        user-select:text !important;
        -webkit-user-select:text !important;
        touch-action:manipulation !important;
        background:rgba(0,0,0,.78) !important;
      }
      #quoteVehicle{
        user-select:auto !important;
        -webkit-user-select:auto !important;
      }
      .quote-panel::before,
      .quote-panel::after,
      .card::before,
      .card::after,
      .hero::before,
      .hero::after{
        pointer-events:none !important;
      }
      .pac-container{
        z-index:999999 !important;
        border-radius:16px !important;
        overflow:hidden !important;
        border:1px solid rgba(216,181,109,.32) !important;
        box-shadow:0 18px 52px rgba(0,0,0,.46) !important;
        font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureInputsInteractive() {
    ["quotePickup", "quoteDropoff", "quoteDate", "quoteTime", "quoteVehicle", "quoteLuggage"].forEach(function (id) {
      const el = byId(id);
      if (!el) return;
      el.disabled = false;
      el.readOnly = false;
      el.removeAttribute("disabled");
      el.removeAttribute("readonly");
      el.style.pointerEvents = "auto";
      el.style.userSelect = id === "quoteVehicle" ? "auto" : "text";
      el.style.webkitUserSelect = id === "quoteVehicle" ? "auto" : "text";
      el.style.position = "relative";
      el.style.zIndex = "20";
    });
  }

  function renderLoading() {
    const box = byId("quoteResult");
    if (!box) return;
    box.innerHTML = `
      <div class="card" style="padding:22px;border-radius:22px;">
        <b style="color:#f7df9b;">估價中...</b>
        <p style="color:#cfc3a8;line-height:1.9;margin:10px 0 0;">正在請 Google Maps 幫忙算路，這位地圖先生目前正在努力加班。</p>
      </div>
    `;
  }

  function renderError(message, hint = "") {
    const box = byId("quoteResult");
    if (!box) return;
    box.innerHTML = `
      <div class="card" style="padding:22px;border-radius:22px;border-color:rgba(255,80,80,.35);">
        <b style="color:#ffb4b4;">⚠️ ${escapeHtml(message)}</b>
        ${hint ? `<p style="color:#ffe4b8;line-height:1.8;margin:10px 0 0;">${escapeHtml(hint)}</p>` : ""}
      </div>
    `;
  }

  function roundPrice(num) {
    return Math.ceil(Number(num || 0) / PRICE.roundUnit) * PRICE.roundUnit;
  }

  function isNightTime(time) {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return false;
    const hour = Number(time.split(":")[0]);
    return hour >= 22 || hour < 7;
  }

  function buildQuote(data) {
    const vehicle = VEHICLE_NAME[data.vehicle] ? data.vehicle : "sedan";
    const perKm = PRICE.perKm[vehicle] || PRICE.perKm.sedan;
    const luggage = Number(data.luggage || 0);
    const night = isNightTime(data.time) ? PRICE.nightExtra : 0;
    const luggageExtra = luggage >= PRICE.luggageExtraThreshold ? PRICE.luggageExtra : 0;
    const raw = PRICE.base + data.distanceKm * perKm + night + luggageExtra;
    const estimated = Math.max(roundPrice(raw), PRICE.min[vehicle] || PRICE.min.sedan);

    return {
      ...data,
      vehicle,
      vehicleName: VEHICLE_NAME[vehicle],
      base: PRICE.base,
      perKm,
      night,
      luggage,
      luggageExtra,
      estimated,
      minPrice: Math.max(PRICE.min[vehicle] || PRICE.min.sedan, estimated - 300),
      maxPrice: estimated + 500
    };
  }

  function getLineUrl(q) {
    const lineBase = CONTACT.lineUrl || "https://line.me/R/ti/p/@sco20240609";
    const text = [
      "您好，我想詢問玹翔旅遊即時報價：",
      `上車地點：${getValue("quotePickup")}`,
      `下車地點：${getValue("quoteDropoff")}`,
      `用車日期：${getValue("quoteDate")}`,
      `用車時間：${getValue("quoteTime")}`,
      `車型：${q.vehicleName}`,
      `行李數：${q.luggage}`,
      `距離：約 ${q.distanceText}`,
      `車程：約 ${q.durationText}`,
      `系統估價：${money(q.minPrice)} ～ ${money(q.maxPrice)}`,
      "請客服協助確認正式報價，謝謝。"
    ].join("\n");

    return `${lineBase}?text=${encodeURIComponent(text)}`;
  }

  function renderResult(q) {
    const box = byId("quoteResult");
    if (!box) return;

    const lineUrl = getLineUrl(q);

    box.innerHTML = `
      <div class="card" style="padding:28px;border-radius:28px;">
        <span class="eyebrow">📍 即時估價結果</span>
        <h2 style="color:#fff3c2;margin:10px 0;font-size:clamp(32px,5vw,48px);line-height:1.15;">${money(q.minPrice)} ～ ${money(q.maxPrice)}</h2>
        <p style="color:#cfc3a8;line-height:1.9;">
          車型：<b style="color:#f7df9b;">${escapeHtml(q.vehicleName)}</b><br>
          距離：約 <b style="color:#f7df9b;">${escapeHtml(q.distanceText)}</b><br>
          車程：約 <b style="color:#f7df9b;">${escapeHtml(q.durationText)}</b><br>
          夜間加價：${money(q.night)}<br>
          行李加價：${money(q.luggageExtra)}<br>
          計價基準：基本費 ${money(q.base)} ＋ 約 ${q.distanceKm.toFixed(1)} 公里 × ${money(q.perKm)}／公里
        </p>
        <p style="color:#e8dcc2;line-height:1.9;">
          ※ 此為系統初估，正式價格仍依客服確認、車輛調度、上下車地址、等待時間與加購項目為準。
        </p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
          <a class="btn primary" href="${escapeHtml(lineUrl)}" data-quote-send-line target="_blank" rel="noopener">LINE 傳送報價給客服</a>
          <a class="btn" href="booking.html">前往預約商城</a>
        </div>
      </div>
    `;

    box.querySelector("[data-quote-send-line]")?.addEventListener("click", function () {
      track("quoteSendLine", {
        vehicle: q.vehicle,
        estimated_price: q.estimated,
        distance_km: Number(q.distanceKm.toFixed(1))
      });
    }, { once: true });
  }

  function calculateQuote() {
    ensureInputsInteractive();

    const pickup = getValue("quotePickup");
    const dropoff = getValue("quoteDropoff");
    const time = getValue("quoteTime");
    const vehicle = getValue("quoteVehicle") || "sedan";
    const luggage = Number(getValue("quoteLuggage") || 0);

    if (!pickup || !dropoff) {
      renderError("請先輸入上車地點與下車地點。", "建議輸入完整地標，例如：台中火車站、桃園國際機場第二航廈。");
      return;
    }

    if (!window.google?.maps?.DistanceMatrixService) {
      renderError("Google Maps 尚未載入完成。", "請重新整理頁面；若仍失敗，請檢查 API Key、網域限制、Billing 與 API 啟用狀態。地圖先生不出車，報價引擎也只能在旁邊泡茶。");
      return;
    }

    track("quoteStart", {
      vehicle,
      pickup,
      dropoff
    });

    renderLoading();

    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix({
      origins: [pickup],
      destinations: [dropoff],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    }, function (response, status) {
      if (status !== "OK") {
        renderError("距離計算失敗。", `Google 回傳狀態：${status}`);
        return;
      }

      const element = response?.rows?.[0]?.elements?.[0];

      if (!element || element.status !== "OK") {
        renderError("查不到可行車路線。", `路線狀態：${element?.status || "UNKNOWN"}。請改用更完整地址。`);
        return;
      }

      const quote = buildQuote({
        distanceKm: element.distance.value / 1000,
        durationText: element.duration.text,
        distanceText: element.distance.text,
        vehicle,
        time,
        luggage
      });

      renderResult(quote);

      track("quoteCalculated", {
        vehicle: quote.vehicle,
        vehicle_name: quote.vehicleName,
        distance_km: Number(quote.distanceKm.toFixed(1)),
        estimated_price: quote.estimated,
        night_extra: quote.night,
        luggage_extra: quote.luggageExtra
      });
    });
  }

  function bindPlaceToInput(autocomplete, input) {
    if (!autocomplete || !input) return;

    autocomplete.addListener("place_changed", function () {
      const place = autocomplete.getPlace();
      const text = place?.formatted_address || place?.name || input.value;
      if (text) input.value = text;
    });
  }

  function initAutocomplete() {
    const pickup = byId("quotePickup");
    const dropoff = byId("quoteDropoff");

    ensureInputsInteractive();

    if (!pickup || !dropoff || !window.google?.maps?.places?.Autocomplete) return;

    const options = {
      componentRestrictions: { country: "tw" },
      fields: ["formatted_address", "geometry", "name"]
    };

    state.pickupAutocomplete = new google.maps.places.Autocomplete(pickup, options);
    state.dropoffAutocomplete = new google.maps.places.Autocomplete(dropoff, options);

    bindPlaceToInput(state.pickupAutocomplete, pickup);
    bindPlaceToInput(state.dropoffAutocomplete, dropoff);
  }

  function loadGoogleMaps() {
    const key = getMapsKey();

    if (!isRealMapsKey(key)) {
      renderError("Google Maps API Key 尚未設定完成。", "請到 assets/js/config.js 將 GOOGLE_MAPS_API_KEY 換成正式金鑰。現在是穿西裝沒帶鑰匙，門打不開。");
      return;
    }

    if (window.google?.maps) {
      state.mapsLoaded = true;
      initAutocomplete();
      return;
    }

    window.__XX_QUOTE_MAPS_READY__ = function () {
      state.mapsLoaded = true;
      initAutocomplete();
    };

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=zh-TW&region=TW&callback=__XX_QUOTE_MAPS_READY__`;
    script.onerror = function () {
      renderError("Google Maps 載入失敗。", "請確認 API Key、HTTP referrer 限制、Billing 與 API 服務是否啟用。Google 不給過，司機再帥也不能出車。");
    };
    document.head.appendChild(script);
  }

  function initDefaults() {
    if (byId("quoteDate") && !getValue("quoteDate")) setValue("quoteDate", todayString());
    if (byId("quoteTime") && !getValue("quoteTime")) setValue("quoteTime", timeString());
  }

  function initEvents() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    byId("quoteBtn")?.addEventListener("click", calculateQuote);

    byId("quoteResetBtn")?.addEventListener("click", function () {
      setValue("quotePickup", "");
      setValue("quoteDropoff", "");
      setValue("quoteLuggage", "2");
      const box = byId("quoteResult");
      if (box) box.innerHTML = "";
      ensureInputsInteractive();
    });

    ["quotePickup", "quoteDropoff"].forEach(function (id) {
      byId(id)?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          calculateQuote();
        }
      });
    });
  }

  function init() {
    injectQuoteSafetyStyle();
    ensureInputsInteractive();
    initDefaults();
    initEvents();
    loadGoogleMaps();
    window.setTimeout(ensureInputsInteractive, 500);
    window.setTimeout(ensureInputsInteractive, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.XXQuote = {
    calculateQuote,
    loadGoogleMaps,
    buildQuote,
    ensureInputsInteractive
  };
})();