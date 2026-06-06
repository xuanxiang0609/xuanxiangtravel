(async function () {
  "use strict";

  const API =
    window.XUANXIANG_CONFIG?.APPS_SCRIPT_URL;

  const board =
    document.getElementById("orderBoard");

  if (!board || !API) return;

  async function loadOrders() {

    try {

      const res = await fetch(
        `${API}?action=orders&ts=${Date.now()}`
      );

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.message);
      }

      render(data.orders || []);

    } catch (err) {

      board.innerHTML = `
        <div class="module-note">
          訂單載入失敗<br>
          ${err.message}
        </div>
      `;
    }
  }

  function render(orders) {

    if (!orders.length) {

      board.innerHTML =
        '<div class="module-note">目前沒有訂單</div>';

      return;
    }

    board.innerHTML =
      orders.slice(0, 20).map(order => `
        <div class="order-row">

          <div>

            <b>
              ${order["訂單編號"] || "-"}
            </b>

            <span>
              ${order["乘客姓名"] || "-"}
            </span>

            <span>
              ${order["服務項目"] || "-"}
            </span>

          </div>

          <em class="status-pill">
            ${order["狀態"] || "待確認"}
          </em>

        </div>
      `).join("");
  }

  loadOrders();

  setInterval(loadOrders, 60000);

})();