/*
 * 玹翔旅遊 Ultimate Final v12.2 Enterprise｜全站輔助核心・共用導覽防呆正式營運版
 * 功能：Schema 補強、SEO 補強、圖片 fallback、外部連結安全、GA4 輔助事件、Booking Mall 與共用導覽版本追蹤。
 * 注意：Header / Footer / Floating 由 site-layout.js 負責，本檔不重複注入版型，只做防呆與追蹤同步。
 */
(function () {
  "use strict";

  if (window.__XX_SITE_HELPER_BOOTED__) return;
  window.__XX_SITE_HELPER_BOOTED__ = true;

  const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
  const contact = cfg.CONTACT || {};
  const seo = cfg.SEO || {};
  const guard = cfg.AGENCY_UI?.qualityGuard || cfg.GUARD || {};
  const SITE_HELPER_VERSION = cfg.SITE_HELPER_VERSION || "Ultimate Final v12.2 Site Helper";
  const BOOKING_MALL_VERSION = String(cfg.BOOKING_MALL_VERSION || cfg.BOOKING_VERSION || "v12");
  const LAYOUT_VERSION = cfg.LAYOUT_VERSION || "Ultimate Final v12.2 Shared Layout Core";
  const BOOKING_URL = cfg.BOOKING_URL || "booking.html";

  const FALLBACK = {
    brand: "玹翔旅遊",
    siteUrl: "https://xuanxiangtravel.com",
    logo: "https://xuanxiangtravel.com/images/logo.jpg",
    localLogo: "images/logo.jpg",
    phone: "+886972268295",
    email: "xuanxiang0609@gmail.com",
    description: "玹翔旅遊提供機場接送、港口接送、旅遊包車、登山包車、商務專車與高端包車服務。",
    bookingUrl: "booking.html",
    lineUrl: "https://line.me/R/ti/p/@sco20240609",
    whatsappUrl: "https://wa.me/886972268295"
  };

  let dynamicObserver = null;

  function warn(message, detail) {
    if (guard.consoleWarnings === false) return;
    if (typeof console !== "undefined") console.warn(`[玹翔 site.js 防呆] ${message}`, detail || "");
  }

  function safeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function safeUrl(value, fallback = "#") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function siteUrl() {
    return safeUrl(cfg.SITE_URL, FALLBACK.siteUrl).replace(/\/$/, "");
  }

  function canonicalUrl() {
    const path = location.pathname.replace(/^\/+/, "") || "index.html";
    return `${siteUrl()}/${path === "index.html" ? "" : path}`;
  }

  function currentPage() {
    return location.pathname.split("/").pop() || "index.html";
  }

  function ensureMeta(selector, createAttrs = {}) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      Object.entries(createAttrs).forEach(([key, value]) => el.setAttribute(key, value));
      document.head.appendChild(el);
    }
    return el;
  }

  function ensureCanonical() {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl();
  }

  function upsertJsonLd(id, data) {
    if (!id || !data) return;
    document.querySelectorAll(`script[data-xx-schema="${id}"]`).forEach((node) => node.remove());
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.xxSchema = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function buildTravelAgencySchema() {
    const brand = safeText(contact.brand, FALLBACK.brand);
    const image = safeUrl(seo.image, FALLBACK.logo);
    return {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "@id": `${siteUrl()}/#travelagency`,
      name: brand,
      alternateName: "Xuan Xiang Travel",
      url: siteUrl(),
      telephone: safeText(contact.phoneDisplay || contact.phoneTel, FALLBACK.phone),
      email: safeText(contact.email, FALLBACK.email),
      priceRange: "$$",
      image,
      logo: image,
      description: safeText(seo.defaultDescription, FALLBACK.description),
      additionalProperty: [
        { "@type": "PropertyValue", name: "siteHelperVersion", value: SITE_HELPER_VERSION },
        { "@type": "PropertyValue", name: "bookingMallVersion", value: BOOKING_MALL_VERSION },
        { "@type": "PropertyValue", name: "layoutVersion", value: LAYOUT_VERSION }
      ],
      areaServed: [
        { "@type": "AdministrativeArea", name: "Taiwan" },
        { "@type": "AdministrativeArea", name: "中南部區域" }
      ],
      serviceType: [
        "機場接送",
        "港口接送",
        "旅遊包車",
        "商務包車",
        "長途接送",
        "登山包車",
        "演唱會專車"
      ],
      sameAs: [
        contact.lineUrl,
        contact.whatsappUrl,
        contact.instagram,
        contact.threads,
        contact.facebook,
        contact.youtube,
        contact.x,
        contact.tiktok
      ].filter(Boolean)
    };
  }

  function buildWebsiteSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl()}/#website`,
      name: safeText(contact.brand, FALLBACK.brand),
      url: siteUrl(),
      inLanguage: "zh-Hant-TW",
      publisher: {
        "@id": `${siteUrl()}/#travelagency`
      },
      potentialAction: {
        "@type": "ReserveAction",
        target: `${siteUrl()}/${BOOKING_URL}`,
        name: "玹翔旅遊線上預約"
      }
    };
  }

  function buildFaqSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "什麼時候算預約成功？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "完成客服確認與訂金支付後，才會正式保留車輛與司機。"
          }
        },
        {
          "@type": "Question",
          name: "可以指定車型嗎？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "可依需求指定五人座、九人座、Lexus LM、Toyota Alphard、Mercedes-Benz Sprinter 等車型，實際安排以客服確認為準。"
          }
        },
        {
          "@type": "Question",
          name: "行李很多怎麼辦？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "請在預約時提供行李數量與尺寸，客服會依乘客人數、行李量與路線協助評估適合車型。"
          }
        },
        {
          "@type": "Question",
          name: "可以開收據或統編嗎？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "可以，公司行號長期配合、收據與統編需求，請在預約時提前告知。"
          }
        }
      ]
    };
  }

  function injectSchemas() {
    upsertJsonLd("site-travelagency", buildTravelAgencySchema());
    upsertJsonLd("site-website", buildWebsiteSchema());
    if (currentPage() === "faq.html") upsertJsonLd("site-faq", buildFaqSchema());
  }

  function enhanceSeo() {
    ensureCanonical();

    const description = safeText(
      document.querySelector('meta[name="description"]')?.content,
      safeText(seo.defaultDescription, FALLBACK.description)
    );

    const descMeta = ensureMeta('meta[name="description"]', { name: "description" });
    if (!descMeta.content) descMeta.content = description;

    const robotsMeta = ensureMeta('meta[name="robots"]', { name: "robots" });
    if (!robotsMeta.content && currentPage() !== "404.html") robotsMeta.content = "index,follow,max-image-preview:large";

    [
      ["og:title", document.title || safeText(contact.brand, FALLBACK.brand)],
      ["og:description", description],
      ["og:type", "website"],
      ["og:url", canonicalUrl()],
      ["og:image", safeUrl(seo.image, FALLBACK.logo)],
      ["og:site_name", safeText(contact.brand, FALLBACK.brand)],
      ["og:locale", "zh_TW"]
    ].forEach(([property, content]) => {
      const meta = ensureMeta(`meta[property="${property}"]`, { property });
      meta.content = content;
    });

    const twitterCard = ensureMeta('meta[name="twitter:card"]', { name: "twitter:card" });
    twitterCard.content = "summary_large_image";
  }

  function normalizeLinks(root = document) {
    root.querySelectorAll("a").forEach((link) => {
      if (link.dataset.xxSiteHelperLinkReady === "1") return;
      link.dataset.xxSiteHelperLinkReady = "1";

      const href = link.getAttribute("href") || "";
      if (!href.trim()) link.setAttribute("href", "#");

      const finalHref = link.getAttribute("href") || "";
      if (link.hasAttribute("data-xx-booking-link") || finalHref.includes("booking.html")) {
        link.setAttribute("href", BOOKING_URL || FALLBACK.bookingUrl);
        link.dataset.xxBookingLinkReady = "1";
      }

      if (link.hasAttribute("data-xx-line-link") || finalHref.includes("line.me") || finalHref.includes("lin.ee")) {
        link.setAttribute("href", contact.lineUrl || FALLBACK.lineUrl);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }

      if (link.hasAttribute("data-xx-whatsapp-link") || finalHref.includes("wa.me") || finalHref.includes("whatsapp.com")) {
        link.setAttribute("href", contact.whatsappUrl || FALLBACK.whatsappUrl);
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }

      if (/^https?:\/\//i.test(link.getAttribute("href") || "") && !(link.getAttribute("href") || "").includes(location.hostname)) {
        link.setAttribute("target", link.getAttribute("target") || "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  function enhanceImages(root = document) {
    root.querySelectorAll("img").forEach((img) => {
      if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
      if (!img.getAttribute("decoding")) img.setAttribute("decoding", "async");
      if (!img.getAttribute("alt")) img.setAttribute("alt", safeText(contact.brand, FALLBACK.brand));
      img.dataset.xxSiteHelperImageReady = "1";
      img.addEventListener("error", function () {
        if (this.dataset.xxSiteFallback === "1") return;
        this.dataset.xxSiteFallback = "1";
        this.src = safeUrl(guard.safeFallbackImage, FALLBACK.localLogo);
      }, { once: true });
    });
  }

  function trackEvent(name, params = {}) {
    const finalParams = {
      site_helper_version: SITE_HELPER_VERSION,
      booking_mall_version: BOOKING_MALL_VERSION,
      layout_version: LAYOUT_VERSION,
      page_path: location.pathname,
      ...params
    };
    if (window.XXAnalytics && typeof window.XXAnalytics.trackEvent === "function") {
      window.XXAnalytics.trackEvent(name, finalParams);
      return;
    }
    if (typeof window.gtag === "function") window.gtag("event", name, finalParams);
  }

  function bindUtilityEvents() {
    if (window.__XX_SITE_UTILITY_EVENTS__) return;
    window.__XX_SITE_UTILITY_EVENTS__ = true;

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      const payload = {
        page_path: location.pathname,
        link_text: safeText(link.textContent).slice(0, 80),
        link_url: href
      };

      if (href.includes("line.me") || href.includes("lin.ee") || link.hasAttribute("data-xx-line-link")) {
        trackEvent("line_click", { method: "LINE_OA", ...payload });
      } else if (href.startsWith("tel:")) {
        trackEvent("phone_click", { method: "PHONE", ...payload });
      } else if (href.includes("wa.me") || href.includes("whatsapp.com") || link.hasAttribute("data-xx-whatsapp-link")) {
        trackEvent("whatsapp_click", { method: "WHATSAPP", ...payload });
      } else if (href.includes("booking.html") || link.hasAttribute("data-xx-booking-link")) {
        trackEvent("booking_cta_click", { method: "SITE_CTA", ...payload });
      }
    }, true);
  }

  function observeDynamicContent() {
    if (dynamicObserver || !document.body) return;
    dynamicObserver = new MutationObserver((mutations) => {
      const shouldRun = mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node instanceof Element));
      if (!shouldRun) return;
      normalizeLinks(document);
      enhanceImages(document);
    });
    dynamicObserver.observe(document.body, { childList: true, subtree: true });
  }

  function run() {
    try {
      enhanceSeo();
      injectSchemas();
      normalizeLinks(document);
      enhanceImages(document);
      bindUtilityEvents();
      observeDynamicContent();
      window.dispatchEvent(new CustomEvent("xx:site-helper-ready", {
        detail: {
          version: SITE_HELPER_VERSION,
          siteVersion: cfg.SITE_VERSION || cfg.VERSION || "Ultimate Final v12 Booking Mall",
          bookingMallVersion: BOOKING_MALL_VERSION,
          layoutVersion: LAYOUT_VERSION,
          page: currentPage(),
          canonicalUrl: canonicalUrl()
        }
      }));
    } catch (error) {
      warn("site.js 初始化失敗，已避免中斷全站", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  window.XXSiteHelper = {
    run,
    enhanceSeo,
    injectSchemas,
    normalizeLinks,
    enhanceImages,
    trackEvent,
    version: SITE_HELPER_VERSION,
    bookingMallVersion: BOOKING_MALL_VERSION,
    layoutVersion: LAYOUT_VERSION,
    bookingUrl: BOOKING_URL
  };
})();
/* === Home Sync Carousel｜首頁 FB最新消息・最新活動・熱門旅遊輪播 === */
(function(){
  const root = document.querySelector('[data-home-carousel]');
  if(!root) return;

  const slides = Array.from(root.querySelectorAll('.home-slide'));
  const dots = Array.from(root.querySelectorAll('[data-carousel-dot]'));
  const prev = root.querySelector('[data-carousel-prev]');
  const next = root.querySelector('[data-carousel-next]');

  if(!slides.length) return;

  let index = 0;
  let timer = null;

  function show(i){
    index = (i + slides.length) % slides.length;

    slides.forEach((slide, n) => {
      slide.classList.toggle('is-active', n === index);
    });

    dots.forEach((dot, n) => {
      dot.classList.toggle('is-active', n === index);
    });
  }

  function start(){
    stop();
    timer = setInterval(() => show(index + 1), 6500);
  }

  function stop(){
    if(timer) clearInterval(timer);
    timer = null;
  }

  prev && prev.addEventListener('click', () => {
    show(index - 1);
    start();
  });

  next && next.addEventListener('click', () => {
    show(index + 1);
    start();
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      show(Number(dot.dataset.carouselDot || 0));
      start();
    });
  });

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  show(0);
  start();
})();

/* === Facebook Page Plugin Parse Fix｜FB 貼文動態重新解析 === */
(function(){
  function parseFacebookPlugin(){
    if(window.FB && typeof window.FB.XFBML !== 'undefined'){
      try{
        window.FB.XFBML.parse();
      }catch(err){
        console.warn('Facebook XFBML parse failed', err);
      }
    }
  }

  window.addEventListener('load', function(){
    setTimeout(parseFacebookPlugin, 800);
    setTimeout(parseFacebookPlugin, 1800);
    setTimeout(parseFacebookPlugin, 3200);
  });

  document.addEventListener('click', function(e){
    if(e.target && (e.target.matches('[data-carousel-dot]') || e.target.matches('[data-carousel-next]') || e.target.matches('[data-carousel-prev]'))){
      setTimeout(parseFacebookPlugin, 350);
    }
  });
})();
