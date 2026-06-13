/*
 * 玹翔旅遊 Ultimate Final v12.2 Enterprise Black Gold Core
 * 全站 JS 核心｜防呆、轉換追蹤、表單保護、圖片保護、共用導覽列 Header/Footer/Floating 串接保護
 */
(function () {
  "use strict";

  if (window.__XX_ENTERPRISE_V12_2_BOOTED__) return;
  window.__XX_ENTERPRISE_V12_2_BOOTED__ = true;
  window.__XX_ENTERPRISE_V10_BOOTED__ = true;

  const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
  const contact = cfg.CONTACT || {};
  const ENTERPRISE_VERSION = "Ultimate Final v12.2 Enterprise Core";
  const BOOKING_MALL_VERSION = String(cfg.BOOKING_MALL_VERSION || cfg.BOOKING_VERSION || "v12");
  const LAYOUT_VERSION = cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core";
  const BOOKING_URL = cfg.BOOKING_URL || "booking.html";

  const FALLBACK = {
    brand: "玹翔旅遊",
    phoneDisplay: "0972-268295",
    phoneTel: "0972268295",
    lineUrl: "https://line.me/R/ti/p/@sco20240609",
    whatsappUrl: "https://wa.me/886972268295",
    fallbackImage: "images/logo.jpg",
    bookingUrl: "booking.html"
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function safeText(value, fallback = "") {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function getLineUrl() {
    return safeText(contact.lineUrl, FALLBACK.lineUrl);
  }

  function getPhoneTel() {
    return "tel:" + safeText(contact.phoneTel, FALLBACK.phoneTel).replace(/[^0-9+]/g, "");
  }

  function getWhatsappUrl() {
    return safeText(contact.whatsappUrl, FALLBACK.whatsappUrl);
  }

  function track(eventName, params = {}) {
    const finalName = cfg.ANALYTICS?.eventPrefix
      ? `${cfg.ANALYTICS.eventPrefix}${eventName}`
      : eventName;

    const payload = {
      page_path: location.pathname,
      page_title: document.title,
      site_version: cfg.SITE_VERSION || cfg.VERSION || "Ultimate Final v12 Booking Mall",
      enterprise_version: ENTERPRISE_VERSION,
      booking_mall_version: BOOKING_MALL_VERSION,
      layout_version: LAYOUT_VERSION,
      ...params
    };

    if (window.XXAnalytics?.trackEvent) {
      window.XXAnalytics.trackEvent(eventName, payload);
      return;
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", finalName, payload);
    }
  }

  function initContactLinks(root = document) {
    $$("[data-xx-line-link], a[href*='line.me'], a[href*='lin.ee']", root).forEach((a) => {
      a.href = getLineUrl();
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });

    $$("[data-xx-phone-link], a[href^='tel:']", root).forEach((a) => {
      a.href = getPhoneTel();
    });

    $$("[data-xx-whatsapp-link], a[href*='wa.me'], a[href*='whatsapp']", root).forEach((a) => {
      a.href = getWhatsappUrl();
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });

    $$("[data-xx-booking-link], a[href*='booking.html']", root).forEach((a) => {
      a.href = BOOKING_URL || FALLBACK.bookingUrl;
      a.dataset.xxBookingLinkReady = "1";
    });
  }

  function initClickTracking() {
    if (window.__XX_V12_2_CLICK_TRACKING__) return;
    window.__XX_V12_2_CLICK_TRACKING__ = true;
    window.__XX_V10_CLICK_TRACKING__ = true;

    document.addEventListener("click", function (event) {
      const link = event.target.closest("a,button");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      const text = safeText(link.textContent).slice(0, 80);

      if (href.includes("line.me") || link.hasAttribute("data-xx-line-link")) {
        track("line_click", {
          method: "LINE",
          link_text: text
        });
      }

      if (href.startsWith("tel:") || link.hasAttribute("data-xx-phone-link")) {
        track("phone_click", {
          method: "PHONE",
          link_text: text
        });
      }

      if (href.includes("wa.me") || link.hasAttribute("data-xx-whatsapp-link")) {
        track("whatsapp_click", {
          method: "WHATSAPP",
          link_text: text
        });
      }

      if (href.includes("booking.html") || link.hasAttribute("data-xx-booking-link")) {
        track("booking_start", {
          link_text: text
        });
      }

      if (href.includes("quote.html")) {
        track("quote_view", {
          link_text: text
        });
      }
    }, true);
  }

  function initImageGuard(root = document) {
    $$("img", root).forEach((img) => {
      if (img.dataset.xxV12ImageReady === "1") return;
      img.dataset.xxV12ImageReady = "1";

      if (!img.loading) img.loading = "lazy";
      if (!img.decoding) img.decoding = "async";
      if (!img.alt) img.alt = contact.brand || FALLBACK.brand;

      img.addEventListener("error", function () {
        if (this.dataset.xxFallbackDone === "1") return;
        this.dataset.xxFallbackDone = "1";
        this.src = cfg.GUARD?.safeFallbackImage || FALLBACK.fallbackImage;
      });
    });
  }

  function initExternalLinks(root = document) {
    $$("a[href]", root).forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (/^https?:\/\//i.test(href) && !href.includes(location.hostname)) {
        a.target = a.target || "_blank";
        a.rel = "noopener noreferrer";
      }
    });
  }

  function initFormGuard() {
    $$("form").forEach((form) => {
      if (form.dataset.xxV12FormReady === "1") return;
      form.dataset.xxV12FormReady = "1";
      form.dataset.xxEnterpriseVersion = ENTERPRISE_VERSION;
      form.dataset.xxBookingMallVersion = BOOKING_MALL_VERSION;
      form.dataset.xxSharedLayoutVersion = LAYOUT_VERSION;

      form.addEventListener("submit", function (event) {
        const submit = form.querySelector("[type='submit']");
        if (!submit) return;

        if (form.dataset.xxSubmitting === "1") {
          event.preventDefault();
          return;
        }

        form.dataset.xxSubmitting = "1";
        submit.dataset.originalText = submit.textContent;
        submit.textContent = "處理中...";
        submit.disabled = true;

        setTimeout(() => {
          form.dataset.xxSubmitting = "";
          submit.disabled = false;
          submit.textContent = submit.dataset.originalText || "送出";
        }, 12000);
      });
    });
  }

  function initMobileMenuGuard() {
    const toggle = $("#xx-nav-toggle");
    const menu = $(".xx-menu");

    if (!toggle || !menu) return;

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") toggle.checked = false;
    });

    $$(".xx-menu a").forEach((a) => {
      a.addEventListener("click", function () {
        toggle.checked = false;
      });
    });
  }

  function initSmoothAnchor() {
    $$("a[href^='#']").forEach((a) => {
      if (a.dataset.xxSmoothReady === "1") return;
      a.dataset.xxSmoothReady = "1";

      a.addEventListener("click", function (event) {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;

        const target = document.querySelector(id);
        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }

  function initApiHealthBadge() {
    const target = document.querySelector("[data-xx-api-health]");
    if (!target || !window.XXApi?.checkHealth) return;

    window.XXApi.checkHealth()
      .then((data) => {
        target.textContent = data.ok ? "系統正常" : "系統需檢查";
        target.dataset.status = data.ok ? "ok" : "warning";
      })
      .catch(() => {
        target.textContent = "系統檢查失敗";
        target.dataset.status = "error";
      });
  }

  function initQuoteQuickEvents() {
    const quoteBtn = document.getElementById("quoteBtn");
    if (quoteBtn && quoteBtn.dataset.xxV12QuoteReady !== "1") {
      quoteBtn.dataset.xxV12QuoteReady = "1";
      quoteBtn.addEventListener("click", function () {
        track("quote_start", {
          page_path: location.pathname
        });
      });
    }
  }

  function initBookingFunnel() {
    const bookingForm = document.getElementById("bookingForm");
    if (!bookingForm || bookingForm.dataset.xxV12BookingReady === "1") return;

    bookingForm.dataset.xxV12BookingReady = "1";
    bookingForm.dataset.xxEnterpriseVersion = ENTERPRISE_VERSION;
    bookingForm.dataset.xxBookingMallVersion = BOOKING_MALL_VERSION;
    bookingForm.dataset.xxSharedLayoutVersion = LAYOUT_VERSION;

    $$("input,select,textarea", bookingForm).forEach((field) => {
      field.addEventListener("change", function () {
        track("booking_step", {
          field_name: field.name || field.id || "unknown"
        });
      });
    });
  }

  function observeDom() {
    if (window.__XX_V12_2_OBSERVER__) return;
    window.__XX_V12_2_OBSERVER__ = true;
    window.__XX_V10_OBSERVER__ = true;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          initContactLinks(node);
          initImageGuard(node);
          initExternalLinks(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    initContactLinks();
    initExternalLinks();
    initImageGuard();
    initClickTracking();
    initFormGuard();
    initMobileMenuGuard();
    initSmoothAnchor();
    initApiHealthBadge();
    initQuoteQuickEvents();
    initBookingFunnel();
    observeDom();

    document.dispatchEvent(new CustomEvent("xx:enterprise-core-ready", {
      detail: {
        version: ENTERPRISE_VERSION,
        bookingMallVersion: BOOKING_MALL_VERSION,
        layoutVersion: LAYOUT_VERSION,
        ready: true
      }
    }));
    document.dispatchEvent(new CustomEvent("xx:enterprise-v10-ready", {
      detail: {
        version: ENTERPRISE_VERSION,
        bookingMallVersion: BOOKING_MALL_VERSION,
        layoutVersion: LAYOUT_VERSION,
        ready: true,
        legacyAlias: true
      }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.XXEnterpriseCore = {
    version: ENTERPRISE_VERSION,
    bookingMallVersion: BOOKING_MALL_VERSION,
    layoutVersion: LAYOUT_VERSION,
    bookingUrl: BOOKING_URL,
    init,
    track,
    initContactLinks,
    initImageGuard,
    initExternalLinks,
    initFormGuard,
    initBookingFunnel
  };
  window.XXEnterpriseV10 = window.XXEnterpriseCore;
})();