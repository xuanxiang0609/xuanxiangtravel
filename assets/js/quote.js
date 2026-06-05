/*
 * 玹翔旅遊 v9.0｜Google Maps API 即時報價
 * 功能：地址提示、距離計算、車型倍率、夜間加價、報價結果。
 */

(function () {
  "use strict";

  const CONFIG = window.XUANXIANG_CONFIG || {};

  const PRICE = {
    base: 500,
    perKm: {
      sedan: 35,
      van: 45,
      vip: 55,
      sprinter: 65
    },
    nightExtra: 300,
    luggageExtraThreshold: 6,
    luggageExtra: 300
  };

  const vehicleName = {
    sedan: "舒適五人座",
    van: "九人座商務車",
    vip: "尊榮專車｜Alphard / Lexus LM",
    sprinter: "明星保母車｜Sprinter"
  };

  let pickupAutocomplete = null;
  let dropoffAutocomplete = null;

  function getMapsKey() {
    return CONFIG.GOOGLE_MAPS_API_KEY ||
      CONFIG.googleMapsApiKey ||
      window.GOOGLE_MAPS_API_KEY ||
      "";
  }

  function loadGoogleMaps() {
    const key = getMapsKey();

    if (!key) {
      renderError("尚未設定 GOOGLE_MAPS_API_KEY，請先到 config.js 填入 Google Maps API Key。");
      return;
    }

    if (window.google && window.google.maps) {
      initMapsQuote();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=zh-TW&region=TW`;
    script.async = true;
    script.defer = true;
    script.onload = initMapsQuote;
    script.onerror = function () {
      renderError("Google Maps 載入失敗，請確認 API Key、網域限制與 Maps JavaScript API 是否啟用。");
    };

    document.head.appendChild(script);
  }

  function initMapsQuote() {
    const pickup = document.getElementById("quotePickup");
    const dropoff = document.getElementById("quoteDropoff");
    const btn = document.getElementById("quoteBtn");

    if (!pickup || !dropoff || !btn) return;

    pickupAutocomplete = new google.maps.places.Autocomplete(pickup, {
      componentRestrictions: { country: "tw" },
      fields: ["formatted_address", "geometry", "name"]
    });

    dropoffAutocomplete = new google.maps.places.Autocomplete(dropoff, {
      componentRestrictions: { country: "tw" },
      fields: ["formatted_address", "geometry", "name"]
    });

    btn.addEventListener("click", calculateQuote);
  }

  function calculateQuote() {
    const pickup = getValue("quotePickup");
    const dropoff = getValue("quoteDropoff");
    const time = getValue("quoteTime");
    const vehicle = getValue("quoteVehicle") || "sedan";
    const luggage = Number(getValue("quoteLuggage") || 0);

    if (!pickup || !dropoff) {
      renderError("請先輸入上車地點與下車地點。");
      return;
    }

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
        renderError("距離計算失敗，請確認地址是否完整。");
        return;
      }

      const element = response.rows?.[0]?.elements?.[0];

      if (!element || element.status !== "OK") {
        renderError("查不到路線，請改用更完整地址，例如加入縣市與區域。");
        return;
      }

      const distanceKm = element.distance.value / 1000;
      const durationText = element.duration.text;
      const distanceText = element.distance.text;

      const quote = buildQuote({
        distanceKm,
        durationText,
        distanceText,
        vehicle,
        time,
        luggage
      });

      renderResult(quote);
      trackQuote(quote);
    });
  }

  function buildQuote(data) {
    const perKm = PRICE.perKm[data.vehicle] || PRICE.perKm.sedan;
    const night = isNightTime(data.time) ? PRICE.nightExtra : 0;
    const luggageExtra = data.luggage >= PRICE.luggageExtraThreshold ? PRICE.luggageExtra : 0;

    const raw = PRICE.base + data.distanceKm * perKm + night + luggageExtra;
    const estimated = Math.ceil(raw / 100) * 100;

    return {
      ...data,
      vehicleName: vehicleName[data.vehicle] || vehicleName.sedan,
      base: PRICE.base,
      perKm,
      night,
      luggageExtra,
      estimated,
      minPrice: Math.max(estimated - 300, PRICE.base),
      maxPrice: estimated + 500
    };
  }

  function isNightTime(time) {
    if (!time) return false;
    const hour = Number(time.split(":")[0]);
    return hour >= 22 || hour < 7;
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function renderLoading() {
    const box = document.getElementById("quoteResult");
    if (!box) return;
    box.innerHTML = `
      <div class="card" style="padding:22px;border-radius:22px;">
        <b style="color:#f7df9b;">估價中...</b>
        <p style="color:#cfc3a8;">正在請 Google Maps 幫忙算路，請稍候。</p>
      </div>
    `;
  }

  function renderError(message) {
    const box = document.getElementById("quoteResult");
    if (!box) return;
    box.innerHTML = `
      <div class="card" style="padding:22px;border-radius:22px;border-color:rgba(255,80,80,.35);">
        <b style="color:#ffb4b4;">⚠️ ${escapeHtml(message)}</b>
      </div>
    `;
  }

  function renderResult(q) {
    const box = document.getElementById("quoteResult");
    if (!box) return;

    const lineText = encodeURIComponent(
      `您好，我想詢問即時報價：\n` +
      `上車：${getValue("quotePickup")}\n` +
      `下車：${getValue("quoteDropoff")}\n` +
      `車型：${q.vehicleName}\n` +
      `距離：${q.distanceText}\n` +
      `時間：約 ${q.durationText}\n` +
      `系統估價：NT$${q.minPrice.toLocaleString()}～${q.maxPrice.toLocaleString()}`
    );

    const lineBase = CONFIG.CONTACT?.lineUrl || "https://line.me/R/ti/p/@sco20240609";

    box.innerHTML = `
      <div class="card" style="padding:28px;border-radius:28px;">
        <span class="eyebrow">📍 即時估價結果</span>
        <h2 style="color:#fff3c2;margin:10px 0;">NT$ ${q.minPrice.toLocaleString()} ～ ${q.maxPrice.toLocaleString()}</h2>
        <p style="color:#cfc3a8;line-height:1.9;">
          車型：<b style="color:#f7df9b;">${escapeHtml(q.vehicleName)}</b><br>
          距離：約 <b style="color:#f7df9b;">${escapeHtml(q.distanceText)}</b><br>
          車程：約 <b style="color:#f7df9b;">${escapeHtml(q.durationText)}</b><br>
          夜間加價：NT$ ${q.night.toLocaleString()}<br>
          行李加價：NT$ ${q.luggageExtra.toLocaleString()}
        </p>

        <p style="color:#e8dcc2;line-height:1.9;">
          ※ 此為系統初估，正式價格仍依客服確認、車輛調度、上下車地址、等待時間與加購項目為準。
        </p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px;">
          <a class="btn primary" href="${lineBase}?text=${lineText}" target="_blank" rel="noopener">LINE 傳送報價給客服</a>
          <a class="btn" href="booking.html">前往預約商城</a>
        </div>
      </div>
    `;
  }

  function trackQuote(q) {
    if (window.XXAnalytics?.trackEvent) {
      window.XXAnalytics.trackEvent("quote_calculated", {
        vehicle: q.vehicle,
        vehicle_name: q.vehicleName,
        distance_km: Math.round(q.distanceKm * 10) / 10,
        estimated_price: q.estimated
      });
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGoogleMaps, { once: true });
  } else {
    loadGoogleMaps();
  }
})();