(async function () {

  const API =
    window.XUANXIANG_CONFIG?.APPS_SCRIPT_URL;

  const board =
    document.getElementById("driverBoard");

  if (!board || !API) return;

  async function loadDrivers() {

    try {

      const res =
        await fetch(`${API}?action=drivers`);

      const data =
        await res.json();

      render(data.drivers || []);

    } catch (err) {

      board.innerHTML =
        `<div class="module-note">${err.message}</div>`;
    }
  }

  function render(drivers) {

    board.innerHTML =
      drivers.map(driver => `
        <div class="order-row">

          <div>

            <b>${driver.name}</b>

            <span>
              ${driver.vehicle}
            </span>

          </div>

          <em class="status-pill">
            ${driver.status}
          </em>

        </div>
      `).join("");
  }

  loadDrivers();

})();