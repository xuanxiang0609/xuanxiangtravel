/*
 * 玹翔旅遊 Ultimate Final v8.1 Enterprise｜全站版型核心正式上線防呆版
 * Header、Footer、浮動 LINE／電話、手機選單、GA4、SEO、Schema、圖片 fallback 統一由此檔產生。
 */
(function () {
  "use strict";

  if (window.__XX_SITE_LAYOUT_BOOTED__) return;
  window.__XX_SITE_LAYOUT_BOOTED__ = true;

  const cfg = window.XUANXIANG_CONFIG || {};
  const contact = cfg.CONTACT || {};
  const guard = cfg.AGENCY_UI?.qualityGuard || {};

  const FALLBACKS = {
    brand: "玹翔旅遊",
    siteUrl: "https://xuanxiangtravel.com",
    logo: "images/logo.jpg",
    fallbackImage: guard.safeFallbackImage || "images/logo.jpg",
    phoneDisplay: "0972-268295",
    phoneTel: "0972268295",
    lineId: "@sco20240609",
    lineUrl: "https://line.me/R/ti/p/@sco20240609",
    whatsappUrl: "https://wa.me/886972268295"
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
          ${dropdown("服務介紹", cfg.SERVICES)}
          ${dropdown("價目表", cfg.PRICE_LINKS)}
          <a href="booking.html">VIP 預約商城</a>
          <a href="vehicles.html">車款介紹</a>
          ${dropdown("旅遊活動", cfg.TRAVEL_ACTIVITIES)}
          ${dropdown("玹翔小學堂", cfg.SCHOOL_LINKS)}
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
          <div class="xx-footer-actions"><a href="booking.html">立即預約</a><a href="#">查價目表</a></div>
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
    return `<div class="xx-float" aria-label="玹翔旅遊快速聯絡" data-xx-layout-part="floating">
      <a href="${esc(lineUrl())}" data-xx-line-link target="_blank" rel="noopener noreferrer">LINE</a>
      <a href="${esc(telHref())}" data-xx-phone-link>電話</a>
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
    window.dispatchEvent(new CustomEvent("xx:layout-ready", { detail: { version: cfg.VERSION || "v8.1", mounted: true } }));
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
    sameOriginPath
  };
})();
