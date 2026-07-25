/**
 * ======================================================
 * 玹翔旅遊 V39 Enterprise
 * V39_Config.js｜V39 系統設定
 * ======================================================
 */

const V39_CONFIG = Object.freeze({
  VERSION: 'V39.0.0 Enterprise Alpha',
  TIMEZONE: 'Asia/Taipei',

  SHEETS: {
    ORDERS: '訂單',
    DRIVERS: '司機資料',
    DISPATCH_CALENDAR: '派車行事曆',
    DISPATCH_CONFLICTS: '排班衝突',
    ROUTE_CACHE: '路線快取',
    DASHBOARD: 'Dashboard 2.0'
  },

  DEFAULTS: {
    SERVICE_DURATION_MINUTES: 120,
    TURNAROUND_MINUTES: 30,
    MAPS_CACHE_HOURS: 24
  },

  FEATURES: {
    DISPATCH_CONFLICT: true,
    DISPATCH_CALENDAR: false,
    GOOGLE_MAPS: false,
    DASHBOARD_2: false,
    AI_DISPATCH: false
  }
});
