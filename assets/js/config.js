/*
 * 玹翔旅遊 Ultimate Final v12 Booking Mall
 * 全站唯一設定檔｜黑金商務高端版｜分步式預約商城正式營運版
 */
(function () {
  "use strict";

  const config = {
    VERSION: "Ultimate Final v12 Booking Mall",
    SITE_VERSION: "Ultimate Final v12 Booking Mall",
    BOOKING_VERSION: "v12",
    BOOKING_MALL_VERSION: "v12",
    BOOKING_UI_MODE: "stepper",
    BOOKING_STABLE_SUBMIT: true,
    BOOKING_IFRAME_FALLBACK: true,
    BOOKING_ENABLE_FLIGHT_CARD: true,
    BOOKING_ENABLE_LIVE_SUMMARY: true,
    BOOKING_ENABLE_VEHICLE_RULES: true,
    BOOKING_ENABLE_ADDON_ESTIMATE: true,
    GOOGLE_MAPS_API_KEY: "AIzaSyDMoC4SEpieCF7xYtdi9PUnGP_pvRP_K8s",
    SITE_URL: "https://xuanxiangtravel.com",
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxPhHQ4U7HUxj7zZ_TNCfaKVQcE1UD1aTN7gSN8RwgX8FF2U-dFKQ0weQEHB3eCJNiJ/exec",

    LINE_CHANNEL_ID: "2010261169",
    LINE_AUTH_API: "https://access.line.me/oauth2/v2.1/authorize",
    LINE_REDIRECT_URI: "https://xuanxiangtravel.com/register.html",
    LINE_REDIRECT_PATH: "register.html",

    MEMBER_REQUIRED_FOR_BOOKING: false,

    ANALYTICS: {
      ga4MeasurementId: "G-HEPD04QGPK",
      currency: "TWD",
      debugMode: false,
      eventPrefix: "xx_",
      enablePageView: true,
      enableBookingFunnel: true,
      enableEcommerceEvents: true,
      enableLineConversion: true
    },

    CONVERSION: {
      pageView: "page_view",
      bookingStart: "booking_start",
      bookingStep: "booking_step",
      bookingSubmit: "booking_submit",
      bookingSuccess: "booking_success",
      lineClick: "line_click",
      phoneClick: "phone_click",
      whatsappClick: "whatsapp_click",
      priceSearch: "price_search",
      addToCart: "add_to_cart",
      beginCheckout: "begin_checkout",
      purchase: "purchase",
      copyLink: "copy_link",
      apiHealth: "api_health_check",
      quoteStart: "quote_start",
      quoteCalculated: "quote_calculated",
      quoteSendLine: "quote_send_line",
    },

    CONTACT: {
      brand: "玹翔旅遊",
      phoneDisplay: "0972-268295",
      phoneTel: "0972268295",
      email: "xuanxiang0609@gmail.com",
      lineId: "@sco20240609",
      lineUrl: "https://line.me/R/ti/p/@sco20240609",
      whatsappDisplay: "(+886)972268295",
      whatsappUrl: "https://wa.me/886972268295",
      wechat: "sco20240609",
      instagram: "https://www.instagram.com/xuanxiang0609",
      threads: "https://www.threads.net/@xuanxiang0609",
      facebook: "https://www.facebook.com/search/top?q=%E7%8E%B9%E7%BF%94%E6%97%85%E9%81%8A",
      youtube: "https://www.youtube.com/results?search_query=%E7%8E%B9%E7%BF%94%E6%97%85%E9%81%8A",
      x: "https://x.com/xuanxiangtravel",
      tiktok: "https://www.tiktok.com/@xuanxiang0609"
    },

    FIREBASE: {
      apiKey: "AIzaSyAKxCqPm1iZOQnU054iC1iw5naThMge48k",
      authDomain: "xuanxiang-travel.firebaseapp.com",
      projectId: "xuanxiang-travel",
      storageBucket: "xuanxiang-travel.firebasestorage.app",
      messagingSenderId: "359961148631",
      appId: "1:359961148631:web:7348ad9406596f8f370492",
      measurementId: "G-HEPD04QGPK"
    },

    PRICE_GROUPS: {
      airport: ["桃園機場", "松山機場", "清泉岡機場", "小港機場"],
      port: ["平安港", "台北郵輪港", "台中港", "高雄香蕉碼頭", "基隆港", "東港碼頭", "布袋港碼頭", "富岡漁港", "後壁湖碼頭"],
      mountain: ["百岳報價"],
      long: ["長途接送-五人座", "長途接送-九人座"],
      tour: ["旅遊包車"]
    },

    SERVICES: [
      ["機場接送", "airport.html"],
      ["港口接送", "port.html"],
      ["旅遊包車", "charter.html"],
      ["登山包車", "mountain.html"],
      ["長途接送", "long-distance.html"],
      ["商務包車", "business-transfer.html"],
      ["演唱會專車", "concert-transfer.html"],
      ["寵物接送", "pet-transfer.html"],
      ["結婚禮車", "wedding-car.html"],
      ["租車服務", "car-rental.html"]
    ],

    PRICE_LINKS: [
      ["機場價目表", "airport-pricing.html"],
      ["港口價目表", "port-pricing.html"],
      ["旅遊包車價目表", "tour-pricing.html"],
      ["登山包車價目表", "mountain-pricing.html"],
      ["長途接送價目表", "long-distance-pricing.html"]
    ],

    TRAVEL_ACTIVITIES: [
      ["一日遊", "travel-one-day.html"],
      ["兩天一夜", "travel-two-days.html"],
      ["三天兩夜", "travel-three-days.html"],
      ["司馬庫斯", "smangus-day.html"],
      ["合歡山", "hehuanshan-day.html"],
      ["清境・日月潭", "qingjing-sunmoonlake-day.html"],
      ["全台旅遊搜尋", "travel-region.html"]
    ],

    SCHOOL_LINKS: [
      ["機場小學堂", "school-airport.html"],
      ["旅遊包車小學堂", "school-tour.html"],
      ["登山包車小學堂", "school-mountain.html"],
      ["旅遊秘境", "school-secret.html"],
      ["百岳縱走", "school-hiking.html"]
    ],

    MEMBER_LINKS: [
      ["會員申請", "register.html"],
      ["LINE 快速綁定", "register.html#third-party-bind"],
      ["Google 快速註冊", "register.html#third-party-bind"],
      ["會員登入", "login.html"],
      ["忘記密碼", "forgot-password.html"],
      ["會員中心", "member-center.html"]
    ],

    POLICY_LINKS: [
      ["常見問題", "faq.html"],
      ["包車條款", "charter-policy.html"],
      ["機場條款", "transfer-policy.html"],
      ["隱私權政策", "privacy.html"],
      ["網路訂車協議", "ocba.html"]
    ],

    SEO: {
      defaultTitle: "玹翔旅遊｜高端機場接送・旅遊包車・商務專車",
      defaultDescription: "玹翔旅遊提供機場接送、港口接送、旅遊包車、登山包車、商務專車與高端包車服務。",
      image: "https://xuanxiangtravel.com/images/logo.jpg"
    },

    GUARD: {
      enabled: true,
      consoleWarnings: true,
      safeFallbackImage: "images/logo.jpg",
      missingValueText: "請洽客服確認",
      requestTimeoutMs: 12000,
      priceCacheMinutes: 5,
      retryTimes: 1
    }
  };

  const memoryCache = new Map();

  function warnGuard(message, detail) {
    if (config.GUARD.consoleWarnings && typeof console !== "undefined") {
      console.warn(`[玹翔旅遊防呆] ${message}`, detail || "");
    }
  }

  function safeText(value, fallback = "") {
    const text = String(value || "").trim();
    return text || fallback || config.GUARD.missingValueText;
  }

  function safeUrl(value, fallback = "#") {
    const url = String(value || "").trim();
    if (!url) {
      warnGuard("空連結已套用 fallback", fallback);
      return fallback;
    }
    return url;
  }

  function safeNumber(value, fallback = 0) {
    const num = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(num) ? num : fallback;
  }

  function safeImage(value) {
    return safeUrl(value, config.GUARD.safeFallbackImage);
  }

  function getAnalyticsId() {
    return safeText(config.ANALYTICS.ga4MeasurementId, config.FIREBASE.measurementId);
  }

  function loadGA4() {
    const id = getAnalyticsId();
    if (!id || window.__XX_GA4_LOADED__) return;

    window.__XX_GA4_LOADED__ = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: Boolean(config.ANALYTICS.enablePageView),
      currency: config.ANALYTICS.currency || "TWD"
    });
  }

  function trackEvent(eventName, params = {}) {
    const analytics = config.ANALYTICS || {};
    const finalName = `${analytics.eventPrefix || ""}${safeText(eventName, "custom_event")}`;

    const payload = {
      site_version: config.VERSION,
      booking_version: config.BOOKING_VERSION,
      booking_mall_version: config.BOOKING_MALL_VERSION,
      booking_ui_mode: config.BOOKING_UI_MODE,
      page_path: location.pathname,
      currency: analytics.currency || "TWD",
      ...params
    };

    if (analytics.debugMode) console.info("[玹翔旅遊 GA4]", finalName, payload);

    if (typeof window.gtag === "function") {
      window.gtag("event", finalName, payload);
    }
  }

  function trackLineClick(params = {}) {
    trackEvent(config.CONVERSION.lineClick, {
      method: "LINE_OA",
      link_url: config.CONTACT.lineUrl,
      ...params
    });
  }

  function trackPhoneClick(params = {}) {
    trackEvent(config.CONVERSION.phoneClick, {
      method: "PHONE",
      phone_number: config.CONTACT.phoneDisplay,
      ...params
    });
  }

  function trackWhatsappClick(params = {}) {
    trackEvent(config.CONVERSION.whatsappClick, {
      method: "WHATSAPP",
      link_url: config.CONTACT.whatsappUrl,
      ...params
    });
  }

  function trackBookingStep(stepName, params = {}) {
    trackEvent(config.CONVERSION.bookingStep, {
      booking_step_name: safeText(stepName, "未命名步驟"),
      ...params
    });
  }

  function trackEcommerce(eventName, item = {}, params = {}) {
    const value = safeNumber(item.value || params.value || item.price, 0);

    trackEvent(eventName, {
      currency: config.ANALYTICS.currency || "TWD",
      value,
      items: [{
        item_id: safeText(item.item_id || item.id, "xuanxiang_service"),
        item_name: safeText(item.item_name || item.name, "玹翔旅遊服務"),
        item_category: safeText(item.item_category || item.category, "接送包車服務"),
        price: safeNumber(item.price || value, 0),
        quantity: Math.max(1, safeNumber(item.quantity, 1))
      }],
      ...params
    });
  }

  async function fetchWithTimeout(url, options = {}) {
    let lastError;

    for (let i = 0; i <= config.GUARD.retryTimes; i += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.GUARD.requestTimeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timer);
        return response;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
      }
    }

    throw lastError;
  }

  async function fetchJson(url, options = {}) {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) throw new Error(`API 連線失敗 (${response.status})`);
    return response.json();
  }

  async function checkApiHealth() {
    const url = `${config.APPS_SCRIPT_URL}?action=health`;
    const data = await fetchJson(url, { cache: "no-store" });
    trackEvent(config.CONVERSION.apiHealth, { ok: Boolean(data.ok) });
    return data;
  }

  async function fetchPriceSheet(sheetName, forceRefresh = false) {
    const sheet = safeText(sheetName, "");
    if (!sheet) throw new Error("價目表分頁名稱未填寫");
    if (!config.APPS_SCRIPT_URL) throw new Error("Apps Script API 尚未設定");

    const cacheKey = `price:${sheet}`;
    const cached = memoryCache.get(cacheKey);
    const now = Date.now();
    const maxAge = config.GUARD.priceCacheMinutes * 60 * 1000;

    if (!forceRefresh && cached && now - cached.time < maxAge) {
      return cached.data;
    }

    const url = `${config.APPS_SCRIPT_URL}?action=prices&sheet=${encodeURIComponent(sheet)}`;
    const data = await fetchJson(url, { cache: "no-store" });

    if (!data.ok) throw new Error(data.message || "價目表 API 回傳錯誤");

    const finalData = {
      headers: Array.isArray(data.headers) ? data.headers : [],
      rows: Array.isArray(data.rows) ? data.rows : [],
      updatedAt: data.updatedAt || ""
    };

    memoryCache.set(cacheKey, {
      time: now,
      data: finalData
    });

    return finalData;
  }

  function normalizeLinkElement(link) {
    if (!link || !link.getAttribute || link.dataset.xxGuardReady === "1") return;
    link.dataset.xxGuardReady = "1";

    const href = link.getAttribute("href") || "";
    if (!href.trim()) link.setAttribute("href", "#");

    const finalHref = link.getAttribute("href") || "";
    const isExternal = /^https?:\/\//i.test(finalHref) && !finalHref.includes(location.hostname);

    if (isExternal) {
      link.setAttribute("target", link.getAttribute("target") || "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }

    if (finalHref.includes("line.me") || link.hasAttribute("data-xx-line-link")) {
      link.setAttribute("href", config.CONTACT.lineUrl);
      link.addEventListener("click", () => trackLineClick(), { passive: true });
    }

    if (finalHref.startsWith("tel:") || link.hasAttribute("data-xx-phone-link")) {
      link.setAttribute("href", `tel:${config.CONTACT.phoneTel}`);
      link.addEventListener("click", () => trackPhoneClick(), { passive: true });
    }

    if (finalHref.includes("wa.me") || finalHref.includes("whatsapp") || link.hasAttribute("data-xx-whatsapp-link")) {
      link.setAttribute("href", config.CONTACT.whatsappUrl);
      link.addEventListener("click", () => trackWhatsappClick(), { passive: true });
    }
  }

  function applyContactData(root = document) {
    const map = {
      brand: config.CONTACT.brand,
      phone: config.CONTACT.phoneDisplay,
      email: config.CONTACT.email,
      line: config.CONTACT.lineId,
      whatsapp: config.CONTACT.whatsappDisplay,
      wechat: config.CONTACT.wechat
    };

    root.querySelectorAll("[data-xx-text]").forEach((el) => {
      const key = el.getAttribute("data-xx-text");
      if (map[key]) el.textContent = map[key];
    });

    root.querySelectorAll("[data-xx-line-link]").forEach((el) => {
      el.setAttribute("href", config.CONTACT.lineUrl);
    });

    root.querySelectorAll("[data-xx-phone-link]").forEach((el) => {
      el.setAttribute("href", `tel:${config.CONTACT.phoneTel}`);
    });

    root.querySelectorAll("[data-xx-whatsapp-link]").forEach((el) => {
      el.setAttribute("href", config.CONTACT.whatsappUrl);
    });
  }

  function applyImageGuard(root = document) {
    root.querySelectorAll("img").forEach((img) => {
      if (img.dataset.xxImageGuardReady === "1") return;
      img.dataset.xxImageGuardReady = "1";

      if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
      if (!img.getAttribute("alt")) img.setAttribute("alt", config.CONTACT.brand);

      img.addEventListener("error", function () {
        if (this.src.includes(config.GUARD.safeFallbackImage)) return;
        this.src = config.GUARD.safeFallbackImage;
      }, { once: true });
    });
  }

  function applySeoGuard() {
    if (!document.title.trim()) document.title = config.SEO.defaultTitle;

    let desc = document.querySelector('meta[name="description"]');
    if (!desc) {
      desc = document.createElement("meta");
      desc.setAttribute("name", "description");
      document.head.appendChild(desc);
    }
    if (!desc.getAttribute("content")) {
      desc.setAttribute("content", config.SEO.defaultDescription);
    }

    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    if (!ogImage.getAttribute("content")) {
      ogImage.setAttribute("content", config.SEO.image);
    }
  }

  function applyQualityGuard(root = document) {
    if (!config.GUARD.enabled || !root || !root.querySelectorAll) return;

    applyContactData(root);
    root.querySelectorAll("a").forEach(normalizeLinkElement);
    applyImageGuard(root);
  }

  function observeDomGuard() {
    if (!("MutationObserver" in window) || window.__XX_DOM_GUARD_OBSERVING__) return;
    window.__XX_DOM_GUARD_OBSERVING__ = true;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node && node.nodeType === 1) applyQualityGuard(node);
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function initCopyLinkButtons() {
    document.querySelectorAll("[data-copy-link]").forEach((btn) => {
      if (btn.dataset.xxCopyReady === "1") return;
      btn.dataset.xxCopyReady = "1";

      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          trackEvent(config.CONVERSION.copyLink, { url: location.href });
          btn.textContent = "已複製連結";
          setTimeout(() => {
            btn.textContent = "複製連結";
          }, 1800);
        } catch (err) {
          warnGuard("複製連結失敗", err);
        }
      });
    });
  }

  function init() {
    window.XUANXIANG_CONFIG = config;
    window.XX_CONFIG = config;
    window.XX = Object.assign(window.XX || {}, config);
    loadGA4();
    applySeoGuard();

    const ready = function () {
      applyQualityGuard(document);
      observeDomGuard();
      initCopyLinkButtons();
      document.dispatchEvent(new CustomEvent("xx:config-ready", { detail: config }));
      document.dispatchEvent(new CustomEvent("xx:booking-config-ready", {
        detail: {
          version: config.VERSION,
          bookingVersion: config.BOOKING_VERSION,
          bookingMallVersion: config.BOOKING_MALL_VERSION,
          apiReady: Boolean(config.APPS_SCRIPT_URL),
          stableSubmit: Boolean(config.BOOKING_STABLE_SUBMIT),
          iframeFallback: Boolean(config.BOOKING_IFRAME_FALLBACK)
        }
      }));
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ready, { once: true });
    } else {
      ready();
    }
  }

  init();

  window.XUANXIANG_CONFIG = config;
  window.XX_CONFIG = config;
  window.XX = Object.assign(window.XX || {}, config);
  window.XX_FIREBASE_CONFIG = config.FIREBASE;
  window.XX_LINE_CHANNEL_ID = config.LINE_CHANNEL_ID;
  window.XX_LINE_AUTH_API = config.LINE_AUTH_API;
  window.XX_GA4_MEASUREMENT_ID = getAnalyticsId();

  window.XXPricing = {
    fetchSheet: fetchPriceSheet
  };

  window.XXApi = {
    fetchJson,
    checkHealth: checkApiHealth
  };

  window.XXAnalytics = {
    getAnalyticsId,
    loadGA4,
    trackEvent,
    trackBookingStep,
    trackLineClick,
    trackPhoneClick,
    trackWhatsappClick,
    trackEcommerce
  };

  window.XXGuard = {
    warnGuard,
    safeText,
    safeUrl,
    safeNumber,
    safeImage,
    normalizeLinkElement,
    applyQualityGuard
  };
})();

