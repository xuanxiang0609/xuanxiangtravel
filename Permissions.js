/**
 * ======================================================
 * 玹翔旅遊 V38.1 Enterprise
 * Permissions.gs｜角色與 API 權限矩陣
 * ======================================================
 */


/**
 * 系統角色。
 */
const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  DISPATCHER: 'DISPATCHER',
  DRIVER: 'DRIVER',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST'
});


/**
 * 系統權限代碼。
 */
const PERMISSIONS = Object.freeze({
  SYSTEM_MANAGE: 'SYSTEM_MANAGE',

  SETTINGS_READ: 'SETTINGS_READ',
  SETTINGS_MANAGE: 'SETTINGS_MANAGE',

  LOGS_READ: 'LOGS_READ',
  LOGS_MANAGE: 'LOGS_MANAGE',

  USER_MANAGE: 'USER_MANAGE',

  ORDER_READ: 'ORDER_READ',
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_UPDATE: 'ORDER_UPDATE',
  ORDER_DELETE: 'ORDER_DELETE',

  DISPATCH_READ: 'DISPATCH_READ',
  DISPATCH_ASSIGN: 'DISPATCH_ASSIGN',
  DISPATCH_FORCE_ASSIGN: 'DISPATCH_FORCE_ASSIGN',
  DISPATCH_REMOVE: 'DISPATCH_REMOVE',

  DRIVER_READ: 'DRIVER_READ',
  DRIVER_MANAGE: 'DRIVER_MANAGE',
  DRIVER_UPDATE_SELF: 'DRIVER_UPDATE_SELF',

  MEMBER_READ: 'MEMBER_READ',
  MEMBER_MANAGE: 'MEMBER_MANAGE',
  MEMBER_READ_SELF: 'MEMBER_READ_SELF',
  MEMBER_UPDATE_SELF: 'MEMBER_UPDATE_SELF',

  REVENUE_READ: 'REVENUE_READ',
  REVENUE_MANAGE: 'REVENUE_MANAGE',

  DASHBOARD_READ: 'DASHBOARD_READ',

  CRM_READ: 'CRM_READ',
  CRM_MANAGE: 'CRM_MANAGE',

  API_ACCESS: 'API_ACCESS'
});


/**
 * 各角色預設權限。
 */
const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: Object.freeze(
    Object.values(PERMISSIONS)
  ),

  DISPATCHER: Object.freeze([
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_UPDATE,

    PERMISSIONS.DISPATCH_READ,
    PERMISSIONS.DISPATCH_ASSIGN,
    PERMISSIONS.DISPATCH_REMOVE,

    PERMISSIONS.DRIVER_READ,
    PERMISSIONS.MEMBER_READ,

    PERMISSIONS.REVENUE_READ,
    PERMISSIONS.DASHBOARD_READ,

    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_MANAGE,

    PERMISSIONS.API_ACCESS
  ]),

  DRIVER: Object.freeze([
    PERMISSIONS.ORDER_READ,

    PERMISSIONS.DISPATCH_READ,

    PERMISSIONS.DRIVER_UPDATE_SELF,

    PERMISSIONS.API_ACCESS
  ]),

  MEMBER: Object.freeze([
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_CREATE,

    PERMISSIONS.MEMBER_READ_SELF,
    PERMISSIONS.MEMBER_UPDATE_SELF,

    PERMISSIONS.API_ACCESS
  ]),

  GUEST: Object.freeze([])
});


/**
 * API Action 對應權限。
 *
 * null 代表公開 API。
 */
