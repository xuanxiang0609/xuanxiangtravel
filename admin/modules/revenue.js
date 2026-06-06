(async function () {

  const API =
    window.XUANXIANG_CONFIG?.APPS_SCRIPT_URL;

  const canvas =
    document.getElementById("revenueChart");

  if (!canvas || !API) return;

  async function loadRevenue() {

    try {

      const res =
        await fetch(`${API}?action=revenue`);

      const data =
        await res.json();

      drawChart(data);

    } catch (err) {

      console.error(err);
    }
  }

  function drawChart(data) {

    const ctx =
      canvas.getContext("2d");

    new Chart(ctx, {

      type: "line",

      data: {

        labels: [
          "一",
          "二",
          "三",
          "四",
          "五",
          "六",
          "日"
        ],

        datasets: [{
          label: "每日營收",

          data:
            data.daily || []
        }]
      },

      options: {

        responsive: true,

        plugins: {

          legend: {
            display: true
          }
        }
      }
    });

    const kpi =
      document.getElementById(
        "dashboardKpiStatus"
      );

    if (kpi) {

      kpi.innerHTML += `
        <p>
          本月營收：
          NT$
          ${Number(
            data.monthly || 0
          ).toLocaleString("zh-TW")}
        </p>
      `;
    }
  }

  loadRevenue();

})();