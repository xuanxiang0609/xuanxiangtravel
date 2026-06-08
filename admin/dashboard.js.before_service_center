const API =
  window.XUANXIANG_CONFIG?.APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxT3ruTCda05LnAd4FTjg_DkliIVRIjf6gy4uTa1hv_5gnZbMwJWahWLRBk6cSN__fDQA/exec";

window.XXAdmin = window.XXAdmin || {};

window.XXAdmin.state = {
  dashboard: null
};

window.XXAdmin.state.health = null;

async function fetchHealth() {
  try {
    const res = await fetch(`${API}?action=health`, {
      method: 'GET',
      cache: 'no-store'
    });

    const data = await res.json();
    window.XXAdmin.state.health = data;
    renderHealth(data);
  } catch (err) {
    console.error(err);
  }
}

function renderHealth(data) {
  const apiBoard = document.getElementById('apiHealthBoard');
  if (!apiBoard) return;

  apiBoard.innerHTML = `
    <div class="module-note">
      <p><b>API：</b> ${data.ok ? '正常' : '異常'}</p>
      <p><b>時間：</b> ${data.time || '-'}</p>
      <p><b>Google Maps：</b> ${data.enterpriseProperties?.GOOGLE_MAPS_API_KEY ? '已設定' : '未設定'}</p>
      <p><b>Firebase：</b> ${data.enterpriseProperties?.FIREBASE_PROJECT_ID ? '已設定' : '未設定'}</p>
    </div>
  `;
}

async function fetchDashboard() {

  try {

    const res = await fetch(
      `${API}?action=dashboard`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data.ok) {
      throw new Error(
        data.message || "Dashboard API 錯誤"
      );
    }

    window.XXAdmin.state.dashboard = data;

    renderKPI(data);

    renderSystemStatus(data);

    renderExtraBoards(data);

  } catch (err) {

    console.error(err);

    renderError(err);

  }

}

function renderKPI(data) {

  const el = document.getElementById("kpiGrid");

  if (!el) return;

  el.innerHTML = `
    <div class="kpi-card">
      <span>今日訂單</span>
      <strong>${data.todayOrders || 0}</strong>
    </div>

    <div class="kpi-card">
      <span>待派車</span>
      <strong>${data.pendingDispatch || 0}</strong>
    </div>

    <div class="kpi-card">
      <span>本月營收</span>
      <strong>
        NT$
        ${Number(
          data.monthRevenue || 0
        ).toLocaleString("zh-TW")}
      </strong>
    </div>

    <div class="kpi-card">
      <span>會員總數</span>
      <strong>${data.members || 0}</strong>
    </div>

    <div class="kpi-card">
      <span>司機總數</span>
      <strong>${data.drivers || 0}</strong>
    </div>

    <div class="kpi-card">
      <span>車輛總數</span>
      <strong>${data.vehicles || 0}</strong>
    </div>
  `;
}

function renderSystemStatus(data) {

  const board =
    document.getElementById(
      "permissionBoard"
    );

  if (!board) return;

  board.innerHTML = `
    <div class="module-note">

      <p>
        <b>系統狀態：</b>
        <span style="color:#63d471">
          正常運行
        </span>
      </p>

      <p>
        最後更新：
        ${data.updatedAt}
      </p>

      <p>
        API：
        Dashboard 已串接
      </p>

    </div>
  `;
}

function renderExtraBoards(data) {

  const kpiStatus = document.getElementById('dashboardKpiStatus');
  if (kpiStatus) {
    kpiStatus.innerHTML = `
      <div class="module-note">
        <p>今日訂單：${data.todayOrders || 0}</p>
        <p>待派車：${data.pendingDispatch || 0}</p>
        <p>本月營收：NT$ ${Number(data.monthRevenue || 0).toLocaleString('zh-TW')}</p>
      </div>
    `;
  }

  const notice = document.getElementById('notificationBoard');
  if (notice) {
    notice.innerHTML = `
      <div class="module-note">
        Dashboard API 已成功同步<br>
        最後更新：${data.updatedAt || '-'}
      </div>
    `;
  }

  const alert = document.getElementById('systemAlertBoard');
  if (alert) {
    alert.innerHTML = `
      <div class="module-note">
        ${data.error ? '發現系統警示' : '系統運作正常'}
      </div>
    `;
  }
}

function renderError(err) {

  const el =
    document.getElementById("kpiGrid");

  if (!el) return;

  el.innerHTML = `
    <div class="kpi-card">
      <span>Dashboard API</span>
      <strong style="color:#ff6b6b">
        連線失敗
      </strong>
    </div>
  `;

  const board =
    document.getElementById(
      "permissionBoard"
    );

  if (board) {

    board.innerHTML = `
      <div class="module-note">
        ${err.message}
      </div>
    `;
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    fetchHealth();
    fetchDashboard();

    setInterval(
      fetchDashboard,
      60000
    );

    setInterval(fetchHealth, 60000);

  }
);