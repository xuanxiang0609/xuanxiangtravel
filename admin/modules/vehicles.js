(async function () {

  const API =
    window.XUANXIANG_CONFIG?.APPS_SCRIPT_URL;

  const board =
    document.getElementById("vehicleBoard");

  if (!board || !API) return;

  async function loadVehicles() {

    try {

      const res =
        await fetch(`${API}?action=vehicles`);

      const data =
        await res.json();

      render(data.vehicles || []);

    } catch (err) {

      board.innerHTML =
        `<div class="module-note">${err.message}</div>`;
    }
  }

  function render(vehicles) {

    board.innerHTML =
      vehicles.map(vehicle => `
        <div class="order-row">

          <div>

            <b>
              ${vehicle.plate}
            </b>

            <span>
              ${vehicle.model}
            </span>

          </div>

          <em class="status-pill">
            ${vehicle.status}
          </em>

        </div>
      `).join("");
  }

  loadVehicles();

})();