/**
 * ======================================================
 * 玹翔旅遊 V39.2.4.4 Enterprise Final
 * DispatchWeekView.js｜Week View Render Engine
 * ======================================================
 *
 * 職責：
 * 1. 接收 Week View 標準資料
 * 2. 渲染週日期範圍與摘要
 * 3. 建立週一至週日七日欄位
 * 4. 使用 Shared DispatchCard 渲染派車卡片
 * 5. 處理 Loading／Error／Empty State
 * 6. 派送上一週／本週／下一週導覽事件
 *
 * 不負責：
 * - google.script.run
 * - SpreadsheetApp
 * - HtmlService
 * - 訂單資料讀取
 * - 週日期範圍計算
 * - 後端 API 呼叫
 */

(function (global) {
  'use strict';

  const WEEK_VIEW_RENDER_CONFIG = Object.freeze({
    VERSION: 'V39.2.4.4 Week View Render Engine',

    NAVIGATION_EVENT:
      'dispatch-week-view-navigation',

    REFRESH_EVENT:
      'dispatch-week-view-refresh',

    DATE_CHANGE_EVENT:
      'dispatch-week-view-date-change',

    CARD_OPTIONS: Object.freeze({
      compact: true,
      showTime: true,
      showDriver: true,
      showCustomer: true,
      showRoute: true,
      showVehicle: true,
      showAmount: true,
      showOrderNo: true,
      showStatus: true,
      showConflict: true,
      showRecommendation: false,
      showActions: false
    }),

    DAY_LABELS: Object.freeze([
      '星期一',
      '星期二',
      '星期三',
      '星期四',
      '星期五',
      '星期六',
      '星期日'
    ])
  });


  /* ====================================================
   * Public Render API
   * ==================================================== */

  /**
   * 渲染完整 Week View。
   *
   * @param {Object} weekData Week View 資料
   * @return {Object}
   */
  function renderWeekView(weekData) {
    try {
      const data =
        normalizeWeekViewData_(weekData);

      hideWeekViewLoading();
      hideWeekViewError();

      renderWeekRange_(data.weekRange);
      renderWeekSummary(data.summary);
      renderWeekGeneratedAt_(
        data.generatedAt
      );

      if (data.events.length === 0) {
        showWeekViewEmpty();
        clearWeekViewGrid_();

        return {
          ok: true,
          empty: true,
          renderedDays: 0,
          renderedEvents: 0,
          version:
            WEEK_VIEW_RENDER_CONFIG.VERSION
        };
      }

      hideWeekViewEmpty();
      renderWeekGrid(data.days);

      return {
        ok: true,
        empty: false,
        renderedDays: data.days.length,
        renderedEvents: data.events.length,
        version:
          WEEK_VIEW_RENDER_CONFIG.VERSION
      };
    } catch (error) {
      const message =
        getWeekViewRenderErrorMessage_(
          error
        );

      showWeekViewError(message);

      return {
        ok: false,
        empty: true,
        renderedDays: 0,
        renderedEvents: 0,
        message: message,
        version:
          WEEK_VIEW_RENDER_CONFIG.VERSION
      };
    }
  }


  /**
   * 渲染本週摘要。
   *
   * @param {Object} summary
   */
  function renderWeekSummary(summary) {
    const data = summary || {};

    const totalOrders =
      normalizeWeekViewNumber_(
        data.totalOrders
      );

    const totalDrivers =
      normalizeWeekViewNumber_(
        data.totalDrivers
      );

    const totalConflicts =
      normalizeWeekViewNumber_(
        data.totalConflicts
      );

    const totalRevenue =
      normalizeWeekViewNumber_(
        data.totalRevenue
      );

    setWeekViewText_(
      'summaryTotalOrders',
      totalOrders
    );

    setWeekViewText_(
      'summaryTotalDrivers',
      totalDrivers
    );

    setWeekViewText_(
      'summaryTotalConflicts',
      totalConflicts
    );

    setWeekViewText_(
      'summaryTotalRevenue',
      formatWeekViewCurrency_(
        totalRevenue
      )
    );

    const summaryText = [
      '共 ' + totalOrders + ' 筆訂單',
      totalDrivers + ' 位司機'
    ];

    if (totalConflicts > 0) {
      summaryText.push(
        '⚠️ ' +
        totalConflicts +
        ' 筆衝突'
      );
    }

    setWeekViewText_(
      'weekSummaryText',
      summaryText.join('｜')
    );

    const conflictElement =
      getWeekViewElement_(
        'summaryTotalConflicts'
      );

    if (conflictElement) {
      conflictElement.classList.toggle(
        'has-conflict',
        totalConflicts > 0
      );
    }
  }


  /**
   * 建立七日 Grid。
   *
   * @param {Object[]} days
   */
  function renderWeekGrid(days) {
    const grid =
      getWeekViewElement_('weekGrid');

    const template =
      getWeekViewElement_(
        'weekDayColumnTemplate'
      );

    if (!grid) {
      throw new Error(
        '找不到 Week View Grid：#weekGrid'
      );
    }

    if (!template || !template.content) {
      throw new Error(
        '找不到 Week View 日期模板：' +
        '#weekDayColumnTemplate'
      );
    }

    grid.innerHTML = '';

    const normalizedDays =
      normalizeWeekViewDays_(days);

    const fragment =
      document.createDocumentFragment();

    normalizedDays.forEach(
      function (day, index) {
        fragment.appendChild(
          renderWeekDay(
            day,
            template,
            index
          )
        );
      }
    );

    grid.appendChild(fragment);
    grid.hidden = false;
  }


  /**
   * 建立單日欄位。
   *
   * @param {Object} day
   * @param {HTMLTemplateElement} template
   * @param {number} index
   * @return {HTMLElement}
   */
  function renderWeekDay(
    day,
    template,
    index
  ) {
    const fragment =
      template.content.cloneNode(true);

    const column =
      fragment.querySelector(
        '.week-day-column'
      );

    if (!column) {
      throw new Error(
        'Week View 日期模板缺少 ' +
        '.week-day-column。'
      );
    }

    column.dataset.date =
      day.date || '';

    column.dataset.dayIndex =
      String(index);

    if (day.isToday) {
      column.classList.add('is-today');
    }

    setWeekViewElementText_(
      fragment.querySelector(
        '.week-day-label'
      ),
      day.dayLabel ||
      WEEK_VIEW_RENDER_CONFIG
        .DAY_LABELS[index] ||
      ''
    );

    setWeekViewElementText_(
      fragment.querySelector(
        '.week-day-date'
      ),
      formatWeekViewDayDate_(day)
    );

    setWeekViewElementText_(
      fragment.querySelector(
        '.week-day-count'
      ),
      day.events.length + ' 筆'
    );

    renderWeekDayEvents(
      fragment.querySelector(
        '.week-day-events'
      ),
      fragment.querySelector(
        '.week-day-empty'
      ),
      day.events
    );

    return column;
  }


  /**
   * 將派車事件渲染至單日欄位。
   *
   * @param {Element} container
   * @param {Element} emptyState
   * @param {Object[]} events
   */
  function renderWeekDayEvents(
    container,
    emptyState,
    events
  ) {
    if (!container) {
      throw new Error(
        '日期欄位缺少 ' +
        '.week-day-events。'
      );
    }

    container.innerHTML = '';

    const normalizedEvents =
      normalizeWeekViewEvents_(events);

    if (normalizedEvents.length === 0) {
      if (emptyState) {
        emptyState.hidden = false;
      }

      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }

    if (
      !global.DispatchCard ||
      typeof global.DispatchCard.create !==
        'function'
    ) {
      throw new Error(
        '找不到 Shared ' +
        'DispatchCard.create()。'
      );
    }

    const fragment =
      document.createDocumentFragment();

    normalizedEvents.forEach(
      function (event) {
        const card =
          global.DispatchCard.create(
            event,
            WEEK_VIEW_RENDER_CONFIG
              .CARD_OPTIONS
          );

        fragment.appendChild(card);
      }
    );

    container.appendChild(fragment);
  }


  /* ====================================================
   * Navigation Events
   * ==================================================== */

  /**
   * 綁定 Week View 導覽按鈕。
   *
   * 此函式只派送事件，不呼叫後端。
   */
  function bindWeekViewNavigation() {
    bindWeekViewButton_(
      'previousWeekButton',
      function () {
        dispatchWeekViewNavigation_(
          'previous'
        );
      }
    );

    bindWeekViewButton_(
      'currentWeekButton',
      function () {
        dispatchWeekViewNavigation_(
          'current'
        );
      }
    );

    bindWeekViewButton_(
      'nextWeekButton',
      function () {
        dispatchWeekViewNavigation_(
          'next'
        );
      }
    );

    bindWeekViewButton_(
      'refreshWeekButton',
      function () {
        document.dispatchEvent(
          new CustomEvent(
            WEEK_VIEW_RENDER_CONFIG
              .REFRESH_EVENT
          )
        );
      }
    );

    const dateInput =
      getWeekViewElement_(
        'weekDateInput'
      );

    if (
      dateInput &&
      dateInput.dataset.bound !== 'true'
    ) {
      dateInput.dataset.bound = 'true';

      dateInput.addEventListener(
        'change',
        function () {
          document.dispatchEvent(
            new CustomEvent(
              WEEK_VIEW_RENDER_CONFIG
                .DATE_CHANGE_EVENT,
              {
                detail: {
                  date:
                    normalizeWeekViewText_(
                      dateInput.value
                    )
                }
              }
            )
          );
        }
      );
    }
  }


  function bindWeekViewButton_(
    id,
    handler
  ) {
    const button =
      getWeekViewElement_(id);

    if (
      !button ||
      button.dataset.bound === 'true'
    ) {
      return;
    }

    button.dataset.bound = 'true';

    button.addEventListener(
      'click',
      handler
    );
  }


  function dispatchWeekViewNavigation_(
    direction
  ) {
    document.dispatchEvent(
      new CustomEvent(
        WEEK_VIEW_RENDER_CONFIG
          .NAVIGATION_EVENT,
        {
          detail: {
            direction: direction
          }
        }
      )
    );
  }


  /* ====================================================
   * UI State
   * ==================================================== */

  function showWeekViewLoading() {
    setWeekViewHidden_(
      'weekLoadingState',
      false
    );

    setWeekViewHidden_(
      'weekErrorState',
      true
    );

    setWeekViewHidden_(
      'weekEmptyState',
      true
    );

    setWeekViewHidden_(
      'weekGrid',
      true
    );
  }


  function hideWeekViewLoading() {
    setWeekViewHidden_(
      'weekLoadingState',
      true
    );
  }


  function showWeekViewEmpty() {
    setWeekViewHidden_(
      'weekEmptyState',
      false
    );

    setWeekViewHidden_(
      'weekGrid',
      true
    );
  }


  function hideWeekViewEmpty() {
    setWeekViewHidden_(
      'weekEmptyState',
      true
    );
  }


  function showWeekViewError(message) {
    hideWeekViewLoading();
    hideWeekViewEmpty();
    clearWeekViewGrid_();

    setWeekViewText_(
      'weekErrorMessage',
      message || '發生未知錯誤。'
    );

    setWeekViewHidden_(
      'weekErrorState',
      false
    );

    console.error(
      'V39.2.4.4 Week View Render 失敗：',
      message
    );
  }


  function hideWeekViewError() {
    setWeekViewHidden_(
      'weekErrorState',
      true
    );
  }


  function clearWeekViewGrid_() {
    const grid =
      getWeekViewElement_('weekGrid');

    if (!grid) {
      return;
    }

    grid.innerHTML = '';
    grid.hidden = true;
  }


  /* ====================================================
   * Range / Generated Time
   * ==================================================== */

  function renderWeekRange_(weekRange) {
    const range = weekRange || {};

    const startDate =
      normalizeWeekViewText_(
        range.startDate
      );

    const endDate =
      normalizeWeekViewText_(
        range.endDate
      );

    const label =
      startDate && endDate
        ? formatWeekViewDisplayDate_(
            startDate
          ) +
          ' ～ ' +
          formatWeekViewDisplayDate_(
            endDate
          )
        : '尚未取得週日期範圍';

    setWeekViewText_(
      'weekRangeLabel',
      label
    );
  }


  function renderWeekGeneratedAt_(value) {
    setWeekViewText_(
      'weekGeneratedAt',
      value
        ? '更新時間：' + value
        : ''
    );
  }


  /* ====================================================
   * Data Normalization
   * ==================================================== */

  function normalizeWeekViewData_(input) {
    const source = input || {};

    if (source.ok === false) {
      throw new Error(
        source.message ||
        'Week View 資料讀取失敗。'
      );
    }

    const data =
      source.data &&
      typeof source.data === 'object'
        ? source.data
        : source;

    const days =
      normalizeWeekViewDays_(
        data.days
      );

    const events =
      Array.isArray(data.events)
        ? normalizeWeekViewEvents_(
            data.events
          )
        : flattenWeekViewEvents_(days);

    return {
      weekRange:
        data.weekRange || {
          startDate:
            data.startDate || '',
          endDate:
            data.endDate || ''
        },

      days: days,

      events: events,

      summary:
        data.summary ||
        createWeekViewSummary_(events),

      generatedAt:
        normalizeWeekViewText_(
          source.generatedAt ||
          data.generatedAt
        )
    };
  }


  function normalizeWeekViewDays_(days) {
    if (!Array.isArray(days)) {
      return [];
    }

    return days
      .map(function (day, index) {
        const data = day || {};

        return {
          index:
            Number.isFinite(
              Number(data.index)
            )
              ? Number(data.index)
              : index,

          date:
            normalizeWeekViewText_(
              data.date
            ),

          dayLabel:
            normalizeWeekViewText_(
              data.dayLabel
            ) ||
            WEEK_VIEW_RENDER_CONFIG
              .DAY_LABELS[index] ||
            '',

          shortLabel:
            normalizeWeekViewText_(
              data.shortLabel
            ),

          month:
            normalizeWeekViewNumber_(
              data.month
            ),

          day:
            normalizeWeekViewNumber_(
              data.day
            ),

          isToday:
            Boolean(data.isToday),

          events:
            normalizeWeekViewEvents_(
              data.events
            )
        };
      })
      .sort(function (a, b) {
        return String(a.date || '')
          .localeCompare(
            String(b.date || '')
          );
      });
  }


  function normalizeWeekViewEvents_(events) {
    if (!Array.isArray(events)) {
      return [];
    }

    const normalized =
      events.map(function (event) {
        if (
          global.DispatchCard &&
          typeof global.DispatchCard
            .normalize === 'function'
        ) {
          return global.DispatchCard
            .normalize(event);
        }

        return event || {};
      });

    return normalized.sort(
      function (a, b) {
        const timeCompare =
          weekViewTimeToMinutes_(
            a.startTime
          ) -
          weekViewTimeToMinutes_(
            b.startTime
          );

        if (timeCompare !== 0) {
          return timeCompare;
        }

        return String(
          a.orderNo || ''
        ).localeCompare(
          String(b.orderNo || ''),
          'zh-Hant'
        );
      }
    );
  }


  function flattenWeekViewEvents_(days) {
    return days.reduce(
      function (result, day) {
        return result.concat(
          day.events || []
        );
      },
      []
    );
  }


  function createWeekViewSummary_(events) {
    const drivers = new Set();

    let totalConflicts = 0;
    let totalRevenue = 0;

    events.forEach(function (event) {
      if (event.driver) {
        drivers.add(event.driver);
      }

      if (event.conflict) {
        totalConflicts += 1;
      }

      totalRevenue +=
        parseWeekViewAmount_(
          event.amount
        );
    });

    return {
      totalOrders: events.length,
      totalDrivers: drivers.size,
      totalConflicts: totalConflicts,
      totalRevenue: totalRevenue
    };
  }


  /* ====================================================
   * Formatting
   * ==================================================== */

  function formatWeekViewDayDate_(day) {
    if (
      day.month > 0 &&
      day.day > 0
    ) {
      return (
        String(day.month)
          .padStart(2, '0') +
        '/' +
        String(day.day)
          .padStart(2, '0')
      );
    }

    const match =
      normalizeWeekViewText_(
        day.date
      ).match(
        /^\d{4}-(\d{2})-(\d{2})$/
      );

    return match
      ? match[1] + '/' + match[2]
      : day.date;
  }


  function formatWeekViewDisplayDate_(
    value
  ) {
    const match =
      normalizeWeekViewText_(value)
        .match(
          /^(\d{4})-(\d{2})-(\d{2})$/
        );

    return match
      ? match[1] +
        '/' +
        match[2] +
        '/' +
        match[3]
      : value;
  }


  function formatWeekViewCurrency_(value) {
    return (
      'NT$ ' +
      normalizeWeekViewNumber_(value)
        .toLocaleString('zh-TW')
    );
  }


  function parseWeekViewAmount_(value) {
    if (
      value === '' ||
      value === null ||
      typeof value === 'undefined'
    ) {
      return 0;
    }

    const amount = Number(
      String(value)
        .replace(/[^\d.-]/g, '')
    );

    return Number.isFinite(amount)
      ? amount
      : 0;
  }


  function weekViewTimeToMinutes_(value) {
    const match =
      normalizeWeekViewText_(value)
        .match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return Number.MAX_SAFE_INTEGER;
    }

    return hour * 60 + minute;
  }


  /* ====================================================
   * DOM Helpers
   * ==================================================== */

  function getWeekViewElement_(id) {
    return document.getElementById(id);
  }


  function setWeekViewText_(id, value) {
    setWeekViewElementText_(
      getWeekViewElement_(id),
      value
    );
  }


  function setWeekViewElementText_(
    element,
    value
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      normalizeWeekViewText_(value);
  }


  function setWeekViewHidden_(
    id,
    hidden
  ) {
    const element =
      getWeekViewElement_(id);

    if (element) {
      element.hidden = hidden;
    }
  }


  function normalizeWeekViewText_(value) {
    return String(
      value === null ||
      typeof value === 'undefined'
        ? ''
        : value
    ).trim();
  }


  function normalizeWeekViewNumber_(value) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }


  function getWeekViewRenderErrorMessage_(
    error
  ) {
    if (
      error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return String(
      error || '未知錯誤'
    );
  }


  /* ====================================================
   * Public Exports
   * ==================================================== */

  global.WeekViewRenderer =
    Object.freeze({
      render: renderWeekView,
      renderSummary:
        renderWeekSummary,
      renderGrid:
        renderWeekGrid,
      renderDay:
        renderWeekDay,
      renderDayEvents:
        renderWeekDayEvents,
      bindNavigation:
        bindWeekViewNavigation,
      showLoading:
        showWeekViewLoading,
      hideLoading:
        hideWeekViewLoading,
      showEmpty:
        showWeekViewEmpty,
      hideEmpty:
        hideWeekViewEmpty,
      showError:
        showWeekViewError,
      hideError:
        hideWeekViewError,
      version:
        WEEK_VIEW_RENDER_CONFIG.VERSION
    });

  global.renderWeekView =
    renderWeekView;

  global.renderWeekSummary =
    renderWeekSummary;

  global.renderWeekGrid =
    renderWeekGrid;

  global.renderWeekDay =
    renderWeekDay;

  global.renderWeekDayEvents =
    renderWeekDayEvents;

  global.bindWeekViewNavigation =
    bindWeekViewNavigation;

  global.showWeekViewLoading =
    showWeekViewLoading;

  global.hideWeekViewLoading =
    hideWeekViewLoading;

  global.showWeekViewEmpty =
    showWeekViewEmpty;

  global.hideWeekViewEmpty =
    hideWeekViewEmpty;

  global.showWeekViewError =
    showWeekViewError;

  global.hideWeekViewError =
    hideWeekViewError;

})(window);