const API_PERMISSION_MATRIX = Object.freeze({
  health: null,
  version: null,

  orders: PERMISSIONS.ORDER_READ,
  orderLookup: PERMISSIONS.ORDER_READ,
  createOrder: PERMISSIONS.ORDER_CREATE,
  updateOrder: PERMISSIONS.ORDER_UPDATE,
  deleteOrder: PERMISSIONS.ORDER_DELETE,

  dispatchLookup: PERMISSIONS.DISPATCH_READ,
  dispatchAssign: PERMISSIONS.DISPATCH_ASSIGN,
  dispatchForceAssign:
    PERMISSIONS.DISPATCH_FORCE_ASSIGN,
  dispatchRemove: PERMISSIONS.DISPATCH_REMOVE,

  drivers: PERMISSIONS.DRIVER_READ,
  driverProfile:
    PERMISSIONS.DRIVER_UPDATE_SELF,
  updateDriverSelf:
    PERMISSIONS.DRIVER_UPDATE_SELF,
  manageDrivers:
    PERMISSIONS.DRIVER_MANAGE,

  members: PERMISSIONS.MEMBER_READ,
  memberProfile:
    PERMISSIONS.MEMBER_READ_SELF,
  updateMemberProfile:
    PERMISSIONS.MEMBER_UPDATE_SELF,
  manageMembers:
    PERMISSIONS.MEMBER_MANAGE,

  revenue:
    PERMISSIONS.REVENUE_READ,
  revenueManage:
    PERMISSIONS.REVENUE_MANAGE,

  dashboard:
    PERMISSIONS.DASHBOARD_READ,

  crm:
    PERMISSIONS.CRM_READ,
  crmManage:
    PERMISSIONS.CRM_MANAGE,

  logs:
    PERMISSIONS.LOGS_READ,
  cleanupLogs:
    PERMISSIONS.LOGS_MANAGE,

  settings:
    PERMISSIONS.SETTINGS_READ,
  updateSettings:
    PERMISSIONS.SETTINGS_MANAGE,

  systemManage:
    PERMISSIONS.SYSTEM_MANAGE
});


/**
 * 建立角色與權限設定表。
 */
function upgradePermissions_(ss) {
  const spreadsheet =
    ss ||
    SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      '找不到目前的 Google 試算表。'
    );
  }

  const sheet = getOrCreateSheet_(
    spreadsheet,
    '權限設定'
  );

  const headers = [
    '角色',
    '權限代碼',
    '啟用',
    '說明',
    '更新時間'
  ];

  ensureCols_(
    sheet,
    headers.length
  );

  ensureRows_(
    sheet,
    300
  );

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([headers]);

  styleHeader_(
    sheet.getRange(
      1,
      1,
      1,
      headers.length
    )
  );

  sheet.setFrozenRows(1);

  const existingRows =
    sheet.getLastRow() > 1
      ? sheet
          .getRange(
            2,
            1,
            sheet.getLastRow() - 1,
            headers.length
          )
          .getValues()
      : [];

  const existingKeys = {};

  existingRows.forEach(function(row) {
    const role = normalizeRole_(
      row[0]
    );

    const permission = String(
      row[1] || ''
    ).trim();

    if (
      role &&
      permission
    ) {
      existingKeys[
        role +
        '::' +
        permission
      ] = true;
    }
  });

  const rowsToAppend = [];
  const now = new Date();

  Object
    .keys(ROLE_PERMISSIONS)
    .forEach(function(role) {
      ROLE_PERMISSIONS[
        role
      ].forEach(function(permission) {
        const key =
          role +
          '::' +
          permission;

        if (!existingKeys[key]) {
          rowsToAppend.push([
            role,
            permission,
            true,
            describePermission_(
              permission
            ),
            now
          ]);
        }
      });
    });

  if (rowsToAppend.length > 0) {
    const startRow = Math.max(
      sheet.getLastRow() + 1,
      2
    );

    sheet
      .getRange(
        startRow,
        1,
        rowsToAppend.length,
        headers.length
      )
      .setValues(rowsToAppend);
  }

  applyPermissionValidations_(
    sheet
  );

  applyPermissionFormats_(
    sheet
  );

  sheet.autoResizeColumns(
    1,
    headers.length
  );

  if (
    typeof logAudit_ ===
    'function'
  ) {
    logAudit_(
      'PERMISSIONS',
      'UPGRADE_PERMISSIONS',
      'SUCCESS',
      {
        appendedRows:
          rowsToAppend.length
      }
    );
  }

  return {
    success: true,
    sheet: sheet.getName(),
    appendedRows:
      rowsToAppend.length
  };
}


/**
 * 建立權限欄位驗證。
 */
