import React, { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip,
  ArcElement,
  DoughnutController,
} from 'chart.js';

let registered = false;
function ensureCharts() {
  if (registered) return;
  Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Filler,
    Legend,
    Tooltip,
    ArcElement,
    DoughnutController
  );
  registered = true;
}

/** Weekly sales chart — revenue bars, expenses bars, profit line (admin profit may be zeros for cashier). */
export function DashboardWeeklyChart({ weeklyTrend, isProfitVisible }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const labelsRaw = weeklyTrend?.labels && weeklyTrend.labels.length ? weeklyTrend.labels : null;
    const slot = (_, i) => Number(weeklyTrend?.revenue?.[i]) || 0;
    const rev = Array.from({ length: 7 }, slot);
    const exp = Array.from({ length: 7 }, (_, i) => Number(weeklyTrend?.expenses?.[i]) || 0);
    const prof = Array.from({ length: 7 }, (_, i) => Number(weeklyTrend?.profit?.[i]) || 0);
    const labels =
      labelsRaw?.length >= 7
        ? labelsRaw.slice(0, 7)
        : Array.from({ length: 7 }, (_, i) => labelsRaw?.[i] ?? `Day ${i + 1}`);
    ensureCharts();
    if (chartRef.current) chartRef.current.destroy();
    Chart.defaults.color = '#9c9890';
    Chart.defaults.borderColor = 'rgba(0,0,0,0.05)';
    Chart.defaults.font.family = "'DM Sans',system-ui,sans-serif";
    Chart.defaults.font.size = 11;

    /** Series aligned to `labels` (always length 7) */
    const fmtFull = (v) => `PKR ${Number(v || 0).toLocaleString('en-US')}`;
    const fmtK = (v) => {
      const n = Number(v) || 0;
      return `PKR ${(n / 1000).toFixed(0)}k`;
    };

    const maxVal = Math.max(
      0,
      ...rev.map(Number),
      ...exp.map(Number),
      ...(isProfitVisible ? prof.map(Number) : [0])
    );

    const datasets = [
      {
        type: 'bar',
        label: 'Revenue',
        data: rev,
        backgroundColor: 'rgba(79,70,229,0.12)',
        borderColor: '#4f46e5',
        borderWidth: 1.5,
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'bar',
        label: 'Expenses',
        data: exp,
        backgroundColor: 'rgba(220,38,38,0.1)',
        borderColor: '#dc2626',
        borderWidth: 1.5,
        borderRadius: 6,
        order: 3,
      },
    ];
    if (isProfitVisible) {
      datasets.push({
        label: 'Net Profit',
        type: 'line',
        data: prof,
        borderColor: '#15803d',
        backgroundColor: 'rgba(21,128,61,0.06)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#15803d',
        borderWidth: 2.5,
        order: 1,
      });
    }

    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            borderColor: 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            titleColor: '#14120e',
            bodyColor: '#6b6760',
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label(ctx) {
                return `${ctx.dataset.label}: ${fmtFull(ctx.raw)}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#b0aca4' } },
          y: {
            beginAtZero: true,
            suggestedMax: maxVal <= 0 ? 100 : maxVal * 1.15,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              color: '#b0aca4',
              callback: (v) => fmtK(v),
            },
          },
        },
      },
    });

    requestAnimationFrame(() => {
      if (chartRef.current) chartRef.current.resize();
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = null;
    };
  }, [weeklyTrend, isProfitVisible]);

  return <canvas ref={ref} role="img" aria-label="Weekly sales trend" />;
}

/** Monthly donut: net profit vs expenses vs credit outstanding — independent magnitudes. */
export function DashboardSnapshotDonut({ netProfit, totalExpenses, creditOutstanding }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    ensureCharts();
    if (chartRef.current) chartRef.current.destroy();
    Chart.defaults.font.family = "'DM Sans',system-ui,sans-serif";
    Chart.defaults.font.size = 11;

    const p = Math.max(0, Number(netProfit) || 0);
    const e = Math.max(0, Number(totalExpenses) || 0);
    const c = Math.max(0, Number(creditOutstanding) || 0);

    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels: ['Net Profit', 'Expenses', 'Credit outstanding'],
        datasets: [
          {
            data: [p, e, c],
            backgroundColor: ['#15803d', '#dc2626', '#d97706'],
            borderWidth: 0,
            hoverOffset: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            borderColor: 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            titleColor: '#14120e',
            bodyColor: '#6b6760',
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label(ct) {
                return `${ct.label}: PKR ${Number(ct.raw || 0).toLocaleString('en-US')}`;
              },
            },
          },
        },
      },
    });

    requestAnimationFrame(() => {
      if (chartRef.current) chartRef.current.resize();
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = null;
    };
  }, [netProfit, totalExpenses, creditOutstanding]);

  return <canvas ref={ref} role="img" aria-label="Monthly snapshot" />;
}
