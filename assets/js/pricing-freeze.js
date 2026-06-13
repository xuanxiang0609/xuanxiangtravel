/*
 * 玹翔旅遊 Ultimate Final v12.2｜Booking Mall 價目表凍結列欄・共用導覽防呆強化版
 * 功能：凍結第一列 + A欄 + B欄、補齊 A～G 欄標題、手機滑動提示、效能節流、動態表格防呆、v12.2 設定同步、共用 CSS/JS 版本追蹤。
 */
(function () {
  'use strict';

  const CONFIG = {
    version: 'Ultimate Final v12.2 Pricing Freeze',
    bookingMallVersion: 'v12',
    layoutVersion: 'Ultimate Final v12.2 Shared Layout Core',
    cssVersion: 'Ultimate Final v12.2 Shared Black Gold CSS',
    navVersion: 'Ultimate Final v12.2 Unified Navigation',
    tableSelector: '.table-wrap table, .price-table-wrap table, .booking-price-wrap table, table[data-xx-price-table]',
    wrapperSelector: '.table-wrap, .price-table-wrap, .booking-price-wrap',
    tableClass: 'xx-price-table',
    enhancedClass: 'xx-price-enhanced',
    v12Class: 'xx-price-v12',
    headerClass: 'freeze-row-1',
    frozenCol1Class: 'freeze-col-1',
    frozenCol2Class: 'freeze-col-2',
    emptyCellText: '請洽客服',
    ariaLabel: '玹翔旅遊 v12 A～G 欄價目表，第一列與 A、B 欄凍結，可左右滑動查看完整車型報價',
    minCol1Width: 142,
    minCol2Width: 142,
    maxColWidth: 240,
    observerThrottleMs: 120,
    enableSharedLayoutSync: true,
    enableMutationGuard: true,
    readyEventName: 'xx:pricing-freeze-ready'
  };

  function getRuntimeConfig() {
    const cfg = window.XUANXIANG_CONFIG || window.XX_CONFIG || window.XX || {};
    return cfg && typeof cfg === 'object' ? cfg : {};
  }

  function syncRuntimeConfig() {
    const cfg = getRuntimeConfig();
    CONFIG.bookingMallVersion = String(cfg.BOOKING_MALL_VERSION || cfg.BOOKING_VERSION || CONFIG.bookingMallVersion || 'v12');
    CONFIG.layoutVersion = String(cfg.LAYOUT_VERSION || CONFIG.layoutVersion);
    CONFIG.cssVersion = String(cfg.CSS_VERSION || CONFIG.cssVersion);
    CONFIG.navVersion = String(cfg.NAV_VERSION || CONFIG.navVersion);
    return cfg;
  }

  const HEADER_LABELS = [
    '縣市',
    '行政區域',
    '舒適五人座',
    '豪華九人座',
    'VITO',
    '阿法',
    '明星保母車'
  ];

  const processedTables = new WeakSet();
  let observer = null;
  let rafId = 0;
  let lastRun = 0;

  function warn(message, detail) {
    const cfg = getRuntimeConfig();
    if (cfg?.AGENCY_UI?.qualityGuard?.consoleWarnings === false || cfg?.GUARD?.consoleWarnings === false) return;
    if (typeof console !== 'undefined') console.warn(`[玹翔價目表防呆] ${message}`, detail || '');
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function textOf(element) {
    return String(element?.textContent || '').trim();
  }

  function ensureGlobalStyles() {
    if (document.getElementById('xx-pricing-freeze-style')) return;

    const style = document.createElement('style');
    style.id = 'xx-pricing-freeze-style';
    style.textContent = `
      /* ${CONFIG.version}｜${CONFIG.cssVersion} */
      :root{
        --xx-freeze-gold:#d8b56d;
        --xx-freeze-gold-2:#fff0b8;
        --xx-freeze-bg:#080706;
        --xx-freeze-card:#15110a;
        --xx-freeze-line:rgba(216,181,109,.34);
        --xx-freeze-text:#fff8e8;
        --xx-freeze-muted:#cfc3a8;
        --freeze-col-1:160px;
        --freeze-col-2:160px;
        --freeze-left-2:160px;
      }

      .table-wrap,
      .price-table-wrap,
      .booking-price-wrap{
        position:relative;
        width:100%;
        overflow:auto;
        -webkit-overflow-scrolling:touch;
        border:1px solid var(--xx-freeze-line);
        border-radius:22px;
        background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015)),var(--xx-freeze-bg);
        box-shadow:0 22px 60px rgba(0,0,0,.48);
      }

      .table-wrap.xx-price-enhanced,
      .price-table-wrap.xx-price-enhanced,
      .booking-price-wrap.xx-price-enhanced{
        scrollbar-color:var(--xx-freeze-gold) rgba(255,255,255,.08);
        scrollbar-width:thin;
      }

      .table-wrap.xx-price-enhanced::before,
      .price-table-wrap.xx-price-enhanced::before,
      .booking-price-wrap.xx-price-enhanced::before{
        content:'左右滑動查看更多車型與完整報價';
        position:sticky;
        left:0;
        top:0;
        z-index:12;
        display:none;
        padding:10px 14px;
        color:#201305;
        font-size:.86rem;
        font-weight:900;
        letter-spacing:.04em;
        background:linear-gradient(135deg,var(--xx-freeze-gold-2),var(--xx-freeze-gold));
        border-bottom:1px solid rgba(0,0,0,.18);
      }

      .xx-price-table{
        width:100%;
        min-width:920px;
        border-collapse:separate !important;
        border-spacing:0;
        color:var(--xx-freeze-text);
        background:transparent;
        table-layout:auto;
      }

      .xx-price-table th,
      .xx-price-table td{
        position:relative;
        padding:16px 18px;
        min-width:126px;
        line-height:1.7;
        vertical-align:middle;
        border-right:1px solid rgba(216,181,109,.18);
        border-bottom:1px solid rgba(216,181,109,.18);
        background:rgba(20,17,11,.88);
        color:var(--xx-freeze-text);
        white-space:nowrap;
        font-size:15px;
      }

      .xx-price-table th{
        font-weight:900;
        color:var(--xx-freeze-gold-2);
        letter-spacing:.04em;
        font-size:15px;
      }

      .xx-price-table .freeze-row-1 > th,
      .xx-price-table .freeze-row-1 > td{
        position:sticky;
        top:0;
        z-index:8;
        background:linear-gradient(180deg,#2a2112,#120e08);
        box-shadow:0 6px 18px rgba(0,0,0,.35);
      }

      .xx-price-table .freeze-col-1,
      .xx-price-table .freeze-col-2{
        position:sticky;
        z-index:7;
        background:linear-gradient(180deg,#181208,#100d08);
        color:var(--xx-freeze-gold-2);
        font-weight:800;
        box-shadow:6px 0 18px rgba(0,0,0,.22);
      }

      .xx-price-table .freeze-col-1{
        left:0;
        min-width:var(--freeze-col-1,150px);
        width:var(--freeze-col-1,150px);
      }

      .xx-price-table .freeze-col-2{
        left:var(--freeze-left-2,150px);
        min-width:var(--freeze-col-2,150px);
        width:var(--freeze-col-2,150px);
      }

      .xx-price-table .freeze-row-1 .freeze-col-1,
      .xx-price-table .freeze-row-1 .freeze-col-2{
        z-index:11;
        background:linear-gradient(135deg,var(--xx-freeze-gold-2),var(--xx-freeze-gold));
        color:#130c04;
      }

      .xx-price-table tr:hover td{
        background:rgba(216,181,109,.08);
      }

      .xx-price-table tr:hover .freeze-col-1,
      .xx-price-table tr:hover .freeze-col-2{
        background:linear-gradient(180deg,#241a0c,#141009);
      }

      .xx-price-empty-cell{
        color:var(--xx-freeze-muted) !important;
        opacity:.82;
        font-style:normal;
      }

      .xx-price-table[data-xx-pricing-version="v12"]{
        isolation:isolate;
      }

      .xx-price-table caption{
        caption-side:top;
        padding:12px 14px;
        color:var(--xx-freeze-gold-2);
        font-weight:900;
        text-align:left;
      }

      @media(max-width:768px){
        .table-wrap.xx-price-enhanced::before,
        .price-table-wrap.xx-price-enhanced::before,
        .booking-price-wrap.xx-price-enhanced::before{
          display:block;
        }

        .xx-price-table{
          min-width:880px;
        }

        .xx-price-table th,
        .xx-price-table td{
          padding:13px 12px;
          font-size:.94rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureWrapper(table) {
    const currentWrapper = table.closest(CONFIG.wrapperSelector);
    if (currentWrapper) return currentWrapper;

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrap booking-price-wrap';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
    return wrapper;
  }

  function ensureColGroup(table, col1Width, col2Width) {
    let colgroup = table.querySelector('colgroup');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      table.insertBefore(colgroup, table.firstChild);
    }

    const totalCols = Math.max(HEADER_LABELS.length, table.querySelector('tr')?.children.length || HEADER_LABELS.length);
    const otherCols = Math.max(0, totalCols - 2);

    colgroup.innerHTML = [
      `<col style="width:${col1Width}px">`,
      `<col style="width:${col2Width}px">`,
      otherCols ? `<col span="${otherCols}">` : ''
    ].join('');
  }

  function convertCellToTh(cell) {
    if (!cell || cell.tagName.toLowerCase() === 'th') return cell;
    const th = document.createElement('th');
    th.innerHTML = cell.innerHTML;
    Array.from(cell.attributes).forEach((attr) => th.setAttribute(attr.name, attr.value));
    cell.replaceWith(th);
    return th;
  }

  function normalizeHeaderRow(table) {
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;

    firstRow.classList.add(CONFIG.headerClass);
    const originalCells = Array.from(firstRow.children);

    originalCells.forEach((cell) => convertCellToTh(cell));

    const cells = Array.from(firstRow.children);
    HEADER_LABELS.forEach((label, index) => {
      if (!cells[index]) {
        const th = document.createElement('th');
        th.textContent = label;
        firstRow.appendChild(th);
        return;
      }
      if (!textOf(cells[index])) cells[index].textContent = label;
    });
  }

  function normalizeFrozenCells(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach((row) => {
      Array.from(row.children).forEach((cell) => {
        cell.classList.remove(CONFIG.headerClass, CONFIG.frozenCol1Class, CONFIG.frozenCol2Class, 'xx-price-empty-cell');
      });
    });

    rows.forEach((row, rowIndex) => {
      if (rowIndex === 0) row.classList.add(CONFIG.headerClass);
      const cells = Array.from(row.children);

      cells.forEach((cell, cellIndex) => {
        if (cellIndex === 0) cell.classList.add(CONFIG.frozenCol1Class);
        if (cellIndex === 1) cell.classList.add(CONFIG.frozenCol2Class);
        if (rowIndex > 0 && !textOf(cell)) {
          cell.textContent = CONFIG.emptyCellText;
          cell.classList.add('xx-price-empty-cell');
        }
      });
    });
  }

  function measureFrozenWidths(table) {
    const firstRow = table.querySelector('tr');
    const cells = Array.from(firstRow?.children || []);
    const col1 = clampNumber(cells[0]?.offsetWidth || CONFIG.minCol1Width, CONFIG.minCol1Width, CONFIG.maxColWidth);
    const col2 = clampNumber(cells[1]?.offsetWidth || CONFIG.minCol2Width, CONFIG.minCol2Width, CONFIG.maxColWidth);
    return { col1, col2 };
  }

  function applyTableAccessibility(table) {
    table.classList.add(CONFIG.tableClass);
    table.dataset.xxPricingVersion = CONFIG.bookingMallVersion || 'v12';
    table.dataset.xxPricingFreezeVersion = CONFIG.version;
    table.dataset.xxSharedLayoutVersion = CONFIG.layoutVersion;
    table.dataset.xxSharedCssVersion = CONFIG.cssVersion;
    table.setAttribute('aria-label', table.getAttribute('aria-label') || CONFIG.ariaLabel);
    table.setAttribute('role', table.getAttribute('role') || 'table');
  }

  function enhanceWrapper(wrapper) {
    wrapper.classList.add(CONFIG.enhancedClass, CONFIG.v12Class);
    wrapper.setAttribute('data-xx-price-scroll', 'true');
    wrapper.setAttribute('data-xx-pricing-freeze-version', CONFIG.version);
    wrapper.setAttribute('data-xx-shared-layout-version', CONFIG.layoutVersion);
    wrapper.setAttribute('tabindex', wrapper.getAttribute('tabindex') || '0');
    wrapper.setAttribute('aria-label', wrapper.getAttribute('aria-label') || '價目表可橫向滑動');
  }

  function enhanceTable(table) {
    if (!table || !(table instanceof HTMLTableElement)) return;
    if (!table.querySelector('tr')) return;

    ensureGlobalStyles();

    const wrapper = ensureWrapper(table);
    enhanceWrapper(wrapper);
    applyTableAccessibility(table);
    normalizeHeaderRow(table);
    normalizeFrozenCells(table);

    const widths = measureFrozenWidths(table);
    table.style.setProperty('--freeze-col-1', `${widths.col1}px`);
    table.style.setProperty('--freeze-col-2', `${widths.col2}px`);
    table.style.setProperty('--freeze-left-2', `${widths.col1}px`);
    ensureColGroup(table, widths.col1, widths.col2);

    processedTables.add(table);
  }

  function applyFreeze() {
    const tables = Array.from(document.querySelectorAll(CONFIG.tableSelector));
    if (!tables.length) return;

    tables.forEach((table) => {
      try {
        enhanceTable(table);
      } catch (error) {
        warn('價目表升級失敗，已略過單一表格', error);
      }
    });
  }

  function scheduleApplyFreeze() {
    const now = Date.now();
    const diff = now - lastRun;
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      if (diff < CONFIG.observerThrottleMs) {
        setTimeout(applyFreeze, CONFIG.observerThrottleMs - diff);
        return;
      }
      lastRun = Date.now();
      applyFreeze();
    });
  }

  function initObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      const shouldRun = mutations.some((mutation) => {
        if (mutation.type !== 'childList') return false;
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof Element)) return false;
          return node.matches?.(CONFIG.tableSelector) || node.querySelector?.(CONFIG.tableSelector);
        });
      });
      if (shouldRun) scheduleApplyFreeze();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    syncRuntimeConfig();
    ensureGlobalStyles();
    applyFreeze();
    initObserver();
    window.addEventListener('resize', scheduleApplyFreeze, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.XXPricingFreeze = {
    version: CONFIG.version,
    bookingMallVersion: CONFIG.bookingMallVersion,
    layoutVersion: CONFIG.layoutVersion,
    cssVersion: CONFIG.cssVersion,
    navVersion: CONFIG.navVersion,
    apply: applyFreeze,
    schedule: scheduleApplyFreeze,
    syncRuntimeConfig
  };

  document.dispatchEvent(new CustomEvent(CONFIG.readyEventName, {
    detail: {
      version: CONFIG.version,
      bookingMallVersion: CONFIG.bookingMallVersion,
      layoutVersion: CONFIG.layoutVersion,
      cssVersion: CONFIG.cssVersion,
      navVersion: CONFIG.navVersion,
      tableSelector: CONFIG.tableSelector,
      enhancedTables: document.querySelectorAll('.xx-price-table').length
    }
  }));
})();