function applyPermissionValidations_(
  sheet
) {
  if (!sheet) {
    return;
  }

  const roleRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        Object.values(ROLES),
        true
      )
      .setAllowInvalid(false)
      .build();

  const permissionRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        Object.values(
          PERMISSIONS
        ),
        true
      )
      .setAllowInvalid(false)
      .build();

  const dataRows = Math.max(
    sheet.getMaxRows() - 1,
    1
  );

  sheet
    .getRange(
      2,
      1,
      dataRows,
      1
    )
    .setDataValidation(
      roleRule
    );

  sheet
    .getRange(
      2,
      2,
      dataRows,
      1
    )
    .setDataValidation(
      permissionRule
    );

  sheet
    .getRange(
      2,
      3,
      dataRows,
      1
    )
    .insertCheckboxes();
}


/**
 * 建立權限條件格式。
 */
function applyPermissionFormats_(
  sheet
) {
  if (!sheet) {
    return;
  }

  const range = sheet.getRange(
    2,
    1,
    Math.max(
      sheet.getMaxRows() - 1,
      1
    ),
    5
  );

  const rules = [
    SpreadsheetApp
      .newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=$C2=FALSE'
      )
      .setBackground(
        '#fce8e6'
      )
      .setFontColor(
        '#b31412'
      )
      .setRanges([range])
      .build(),

    SpreadsheetApp
      .newConditionalFormatRule()
      .whenFormulaSatisfied(
        '=$A2="ADMIN"'
      )
      .setBackground(
        '#fff2cc'
      )
      .setRanges([range])
      .build()
  ];

  sheet.setConditionalFormatRules(
    rules
  );
}


/**
 * 標準化角色。
 */
function normalizeRole_(role) {
  const normalized = String(
    role || ROLES.GUEST
  )
    .trim()
    .toUpperCase();

  return Object.prototype
    .hasOwnProperty.call(
      ROLES,
      normalized
    )
    ? ROLES[normalized]
    : ROLES.GUEST;
}


/**
 * 取得角色預設權限。
 */
function getRolePermissions_(role) {
  const normalizedRole =
    normalizeRole_(role);

  return (
    ROLE_PERMISSIONS[
      normalizedRole
    ] || []
  ).slice();
}


/**
 * 取得身分的有效權限。
 */
function getEffectivePermissions_(
  identity
) {
  const subject =
    identity || {};

  const rolePermissions =
    getRolePermissions_(
      subject.role
    );

  const directPermissions =
    Array.isArray(
      subject.permissions
    )
      ? subject.permissions
      : [];

  return Array.from(
    new Set(
      rolePermissions.concat(
        directPermissions
      )
    )
  );
}


/**
 * 判斷是否具有單一權限。
 */
function hasPermission_(
  identity,
  permission
) {
  if (!permission) {
    return true;
  }

  const subject =
    identity || {};

  const role = normalizeRole_(
    subject.role
  );

  if (role === ROLES.ADMIN) {
    return true;
  }

  return (
    getEffectivePermissions_(
      subject
    ).indexOf(permission) >= 0
  );
}


/**
 * 判斷是否具有任一權限。
 */
function hasAnyPermission_(
  identity,
  permissions
) {
  const required =
    Array.isArray(permissions)
      ? permissions
      : [permissions];

  return required.some(
    function(permission) {
      return hasPermission_(
        identity,
        permission
      );
    }
  );
}


/**
 * 判斷是否具備全部權限。
 */
function hasAllPermissions_(
  identity,
  permissions
) {
  const required =
    Array.isArray(permissions)
      ? permissions
      : [permissions];

  return required.every(
    function(permission) {
      return hasPermission_(
        identity,
        permission
      );
    }
  );
}


/**
 * 強制要求權限。
 */
function requirePermission_(
  identity,
  permission,
  context
) {
  if (
    hasPermission_(
      identity,
      permission
    )
  ) {
    return true;
  }

  const subject =
    identity || {};

  if (
    typeof logAudit_ ===
    'function'
  ) {
    logAudit_(
      'PERMISSIONS',
      'ACCESS_DENIED',
      'DENIED',
      {
        uid:
          subject.uid || '',

        email:
          subject.email || '',

        role:
          normalizeRole_(
            subject.role
          ),

        permission:
          permission,

        context:
          context || {}
      }
    );
  }

  const error = new Error(
    '權限不足：' +
    permission
  );

  error.code =
    'PERMISSION_DENIED';

  error.permission =
    permission;

  throw error;
}


