/*
 * 玹翔旅遊 Ultimate Final v12.2 Enterprise｜共用導覽列・Footer・Floating・防呆正式營運版
 * Header、Footer、浮動預約／LINE／電話／WhatsApp、手機選單、GA4、SEO、Schema、圖片 fallback 統一由此檔產生。
 */
(function () {
  "use strict";

  if (window.__XX_SITE_LAYOUT_BOOTED__) return;
  window.__XX_SITE_LAYOUT_BOOTED__ = true;

  const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
  const contact = cfg.CONTACT || {};
  const guard = cfg.AGENCY_UI?.qualityGuard || cfg.GUARD || {};
  const LAYOUT_VERSION = cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core";
  const BOOKING_URL = cfg.BOOKING_URL || "booking.html";

  const FALLBACKS = {
    brand: "玹翔旅遊",
    siteUrl: "https://xuanxiangtravel.com",
    logo: "images/logo.jpg",
    fallbackImage: guard.safeFallbackImage || "images/logo.jpg",
    phoneDisplay: "0972-268295",
    phoneTel: "0972268295",
    lineId: "@sco20240609",
    lineUrl: "https://line.me/R/ti/p/@sco20240609",
    whatsappUrl: "https://wa.me/886972268295",
    bookingLabel: "立即預約",
    bookingUrl: "booking.html"
  };

  const state = {
    mounted: false,
    ga4Loaded: false,
    navReady: false,
    contactReady: false,
    schemaReady: false,
    seoReady: false,
    imagesReady: false,
    observer: null
  };

  function warn(message, detail) {
    if (guard.consoleWarnings === false) return;
    if (typeof console !== "undefined") console.warn(`[玹翔全站版型防呆] ${message}`, detail || "");
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[char]);
  }

  function safeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function safeUrl(value, fallback = "#") {
    const text = String(value ?? "").trim();
    if (!text) return fallback;
    return text;
  }

  function fixBrokenInternalHref(rawHref) {
    const href = String(rawHref || "").trim();
    if (!href) return "";

    // 修正 AI / 搜尋引擎曾抓到的錯誤拼接網址：index.htmlprivacy、/index.htmlbusiness-transfer。
    const brokenIndexMatch = href.match(/^\/?index\.html([a-z0-9][a-z0-9-]*)(#.*)?$/i);
    if (brokenIndexMatch) {
      const slug = brokenIndexMatch[1].replace(/^\/+|\/+$/g, "");
      const hash = brokenIndexMatch[2] || "";
      return `${slug}.html${hash}`;
    }

    return href;
  }

  function sameOriginPath(path, fallback = "index.html") {
    const fixedPath = fixBrokenInternalHref(path || fallback);

    if (fixedPath === "#" || fixedPath.startsWith("#")) return fixedPath;
    if (/^(tel:|mailto:|sms:|line:|weixin:|whatsapp:)/i.test(fixedPath)) return fixedPath;

    try {
      const url = new URL(fixedPath, location.href);
      if (url.origin !== location.origin) return fixedPath;

      const fileName = url.pathname.split("/").filter(Boolean).pop() || "index.html";
      return `${fileName}${url.search}${url.hash}`;
    } catch (_) {
      return fallback;
    }
  }

  function currentPage() {
    return location.pathname.split("/").pop() || "index.html";
  }

  function siteUrl() {
    return safeUrl(cfg.SITE_URL, FALLBACKS.siteUrl).replace(/\/$/, "");
  }

  function telHref() {
    const tel = safeText(contact.phoneTel, FALLBACKS.phoneTel).replace(/[^0-9+]/g, "");
    return `tel:${tel}`;
  }

  function lineUrl() {
    return safeUrl(contact.lineUrl, FALLBACKS.lineUrl);
  }

  function whatsappUrl() {
    return safeUrl(contact.whatsappUrl, FALLBACKS.whatsappUrl);
  }

  function arrayItems(items) {
    return Array.isArray(items) ? items.filter((item) => Array.isArray(item) && item.length >= 2) : [];
  }

  function links(items) {
    return arrayItems(items).map(([label, href]) => {
      const cleanHref = sameOriginPath(href || "#", "#");
      return `<a href="${esc(cleanHref)}">${esc(label)}</a>`;
    }).join("");
  }

  function dropdown(label, items) {
    const content = links(items);
    if (!content) return "";
    return `<span class="drop"><button class="drop-btn" type="button" aria-expanded="false">${esc(label)}</button><span class="drop-list">${content}</span></span>`;
  }

  function headerHtml() {
    return `<header class="xx-topbar" data-xx-layout-part="header">
      <div class="xx-nav-wrap">
        <a class="xx-brand" href="index.html" aria-label="${esc(FALLBACKS.brand)}主頁">
          <img src="${esc(FALLBACKS.logo)}" class="logo-img" alt="${esc(contact.brand || FALLBACKS.brand)} LOGO" width="54" height="54">
          <span class="brand-text"><strong>${esc(contact.brand || FALLBACKS.brand)}</strong><small>Xuan Xiang Travel</small></span>
        </a>
        <input id="xx-nav-toggle" class="xx-nav-toggle" type="checkbox" aria-label="開啟導覽選單">
        <label for="xx-nav-toggle" class="xx-hamburger" aria-label="開啟導覽選單" role="button" tabindex="0">☰</label>
        <nav class="nav-links xx-menu" aria-label="玹翔旅遊主導覽列">
          <a href="index.html">主頁</a>
          <a href="about.html">關於玹翔</a>
          ${dropdown("服務項目", cfg.SERVICES)}
          <a href="${esc(BOOKING_URL || FALLBACKS.bookingUrl)}" data-xx-booking-link>VIP 預約商城</a>
          <a href="vehicles.html">車款介紹</a>
          <a href="blog.html">部落格</a>
          ${dropdown("旅遊活動", cfg.TRAVEL_ACTIVITIES)}
          ${dropdown("會員專區", cfg.MEMBER_LINKS)}
          ${dropdown("常見問題｜條款政策", cfg.POLICY_LINKS)}
          <a href="driver-recruit.html">司機招募</a>
        </nav>
      </div>
    </header>`;
  }

  function footerHtml() {
    const brand = esc(contact.brand || FALLBACKS.brand);
    return `<footer class="xx-footer-clean" id="contact" aria-label="玹翔旅遊聯繫方式" data-xx-layout-part="footer">
      <div class="xx-footer-wrap">
        <section class="xx-footer-col">
          <h3>${brand}</h3>
          <p>秉持「用心、貼心、深得你心」的服務品質，讓每一次移動都穩、準、舒適。</p>
          <div class="xx-footer-actions"><a href="${esc(BOOKING_URL || FALLBACKS.bookingUrl)}" data-xx-booking-link>立即預約</a><a href="airport.html">查看服務項目</a></div>
        </section>
        <section class="xx-footer-col"><h3>聯絡方式</h3><ul>
          <li><a href="${esc(telHref())}" data-xx-phone-link>電話：${esc(contact.phoneDisplay || FALLBACKS.phoneDisplay)}</a></li>
          <li><a href="mailto:${esc(contact.email || "")}">Gmail：${esc(contact.email || "請洽客服")}</a></li>
          <li><a href="${esc(lineUrl())}" data-xx-line-link target="_blank" rel="noopener noreferrer">LINE：${esc(contact.lineId || FALLBACKS.lineId)}</a></li>
          <li><a href="${esc(whatsappUrl())}" data-xx-whatsapp-link target="_blank" rel="noopener noreferrer">WhatsApp：${esc(contact.whatsappDisplay || "(+886)972268295")}</a></li>
          <li><a href="weixin://dl/chat?${esc(contact.wechat || "")}">WeChat：${esc(contact.wechat || "請洽客服")}</a></li>
        </ul></section>
        <section class="xx-footer-col"><h3>社群平台</h3><ul>
          <li><a href="${esc(contact.instagram || "#")}" target="_blank" rel="noopener noreferrer">IG：xuanxiang0609</a></li>
          <li><a href="${esc(contact.threads || "#")}" target="_blank" rel="noopener noreferrer">Threads：xuanxiang0609</a></li>
          <li><a href="${esc(contact.facebook || "#")}" target="_blank" rel="noopener noreferrer">粉絲專頁：玹翔旅遊</a></li>
          <li><a href="${esc(contact.youtube || "#")}" target="_blank" rel="noopener noreferrer">YouTube：玹翔旅遊</a></li>
          <li><a href="${esc(contact.x || "#")}" target="_blank" rel="noopener noreferrer">X：@xuanxiangtravel</a></li>
          <li><a href="${esc(contact.tiktok || "#")}" target="_blank" rel="noopener noreferrer">TikTok：@xuanxiang0609</a></li>
        </ul></section>
      </div>
      <div class="xx-copy">© ${brand}｜機場接送・包車旅遊・商務接送｜本網站價目以客服確認報價為準。</div>
    </footer>`;
  }

  function floatingHtml() {
    return `<div class="xx-float" aria-label="玹翔旅遊快速聯絡" data-xx-layout-part="floating" data-xx-version="${esc(LAYOUT_VERSION)}">
      <a href="${esc(BOOKING_URL || FALLBACKS.bookingUrl)}" data-xx-booking-link>預約</a>
      <a href="${esc(lineUrl())}" data-xx-line-link target="_blank" rel="noopener noreferrer">LINE</a>
      <a href="${esc(telHref())}" data-xx-phone-link>電話</a>
      <a href="${esc(whatsappUrl())}" data-xx-whatsapp-link target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </div>`;
  }

  function ensureMount(id, position) {
    let mount = document.getElementById(id);
    if (!mount) {
      mount = document.createElement("div");
      mount.id = id;
      if (position === "start") document.body.prepend(mount);
      else document.body.append(mount);
    }
    return mount;
  }

  function mountLayout() {
    ensureMount("xx-site-header", "start").innerHTML = headerHtml();
    ensureMount("xx-site-footer", "end").innerHTML = footerHtml();
    ensureMount("xx-site-floating", "end").innerHTML = floatingHtml();
    state.mounted = true;
  }

  function closeMobileMenu() {
    const toggle = document.getElementById("xx-nav-toggle");
    if (toggle) toggle.checked = false;
  }

  function initNav() {
    if (state.navReady) return;
    state.navReady = true;

    const toggle = document.getElementById("xx-nav-toggle");
    const hamburger = document.querySelector(".xx-hamburger");
    const drops = Array.from(document.querySelectorAll(".drop"));

    const closeDrops = (except) => drops.forEach((drop) => {
      if (drop !== except) {
        drop.classList.remove("active");
        drop.querySelector(".drop-btn")?.setAttribute("aria-expanded", "false");
      }
    });

    hamburger?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (toggle) toggle.checked = !toggle.checked;
      }
    });

    drops.forEach((drop) => {
      const button = drop.querySelector(".drop-btn");
      if (!button || button.dataset.xxBound === "1") return;
      button.dataset.xxBound = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const open = !drop.classList.contains("active");
        closeDrops(drop);
        drop.classList.toggle("active", open);
        button.setAttribute("aria-expanded", String(open));
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeDrops();
      });
    });

    document.addEventListener("click", () => closeDrops());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrops();
        closeMobileMenu();
      }
    });

    document.querySelectorAll(".xx-menu a").forEach((anchor) => {
      const hrefPage = anchor.getAttribute("href")?.split("#")[0];
      if (hrefPage === currentPage()) anchor.classList.add("is-active");
      anchor.addEventListener("click", () => {
        closeDrops();
        closeMobileMenu();
      });
    });
  }

  function normalizeExternalLink(anchor) {
    const href = anchor.getAttribute("href") || "";

    if (!href.trim()) {
      anchor.setAttribute("href", "#");
      return;
    }

    const fixedHref = fixBrokenInternalHref(href);
    if (fixedHref !== href) {
      warn("已修正錯誤拼接連結", { before: href, after: fixedHref });
      anchor.setAttribute("href", fixedHref);
    }

    if (/^https?:\/\//i.test(fixedHref) && !fixedHref.includes(location.hostname)) {
      anchor.setAttribute("target", anchor.getAttribute("target") || "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    }
  }

  function normalizePublicContactLinks(root = document) {
    root.querySelectorAll('[data-xx-line-link],a[href*="lin.ee"],a[href*="line.me/R/ti/p/"]').forEach((anchor) => {
      anchor.href = lineUrl();
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    });
    root.querySelectorAll('[data-xx-phone-link],a[href^="tel:"]').forEach((anchor) => {
      anchor.href = telHref();
    });
    root.querySelectorAll('[data-xx-whatsapp-link],a[href*="wa.me"],a[href*="whatsapp.com"]').forEach((anchor) => {
      anchor.href = whatsappUrl();
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    });
    root.querySelectorAll('[data-xx-booking-link]').forEach((anchor) => {
      anchor.href = BOOKING_URL || FALLBACKS.bookingUrl;
    });
    root.querySelectorAll("[data-xx-line-form]").forEach((form) => {
      form.action = lineUrl();
    });
    root.querySelectorAll("a").forEach(normalizeExternalLink);
  }

  function replaceTokens() {
    if (!document.body) return;
    const tokens = [
      ["{{XX_PHONE}}", contact.phoneDisplay || FALLBACKS.phoneDisplay],
      ["{{XX_PHONE_TEL}}", contact.phoneTel || FALLBACKS.phoneTel],
      ["{{XX_EMAIL}}", contact.email || ""],
      ["{{XX_LINE_ID}}", contact.lineId || FALLBACKS.lineId],
      ["{{XX_LINE_URL}}", lineUrl()],
      ["{{XX_WHATSAPP_URL}}", whatsappUrl()]
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.parentElement?.tagName)) continue;
      node.nodeValue = tokens.reduce((text, [token, replacement]) => text.replaceAll(token, replacement || ""), node.nodeValue);
    }
  }

  function injectJsonLd(id, data) {
    const selector = `script[data-xx-schema="${id}"]`;
    document.querySelectorAll(selector).forEach((node) => node.remove());
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.xxSchema = id;
    schema.textContent = JSON.stringify(data);
    document.head.append(schema);
  }

  function injectSchemas() {
    if (state.schemaReady) return;
    state.schemaReady = true;

    // 若頁面本身已放完整 JSON-LD，保留頁面原生 Schema，避免重複灌資料。
    const hasPageJsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .some((script) => !script.dataset.xxSchema && safeText(script.textContent).length > 40);

    if (!hasPageJsonLd) {
      injectJsonLd("local-business", {
        "@context": "https://schema.org",
        "@type": "TravelAgency",
        name: contact.brand || FALLBACKS.brand,
        alternateName: "Xuan Xiang Travel",
        url: siteUrl(),
        telephone: contact.phoneDisplay || FALLBACKS.phoneDisplay,
        email: contact.email || "",
        image: cfg.SEO?.image || `${siteUrl()}/images/logo.jpg`,
        priceRange: "$$",
        areaServed: "Taiwan",
        description: cfg.SEO?.defaultDescription || "玹翔旅遊提供機場接送、港口接送、旅遊包車、登山包車、商務專車與高端包車服務。",
        sameAs: [lineUrl(), whatsappUrl(), contact.instagram, contact.facebook, contact.youtube, contact.tiktok].filter(Boolean)
      });
    }

    if (currentPage() === "faq.html") {
      injectJsonLd("faq", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "什麼時候算預約成功？",
            acceptedAnswer: { "@type": "Answer", text: "完成客服確認與訂金支付後，才會正式保留車輛與司機。" }
          },
          {
            "@type": "Question",
            name: "可以指定車型嗎？",
            acceptedAnswer: { "@type": "Answer", text: "可依需求指定五人座、九人座、Lexus LM、Toyota Alphard、Mercedes-Benz Sprinter 等車型，實際安排以客服確認為準。" }
          },
          {
            "@type": "Question",
            name: "可以開收據或統編嗎？",
            acceptedAnswer: { "@type": "Answer", text: "可以，公司行號長期配合、收據與統編需求，請在預約時提前告知。" }
          }
        ]
      });
    }
  }

  function ensureMeta(selector, attrs) {
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      Object.entries(attrs).forEach(([key, value]) => meta.setAttribute(key, value));
      document.head.append(meta);
    }
    return meta;
  }

  function ensureSeo() {
    if (state.seoReady) return;
    state.seoReady = true;
    const pagePath = fixBrokenInternalHref(location.pathname.replace(/^\/+/, "") || "index.html");
    
    const canonicalUrl = `${siteUrl()}/${pagePath === "index.html" ? "" : pagePath}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;

    const descriptionMeta = document.querySelector('meta[name="description"]') || ensureMeta('meta[name="description"]', { name: "description" });
    if (!descriptionMeta.content) descriptionMeta.content = cfg.SEO?.defaultDescription || "玹翔旅遊提供機場接送、港口接送、旅遊包車、登山包車、商務專車與高端包車服務。";
    const description = descriptionMeta.content;

    [
      ["og:title", document.title || contact.brand || FALLBACKS.brand],
      ["og:description", description],
      ["og:type", "website"],
      ["og:image", cfg.SEO?.image || `${siteUrl()}/images/logo.jpg`],
      ["og:url", canonicalUrl]
    ].forEach(([property, content]) => {
      const meta = ensureMeta(`meta[property="${property}"]`, { property });
      meta.content = content;
    });
  }

  function populateBookingServices() {
    const select = document.querySelector('#bookingForm [name="service"]');
    if (!select || !Array.isArray(cfg.SERVICES) || !cfg.SERVICES.length) return;
    const selected = select.value;
    select.innerHTML = arrayItems(cfg.SERVICES).map(([label]) => `<option value="${esc(label)}">${esc(label)}</option>`).join("");
    if (Array.from(select.options).some((option) => option.value === selected)) select.value = selected;
  }

  function initImages(root = document) {
    root.querySelectorAll("img").forEach((img) => {
      if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
      if (!img.getAttribute("alt")) img.setAttribute("alt", contact.brand || FALLBACKS.brand);
      img.addEventListener("error", function () {
        if (this.dataset.xxFallback === "1") return;
        this.dataset.xxFallback = "1";
        this.src = FALLBACKS.fallbackImage;
      }, { once: true });
    });
    state.imagesReady = true;
  }

  function loadGa4() {
    const analytics = cfg.ANALYTICS || {};
    const ga4Id = window.XX_GA4_MEASUREMENT_ID || analytics.ga4MeasurementId || cfg.FIREBASE?.measurementId || "";
    if (!ga4Id || state.ga4Loaded || window.__XX_GA4_LOADED__) return;

    state.ga4Loaded = true;
    window.__XX_GA4_LOADED__ = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.append(script);

    window.gtag("js", new Date());
    window.gtag("config", ga4Id, {
      send_page_view: analytics.enablePageView !== false,
      page_title: document.title,
      page_location: location.href,
      page_path: location.pathname
    });
  }

  function trackEvent(name, params = {}) {
    if (window.XXAnalytics?.trackEvent) {
      window.XXAnalytics.trackEvent(name, params);
      return;
    }
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  }

  function bindClickTracking() {
    if (window.__XX_ENTERPRISE_CLICK_TRACKING__) return;
    window.__XX_ENTERPRISE_CLICK_TRACKING__ = true;

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      const text = safeText(link.textContent).slice(0, 80);
      const payload = { link_text: text, page_path: location.pathname };

      if (href.includes("line.me") || href.includes("lin.ee") || link.hasAttribute("data-xx-line-link")) {
        trackEvent(cfg.CONVERSION?.lineClick || "line_click", { method: "LINE_OA", link_url: lineUrl(), ...payload });
      } else if (href.startsWith("tel:")) {
        trackEvent(cfg.CONVERSION?.phoneClick || "phone_click", { method: "PHONE", phone_number: contact.phoneDisplay || FALLBACKS.phoneDisplay, ...payload });
      } else if (href.includes("wa.me") || href.includes("whatsapp.com") || link.hasAttribute("data-xx-whatsapp-link")) {
        trackEvent(cfg.CONVERSION?.whatsappClick || "whatsapp_click", { method: "WHATSAPP", link_url: whatsappUrl(), ...payload });
      }
    }, true);
  }

  function observeDynamicContent() {
    if (state.observer || !document.body) return;
    state.observer = new MutationObserver((mutations) => {
      const shouldRun = mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node instanceof Element));
      if (!shouldRun) return;
      normalizePublicContactLinks(document);
      initImages(document);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
  }

  async function initFirebaseAnalytics() {
    const firebase = cfg.FIREBASE || {};
    if (!firebase.measurementId || !/^https?:$/.test(location.protocol)) return;
    try {
      const [{ getApps, initializeApp }, { getAnalytics, isSupported }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js")
      ]);
      if (!await isSupported()) return;
      const app = getApps().length ? getApps()[0] : initializeApp(firebase);
      getAnalytics(app);
    } catch (error) {
      warn("Firebase Analytics 初始化略過", error);
    }
  }

  function init() {
    mountLayout();
    normalizePublicContactLinks(document);
    replaceTokens();
    injectSchemas();
    populateBookingServices();
    ensureSeo();
    initNav();
    initImages(document);
    loadGa4();
    bindClickTracking();
    observeDynamicContent();
    initFirebaseAnalytics();
    window.dispatchEvent(new CustomEvent("xx:layout-ready", {
      detail: {
        version: LAYOUT_VERSION,
        siteVersion: cfg.SITE_VERSION || cfg.VERSION || "Ultimate Final v12 Booking Mall",
        bookingMallVersion: cfg.BOOKING_MALL_VERSION || cfg.BOOKING_VERSION || "v12",
        mounted: true
      }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.XXSiteLayout = {
    init,
    mountLayout,
    normalizePublicContactLinks,
    injectSchemas,
    ensureSeo,
    initImages,
    loadGa4,
    fixBrokenInternalHref,
    sameOriginPath,
    version: LAYOUT_VERSION,
    bookingUrl: BOOKING_URL
  };
})();

/* =====================================================
   玹翔旅遊 Ultimate Final v12.2｜共用導覽列・Footer・Floating・防呆升級層
   目的：統一全站 Header/Footer/Floating，避免重複注入，強化連結、圖片、手機選單防呆
===================================================== */
(function () {
  "use strict";

  if (window.__XX_SHARED_LAYOUT_V12_2_READY__) return;
  window.__XX_SHARED_LAYOUT_V12_2_READY__ = true;

  const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
  const VERSION = "Ultimate Final v12.2 Shared Layout Core";
  const BRAND = "玹翔旅遊";
  const BOOKING_URL = cfg.BOOKING_URL || "booking.html";
  const CONTACT = cfg.CONTACT || {};

  const lineUrl = CONTACT.lineUrl || "https://line.me/R/ti/p/@sco20240609";
  const phoneTel = CONTACT.phoneTel || "0972268295";
  const phoneDisplay = CONTACT.phoneDisplay || "0972-268295";
  const whatsappUrl = CONTACT.whatsappUrl || "https://wa.me/886972268295";
  const email = CONTACT.email || "xuanxiang0609@gmail.com";

  const serviceLinks = cfg.SERVICES || [
    ["機場接送", "airport-pricing.html"],
    ["即時報價", "quote.html"],
    ["港口接送", "port-pricing.html"],
    ["旅遊包車", "tour-pricing.html"],
    ["登山包車", "mountain-pricing.html"],
    ["長途接送", "long-distance-pricing.html"],
    ["商務包車", "business-transfer.html"],
    ["演唱會專車", "concert-transfer.html"],
    ["寵物接送", "pet-transfer.html"],
    ["結婚禮車", "wedding-car.html"]
  ];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function linkList(items) {
    return items.map(([label, href]) => `<a href="${esc(href || "#")}">${esc(label)}</a>`).join("");
  }

  function buildHeader() {
    return `
      <header class="xx-shared-header" data-xx-layout-part="header" data-xx-version="${esc(VERSION)}">
        <div class="xx-shared-header-inner">
          <a class="xx-shared-brand" href="index.html" aria-label="玹翔旅遊首頁">
            <img src="images/logo.jpg" alt="玹翔旅遊 Logo" loading="eager" decoding="async">
            <span><b>玹翔旅遊</b><small>Xuan Xiang Travel</small></span>
          </a>
          <button class="xx-shared-menu-btn" type="button" aria-label="開啟選單" aria-expanded="false" data-xx-menu-button>☰</button>
          <nav class="xx-shared-nav" data-xx-menu-panel aria-label="玹翔旅遊主選單">
            <a href="index.html">首頁</a>
            <a href="vehicles.html">車款介紹</a>
            <a href="quote.html">即時報價</a>
            <div class="xx-shared-dropdown">
              <button type="button">服務項目</button>
              <div class="xx-shared-dropdown-panel">${linkList(serviceLinks)}</div>
            </div>
            <a class="xx-shared-booking" href="${esc(BOOKING_URL)}" data-xx-booking-link>立即預約</a>
          </nav>
        </div>
      </header>`;
  }

  function buildFooter() {
    return `
      <footer class="xx-shared-footer" data-xx-layout-part="footer" data-xx-version="${esc(VERSION)}">
        <div class="xx-shared-footer-grid">
          <section>
            <h3>玹翔旅遊</h3>
            <p>用心、貼心、深得你心。每一趟接送，都代表玹翔旅遊的品牌承諾。</p>
          </section>
          <section>
            <h3>服務項目</h3>
            <div class="xx-shared-footer-links">${linkList(serviceLinks.slice(0, 8))}</div>
          </section>
          <section>
            <h3>聯絡我們</h3>
            <p>電話：<a href="tel:${esc(phoneTel)}" data-xx-phone-link>${esc(phoneDisplay)}</a></p>
            <p>Email：<a href="mailto:${esc(email)}">${esc(email)}</a></p>
            <p>LINE：<a href="${esc(lineUrl)}" data-xx-line-link>@sco20240609</a></p>
          </section>
        </div>
        <div class="xx-shared-footer-bottom">© ${new Date().getFullYear()} 玹翔旅遊 Xuan Xiang Travel｜${esc(VERSION)}</div>
      </footer>`;
  }

  function buildFloating() {
    return `
      <div class="xx-shared-floating" data-xx-layout-part="floating" data-xx-version="${esc(VERSION)}" aria-label="快速聯絡">
        <a href="${esc(BOOKING_URL)}" data-xx-booking-link>預約</a>
        <a href="${esc(lineUrl)}" data-xx-line-link>LINE</a>
        <a href="tel:${esc(phoneTel)}" data-xx-phone-link>電話</a>
        <a href="${esc(whatsappUrl)}" data-xx-whatsapp-link>WhatsApp</a>
      </div>`;
  }

  function ensureHeader() {
    if (document.querySelector("[data-xx-layout-part='header']")) return;
    document.body.insertAdjacentHTML("afterbegin", buildHeader());
  }

  function ensureFooter() {
    if (document.querySelector("[data-xx-layout-part='footer']")) return;
    document.body.insertAdjacentHTML("beforeend", buildFooter());
  }

  function ensureFloating() {
    if (document.querySelector("[data-xx-layout-part='floating']")) return;
    document.body.insertAdjacentHTML("beforeend", buildFloating());
  }

  function guardLinks(root) {
    (root || document).querySelectorAll("a").forEach((link) => {
      if (link.dataset.xxV12LinkGuard === "1") return;
      link.dataset.xxV12LinkGuard = "1";
      if (!String(link.getAttribute("href") || "").trim()) link.setAttribute("href", "#");
      if (link.hasAttribute("data-xx-line-link")) link.setAttribute("href", lineUrl);
      if (link.hasAttribute("data-xx-phone-link")) link.setAttribute("href", `tel:${phoneTel}`);
      if (link.hasAttribute("data-xx-whatsapp-link")) link.setAttribute("href", whatsappUrl);
      if (link.hasAttribute("data-xx-booking-link")) link.setAttribute("href", BOOKING_URL);
    });
  }

  function guardImages(root) {
    (root || document).querySelectorAll("img").forEach((img) => {
      if (img.dataset.xxV12ImageGuard === "1") return;
      img.dataset.xxV12ImageGuard = "1";
      if (!img.getAttribute("alt")) img.setAttribute("alt", BRAND);
      if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
      img.addEventListener("error", function () {
        if (!this.src.includes("images/logo.jpg")) this.src = "images/logo.jpg";
      }, { once: true });
    });
  }

  function setupMobileMenu() {
    document.querySelectorAll("[data-xx-menu-button]").forEach((button) => {
      if (button.dataset.xxV12MenuReady === "1") return;
      button.dataset.xxV12MenuReady = "1";
      button.addEventListener("click", () => {
        const header = button.closest("[data-xx-layout-part='header']") || document;
        const panel = header.querySelector("[data-xx-menu-panel]");
        const isOpen = header.classList.toggle("is-menu-open");
        button.setAttribute("aria-expanded", String(isOpen));
        if (panel) panel.classList.toggle("is-open", isOpen);
      });
    });

    document.querySelectorAll(".xx-shared-dropdown > button").forEach((button) => {
      if (button.dataset.xxV12DropdownReady === "1") return;
      button.dataset.xxV12DropdownReady = "1";
      button.addEventListener("click", () => {
        const item = button.closest(".xx-shared-dropdown");
        if (item) item.classList.toggle("is-open");
      });
    });
  }

  function runGuards(root) {
    guardLinks(root || document);
    guardImages(root || document);
    setupMobileMenu();
  }

  function boot() {
    document.documentElement.dataset.xxSharedLayoutVersion = VERSION;
    document.body.dataset.xxSharedLayoutReady = "1";
    ensureHeader();
    ensureFooter();
    ensureFloating();
    runGuards(document);
    document.dispatchEvent(new CustomEvent("xx:shared-layout-ready", {
      detail: {
        version: VERSION,
        bookingMallVersion: cfg.BOOKING_MALL_VERSION || "v12",
        headerReady: Boolean(document.querySelector("[data-xx-layout-part='header']")),
        footerReady: Boolean(document.querySelector("[data-xx-layout-part='footer']")),
        floatingReady: Boolean(document.querySelector("[data-xx-layout-part='floating']"))
      }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
