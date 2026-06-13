/*
 * 玹翔旅遊 Ultimate Final v12.2 Enterprise｜旅遊活動共用送單・Booking Mall 穩定送單防呆版
 * 功能：日期防呆、電話驗證、數量金額保護、API 逾時、重複送單防護、草稿暫存、GA4 事件、LINE fallback、iframe/no-cors 穩定送單、共用導覽版本追蹤。
 */
(function () {
  "use strict";

  if (window.__XX_TRIP_BOOKING_BOOTED__) return;
  window.__XX_TRIP_BOOKING_BOOTED__ = true;

  const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
  const contact = cfg.CONTACT || {};
  const API = String(cfg.APPS_SCRIPT_URL || window.XX_APPS_SCRIPT_URL || "").trim();
  const TRIP_BOOKING_VERSION = "Ultimate Final v12.2 Trip Booking";
  const BOOKING_MALL_VERSION = String(cfg.BOOKING_MALL_VERSION || cfg.BOOKING_VERSION || "v12");
  const LAYOUT_VERSION = cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core";
  const BOOKING_URL = cfg.BOOKING_URL || "booking.html";

  const SETTINGS = {
    version: TRIP_BOOKING_VERSION,
    bookingMallVersion: BOOKING_MALL_VERSION,
    layoutVersion: LAYOUT_VERSION,
    sourcePrefix: "trip-booking-v12-2",
    storageKey: "xuanxiang_last_order",
    draftKey: "xuanxiang_trip_booking_draft",
    lastOrderIdKey: "xx_last_order_id",
    duplicateWindowMs: 8000,
    apiTimeoutMs: 18000,
    minPassengers: 1,
    maxPassengers: 99,
    defaultService: "旅遊包車",
    defaultTime: "客服確認",
    defaultDropoff: "依行程安排",
    defaultVehicle: "客服依人數安排",
    fallbackLineUrl: "https://line.me/R/ti/p/@sco20240609",
    stableSubmit: cfg.BOOKING_STABLE_SUBMIT !== false,
    iframeFallback: cfg.BOOKING_IFRAME_FALLBACK !== false,
    noCorsFallback: true,
    readyEventName: "xx:trip-booking-ready"
  };

  let submitting = false;
  let lastSubmitAt = 0;
  let lastPayloadHash = "";

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function cleanMultiline(value) {
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatMoney(value) {
    const number = safeNumber(value, 0);
    return number > 0 ? number.toLocaleString("zh-TW") : "0";
  }

  function todayInTaipei() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function isDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(clean(value));
  }

  function normalizeDate(value) {
    const today = todayInTaipei();
    const date = clean(value);
    if (!isDate(date) || date < today) return today;
    return date;
  }

  function normalizePhone(value) {
    return clean(value).replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248));
  }

  function isPhone(value) {
    const phone = normalizePhone(value);
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 && /^[0-9+\-\s()#]{8,24}$/.test(phone);
  }

  function normalizeQty(value) {
    return clamp(Math.round(safeNumber(value, 1)), SETTINGS.minPassengers, SETTINGS.maxPassengers);
  }

  function sourceName(source) {
    const raw = clean(source || location.pathname || SETTINGS.sourcePrefix);
    return raw || SETTINGS.sourcePrefix;
  }

  function payloadHash(payload) {
    return JSON.stringify({
      serviceDetail: payload.serviceDetail,
      name: payload.name,
      phone: payload.phone,
      date: payload.date,
      pickup: payload.pickup,
      passengers: payload.passengers,
      vehicle: payload.vehicle
    });
  }

  function lineUrl() {
    return clean(contact.lineUrl) || SETTINGS.fallbackLineUrl;
  }

  function track(eventName, params = {}) {
    if (window.XXAnalytics && typeof window.XXAnalytics.trackEvent === "function") {
      window.XXAnalytics.trackEvent(eventName, {
        trip_booking_version: TRIP_BOOKING_VERSION,
        booking_mall_version: BOOKING_MALL_VERSION,
        layout_version: LAYOUT_VERSION,
        page_path: location.pathname,
        ...params
      });
      return;
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, {
        trip_booking_version: TRIP_BOOKING_VERSION,
        booking_mall_version: BOOKING_MALL_VERSION,
        layout_version: LAYOUT_VERSION,
        page_path: location.pathname,
        ...params
      });
    }
  }

  function initDateInput(input) {
    const today = todayInTaipei();
    if (!input) return today;
    input.min = today;
    input.removeAttribute("max");
    if (!input.value || input.value < today || !isDate(input.value)) input.value = today;
    input.setAttribute("autocomplete", "off");
    input.setAttribute("inputmode", "numeric");
    return input.value;
  }

  function readForm(form) {
    if (!form || !form.querySelectorAll) return {};
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key]) data[key] = `${data[key]}, ${value}`;
      else data[key] = value;
    });
    return data;
  }

  function normalize(source, input = {}) {
    const merged = { ...input };
    const product = clean(merged.product || merged.serviceDetail || merged.title || merged.tripName || "旅遊活動");
    const qty = normalizeQty(merged.qty || merged.quantity || merged.passengers || 1);
    const unit = clean(merged.unit || "人");
    const total = safeNumber(merged.total || merged.value || merged.priceTotal, 0);
    const plan = clean(merged.plan || merged.vehicle || merged.packageName || SETTINGS.defaultVehicle);
    const date = normalizeDate(merged.date || merged.travelDate);
    const pickup = clean(merged.pickup || merged.from || merged.pickupAddress);
    const dropoff = clean(merged.dropoff || merged.to || merged.dropoffAddress) || product || SETTINGS.defaultDropoff;
    const phone = normalizePhone(merged.phone || merged.tel || merged.mobile);
    const name = clean(merged.name || merged.customerName);
    const lineid = clean(merged.lineid || merged.lineId || merged.contactApp || merged.contact);

    const noteParts = [
      cleanMultiline(merged.note || merged.memo),
      plan ? `方案：${plan}` : "",
      qty ? `數量：${qty}${unit}` : "",
      total ? `頁面試算總價：NT$ ${formatMoney(total)}` : "",
      merged.pickupNote ? `上車備註：${cleanMultiline(merged.pickupNote)}` : "",
      merged.addons ? `加購項目：${cleanMultiline(Array.isArray(merged.addons) ? merged.addons.join("、") : merged.addons)}` : ""
    ].filter(Boolean);

    return {
      action: "booking",
      source: sourceName(source),
      tripBookingVersion: TRIP_BOOKING_VERSION,
      bookingMallVersion: BOOKING_MALL_VERSION,
      layoutVersion: LAYOUT_VERSION,
      bookingUrl: BOOKING_URL,
      service: clean(merged.service) || SETTINGS.defaultService,
      serviceDetail: product,
      name,
      phone,
      contactApp: lineid,
      lineId: lineid,
      date,
      time: clean(merged.time) || SETTINGS.defaultTime,
      pickup,
      dropoff,
      passengers: `${qty}${unit}`,
      passengerCount: qty,
      vehicle: plan,
      priceEstimate: total,
      total,
      currency: "TWD",
      note: noteParts.join("\n"),
      pageUrl: location.href,
      createdAtClient: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
  }

  function validate(payload) {
    const errors = [];
    if (!payload.name) errors.push("請填寫姓名。");
    if (!payload.phone) errors.push("請填寫電話。");
    else if (!isPhone(payload.phone)) errors.push("電話格式不正確，請重新檢查。");
    if (!payload.pickup) errors.push("請填寫上車地址。");
    if (!payload.date || !isDate(payload.date)) errors.push("請選擇正確日期。");
    if (!payload.serviceDetail) errors.push("行程名稱遺失，請重新整理頁面後再試。");
    if (!payload.passengerCount || payload.passengerCount < SETTINGS.minPassengers) errors.push("請確認預約人數。");
    return errors;
  }

  function setButtonBusy(button, busy) {
    if (!button) return;
    if (busy) {
      button.dataset.xxOldText = button.textContent || "";
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "送出中，請勿重複點擊";
    } else {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = button.dataset.xxOldText || "送出預約";
    }
  }

  function alertMessage(message, type = "info") {
    const box = document.querySelector("#tripBookingMessage,#bookingMessage,#orderMessage,.trip-booking-message");
    if (box) {
      box.textContent = message;
      box.className = `trip-booking-message ${type}`;
      box.setAttribute("role", type === "error" ? "alert" : "status");
      box.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
      box.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    alert(message);
  }

  function saveDraft(payload) {
    try {
      localStorage.setItem(SETTINGS.storageKey, JSON.stringify(payload));
      sessionStorage.setItem(SETTINGS.draftKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("[玹翔旅遊] 預約草稿暫存失敗", error);
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(SETTINGS.draftKey);
    } catch (_) {}
  }

  function getDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(SETTINGS.draftKey) || localStorage.getItem(SETTINGS.storageKey) || "null");
    } catch (_) {
      return null;
    }
  }

  async function postJson(url, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SETTINGS.apiTimeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const text = await response.text();
      let result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch (_) {
        throw new Error("後端回傳格式異常，請改用 LINE 官方客服聯繫。");
      }
      if (!response.ok || result.ok === false) throw new Error(result.message || `API 連線失敗 (${response.status})`);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  function submitByIframe(url, payload) {
    return new Promise((resolve) => {
      const iframeName = `xxTripBookingFrame_${Date.now()}`;
      const iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");

      const form = document.createElement("form");
      form.method = "POST";
      form.action = url;
      form.target = iframeName;
      form.style.display = "none";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(payload);
      form.appendChild(input);

      const action = document.createElement("input");
      action.type = "hidden";
      action.name = "action";
      action.value = payload.action || "booking";
      form.appendChild(action);

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        form.remove();
        iframe.remove();
        resolve({ ok: true, queued: true, mode: "iframe", orderId: "客服確認中" });
      }, 1500);
    });
  }

  function fallbackToLine(payload) {
    const message = [
      "您好，我想預約玹翔旅遊行程：",
      `行程：${payload.serviceDetail}`,
      `版本：${payload.tripBookingVersion || TRIP_BOOKING_VERSION}`,
      `預約頁：${payload.bookingUrl || BOOKING_URL}`,
      `日期：${payload.date}`,
      `姓名：${payload.name}`,
      `電話：${payload.phone}`,
      `人數：${payload.passengers}`,
      `上車：${payload.pickup}`,
      payload.dropoff ? `下車：${payload.dropoff}` : "",
      payload.vehicle ? `方案/車型：${payload.vehicle}` : "",
      payload.note ? `備註：${payload.note}` : ""
    ].filter(Boolean).join("\n");

    const base = lineUrl();
    if (base.includes("line.me") || base.includes("lin.ee")) {
      window.open(base, "_blank", "noopener,noreferrer");
    }
    try {
      navigator.clipboard?.writeText(message);
    } catch (_) {}
  }

  async function submit(options = {}) {
    const source = options.source || location.pathname;
    const formPayload = options.form ? readForm(options.form) : {};
    const payload = normalize(source, { ...formPayload, ...(options.payload || {}) });
    const errors = validate(payload);

    if (errors.length) {
      alertMessage(errors.join("\n"), "error");
      track("trip_booking_validation_error", { error_count: errors.length, service_detail: payload.serviceDetail });
      return { ok: false, errors, payload };
    }

    const now = Date.now();
    const hash = payloadHash(payload);
    if (submitting || (lastPayloadHash === hash && now - lastSubmitAt < SETTINGS.duplicateWindowMs)) {
      alertMessage("預約正在送出中，請勿重複點擊。", "info");
      return { ok: false, duplicate: true, payload };
    }

    if (!API) {
      saveDraft(payload);
      alertMessage("預約 API 尚未設定，資料已暫存；請改用 LINE 官方客服聯繫。", "error");
      fallbackToLine(payload);
      return { ok: false, missingApi: true, payload };
    }

    const button = options.button || document.querySelector(".drawerPanel .btn.orange,[data-trip-submit],[data-booking-submit]");
    submitting = true;
    lastSubmitAt = now;
    lastPayloadHash = hash;
    setButtonBusy(button, true);
    saveDraft(payload);
    track("trip_booking_submit", { service_detail: payload.serviceDetail, value: payload.total || 0, currency: "TWD" });

    try {
      let result;
      try {
        result = await postJson(API, payload);
      } catch (postError) {
        if (!SETTINGS.iframeFallback) throw postError;
        result = await submitByIframe(API, payload);
      }
      const orderId = clean(result.orderId || result.id || "客服確認中");
      sessionStorage.setItem(SETTINGS.lastOrderIdKey, orderId);
      clearDraft();
      track("trip_booking_success", { order_id: orderId, service_detail: payload.serviceDetail, value: payload.total || 0, currency: "TWD" });
      alertMessage(result.queued ? "預約資料已使用穩定送單模式送出！客服會再確認車款、報價與成行狀況。" : `預約資料已送出！訂單編號：${orderId}。客服會再確認車款、報價與成行狀況。`, "success");
      return { ok: true, orderId, result, payload };
    } catch (error) {
      const message = error.name === "AbortError" ? "API 連線逾時" : (error.message || "未知錯誤");
      console.error(error);
      track("trip_booking_failed", { service_detail: payload.serviceDetail, error_message: message });
      alertMessage(`送出失敗：${message}。資料已暫存在此瀏覽器，請改用 LINE 官方客服聯繫。`, "error");
      fallbackToLine(payload);
      return { ok: false, error, payload };
    } finally {
      submitting = false;
      setButtonBusy(button, false);
    }
  }

  function bindForms(root = document) {
    root.querySelectorAll("form[data-trip-booking]").forEach((form) => {
      if (form.dataset.xxTripBound === "1") return;
      form.dataset.xxTripBound = "1";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submit({ form, source: form.dataset.source || location.pathname, button: form.querySelector('[type="submit"]') });
      });
    });

    root.querySelectorAll("input[type='date'][data-trip-date]").forEach(initDateInput);

    root.querySelectorAll("form[data-trip-booking]").forEach((form) => {
      form.dataset.xxTripBookingVersion = TRIP_BOOKING_VERSION;
      form.dataset.xxBookingMallVersion = BOOKING_MALL_VERSION;
      form.dataset.xxSharedLayoutVersion = LAYOUT_VERSION;
      form.setAttribute("novalidate", "novalidate");
    });
  }

  function init() {
    bindForms(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.XUANXIANG_TRIP_BOOKING = {
    version: TRIP_BOOKING_VERSION,
    bookingMallVersion: BOOKING_MALL_VERSION,
    layoutVersion: LAYOUT_VERSION,
    bookingUrl: BOOKING_URL,
    initDateInput,
    normalize,
    validate,
    submit,
    bindForms,
    getDraft,
    clearDraft,
    submitByIframe
  };
  window.XXTripBooking = window.XUANXIANG_TRIP_BOOKING;

  document.dispatchEvent(new CustomEvent(SETTINGS.readyEventName, {
    detail: {
      version: TRIP_BOOKING_VERSION,
      bookingMallVersion: BOOKING_MALL_VERSION,
      layoutVersion: LAYOUT_VERSION,
      apiReady: Boolean(API),
      stableSubmit: Boolean(SETTINGS.stableSubmit),
      iframeFallback: Boolean(SETTINGS.iframeFallback)
    }
  }));
})();
