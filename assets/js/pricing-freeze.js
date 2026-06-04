
/*
 * 玹翔旅遊 Ultimate Final v8.1｜價目表凍結列欄正式上線防呆版
 * 功能：凍結第一列 + A欄 + B欄、補齊 A～G 欄標題、手機滑動提示、效能節流、動態表格防呆。
 * 適用：airport-pricing / port-pricing / mountain-pricing / long-distance-pricing / tour-pricing
 */
(function () {
  'use strict';

  const CONFIG = {
    tableSelector: '.table-wrap table, .price-table-wrap table, table[data-xx-price-table]',
    wrapperSelector: '.table-wrap, .price-table-wrap',
    tableClass: 'xx-price-table',
    enhancedClass: 'xx-price-enhanced',
    headerClass: 'freeze-row-1',
    frozenCol1Class: 'freeze-col-1',
    frozenCol2Class: 'freeze-col-2',
    emptyCellText: '請洽客服',
    ariaLabel: '玹翔旅遊 A～G 欄價目表，第一列與 A、B 欄凍結，可左右滑動查看完整車型報價',
    minCol1Width: 132,
    minCol2Width: 132,
    maxColWidth: 220,
    observerThrottleMs: 120
  };

  const HEADER_LABELS = [
    '縣市',
    '行政區域',
    '舒適五人座',
    '尊榮商務車',
    'VITO',
    '阿法',
    '明星保母車'
  ];

  const processedTables = new WeakSet();
  let observer = null;
  let rafId = 0;
  let lastRun = 0;

  function warn(message, detail) {
    if (window.XUANXIANG_CONFIG?.AGENCY_UI?.qualityGuard?.consoleWarnings === false) return;
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
      :root{
        --xx-freeze-gold:#d8b56d;
        --xx-freeze-gold-2:#fff0b8;
        --xx-freeze-bg:#0b0906;
        --xx-freeze-card:#14110b;
        --xx-freeze-line:rgba(216,181,109,.28);
        --xx-freeze-text:#fff8e8;
        --xx-freeze-muted:#cfc3a8;
        --freeze-col-1:150px;
        --freeze-col-2:150px;
        --freeze-left-2:150px;
      }

      .table-wrap,
      .price-table-wrap{
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
      .price-table-wrap.xx-price-enhanced{
        scrollbar-color:var(--xx-freeze-gold) rgba(255,255,255,.08);
        scrollbar-width:thin;
      }

      .table-wrap.xx-price-enhanced::before,
      .price-table-wrap.xx-price-enhanced::before{
        content:'左右滑動查看更多車型報價';
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
        min-width:860px;
        border-collapse:separate !important;
        border-spacing:0;
        color:var(--xx-freeze-text);
        background:transparent;
        table-layout:auto;
      }

      .xx-price-table th,
      .xx-price-table td{
        position:relative;
        padding:15px 16px;
        min-width:118px;
        line-height:1.65;
        vertical-align:middle;
        border-right:1px solid rgba(216,181,109,.18);
        border-bottom:1px solid rgba(216,181,109,.18);
        background:rgba(20,17,11,.88);
        color:var(--xx-freeze-text);
        white-space:nowrap;
      }

      .xx-price-table th{
        font-weight:900;
        color:var(--xx-freeze-gold-2);
        letter-spacing:.04em;
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
      }

      @media(max-width:768px){
        .table-wrap.xx-price-enhanced::before,
        .price-table-wrap.xx-price-enhanced::before{
          display:block;
        }

        .xx-price-table{
          min-width:820px;
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
    wrapper.className = 'table-wrap';
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
    table.setAttribute('aria-label', table.getAttribute('aria-label') || CONFIG.ariaLabel);
    table.setAttribute('role', table.getAttribute('role') || 'table');
  }

  function enhanceWrapper(wrapper) {
    wrapper.classList.add(CONFIG.enhancedClass);
    wrapper.setAttribute('data-xx-price-scroll', 'true');
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
    apply: applyFreeze,
    schedule: scheduleApplyFreeze
  };
})();