/* === 玹翔旅遊 Ultimate Final v12.2｜全站共用設定防呆升級層 === */
(function () {
  "use strict";
  const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
  Object.assign(cfg, {
    SITE_VERSION: cfg.SITE_VERSION || "Ultimate Final v12 Booking Mall",
    LAYOUT_VERSION: "Ultimate Final v12.2 Shared Layout Core",
    CSS_VERSION: "Ultimate Final v12.2 Shared Black Gold CSS",
    NAV_VERSION: "Ultimate Final v12.2 Unified Navigation",
    BOOKING_VERSION: cfg.BOOKING_VERSION || "v12",
    BOOKING_MALL_VERSION: cfg.BOOKING_MALL_VERSION || "v12",
    BOOKING_URL: cfg.BOOKING_URL || "booking.html",
    ENABLE_SHARED_HEADER: true,
    ENABLE_SHARED_FOOTER: true,
    ENABLE_FLOATING_CONTACT: true,
    ENABLE_NAV_GUARD: true,
    ENABLE_LINK_GUARD: true,
    ENABLE_IMAGE_GUARD: true,
    ENABLE_MOBILE_MENU_GUARD: true
  });
  window.XUANXIANG_CONFIG = cfg;
  window.XX_CONFIG = cfg;
  window.XX = Object.assign(window.XX || {}, cfg);
  document.dispatchEvent(new CustomEvent("xx:v12-config-extended", {
    detail: {
      version: cfg.SITE_VERSION,
      layoutVersion: cfg.LAYOUT_VERSION,
      navVersion: cfg.NAV_VERSION,
      bookingMallVersion: cfg.BOOKING_MALL_VERSION
    }
  }));
})();