/**
 * 取得 API Action 所需權限。
 */
function getApiPermission_(action) {
  const normalizedAction =
    String(action || '')
      .trim();

  return Object.prototype
    .hasOwnProperty.call(
      API_PERMISSION_MATRIX,
      normalizedAction
    )
    ? API_PERMISSION_MATRIX[
        normalizedAction
      ]
    : PERMISSIONS.API_ACCESS;
}


/**
 * 判斷身分是否能存取 API。
 */
function canAccessApi_(
  identity,
  action
) {
  const requiredPermission =
    getApiPermission_(action);

  if (
    requiredPermission ===
    null
  ) {
    return true;
  }

  return hasPermission_(
    identity,
    requiredPermission
  );
}


/**
 * 強制驗證 API 權限。
 */
function requireApiPermission_(
  identity,
  action,
  requestContext
) {
  const requiredPermission =
    getApiPermission_(action);

  if (
    requiredPermission ===
    null
  ) {
    return true;
  }

  return requirePermission_(
    identity,
    requiredPermission,
    {
      action: action,
      request:
        requestContext || {}
    }
  );
}


/**
 * 建立標準權限 Context。
 */
function buildPermissionContext_(
  identity
) {
  const subject =
    identity || {};

  const role =
    normalizeRole_(
      subject.role
    );

  return {
    uid:
      subject.uid || '',

    email:
      subject.email || '',

    lineUserId:
      subject.lineUserId || '',

    role: role,

    authenticated: Boolean(
      subject.uid ||
      subject.email ||
      subject.lineUserId
    ),

    permissions:
      getEffectivePermissions_(
        subject
      )
  };
}


/**
 * 取得角色與權限摘要。
 */
function getPermissionSummary_() {
  const summary = {};

  Object
    .keys(ROLE_PERMISSIONS)
    .forEach(function(role) {
      summary[role] = {
        count:
          ROLE_PERMISSIONS[
            role
          ].length,

        permissions:
          ROLE_PERMISSIONS[
            role
          ].slice()
      };
    });

  return summary;
}


/**
 * 權限代碼中文說明。
 */
function describePermission_(
  permission
) {
  const descriptions = {
    SYSTEM_MANAGE:
      '系統管理',

    SETTINGS_READ:
      '讀取系統設定',

    SETTINGS_MANAGE:
      '修改系統設定',

    LOGS_READ:
      '讀取系統日誌',

    LOGS_MANAGE:
      '管理與清理日誌',

    USER_MANAGE:
      '使用者管理',

    ORDER_READ:
      '讀取訂單',

    ORDER_CREATE:
      '建立訂單',

    ORDER_UPDATE:
      '修改訂單',

    ORDER_DELETE:
      '刪除訂單',

    DISPATCH_READ:
      '讀取派車資料',

    DISPATCH_ASSIGN:
      '一般派車',

    DISPATCH_FORCE_ASSIGN:
      '強制派車',

    DISPATCH_REMOVE:
      '取消派車',

    DRIVER_READ:
      '讀取司機資料',

    DRIVER_MANAGE:
      '管理司機資料',

    DRIVER_UPDATE_SELF:
      '司機更新本人資料',

    MEMBER_READ:
      '讀取會員資料',

    MEMBER_MANAGE:
      '管理會員資料',

    MEMBER_READ_SELF:
      '會員讀取本人資料',

    MEMBER_UPDATE_SELF:
      '會員更新本人資料',

    REVENUE_READ:
      '讀取財務資料',

    REVENUE_MANAGE:
      '管理財務資料',

    DASHBOARD_READ:
      '讀取營運儀表板',

    CRM_READ:
      '讀取 CRM 資料',

    CRM_MANAGE:
      '管理 CRM 資料',

    API_ACCESS:
      '存取受保護 API'
  };

  return (
    descriptions[
      permission
    ] ||
    permission
  );
}
