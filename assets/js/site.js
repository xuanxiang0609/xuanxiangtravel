/*
 * 玹翔旅遊 Ultimate Final v8.1 Enterprise｜全站輔助核心正式上線防呆版
 * 功能：Schema 補強、SEO 補強、圖片 fallback、外部連結安全、GA4 輔助事件。
 * 注意：Header / Footer / Floating 由 site-layout.js 負責，本檔不重複注入版型。
 */
(function () {
  "use strict";

  if (window.__XX_SITE_HELPER_BOOTED__) return;
  window.__XX_SITE_HELPER_BOOTED__ = true;

  const cfg = window.XUANXIANG_CONFIG || {};
  const contact = cfg.CONTACT || {};
  const seo = cfg.SEO || {};
  const guard = cfg.AGENCY_UI?.qualityGuard || {};

  const FALLBACK = {
    brand: "玹翔旅遊",
    siteUrl: "https://xuanxiangtravel.com",
    logo: "https://xuanxiangtravel.com/images/logo.jpg",
    localLogo: "images/logo.jpg",
    phone: "+886972268295",
    email: "xuanxiang0609@gmail.com",
    description: "玹翔旅遊提供機場接送、港口接送、旅遊包車、登山包車、商務專車與高端包車服務。"
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
      const href = link.getAttribute("href") || "";
      if (!href.trim()) link.setAttribute("href", "#");
      if (/^https?:\/\//i.test(href) && !href.includes(location.hostname)) {
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
      img.addEventListener("error", function () {
        if (this.dataset.xxSiteFallback === "1") return;
        this.dataset.xxSiteFallback = "1";
        this.src = safeUrl(guard.safeFallbackImage, FALLBACK.localLogo);
      }, { once: true });
    });
  }

  function trackEvent(name, params = {}) {
    if (window.XXAnalytics && typeof window.XXAnalytics.trackEvent === "function") {
      window.XXAnalytics.trackEvent(name, params);
      return;
    }
    if (typeof window.gtag === "function") window.gtag("event", name, params);
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
      } else if (href.includes("booking.html")) {
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
        detail: { version: cfg.VERSION || "v8.1", page: currentPage() }
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
    trackEvent
  };
})();