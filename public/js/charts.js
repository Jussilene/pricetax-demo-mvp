// public/js/charts.js
// Depende do Chart.js estar carregado antes (window.Chart)

(function () {
  let __charts = [];

  function destroyCharts() {
    __charts.forEach((c) => {
      try {
        c.destroy();
      } catch {}
    });
    __charts = [];
  }

  function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function unwrapPayload(payload) {
    // ✅ Aceita:
    // - render(result)
    // - render({ ok, meta, result })
    // - render({ data: { result } }) (caso algum fetch envolva)
    if (payload && typeof payload === "object") {
      if (payload.result && typeof payload.result === "object") return payload.result;
      if (payload.data && payload.data.result && typeof payload.data.result === "object") return payload.data.result;
    }
    return payload;
  }

  function formatBRL(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "R$ 0,00";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function dedupeLabels(labels) {
    const seen = new Map();
    return labels.map((raw) => {
      const base = String(raw ?? "").trim() || "—";
      const count = (seen.get(base) || 0) + 1;
      seen.set(base, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  }

  function isAllZero(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return true;
    return arr.every((x) => Math.abs(Number(x) || 0) < 1e-9);
  }

  // Plugin simples: escreve "Sem dados para este gráfico" quando dataset é vazio/zero
  const NoDataPlugin = {
    id: "noDataText",
    afterDraw(chart) {
      try {
        const ds = chart?.data?.datasets?.[0]?.data ?? [];
        const labels = chart?.data?.labels ?? [];

        const noData =
          !labels?.length ||
          labels.length === 0 ||
          isAllZero(ds) ||
          (labels.length === 1 && String(labels[0]).toLowerCase().includes("sem dados"));

        if (!noData) return;

        const ctx = chart.ctx;
        const area = chart.chartArea;
        if (!ctx || !area) return;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillText("Sem dados para este gráfico", (area.left + area.right) / 2, (area.top + area.bottom) / 2);
        ctx.restore();
      } catch {}
    },
  };

  function commonOptionsBRL(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        tooltip: {
          callbacks: {
            label(ctx) {
              const label = ctx?.dataset?.label ? `${ctx.dataset.label}: ` : "";
              const y = ctx?.parsed?.y ?? ctx?.parsed ?? 0;
              return `${label}${formatBRL(y)}`;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback(value) {
              return formatBRL(value);
            },
          },
        },
      },
      ...extra,
    };
  }

  function render(payload) {
    if (!window.Chart) {
      console.error("[charts] Chart.js não carregado ainda.");
      return;
    }

    destroyCharts();

    const ctxPareto = document.getElementById("chartPareto");
    const ctxAdmin = document.getElementById("chartAdminVsReceita");
    const ctxGrupos = document.getElementById("chartGrupos");
    const ctxSerie = document.getElementById("chartSerie");

    if (!ctxPareto || !ctxAdmin || !ctxGrupos || !ctxSerie) {
      console.warn("[charts] Canvas não encontrado no DOM.");
      return;
    }

    // ✅ pega o "miolo" certo (result) se vier envelopado
    const pld = unwrapPayload(payload);

    const periodos = Array.isArray(pld?.periodos) ? pld.periodos : [];
    const k = pld?.kpisPorPeriodo || {};

    // 1) Pareto Top Gastos
    const topArr = Array.isArray(pld?.topGastos) ? pld.topGastos.slice(0, 10) : [];
    const hasTop = topArr.length > 0;

    const rawLabelsTop = hasTop ? topArr.map((x) => x.label ?? "") : ["Sem dados"];
    const labelsTop = dedupeLabels(rawLabelsTop);
    const valuesTop = hasTop ? topArr.map((x) => safeNum(x.value)) : [0];

    __charts.push(
      new Chart(ctxPareto, {
        type: "bar",
        data: {
          labels: labelsTop,
          datasets: [{ label: "Valor", data: valuesTop }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const y = ctx?.parsed?.y ?? 0;
                  return formatBRL(y);
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                callback(value, index) {
                  const label = (this.getLabelForValue ? this.getLabelForValue(value) : labelsTop[index]) || "";
                  // corta label muito grande sem quebrar layout
                  const s = String(label);
                  return s.length > 22 ? s.slice(0, 21) + "…" : s;
                },
              },
            },
            y: {
              ticks: {
                callback(v) {
                  return formatBRL(v);
                },
              },
            },
          },
        },
        plugins: [NoDataPlugin],
      })
    );

    // 2) Admin vs Receita
    const receita = periodos.map((p) => safeNum(k?.[p]?.receitaLiquida));
    const admin = periodos.map((p) => safeNum(k?.[p]?.despAdmin));

    __charts.push(
      new Chart(ctxAdmin, {
        type: "line",
        data: {
          labels: periodos?.length ? periodos : ["Sem dados"],
          datasets: [
            { label: "Receita Líquida", data: periodos?.length ? receita : [0], tension: 0.25 },
            { label: "Despesas Administrativas", data: periodos?.length ? admin : [0], tension: 0.25 },
          ],
        },
        options: commonOptionsBRL({
          plugins: {
            tooltip: {
              callbacks: {
                label(ctx) {
                  const label = ctx?.dataset?.label ? `${ctx.dataset.label}: ` : "";
                  const y = ctx?.parsed?.y ?? 0;
                  return `${label}${formatBRL(y)}`;
                },
              },
            },
          },
        }),
        plugins: [NoDataPlugin],
      })
    );

    // 3) Distribuição por grupos
    const dist = pld?.distribuicaoGrupos || {};
    const gruposLabels = ["ATIVO", "PASSIVO", "DRE"];
    const gruposValues = gruposLabels.map((g) => safeNum(dist?.[g]));
    const hasGrupos = gruposValues.some((v) => Math.abs(v) > 1e-9);

    __charts.push(
      new Chart(ctxGrupos, {
        type: "doughnut",
        data: {
          labels: gruposLabels,
          datasets: [{ data: hasGrupos ? gruposValues : [0, 0, 0] }],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label(ctx) {
                  const label = ctx?.label ? `${ctx.label}: ` : "";
                  const v = Number(ctx?.parsed ?? 0);
                  return `${label}${formatBRL(v)}`;
                },
              },
            },
          },
        },
        plugins: [NoDataPlugin],
      })
    );

    // 4) Série Receita x Lucro Líquido
    const lucro = periodos.map((p) => safeNum(k?.[p]?.lucroLiquido));

    // ✅ Melhoria para lucro negativo não “amassar” o gráfico:
    // Mantém visual igual (linha), mas dá escala separada para o Lucro quando necessário.
    const lucroHasNegative = lucro.some((v) => v < 0);
    const useDualAxis = lucroHasNegative || (Math.max(...receita, 0) > 0 && Math.max(...lucro.map((x) => Math.abs(x)), 0) > 0);

    __charts.push(
      new Chart(ctxSerie, {
        type: "line",
        data: {
          labels: periodos?.length ? periodos : ["Sem dados"],
          datasets: [
            { label: "Receita Líquida", data: periodos?.length ? receita : [0], tension: 0.25, yAxisID: "y" },
            { label: "Lucro Líquido", data: periodos?.length ? lucro : [0], tension: 0.25, yAxisID: useDualAxis ? "y1" : "y" },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label(ctx) {
                  const label = ctx?.dataset?.label ? `${ctx.dataset.label}: ` : "";
                  const y = ctx?.parsed?.y ?? 0;
                  return `${label}${formatBRL(y)}`;
                },
              },
            },
          },
          scales: {
            y: {
              position: "left",
              ticks: { callback: (v) => formatBRL(v) },
            },
            ...(useDualAxis
              ? {
                  y1: {
                    position: "right",
                    grid: { drawOnChartArea: false },
                    ticks: { callback: (v) => formatBRL(v) },
                  },
                }
              : {}),
          },
        },
        plugins: [NoDataPlugin],
      })
    );
  }

  window.PricetaxCharts = { render };
})();
