import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  ArcElement,
  DoughnutController,
  BarController,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faCashRegister,
  faUsers,
  faTruck,
  faReceipt,
  faTriangleExclamation,
  faGauge,
} from '@fortawesome/free-solid-svg-icons';
import { reportsAPI, customersAPI, productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canUseProFeatures } from '../utils/planFeatures';
import { zbKeys } from '../lib/queryKeys';
import {
  defaultMonthlyReportParams,
  formatLocalYmd,
  computePresetDateRange,
} from '../lib/reportsQueryUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  ArcElement,
  DoughnutController,
  BarController,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

const REPORTS_RQ_STALE_MS = 60 * 1000;

const reportsInlineStyles = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
.rep-root{--rep-bg:#f2f1ed;--rep-ink:#111827;--rep-muted:#6b7280;--rep-line:rgba(17,24,39,.1);--rep-accent:#5e5adb;--rep-accent-2:#111827;--rep-card:#fff;--rep-radius:16px;--rep-shadow:0 1px 2px rgba(0,0,0,.04),0 14px 36px -12px rgba(17,24,39,.1);font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:var(--rep-ink);background:var(--rep-bg);margin:-12px -16px;padding:20px 18px 36px;min-height:calc(100vh - 72px);box-sizing:border-box}
.rep-root .rep-title{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:clamp(1.35rem,2.2vw,1.85rem);font-weight:700;letter-spacing:-.035em;margin:0;line-height:1.12}
.rep-root .rep-sub{margin:8px 0 0;font-size:14px;color:var(--rep-muted);max-width:52ch;line-height:1.45}
.rep-root .rep-period{background:var(--rep-card);border:1px solid var(--rep-line);border-radius:var(--rep-radius);box-shadow:var(--rep-shadow);padding:16px 18px;margin-top:18px}
.rep-root .rep-period-hd{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:15px;font-weight:600;margin:0 0 12px;letter-spacing:-.02em}
.rep-root .rep-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.rep-root .rep-chip{border:1px solid var(--rep-line);background:#fafaf9;color:var(--rep-ink);padding:9px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s,border-color .15s,box-shadow .15s}
.rep-root .rep-chip:hover{background:#f3f2ef;border-color:rgba(17,24,39,.14)}
.rep-root .rep-chip.rep-chip-on{background:var(--rep-accent-2);color:#fff;border-color:var(--rep-accent-2);box-shadow:0 4px 14px rgba(17,24,39,.18)}
.rep-root .rep-custom{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-top:4px}
.rep-root .rep-range-note{font-size:13px;color:var(--rep-muted);padding:10px 12px;background:#f9f9f7;border-radius:12px;border:1px dashed var(--rep-line);margin-top:8px}
.rep-root .rep-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.rep-root .rep-btn-ghost{padding:9px 16px;border-radius:12px;border:1px solid var(--rep-line);background:var(--rep-card);font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;color:var(--rep-ink)}
.rep-root .rep-btn-ghost:hover{background:#fafaf9}
.rep-root .rep-tabs-wrap{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin:20px 0 6px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.rep-root .rep-tabs-wrap::-webkit-scrollbar{height:4px}
.rep-root .rep-tabs-wrap::-webkit-scrollbar-thumb{background:rgba(17,24,39,.15);border-radius:4px}
.rep-root .rep-tab{flex:0 0 auto;border:1px solid var(--rep-line);background:var(--rep-card);color:var(--rep-muted);padding:10px 16px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:color .15s,background .15s,border-color .15s}
.rep-root .rep-tab:hover{color:var(--rep-ink);border-color:rgba(17,24,39,.18)}
.rep-root .rep-tab.rep-tab-on{background:var(--rep-accent);color:#fff;border-color:var(--rep-accent);box-shadow:0 6px 18px rgba(94,90,219,.28)}
.rep-root .rep-tab:disabled{opacity:.5;cursor:not-allowed}
.rep-root .rep-panel{background:var(--rep-card);border:1px solid var(--rep-line);border-radius:var(--rep-radius);box-shadow:var(--rep-shadow);padding:18px 18px 22px;margin-top:8px}
.rep-root .rep-ins-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
.rep-root .rep-kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}
.rep-root .rep-ins-card,.rep-root .rep-kpi-card{background:linear-gradient(145deg,#fff 0%,#fafaf9 100%);border:1px solid var(--rep-line);border-radius:14px;padding:14px 16px;cursor:pointer;transition:transform .12s,box-shadow .12s}
.rep-root .rep-ins-card:hover,.rep-root .rep-kpi-card:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(17,24,39,.08)}
.rep-root .rep-ins-card .rep-k{color:var(--rep-muted);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.rep-root .rep-ins-card .rep-v{margin-top:8px;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:1.35rem;font-weight:700;letter-spacing:-.02em}
.rep-root .rep-kpi-card{border-top:3px solid transparent}
.rep-root .rep-kpi-card.rep-accent-blue{border-top-color:#2563eb}
.rep-root .rep-kpi-card.rep-accent-red{border-top-color:#ef4444}
.rep-root .rep-kpi-card.rep-accent-green{border-top-color:#16a34a}
.rep-root .rep-kpi-card .rep-k{color:var(--rep-muted);font-size:13px;font-weight:600}
.rep-root .rep-kpi-card .rep-v{margin-top:6px;font-size:1.5rem;font-weight:800;font-family:'Bricolage Grotesque','DM Sans',sans-serif;letter-spacing:-.03em}
.rep-root .rep-dash-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:4px}
.rep-root .rep-chart-card{background:var(--rep-card);border:1px solid var(--rep-line);border-radius:14px;padding:14px 16px 18px;min-height:120px}
.rep-root .rep-chart-card h3,.rep-root .rep-chart-h{margin:0 0 4px;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:15px;font-weight:600;letter-spacing:-.02em}
.rep-root .rep-chart-sub{margin:0 0 12px;font-size:12px;color:var(--rep-muted)}
.rep-root .rep-chart-canvas{height:220px;position:relative}
.rep-root .rep-chart-canvas.rep-tall{height:240px}
.rep-root .rep-stock-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.rep-root .rep-stock-li{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:8px 10px;background:#fafaf9;border-radius:10px;border:1px solid var(--rep-line)}
.rep-root .rep-stock-li span:last-child{font-weight:700;color:#b45309}
.rep-root .rep-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 14px;border-radius:12px;margin:14px 0;font-size:14px}
.rep-root .tabs-container{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
.rep-root .tab{border:1px solid var(--rep-line);background:#fafaf9;color:var(--rep-ink);padding:9px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit}
.rep-root .tab.active{background:var(--rep-accent);color:#fff;border-color:var(--rep-accent)}
.rep-root .report-totals{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:8px}
.rep-root .total-card{border:1px solid var(--rep-line);border-radius:14px;padding:14px 16px;background:var(--rep-card)}
.rep-root .total-card.highlight{border-color:rgba(94,90,219,.45);box-shadow:0 0 0 1px rgba(94,90,219,.12)}
.rep-root .total-label{font-size:12px;color:var(--rep-muted);font-weight:600}
.rep-root .total-value{font-size:22px;font-weight:800;margin-top:6px;font-family:'Bricolage Grotesque','DM Sans',sans-serif}
.rep-root .table-container{overflow:auto;border:1px solid var(--rep-line);border-radius:14px;background:var(--rep-card);margin-top:12px}
.rep-root .reports-table{width:100%;border-collapse:collapse}
.rep-root .reports-table th,.rep-root .reports-table td{padding:11px 12px;border-bottom:1px solid rgba(17,24,39,.06);text-align:left;font-size:13px}
.rep-root .reports-table th{background:#f9f9f7;color:#374151;font-weight:700}
.rep-root .empty-state{text-align:center;color:var(--rep-muted);padding:24px}
.rep-root .loading{padding:28px;color:var(--rep-muted);font-size:14px}
.rep-root .profit-positive{color:#15803d}
.rep-root .profit-negative{color:#dc2626}
.rep-root .reports-v2-chart-grid{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.rep-root .reports-v2-chart-card{background:var(--rep-card);border:1px solid var(--rep-line);border-radius:14px;padding:14px 16px}
.rep-root .reports-v2-chart-card h4{margin:0 0 10px;font-size:14px;font-weight:700;font-family:'Bricolage Grotesque','DM Sans',sans-serif}
.rep-root .reports-v2-bars{display:grid;gap:10px}
.rep-root .reports-v2-bar-row{display:grid;gap:5px}
.rep-root .reports-v2-bar-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#374151}
.rep-root .reports-v2-bar-track{height:10px;border-radius:999px;background:#ecece8;overflow:hidden}
.rep-root .reports-v2-bar-fill{height:100%;border-radius:999px}
.rep-root .rep-sec-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.rep-root .rep-sec-title{margin:0;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.02em}
.rep-root .rep-sec-sub{margin:4px 0 0;font-size:13px;color:var(--rep-muted)}
.rep-root .rep-badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700}
.rep-root .rep-badge-warn{background:#fef3c7;color:#92400e}
.rep-root .rep-badge-err{background:#fee2e2;color:#991b1b}
.rep-root .rep-badge-ok{background:#dcfce7;color:#166534}
.rep-root .rep-badge-info{background:#e0e7ff;color:#3730a3}
.rep-root .rep-kpi-row-5{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:16px}
.rep-root .rep-kpi-row-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.rep-root .rep-kpi-mini{background:var(--rep-card);border:1px solid var(--rep-line);border-radius:14px;padding:12px 14px;border-top:3px solid var(--rep-accent)}
.rep-root .rep-kpi-mini.rep-accent-blue{border-top-color:#2563eb}
.rep-root .rep-kpi-mini.rep-accent-red{border-top-color:#ef4444}
.rep-root .rep-kpi-mini.rep-accent-green{border-top-color:#16a34a}
.rep-root .rep-kpi-mini.rep-accent-amber{border-top-color:#f59e0b}
.rep-root .rep-kpi-mini .tk{font-size:11px;font-weight:700;color:var(--rep-muted);text-transform:uppercase;letter-spacing:.04em}
.rep-root .rep-kpi-mini .tv{margin-top:6px;font-size:1.15rem;font-weight:800;font-family:'Bricolage Grotesque','DM Sans',sans-serif}
.rep-root .rep-alert{padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.45;margin-top:12px}
.rep-root .rep-alert-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
.rep-root .rep-alert-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.rep-root .rep-collect-row{display:grid;gap:10px;margin-top:14px}
.rep-root .rep-collect-item{display:grid;grid-template-columns:1fr 1fr minmax(120px,160px);gap:10px;align-items:center;font-size:13px}
.rep-root .rep-collect-bar{height:12px;border-radius:999px;background:#ecece8;overflow:hidden}
.rep-root .rep-collect-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#5e5adb,#818cf8)}
.rep-root .rep-tab .rep-tab-ico{margin-right:8px;opacity:.85}
.rep-root .rep-two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:8px}
.rep-root .rep-mix-side{display:grid;gap:10px}
.rep-root .rep-mix-pill{padding:12px 14px;border-radius:12px;font-weight:700;font-size:14px}
.rep-root .rep-mix-pill.cash{background:#ecfdf5;color:#166534}
.rep-root .rep-mix-pill.credit{background:#fff7ed;color:#c2410c}
@media (max-width:960px){.rep-root .rep-ins-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rep-root .rep-dash-grid{grid-template-columns:1fr}.rep-root .rep-kpi-row-5,.rep-root .rep-kpi-row-4{grid-template-columns:repeat(2,minmax(0,1fr))}.rep-root .rep-two-col{grid-template-columns:1fr}}
@media (max-width:520px){.rep-root{margin:-8px -10px;padding:14px 12px 28px}.rep-root .rep-ins-grid{grid-template-columns:1fr}.rep-root .rep-kpi-grid{grid-template-columns:1fr}}
`;

const Reports = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { profile, activeShopId } = useAuth();
  const proOk = canUseProFeatures(profile?.plan);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterType, setFilterType] = useState('monthly');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState('');
  
  // Sub-tabs for combined tabs
  const [salesSubTab, setSalesSubTab] = useState('summary'); // 'summary' or 'by-product'
  const [customerSubTab, setCustomerSubTab] = useState('due-list'); // 'due-list' or 'history'
  const [supplierSubTab, setSupplierSubTab] = useState('payables'); // 'payables' or 'history'
  const [expenseSubTab, setExpenseSubTab] = useState('summary'); // 'summary' or 'list'
  const [startDate, setStartDate] = useState(() => defaultMonthlyReportParams().start_date);
  const [endDate, setEndDate] = useState(() => defaultMonthlyReportParams().end_date);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search states
  const [customerDueSearch, setCustomerDueSearch] = useState('');
  const [supplierPayablesSearch, setSupplierPayablesSearch] = useState('');
  const [customerHistorySearch, setCustomerHistorySearch] = useState('');
  const [supplierHistorySearch, setSupplierHistorySearch] = useState('');
  const [showCustomerHistoryDropdown, setShowCustomerHistoryDropdown] = useState(false);
  const [showSupplierHistoryDropdown, setShowSupplierHistoryDropdown] = useState(false);
  
  const customerHistoryDropdownRef = useRef(null);
  const supplierHistoryDropdownRef = useRef(null);
  const canvasTrendRef = useRef(null);
  const canvasMixRef = useRef(null);
  const canvasExpRef = useRef(null);
  const chartTrendInst = useRef(null);
  const chartMixInst = useRef(null);
  const chartExpInst = useRef(null);
  const canvasSalesStackRef = useRef(null);
  const chartSalesStackInst = useRef(null);
  const canvasProfitTrendRef = useRef(null);
  const chartProfitTrendInst = useRef(null);
  const canvasProfitMarginRef = useRef(null);
  const chartProfitMarginInst = useRef(null);
  const canvasExpenseDonutRef = useRef(null);
  const chartExpenseDonutInst = useRef(null);
  const canvasExpenseVsRef = useRef(null);
  const chartExpenseVsInst = useRef(null);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Report data
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesByProduct, setSalesByProduct] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [customerDueList, setCustomerDueList] = useState(null);
  const [customerStatement, setCustomerStatement] = useState(null);
  const [supplierPayables, setSupplierPayables] = useState(null);
  const [supplierHistory, setSupplierHistory] = useState(null);
  const [expensesSummary, setExpensesSummary] = useState(null);
  const [expensesList, setExpensesList] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [salesInvoices, setSalesInvoices] = useState(null);
  const [customersAnalytics, setCustomersAnalytics] = useState(null);
  const [suppliersAnalytics, setSuppliersAnalytics] = useState(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerHistoryDropdownRef.current && !customerHistoryDropdownRef.current.contains(event.target)) {
        setShowCustomerHistoryDropdown(false);
      }
      if (supplierHistoryDropdownRef.current && !supplierHistoryDropdownRef.current.contains(event.target)) {
        setShowSupplierHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'customers') {
        setActiveTab('customers');
        setCustomerSubTab('due-list');
      } else if (tabParam === 'suppliers') {
        setActiveTab('suppliers');
        setSupplierSubTab('payables');
      } else if (tabParam === 'stock-low') {
        setActiveTab('stock-low');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (proOk) return;
    if (salesSubTab === 'by-product') setSalesSubTab('summary');
    if (customerSubTab === 'history') setCustomerSubTab('due-list');
    if (supplierSubTab === 'history') setSupplierSubTab('payables');
    if (expenseSubTab === 'list') setExpenseSubTab('summary');
  }, [proOk, activeTab, salesSubTab, customerSubTab, supplierSubTab, expenseSubTab]);

  useEffect(() => {
    updateDateRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preset change only; custom dates set range explicitly
  }, [filterType]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardSummary();
    } else if (activeTab === 'sales') {
      if (salesSubTab === 'summary') {
        fetchSalesSummary();
        fetchSalesInvoices();
      } else if (salesSubTab === 'by-product' && proOk) {
        fetchSalesByProduct();
      }
    } else if (activeTab === 'profit') {
      fetchProfit();
    } else if (activeTab === 'customers') {
      if (customerSubTab === 'due-list') {
        fetchCustomersAnalytics();
        fetchCustomerDueList();
      } else if (customerSubTab === 'history') {
        if (selectedCustomer) {
          fetchCustomerStatement();
        } else {
          setCustomerStatement(null);
        }
      }
    } else if (activeTab === 'suppliers') {
      if (supplierSubTab === 'payables') {
        fetchSuppliersAnalytics();
        fetchSupplierPayables();
      } else if (supplierSubTab === 'history') {
        if (selectedSupplierForHistory) {
          fetchSupplierHistory();
        } else {
          setSupplierHistory(null);
        }
      }
    } else if (activeTab === 'expenses') {
      if (expenseSubTab === 'summary') {
        fetchExpensesSummary();
        fetchSalesSummary();
        if (proOk) fetchExpensesList();
      } else if (expenseSubTab === 'list') {
        fetchExpensesList();
      }
    } else if (activeTab === 'stock-low') {
      fetchLowStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab-driven fetches; stable-enough handlers for this screen
  }, [activeTab, salesSubTab, customerSubTab, supplierSubTab, expenseSubTab, filterType, startDate, endDate, selectedProduct, selectedCustomer, selectedSupplierForHistory, proOk]);

  const chartFont = "'DM Sans', system-ui, sans-serif";

  useEffect(() => {
    if (activeTab !== 'dashboard' || !dashboardData) {
      chartTrendInst.current?.destroy();
      chartMixInst.current?.destroy();
      chartExpInst.current?.destroy();
      chartTrendInst.current = null;
      chartMixInst.current = null;
      chartExpInst.current = null;
      return undefined;
    }

    const trendEl = canvasTrendRef.current;
    const mixEl = canvasMixRef.current;
    const expEl = canvasExpRef.current;
    if (!trendEl || !mixEl || !expEl) return undefined;

    const fmtMoney = (v) => `PKR ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    chartTrendInst.current?.destroy();
    chartMixInst.current?.destroy();
    chartExpInst.current?.destroy();

    const trend = Array.isArray(dashboardData.salesTrend) ? dashboardData.salesTrend : [];
    const trendLabels = trend.length
      ? trend.map((x) => {
          const raw = String(x.date || '').slice(0, 10);
          const d = new Date(`${raw}T12:00:00`);
          return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        })
      : ['—'];
    const trendDataTot = trend.length ? trend.map((x) => Number(x.revenue) || 0) : [Number(dashboardData.totalSales) || 0];
    const trendDataCash = trend.length ? trend.map((x) => Number(x.cash) || 0) : [Number(dashboardData.cashSales) || 0];
    const trendDataCred = trend.length ? trend.map((x) => Number(x.credit) || 0) : [Number(dashboardData.creditSales) || 0];

    chartTrendInst.current = new ChartJS(trendEl, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [
          {
            label: t('reports.totalSales'),
            data: trendDataTot,
            borderColor: '#5e5adb',
            backgroundColor: 'rgba(94,90,219,0.06)',
            fill: true,
            tension: 0.35,
            pointRadius: trend.length > 24 ? 0 : 2,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
          {
            label: t('reports.cashSales'),
            data: trendDataCash,
            borderColor: '#16a34a',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointRadius: trend.length > 24 ? 0 : 2,
            borderWidth: 2,
          },
          {
            label: t('reports.creditSales'),
            data: trendDataCred,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointRadius: trend.length > 24 ? 0 : 2,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'top', labels: { font: { family: chartFont, size: 11 }, boxWidth: 10 } },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { ticks: { font: { family: chartFont }, maxRotation: 45, minRotation: 0 } },
          y: {
            ticks: {
              font: { family: chartFont },
              callback: (v) => fmtMoney(v),
            },
            grid: { color: 'rgba(17,24,39,.06)' },
          },
        },
      },
    });

    const cash = Number(dashboardData.cashSales) || 0;
    const credit = Number(dashboardData.creditSales) || 0;
    const mixHas = cash + credit > 0;
    chartMixInst.current = new ChartJS(mixEl, {
      type: 'doughnut',
      data: {
        labels: mixHas ? [t('reports.cashSales'), t('reports.creditSales')] : [t('reports.sales')],
        datasets: [
          {
            data: mixHas ? [cash, credit] : [1],
            backgroundColor: mixHas ? ['#22c55e', '#f59e0b'] : ['#e5e7eb'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: chartFont }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => (mixHas ? `${ctx.label}: ${fmtMoney(ctx.parsed)}` : t('reports.noSalesFound')),
            },
          },
        },
      },
    });

    const cats = Array.isArray(dashboardData.expenseCategoryBreakdown)
      ? dashboardData.expenseCategoryBreakdown.filter((c) => Number(c.total) > 0)
      : [];
    const expLabels = cats.length ? cats.map((c) => c.category || '—') : [t('reports.expenses')];
    const expData = cats.length ? cats.map((c) => Number(c.total) || 0) : [1];
    const expColors = ['#5e5adb', '#111827', '#f97316', '#0ea5e9', '#a855f7', '#14b8a6', '#eab308', '#ec4899', '#64748b', '#84cc16', '#f43f5e', '#78716c'];
    chartExpInst.current = new ChartJS(expEl, {
      type: 'doughnut',
      data: {
        labels: expLabels,
        datasets: [
          {
            data: expData,
            backgroundColor: cats.length ? cats.map((_, i) => expColors[i % expColors.length]) : ['#e5e7eb'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: chartFont, size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => (cats.length ? `${ctx.label}: ${fmtMoney(ctx.parsed)}` : '—'),
            },
          },
        },
      },
    });

    return () => {
      chartTrendInst.current?.destroy();
      chartMixInst.current?.destroy();
      chartExpInst.current?.destroy();
      chartTrendInst.current = null;
      chartMixInst.current = null;
      chartExpInst.current = null;
    };
  }, [activeTab, dashboardData, t]);

  useEffect(() => {
    if (activeTab !== 'sales' || salesSubTab !== 'summary' || !salesInvoices?.invoices?.length) {
      chartSalesStackInst.current?.destroy();
      chartSalesStackInst.current = null;
      return undefined;
    }
    const el = canvasSalesStackRef.current;
    if (!el) return undefined;
    chartSalesStackInst.current?.destroy();
    const inv = [...salesInvoices.invoices].slice(0, 24).reverse();
    const labels = inv.map((i) => i.invoice_number || `#${i.sale_id}`);
    const fmt = (v) => `PKR ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    chartSalesStackInst.current = new ChartJS(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: t('reports.cashSales'),
            data: inv.map((i) => Number(i.cash) || 0),
            backgroundColor: '#22c55e',
            stack: 'a',
            borderRadius: 4,
          },
          {
            label: t('reports.creditSales'),
            data: inv.map((i) => Number(i.credit) || 0),
            backgroundColor: '#fb923c',
            stack: 'a',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: chartFont, size: 11 } } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)}` } },
        },
        scales: {
          x: { stacked: true, ticks: { font: { family: chartFont } } },
          y: {
            stacked: true,
            ticks: {
              font: { family: chartFont },
              callback: (v) => fmt(v),
            },
            grid: { color: 'rgba(17,24,39,.06)' },
          },
        },
      },
    });
    return () => {
      chartSalesStackInst.current?.destroy();
      chartSalesStackInst.current = null;
    };
  }, [activeTab, salesSubTab, salesInvoices, t]);

  useEffect(() => {
    if (activeTab !== 'profit' || !profitData) {
      chartProfitTrendInst.current?.destroy();
      chartProfitMarginInst.current?.destroy();
      chartProfitTrendInst.current = null;
      chartProfitMarginInst.current = null;
      return undefined;
    }
    const tEl = canvasProfitTrendRef.current;
    const dEl = canvasProfitMarginRef.current;
    if (!tEl || !dEl) return undefined;
    chartProfitTrendInst.current?.destroy();
    chartProfitMarginInst.current?.destroy();
    const fmt = (v) => `PKR ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const trend = Array.isArray(profitData.profitTrend) ? profitData.profitTrend : [];
    const labels = trend.length
      ? trend.map((row) => {
          const raw = String(row.date || '').slice(0, 10);
          const d = new Date(`${raw}T12:00:00`);
          return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        })
      : ['—'];
    const rev = trend.length ? trend.map((r) => Number(r.revenue) || 0) : [profitData.totalSales || 0];
    const costs = trend.length ? trend.map((r) => Number(r.costs) || 0) : [profitData.totalPurchases + profitData.totalExpenses || 0];
    const net = trend.length ? trend.map((r) => Number(r.net) || 0) : [profitData.netProfit || 0];
    chartProfitTrendInst.current = new ChartJS(tEl, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: t('reports.totalSales'), data: rev, borderColor: '#2563eb', tension: 0.35, fill: false, borderWidth: 2 },
          { label: 'Costs (purchases + expenses)', data: costs, borderColor: '#f97316', tension: 0.35, fill: false, borderWidth: 2 },
          { label: t('reports.netProfit'), data: net, borderColor: '#16a34a', tension: 0.35, fill: false, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: chartFont, size: 11 } } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)}` } },
        },
        scales: {
          y: { ticks: { callback: (v) => fmt(v), font: { family: chartFont } }, grid: { color: 'rgba(17,24,39,.06)' } },
          x: { ticks: { font: { family: chartFont } } },
        },
      },
    });
    const np = Math.max(Number(profitData.netProfit) || 0, 0);
    const ex = Math.max(Number(profitData.totalExpenses) || 0, 0);
    const pr = Math.max(Number(profitData.totalPurchases) || 0, 0);
    const sum = np + ex + pr || 1;
    chartProfitMarginInst.current = new ChartJS(dEl, {
      type: 'doughnut',
      data: {
        labels: [t('reports.netProfit'), t('reports.totalExpenses'), t('reports.totalPurchases')],
        datasets: [{ data: [np, ex, pr], backgroundColor: ['#16a34a', '#f97316', '#ef4444'], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: chartFont, size: 10 } } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const v = Number(c.parsed) || 0;
                return `${c.label}: ${fmt(v)} (${Math.round((v / sum) * 1000) / 10}%)`;
              },
            },
          },
        },
      },
    });
    return () => {
      chartProfitTrendInst.current?.destroy();
      chartProfitMarginInst.current?.destroy();
      chartProfitTrendInst.current = null;
      chartProfitMarginInst.current = null;
    };
  }, [activeTab, profitData, t]);

  useEffect(() => {
    if (activeTab !== 'expenses' || expenseSubTab !== 'summary' || !expensesSummary) {
      chartExpenseDonutInst.current?.destroy();
      chartExpenseVsInst.current?.destroy();
      chartExpenseDonutInst.current = null;
      chartExpenseVsInst.current = null;
      return undefined;
    }
    const dEl = canvasExpenseDonutRef.current;
    const bEl = canvasExpenseVsRef.current;
    if (!dEl || !bEl) return undefined;
    chartExpenseDonutInst.current?.destroy();
    chartExpenseVsInst.current?.destroy();
    const fmt = (v) => `PKR ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const cats = expensesSummary.categoryBreakdown || [];
    const labels = cats.length ? cats.map((c) => c.category) : ['—'];
    const data = cats.length ? cats.map((c) => Number(c.total) || 0) : [1];
    const colors = ['#ef4444', '#2563eb', '#f59e0b', '#16a34a', '#8b5cf6', '#0ea5e9', '#64748b'];
    chartExpenseDonutInst.current = new ChartJS(dEl, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: cats.length ? cats.map((_, i) => colors[i % colors.length]) : ['#e5e7eb'], borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: chartFont, size: 10 } } },
          tooltip: { callbacks: { label: (c) => (cats.length ? `${c.label}: ${fmt(c.parsed)}` : '—') } },
        },
      },
    });
    const ts = salesSummary ? Number(salesSummary.totalSales) || 0 : 0;
    const te = Number(expensesSummary.totalExpenses) || 0;
    const net = Math.max(ts - te, 0);
    chartExpenseVsInst.current = new ChartJS(bEl, {
      type: 'bar',
      data: {
        labels: [t('reports.totalSales'), t('reports.totalExpenses'), t('reports.netProfit')],
        datasets: [
          {
            label: 'PKR',
            data: [ts, te, net],
            backgroundColor: ['#2563eb', '#ef4444', '#16a34a'],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmt(c.parsed.y) } } },
        scales: {
          y: { ticks: { callback: (v) => fmt(v), font: { family: chartFont } }, grid: { color: 'rgba(17,24,39,.06)' } },
          x: { ticks: { font: { family: chartFont } } },
        },
      },
    });
    return () => {
      chartExpenseDonutInst.current?.destroy();
      chartExpenseVsInst.current?.destroy();
      chartExpenseDonutInst.current = null;
      chartExpenseVsInst.current = null;
    };
  }, [activeTab, expenseSubTab, expensesSummary, salesSummary, t]);

  const updateDateRange = () => {
    if (filterType === 'custom' && customStartDate && customEndDate) {
      setStartDate(customStartDate);
      setEndDate(customEndDate);
      return;
    }
    const { start, end } = computePresetDateRange(filterType, customStartDate, customEndDate);
    setStartDate(start);
    setEndDate(end);
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  const getFilterParams = () => {
    const params = { period: filterType };
    if (filterType === 'custom' && customStartDate && customEndDate) {
      params.start_date = customStartDate;
      params.end_date = customEndDate;
    } else {
      const { start, end } = computePresetDateRange(filterType, customStartDate, customEndDate);
      params.start_date = start;
      params.end_date = end;
    }
    return params;
  };

  const reportShopKeys = () => (activeShopId ? zbKeys(activeShopId) : null);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getFilterParams();
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsDashSummary(params),
            queryFn: async () => {
              const response = await reportsAPI.getDashboardSummary(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getDashboardSummary(params)).data;
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: 'dashboard' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...getFilterParams() };
      if (selectedProduct) params.product_id = selectedProduct;
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsSalesSummary(params),
            queryFn: async () => {
              const response = await reportsAPI.getSalesSummary(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getSalesSummary(params)).data;
      setSalesSummary(data);
    } catch (err) {
      console.error('Error fetching sales summary:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.sales') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesInvoices = async () => {
    try {
      const params = { ...getFilterParams() };
      if (selectedProduct) params.product_id = selectedProduct;
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsSalesInvoices(params),
            queryFn: async () => {
              const response = await reportsAPI.getSalesInvoices(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getSalesInvoices(params)).data;
      setSalesInvoices(data);
    } catch (err) {
      console.error('Error fetching sales invoices:', err);
      setSalesInvoices(null);
    }
  };

  const fetchCustomersAnalytics = async () => {
    try {
      const p = getFilterParams();
      if (!p.start_date || !p.end_date) return;
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsCustomersAnalytics(p.start_date, p.end_date),
            queryFn: async () => {
              const response = await reportsAPI.getCustomersAnalytics({
                start_date: p.start_date,
                end_date: p.end_date,
              });
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (
            await reportsAPI.getCustomersAnalytics({
              start_date: p.start_date,
              end_date: p.end_date,
            })
          ).data;
      setCustomersAnalytics(data);
    } catch (err) {
      console.error('Error fetching customers analytics:', err);
      setCustomersAnalytics(null);
    }
  };

  const fetchSuppliersAnalytics = async () => {
    try {
      const p = getFilterParams();
      if (!p.start_date || !p.end_date) return;
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsSuppliersAnalytics(p.start_date, p.end_date),
            queryFn: async () => {
              const response = await reportsAPI.getSuppliersAnalytics({
                start_date: p.start_date,
                end_date: p.end_date,
              });
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (
            await reportsAPI.getSuppliersAnalytics({
              start_date: p.start_date,
              end_date: p.end_date,
            })
          ).data;
      setSuppliersAnalytics(data);
    } catch (err) {
      console.error('Error fetching suppliers analytics:', err);
      setSuppliersAnalytics(null);
    }
  };

  const fetchSalesByProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...getFilterParams() };
      if (selectedProduct) params.product_id = selectedProduct;
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsSalesByProduct(params),
            queryFn: async () => {
              const response = await reportsAPI.getSalesByProduct(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getSalesByProduct(params)).data;
      setSalesByProduct(data);
    } catch (err) {
      console.error('Error fetching sales by product:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.byProduct') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchProfit = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getFilterParams();
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsProfit(params),
            queryFn: async () => {
              const response = await reportsAPI.getProfit(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getProfit(params)).data;
      setProfitData(data);
    } catch (err) {
      console.error('Error fetching profit report:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.profit') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDueList = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { balance_greater_than_zero: 'false' };
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsCustomersDue(),
            queryFn: async () => {
              const response = await reportsAPI.getCustomersDue(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getCustomersDue(params)).data;
      setCustomerDueList(data);
    } catch (err) {
      console.error('Error fetching customer due list:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.dueList') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters to history - show all transactions to match current_balance
      const response = await reportsAPI.getCustomerStatement(selectedCustomer, {});
      setCustomerStatement(response.data);
    } catch (err) {
      console.error('Error fetching customer statement:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.history') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierPayables = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters - show all suppliers with payable amounts (like customer due list)
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsSupplierPayables(),
            queryFn: async () => {
              const response = await reportsAPI.getSuppliersPayable();
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getSuppliersPayable()).data;
      setSupplierPayables(data);
    } catch (err) {
      console.error('Error fetching supplier payables:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.payables') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters to history - show all transactions to match current_payable_balance
      const response = await reportsAPI.getSupplierHistory(selectedSupplierForHistory, {});
      setSupplierHistory(response.data);
    } catch (err) {
      console.error('Error fetching supplier history:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.history') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getFilterParams();
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsExpensesSummary(params),
            queryFn: async () => {
              const response = await reportsAPI.getExpensesSummary(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getExpensesSummary(params)).data;
      setExpensesSummary(data);
    } catch (err) {
      console.error('Error fetching expenses summary:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.expenses') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesList = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = getFilterParams();
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsExpensesList(params),
            queryFn: async () => {
              const response = await reportsAPI.getExpensesList(params);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getExpensesList(params)).data;
      setExpensesList(data);
    } catch (err) {
      console.error('Error fetching expenses list:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.list') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      setError(null);
      const stockParams = { min_quantity: 5 };
      const zbk = reportShopKeys();
      const data = zbk
        ? await queryClient.fetchQuery({
            queryKey: zbk.reportsStockLow(5),
            queryFn: async () => {
              const response = await reportsAPI.getStockLow(stockParams);
              return response.data;
            },
            staleTime: REPORTS_RQ_STALE_MS,
          })
        : (await reportsAPI.getStockLow(stockParams)).data;
      setLowStock(data);
    } catch (err) {
      console.error('Error fetching low stock:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.lowStock') }));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const simpleBars = (items = []) => {
    const max = Math.max(...items.map((x) => Number(x.value || 0)), 1);
    return (
      <div className="reports-v2-bars">
        {items.map((item) => (
          <div key={item.label} className="reports-v2-bar-row">
            <div className="reports-v2-bar-head">
              <span>{item.label}</span>
              <strong>{item.display}</strong>
            </div>
            <div className="reports-v2-bar-track">
              <div
                className="reports-v2-bar-fill"
                style={{
                  width: `${Math.max(6, Math.round((Number(item.value || 0) / max) * 100))}%`,
                  background: item.color || 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const handleClearFilters = () => {
    setSelectedProduct('');
    setSelectedCustomer('');
    setSelectedSupplierForHistory('');
    setFilterType('monthly');
    setCustomStartDate('');
    setCustomEndDate('');
    // Clear search states
    setCustomerDueSearch('');
    setSupplierPayablesSearch('');
    setCustomerHistorySearch('');
    setSupplierHistorySearch('');
    setShowCustomerHistoryDropdown(false);
    setShowSupplierHistoryDropdown(false);
    // Clear report data states
    setCustomerStatement(null);
    setSupplierHistory(null);
    // Reset sub-tabs
    setSalesSubTab('summary');
    setCustomerSubTab('due-list');
    setSupplierSubTab('payables');
    setExpenseSubTab('summary');
    // Force date range update
    const today = new Date();
    setStartDate(formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1)));
    setEndDate(formatLocalYmd(today));
  };

  const handleCardClick = (reportType) => {
    setActiveTab(reportType);
  };

  // Render Dashboard
  const renderDashboard = () => {
    if (loading && !dashboardData) {
      return <div className="loading">{t('common.loading')} {t('reports.dashboard').toLowerCase()}...</div>;
    }

    if (!dashboardData) return null;

    const lowN = Number(dashboardData.lowStockCount) || 0;
    const lowPrev = Array.isArray(dashboardData.lowStockPreview) ? dashboardData.lowStockPreview : [];
    const invN = Number(dashboardData.invoiceCount) || 0;
    const ts = Number(dashboardData.totalSales) || 0;
    const marginPct = ts > 0 ? Math.round(((Number(dashboardData.netProfit) || 0) / ts) * 1000) / 10 : 0;
    const expRatio = ts > 0 ? Math.round(((Number(dashboardData.totalExpenses) || 0) / ts) * 1000) / 10 : 0;
    const cs = Number(dashboardData.creditSales) || 0;
    const creditShare = ts > 0 ? Math.round((cs / ts) * 1000) / 10 : 0;

    return (
      <div className="reports-dashboard">
        <div className="rep-ins-grid">
          <button type="button" className="rep-ins-card" onClick={() => { setActiveTab('sales'); setSalesSubTab('summary'); }}>
            <div className="rep-k">{t('reports.totalSales')}</div>
            <div className="rep-v">{formatCurrency(dashboardData.totalSales)}</div>
            <div className="rep-sec-sub" style={{ marginTop: 6 }}>
              {invN} {t('reports.numberOfInvoices').toLowerCase()}
            </div>
          </button>
          <button type="button" className="rep-ins-card" onClick={() => handleCardClick('profit')}>
            <div className="rep-k">{t('reports.netProfit')}</div>
            <div className={`rep-v ${dashboardData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(dashboardData.netProfit)}
            </div>
            <div className="rep-sec-sub" style={{ marginTop: 6 }}>{marginPct}% margin</div>
          </button>
          <button type="button" className="rep-ins-card" onClick={() => { setActiveTab('expenses'); setExpenseSubTab('summary'); }}>
            <div className="rep-k">{t('reports.totalExpenses')}</div>
            <div className="rep-v">{formatCurrency(dashboardData.totalExpenses)}</div>
            <div className="rep-sec-sub" style={{ marginTop: 6 }}>{expRatio}% of revenue</div>
          </button>
          <button type="button" className="rep-ins-card" onClick={() => { setActiveTab('customers'); setCustomerSubTab('due-list'); }}>
            <div className="rep-k">{t('reports.creditGiven')}</div>
            <div className="rep-v">{formatCurrency(dashboardData.creditGiven)}</div>
            <div className="rep-sec-sub" style={{ marginTop: 6 }}>{creditShare}% of sales on credit</div>
          </button>
        </div>

        <div className="rep-kpi-grid">
          <button type="button" className="rep-kpi-card rep-accent-blue" onClick={() => { setActiveTab('sales'); setSalesSubTab('summary'); }}>
            <div className="rep-k">{t('reports.totalSales')}</div>
            <div className="rep-v">{formatCurrency(dashboardData.totalSales)}</div>
            <div className="rep-sec-sub" style={{ marginTop: 4 }}>{invN} invoices</div>
          </button>
          <button type="button" className="rep-kpi-card rep-accent-red" onClick={() => { setActiveTab('expenses'); setExpenseSubTab('summary'); }}>
            <div className="rep-k">{t('reports.totalExpenses')}</div>
            <div className="rep-v profit-negative">{formatCurrency(dashboardData.totalExpenses)}</div>
            <div className="rep-sec-sub" style={{ marginTop: 4 }}>{expRatio}% of sales</div>
          </button>
          <button type="button" className="rep-kpi-card rep-accent-green" onClick={() => handleCardClick('profit')}>
            <div className="rep-k">{t('reports.netProfit')}</div>
            <div className={`rep-v ${dashboardData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(dashboardData.netProfit)}
            </div>
            <div className="rep-sec-sub" style={{ marginTop: 4 }}>{marginPct}% margin</div>
          </button>
        </div>

        <div className="rep-dash-grid">
          <div className="rep-chart-card">
            <h3 className="rep-chart-h">{t('reports.sales')}</h3>
            <p className="rep-chart-sub">
              {dashboardData.dateRange?.start && dashboardData.dateRange?.end
                ? `${formatDate(dashboardData.dateRange.start)} — ${formatDate(dashboardData.dateRange.end)}`
                : '\u00a0'}
            </p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasTrendRef} />
            </div>
          </div>
          <div className="rep-chart-card">
            <h3 className="rep-chart-h">{t('reports.sales')}</h3>
            <p className="rep-chart-sub">
              {t('reports.cashSales')} / {t('reports.creditSales')}
            </p>
            <div className="rep-two-col" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(140px,200px)', alignItems: 'center' }}>
              <div className="rep-chart-canvas rep-tall">
                <canvas ref={canvasMixRef} />
              </div>
              <div className="rep-mix-side">
                <div className="rep-mix-pill cash">{t('reports.cashSales')}: {formatCurrency(dashboardData.cashSales)}</div>
                <div className="rep-mix-pill credit">{t('reports.creditSales')}: {formatCurrency(dashboardData.creditSales)}</div>
                {creditShare >= 50 ? (
                  <div className="rep-alert rep-alert-warn">
                    {creditShare}% of sales are on credit. Follow up on collections to improve cash flow.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="rep-chart-card">
            <h3 className="rep-chart-h">{t('reports.expenses')}</h3>
            <p className="rep-chart-sub">{t('reports.categoryBreakdown')}</p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasExpRef} />
            </div>
          </div>
          <div className="rep-chart-card">
            <h3 className="rep-chart-h">{t('reports.lowStock')}</h3>
            <p className="rep-chart-sub">{lowN > 0 ? `${lowN} SKU` : t('reports.noLowStockItems')}</p>
            {lowPrev.length > 0 ? (
              <ul className="rep-stock-list">
                {lowPrev.map((p) => (
                  <li key={p.product_id} className="rep-stock-li">
                    <span>{p.product_name}</span>
                    <span>{p.current_qty}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rep-chart-sub" style={{ marginTop: 12 }}>{t('reports.noLowStockItems')}</p>
            )}
            <div style={{ marginTop: 14 }}>
              <button type="button" className="rep-btn-ghost" onClick={() => setActiveTab('stock-low')}>
                {t('reports.lowStock')}
              </button>
            </div>
          </div>
        </div>

        <div className="reports-v2-chart-grid" style={{ marginTop: 16 }}>
          <div className="reports-v2-chart-card">
            <h4>
              {t('reports.cashReceived')} / {t('reports.creditGiven')}
            </h4>
            {simpleBars([
              {
                label: t('reports.cashReceived'),
                value: dashboardData.cashReceived,
                display: formatCurrency(dashboardData.cashReceived),
                color: 'linear-gradient(90deg,#16a34a,#34d399)',
              },
              {
                label: t('reports.creditGiven'),
                value: dashboardData.creditGiven,
                display: formatCurrency(dashboardData.creditGiven),
                color: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
              },
              {
                label: t('reports.totalSales'),
                value: dashboardData.totalSales,
                display: formatCurrency(dashboardData.totalSales),
                color: 'linear-gradient(90deg,#2563eb,#60a5fa)',
              },
            ])}
          </div>
          <div className="reports-v2-chart-card">
            <h4>{t('reports.profit')}</h4>
            {simpleBars([
              {
                label: t('reports.totalSales'),
                value: dashboardData.totalSales,
                display: formatCurrency(dashboardData.totalSales),
                color: 'linear-gradient(90deg,#3b82f6,#818cf8)',
              },
              {
                label: t('reports.totalPurchases'),
                value: dashboardData.totalPurchases,
                display: formatCurrency(dashboardData.totalPurchases),
                color: 'linear-gradient(90deg,#ef4444,#f87171)',
              },
              {
                label: t('reports.totalExpenses'),
                value: dashboardData.totalExpenses,
                display: formatCurrency(dashboardData.totalExpenses),
                color: 'linear-gradient(90deg,#f97316,#fb923c)',
              },
            ])}
          </div>
        </div>
      </div>
    );
  };

  // Render Sales (Combined Summary and By Product)
  const renderSales = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Sales */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${salesSubTab === 'summary' ? 'active' : ''}`}
            onClick={() => setSalesSubTab('summary')}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.salesSummary')}
          </button>
          <button
            type="button"
            className={`tab ${salesSubTab === 'by-product' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setSalesSubTab('by-product')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Sales by product' : undefined}
          >
            {t('reports.salesByProduct')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Product Filter - Only show in Sales tab */}
        <div style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">{t('reports.filterByProduct')}</label>
            <select
              className="form-input"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">{t('reports.allProducts')}</option>
              {products.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.name || product.item_name_english}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Render based on sub-tab */}
        {salesSubTab === 'summary' && renderSalesSummary()}
        {salesSubTab === 'by-product' && renderSalesByProduct()}
      </div>
    );
  };

  // Render Sales Summary
  const renderSalesSummary = () => {
    if (loading && !salesSummary) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!salesSummary) return null;

    const invList = salesInvoices?.invoices || [];
    const ts = Number(salesSummary.totalSales) || 0;
    const cashPct = ts > 0 ? Math.round(((Number(salesSummary.cashSales) || 0) / ts) * 1000) / 10 : 0;

    return (
      <div>
        <div className="rep-sec-hd">
          <div>
            <h2 className="rep-sec-title">{t('reports.salesSummary')}</h2>
            <p className="rep-sec-sub">
              {salesSummary.dateRange?.start && salesSummary.dateRange?.end
                ? `${formatDate(salesSummary.dateRange.start)} — ${formatDate(salesSummary.dateRange.end)}`
                : ''}
            </p>
          </div>
        </div>
        <div className="report-totals">
          <div className="total-card highlight">
            <div className="total-label">{t('reports.totalSalesAmount')}</div>
            <div className="total-value" style={{ color: '#2563eb' }}>{formatCurrency(salesSummary.totalSales)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.numberOfInvoices')}</div>
            <div className="total-value">{salesSummary.invoiceCount}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.cashSales')}</div>
            <div className="total-value profit-positive">{formatCurrency(salesSummary.cashSales)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.creditSales')}</div>
            <div className="total-value" style={{ color: '#ea580c' }}>{formatCurrency(salesSummary.creditSales)}</div>
          </div>
        </div>
        <div className="rep-two-col" style={{ marginTop: 16 }}>
          <div className="reports-v2-chart-card">
            <h4>{t('reports.sales')}</h4>
            <p className="rep-chart-sub">Breakdown by payment type</p>
            {simpleBars([
              {
                label: t('reports.cashSales'),
                value: salesSummary.cashSales,
                display: `${formatCurrency(salesSummary.cashSales)} (${cashPct}%)`,
                color: 'linear-gradient(90deg,#22c55e,#4ade80)',
              },
              {
                label: t('reports.creditSales'),
                value: salesSummary.creditSales,
                display: formatCurrency(salesSummary.creditSales),
                color: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
              },
              {
                label: t('reports.totalSales'),
                value: salesSummary.totalSales,
                display: formatCurrency(salesSummary.totalSales),
                color: 'linear-gradient(90deg,#2563eb,#60a5fa)',
              },
            ])}
          </div>
          <div className="reports-v2-chart-card">
            <h4>Sales by invoice</h4>
            <p className="rep-chart-sub">Cash vs credit per transaction</p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasSalesStackRef} />
            </div>
          </div>
        </div>
        <div className="rep-sec-hd" style={{ marginTop: 20 }}>
          <div>
            <h3 className="rep-sec-title">Invoice details</h3>
            <p className="rep-sec-sub">All transactions this period</p>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Total</th>
                <th>Cash</th>
                <th>Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">{t('reports.noSalesFound')}</td>
                </tr>
              ) : (
                invList.map((row) => (
                  <tr key={row.sale_id}>
                    <td>{row.invoice_number || `#${row.sale_id}`}</td>
                    <td>{formatDate(row.date)}</td>
                    <td>{formatCurrency(row.total)}</td>
                    <td className="profit-positive">{formatCurrency(row.cash)}</td>
                    <td style={{ color: '#ea580c' }}>{formatCurrency(row.credit)}</td>
                    <td>
                      <span className={`rep-badge ${row.status === 'Paid' ? 'rep-badge-ok' : 'rep-badge-warn'}`}>{row.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {invList.length > 0 ? (
              <tfoot>
                <tr>
                  <th colSpan="2">Total</th>
                  <th>{formatCurrency(invList.reduce((s, r) => s + (Number(r.total) || 0), 0))}</th>
                  <th className="profit-positive">{formatCurrency(invList.reduce((s, r) => s + (Number(r.cash) || 0), 0))}</th>
                  <th>{formatCurrency(invList.reduce((s, r) => s + (Number(r.credit) || 0), 0))}</th>
                  <th />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    );
  };

  // Render Sales by Product
  const renderSalesByProduct = () => {
    if (loading && !salesByProduct) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!salesByProduct || !salesByProduct.products) return null;

    return (
      <div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>{t('reports.productName')}</th>
                <th>{t('reports.quantitySold')}</th>
                <th>{t('reports.totalSaleAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {salesByProduct.products.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">{t('reports.noSalesFound')}</td>
                </tr>
              ) : (
                salesByProduct.products.map((product) => (
                  <tr key={product.product_id}>
                    <td>{product.product_name}</td>
                    <td>{product.quantity_sold}</td>
                    <td>{formatCurrency(product.total_sale_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Profit Report
  const renderProfit = () => {
    if (loading && !profitData) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!profitData) return null;

    const gp = Number(profitData.grossProfit) || 0;
    const nm = Number(profitData.netMarginPct) || 0;
    const er = Number(profitData.expenseRatioPct) || 0;

    return (
      <div className="report-content">
        <div className="rep-kpi-row-4">
          <div className="rep-kpi-mini rep-accent-blue">
            <div className="tk">Revenue</div>
            <div className="tv">{formatCurrency(profitData.totalSales)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-green">
            <div className="tk">{t('reports.netProfit')}</div>
            <div className="tv profit-positive">{formatCurrency(profitData.netProfit)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-amber">
            <div className="tk">Net margin</div>
            <div className="tv">{nm}%</div>
          </div>
          <div className="rep-kpi-mini rep-accent-red">
            <div className="tk">Total costs</div>
            <div className="tv profit-negative">{formatCurrency((profitData.totalPurchases || 0) + (profitData.totalExpenses || 0))}</div>
          </div>
        </div>
        <div className="report-totals">
          <div className="total-card highlight">
            <div className="total-label">{t('reports.totalSales')}</div>
            <div className="total-value">{formatCurrency(profitData.totalSales)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">Gross profit</div>
            <div className="total-value profit-positive">{formatCurrency(gp)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.totalExpenses')}</div>
            <div className="total-value profit-negative">{formatCurrency(profitData.totalExpenses)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.netProfit')}</div>
            <div className={`total-value ${profitData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(profitData.netProfit)}
            </div>
          </div>
        </div>
        <div className="rep-two-col" style={{ marginTop: 14 }}>
          <div className="reports-v2-chart-card">
            <h4>Profit trend</h4>
            <p className="rep-chart-sub">Revenue, costs, and net by day</p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasProfitTrendRef} />
            </div>
          </div>
          <div className="reports-v2-chart-card">
            <h4>Profit mix</h4>
            <p className="rep-chart-sub">Net vs expenses vs purchases</p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasProfitMarginRef} />
            </div>
            <div className="rep-sec-sub" style={{ marginTop: 8 }}>Expense ratio: {er}% of sales</div>
          </div>
        </div>
        <div className="reports-v2-chart-card" style={{ marginTop: 14 }}>
          <h4>Revenue to profit (snapshot)</h4>
          {simpleBars([
            {
              label: 'Revenue',
              value: profitData.totalSales,
              display: formatCurrency(profitData.totalSales),
              color: 'linear-gradient(90deg,#22c55e,#4ade80)',
            },
            {
              label: t('reports.totalPurchases'),
              value: profitData.totalPurchases,
              display: formatCurrency(profitData.totalPurchases),
              color: 'linear-gradient(90deg,#ef4444,#fb7185)',
            },
            {
              label: t('reports.totalExpenses'),
              value: profitData.totalExpenses,
              display: formatCurrency(profitData.totalExpenses),
              color: 'linear-gradient(90deg,#f97316,#fb923c)',
            },
            {
              label: t('reports.netProfit'),
              value: Math.abs(profitData.netProfit),
              display: formatCurrency(profitData.netProfit),
              color:
                profitData.netProfit >= 0
                  ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                  : 'linear-gradient(90deg,#dc2626,#f87171)',
            },
          ])}
        </div>
        {Array.isArray(profitData.expenseCategoryBreakdown) && profitData.expenseCategoryBreakdown.length > 0 ? (
          <div className="reports-v2-chart-card" style={{ marginTop: 14 }}>
            <h4>Expense impact</h4>
            {simpleBars(
              profitData.expenseCategoryBreakdown.slice(0, 8).map((c) => ({
                label: c.category,
                value: c.total,
                display: formatCurrency(c.total),
                color: 'linear-gradient(90deg,#f97316,#fb923c)',
              }))
            )}
          </div>
        ) : null}
      </div>
    );
  };

  // Render Customers (Combined Due List and History)
  const renderCustomers = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Customers */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${customerSubTab === 'due-list' ? 'active' : ''}`}
            onClick={() => { setCustomerSubTab('due-list'); setSelectedCustomer(''); setCustomerStatement(null); }}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.dueList')}
          </button>
          <button
            type="button"
            className={`tab ${customerSubTab === 'history' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setCustomerSubTab('history')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Customer statement / history' : undefined}
          >
            {t('reports.history')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Render based on sub-tab */}
        {customerSubTab === 'due-list' && renderCustomerDueList()}
        {customerSubTab === 'history' && renderCustomerStatement()}
      </div>
    );
  };

  // Render Customer Due List
  const renderCustomerDueList = () => {
    if (loading && !customerDueList) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!customerDueList || !customerDueList.customers) return null;

    const filteredCustomers = customerDueList.customers.filter((customer) => {
      if (!customerDueSearch.trim()) return true;
      const search = customerDueSearch.toLowerCase();
      const name = (customer.customer_name || '').toLowerCase();
      const phone = (customer.mobile_number || '').toLowerCase();
      return name.includes(search) || phone.includes(search);
    });

    const custStatus = (row) => {
      const due = parseFloat(row.total_due) || 0;
      if (due < 0.5) return { label: 'Cleared', cls: 'rep-badge-ok' };
      const lp = row.last_purchase_date ? new Date(row.last_purchase_date).getTime() : 0;
      const lpay = row.last_payment_date ? new Date(row.last_payment_date).getTime() : 0;
      if (lp && (!lpay || lp > lpay) && Date.now() - lp > 40 * 86400000) return { label: 'Overdue', cls: 'rep-badge-err' };
      return { label: 'Partial', cls: 'rep-badge-warn' };
    };

    const ca = customersAnalytics || {};
    const pendingN = filteredCustomers.filter((c) => (parseFloat(c.total_due) || 0) >= 0.5).length;

    return (
      <div className="report-content">
        <div className="rep-kpi-row-5">
          <div className="rep-kpi-mini rep-accent-blue">
            <div className="tk">Total customers</div>
            <div className="tv">{ca.totalCustomers ?? customerDueList.customers?.length ?? '—'}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-amber">
            <div className="tk">Credit sales (period)</div>
            <div className="tv">{formatCurrency(ca.totalCreditSales)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-green">
            <div className="tk">Collected (period)</div>
            <div className="tv">{formatCurrency(ca.totalCollected)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-red">
            <div className="tk">Outstanding</div>
            <div className="tv">{formatCurrency(ca.outstanding)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-blue">
            <div className="tk">Collection rate</div>
            <div className="tv">{ca.collectionRatePct != null ? `${ca.collectionRatePct}%` : '—'}</div>
          </div>
        </div>
        <div className="rep-sec-hd">
          <div>
            <h3 className="rep-sec-title">Outstanding balances</h3>
            <p className="rep-sec-sub">Customers with pending credit collection</p>
          </div>
          <span className="rep-badge rep-badge-warn">{pendingN} pending</span>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">{t('reports.searchCustomer')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('reports.typeToSearch')}
              value={customerDueSearch}
              onChange={(e) => setCustomerDueSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('reports.customerName')}</th>
                <th>{t('reports.mobileNumber')}</th>
                <th>Credit given</th>
                <th>Collected</th>
                <th>Balance</th>
                <th>Last txn</th>
                <th>Status</th>
                <th>{t('reports.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-state">
                    {customerDueSearch ? t('reports.noCustomersFound') : t('reports.noCustomersDue')}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => {
                  const st = custStatus(customer);
                  const cg = parseFloat(customer.total_sales_due) || 0;
                  const col = parseFloat(customer.total_paid) || 0;
                  const last = customer.last_payment_date || customer.last_purchase_date;
                  return (
                    <tr key={customer.customer_id}>
                      <td>{idx + 1}</td>
                      <td>{customer.customer_name}</td>
                      <td>{customer.mobile_number || '-'}</td>
                      <td>{formatCurrency(cg)}</td>
                      <td className="profit-positive">{formatCurrency(col)}</td>
                      <td className="profit-negative">{formatCurrency(customer.total_due)}</td>
                      <td>{last ? formatDate(last) : '—'}</td>
                      <td><span className={`rep-badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedCustomer(customer.customer_id);
                            setCustomerSubTab('history');
                          }}
                        >
                          View history
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="rep-sec-hd" style={{ marginTop: 20 }}>
          <div>
            <h3 className="rep-sec-title">Collection progress</h3>
            <p className="rep-sec-sub">Credit recovery vs outstanding</p>
          </div>
        </div>
        <div className="rep-collect-row">
          {filteredCustomers
            .filter((c) => (parseFloat(c.total_sales_due) || 0) > 0.01)
            .slice(0, 12)
            .map((c) => {
              const target = parseFloat(c.total_sales_due) || 1;
              const got = parseFloat(c.total_paid) || 0;
              const pct = Math.min(100, Math.round((got / target) * 100));
              return (
                <div key={`cp-${c.customer_id}`} className="rep-collect-item">
                  <span>{c.customer_name}</span>
                  <div className="rep-collect-bar">
                    <div className="rep-collect-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{formatCurrency(got)} / {formatCurrency(target)}</span>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  // Render Customer Statement
  const renderCustomerStatement = () => {
    if (loading && !customerStatement) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!customerStatement) {
      // Filter customers based on search
      const filteredCustomers = customers.filter(customer => {
        if (!customerHistorySearch.trim()) return true;
        const search = customerHistorySearch.toLowerCase();
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        return name.includes(search) || phone.includes(search);
      });

      // Get selected customer name for display
      const selectedCustomerData = customers.find(c => c.customer_id === parseInt(selectedCustomer));
      const displayValue = selectedCustomerData 
        ? `${selectedCustomerData.name} ${selectedCustomerData.current_due > 0 ? `- ${formatCurrency(selectedCustomerData.current_due)}` : ''}`
        : customerHistorySearch;

      return (
        <div className="report-content">
          <div className="form-group" style={{ position: 'relative' }} ref={customerHistoryDropdownRef}>
            <label className="form-label">{t('reports.selectCustomer')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('reports.typeToSearch')}
              value={selectedCustomer ? displayValue : customerHistorySearch}
              onChange={(e) => {
                setCustomerHistorySearch(e.target.value);
                setSelectedCustomer('');
                setShowCustomerHistoryDropdown(true);
              }}
              onFocus={() => setShowCustomerHistoryDropdown(true)}
            />
            {showCustomerHistoryDropdown && filteredCustomers.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.customer_id}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    onClick={() => {
                      setSelectedCustomer(customer.customer_id);
                      setCustomerHistorySearch('');
                      setShowCustomerHistoryDropdown(false);
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{customer.name}</div>
                    {customer.phone && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.phone}</div>
                    )}
                    {customer.current_due > 0 && (
                      <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    {t('reports.due')} {formatCurrency(customer.current_due)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {showCustomerHistoryDropdown && filteredCustomers.length === 0 && customerHistorySearch && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '12px',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                No customers found
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="report-content">
        <div className="report-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{customerStatement.customer.name}</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedCustomer('');
                  setCustomerHistorySearch('');
                  setCustomerStatement(null);
                  setShowCustomerHistoryDropdown(false);
                }}
              >
                {t('reports.changeCustomer')}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setCustomerSubTab('due-list');
                  setSelectedCustomer('');
                  setCustomerStatement(null);
                }}
              >
                {t('reports.backToList')}
              </button>
            </div>
          </div>
          <div className="report-totals">
            <div className="total-card">
              <div className="total-label">{t('reports.totalSales')}</div>
              <div className="total-value">{formatCurrency(customerStatement.total_sales)}</div>
            </div>
            <div className="total-card">
              <div className="total-label">{t('reports.totalPayments')}</div>
              <div className="total-value profit-positive">{formatCurrency(customerStatement.total_payments)}</div>
            </div>
            <div className="total-card highlight">
              <div className="total-label">{t('reports.remainingBalance')}</div>
              <div className="total-value profit-negative">{formatCurrency(customerStatement.remaining_balance)}</div>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {customerStatement.statement.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No transactions found.</td>
                </tr>
              ) : (
                customerStatement.statement.map((item, index) => (
                  <tr key={index}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.description}</td>
                    <td className={item.amount >= 0 ? 'profit-negative' : 'profit-positive'}>
                      {formatCurrency(Math.abs(item.amount))}
                    </td>
                    <td>{formatCurrency(item.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Suppliers (Combined Payables and History)
  const renderSuppliers = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Suppliers */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${supplierSubTab === 'payables' ? 'active' : ''}`}
            onClick={() => { setSupplierSubTab('payables'); setSelectedSupplierForHistory(''); setSupplierHistory(null); }}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.payables')}
          </button>
          <button
            type="button"
            className={`tab ${supplierSubTab === 'history' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setSupplierSubTab('history')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Supplier history' : undefined}
          >
            {t('reports.history')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Render based on sub-tab */}
        {supplierSubTab === 'payables' && renderSupplierPayables()}
        {supplierSubTab === 'history' && renderSupplierHistory()}
      </div>
    );
  };

  // Render Supplier Payables
  const renderSupplierPayables = () => {
    if (loading && !supplierPayables) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!supplierPayables || !Array.isArray(supplierPayables)) return null;

    // Filter suppliers based on search
    const filteredSuppliers = supplierPayables.filter(supplier => {
      if (!supplierPayablesSearch.trim()) return true;
      const search = supplierPayablesSearch.toLowerCase();
      const name = (supplier.name || '').toLowerCase();
      const contact = (supplier.contact_number || '').toLowerCase();
      return name.includes(search) || contact.includes(search);
    });

    // Only sum positive balances (amounts we actually owe)
    const totalPayable = filteredSuppliers.reduce((sum, s) => {
      const balance = parseFloat(s.current_payable_balance || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    const sa = suppliersAnalytics || {};
    const purchRows = sa.purchases || [];
    const supSt = (bal) => {
      const b = parseFloat(bal) || 0;
      if (b < 0.5) return { label: 'Cleared', cls: 'rep-badge-ok' };
      if (b > 100000) return { label: 'Overdue', cls: 'rep-badge-err' };
      return { label: 'Partial', cls: 'rep-badge-warn' };
    };

    return (
      <div className="report-content">
        <div className="rep-kpi-row-4">
          <div className="rep-kpi-mini rep-accent-blue">
            <div className="tk">Total suppliers</div>
            <div className="tv">{sa.supplierCount ?? '—'}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-blue">
            <div className="tk">Purchased (period)</div>
            <div className="tv">{formatCurrency(sa.totalPurchased)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-green">
            <div className="tk">Total paid</div>
            <div className="tv">{formatCurrency(sa.totalPaid)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-red">
            <div className="tk">Outstanding</div>
            <div className="tv">{formatCurrency(sa.outstandingPayable ?? totalPayable)}</div>
          </div>
        </div>
        <div className="rep-sec-hd">
          <div>
            <h3 className="rep-sec-title">Supplier payables</h3>
            <p className="rep-sec-sub">Outstanding amounts owed to suppliers</p>
          </div>
          <span className="rep-badge rep-badge-err">{formatCurrency(totalPayable)} due</span>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">{t('reports.searchSupplier')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('reports.typeToSearch')}
              value={supplierPayablesSearch}
              onChange={(e) => setSupplierPayablesSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('reports.supplierName')}</th>
                <th>Purchased</th>
                <th>Paid</th>
                <th>Payable</th>
                <th>Last order</th>
                <th>Status</th>
                <th>{t('reports.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    {supplierPayablesSearch ? t('reports.noSuppliersFound') : t('reports.noSuppliersPayable')}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier, idx) => {
                  const bal = parseFloat(supplier.current_payable_balance || 0);
                  const st = supSt(bal);
                  const tp = parseFloat(supplier.total_credit_purchases) || 0;
                  const paid = parseFloat(supplier.total_paid) || 0;
                  return (
                    <tr key={supplier.supplier_id}>
                      <td>{idx + 1}</td>
                      <td>{supplier.name}</td>
                      <td>{formatCurrency(tp)}</td>
                      <td className="profit-positive">{formatCurrency(paid)}</td>
                      <td className="profit-negative">{formatCurrency(Math.abs(bal))}</td>
                      <td>{supplier.last_purchase_date ? formatDate(supplier.last_purchase_date) : '—'}</td>
                      <td><span className={`rep-badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedSupplierForHistory(supplier.supplier_id);
                            setSupplierSubTab('history');
                          }}
                        >
                          {t('reports.viewHistory')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="rep-sec-hd" style={{ marginTop: 20 }}>
          <div>
            <h3 className="rep-sec-title">Purchase history</h3>
            <p className="rep-sec-sub">All purchase transactions this period</p>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No purchases in this period.</td>
                </tr>
              ) : (
                purchRows.map((p) => (
                  <tr key={p.purchase_id}>
                    <td>PO-{String(p.purchase_id).padStart(3, '0')}</td>
                    <td>{p.supplier_name}</td>
                    <td>{formatCurrency(p.total_amount)}</td>
                    <td>{formatDate(p.date)}</td>
                    <td style={{ color: '#2563eb', fontWeight: 600 }}>{p.payment_type === 'cash' ? 'Cash' : 'Credit'}</td>
                    <td>
                      <span className={`rep-badge ${p.payment_type === 'cash' ? 'rep-badge-ok' : 'rep-badge-warn'}`}>
                        {p.payment_type === 'cash' ? 'Paid' : 'Partial'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {purchRows.length > 0 ? (
              <tfoot>
                <tr>
                  <th colSpan="2">Total</th>
                  <th>{formatCurrency(purchRows.reduce((s, p) => s + (Number(p.total_amount) || 0), 0))}</th>
                  <th colSpan="3" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    );
  };

  // Render Supplier History
  const renderSupplierHistory = () => {
    if (loading && !supplierHistory) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!supplierHistory) {
      // Filter suppliers based on search
      const filteredSuppliers = (supplierPayables || []).filter(supplier => {
        if (!supplierHistorySearch.trim()) return true;
        const search = supplierHistorySearch.toLowerCase();
        const name = (supplier.name || '').toLowerCase();
        const contact = (supplier.contact_number || '').toLowerCase();
        return name.includes(search) || contact.includes(search);
      });

      // Get selected supplier name for display
      const selectedSupplierData = supplierPayables?.find(s => s.supplier_id === parseInt(selectedSupplierForHistory));
      const displayValue = selectedSupplierData 
        ? `${selectedSupplierData.name} - ${formatCurrency(Math.abs(parseFloat(selectedSupplierData.current_payable_balance || 0)))}`
        : supplierHistorySearch;

      return (
        <div className="report-content">
          <div className="form-group" style={{ position: 'relative' }} ref={supplierHistoryDropdownRef}>
            <label className="form-label">Select Supplier</label>
            <input
              type="text"
              className="form-input"
              placeholder="Type to search suppliers..."
              value={selectedSupplierForHistory ? displayValue : supplierHistorySearch}
              onChange={(e) => {
                setSupplierHistorySearch(e.target.value);
                setSelectedSupplierForHistory('');
                setShowSupplierHistoryDropdown(true);
              }}
              onFocus={() => setShowSupplierHistoryDropdown(true)}
            />
            {showSupplierHistoryDropdown && filteredSuppliers.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                {filteredSuppliers.map(supplier => (
                  <div
                    key={supplier.supplier_id}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    onClick={() => {
                      setSelectedSupplierForHistory(supplier.supplier_id);
                      setSupplierHistorySearch('');
                      setShowSupplierHistoryDropdown(false);
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{supplier.name}</div>
                    {supplier.contact_number && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{supplier.contact_number}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      Payable: {formatCurrency(Math.abs(parseFloat(supplier.current_payable_balance || 0)))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showSupplierHistoryDropdown && filteredSuppliers.length === 0 && supplierHistorySearch && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '12px',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                No suppliers found
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="report-content">
        <div className="report-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{supplierHistory.supplier.name}</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedSupplierForHistory('');
                  setSupplierHistorySearch('');
                  setSupplierHistory(null);
                  setShowSupplierHistoryDropdown(false);
                }}
              >
                Change Supplier
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSupplierSubTab('payables');
                  setSelectedSupplierForHistory('');
                  setSupplierHistory(null);
                }}
              >
                {t('reports.backToList')}
              </button>
            </div>
          </div>
          <div className="report-totals">
            <div className="total-card">
              <div className="total-label">{t('reports.totalPurchases')}</div>
              <div className="total-value">{formatCurrency(supplierHistory.total_purchases)}</div>
            </div>
            <div className="total-card">
              <div className="total-label">{t('reports.totalPaid')}</div>
              <div className="total-value profit-positive">{formatCurrency(supplierHistory.total_paid)}</div>
            </div>
            <div className="total-card highlight">
              <div className="total-label">{t('reports.remainingBalance')}</div>
              <div className="total-value profit-negative">{formatCurrency(Math.abs(parseFloat(supplierHistory.remaining_balance || 0)))}</div>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {supplierHistory.history.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No transactions found.</td>
                </tr>
              ) : (
                supplierHistory.history.map((item, index) => (
                  <tr key={index}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.description}</td>
                    <td className={item.amount >= 0 ? 'profit-negative' : 'profit-positive'}>
                      {formatCurrency(Math.abs(item.amount))}
                    </td>
                    <td>{formatCurrency(item.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Expenses (Combined Summary and List)
  const renderExpenses = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Expenses */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${expenseSubTab === 'summary' ? 'active' : ''}`}
            onClick={() => setExpenseSubTab('summary')}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.summary')}
          </button>
          <button
            type="button"
            className={`tab ${expenseSubTab === 'list' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setExpenseSubTab('list')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Detailed expense list' : undefined}
          >
            {t('reports.list')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Render based on sub-tab */}
        {expenseSubTab === 'summary' && renderExpensesSummary()}
        {expenseSubTab === 'list' && renderExpensesList()}
      </div>
    );
  };

  // Render Expenses Summary
  const renderExpensesSummary = () => {
    if (loading && !expensesSummary) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!expensesSummary) return null;

    const cats = expensesSummary.categoryBreakdown || [];
    const topCat = cats.length
      ? cats.reduce((a, b) => (parseFloat(b.total) > parseFloat(a.total) ? b : a))
      : { category: '—', total: 0 };
    const ts = salesSummary ? Number(salesSummary.totalSales) || 0 : 0;
    const te = Number(expensesSummary.totalExpenses) || 0;
    const pctOfSales = ts > 0 ? Math.round((te / ts) * 1000) / 10 : 0;

    return (
      <div>
        <div className="rep-kpi-row-4">
          <div className="rep-kpi-mini rep-accent-red">
            <div className="tk">Total expenses</div>
            <div className="tv profit-negative">{formatCurrency(expensesSummary.totalExpenses)}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-blue">
            <div className="tk">Entries</div>
            <div className="tv">{expensesSummary.expenseCount}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-amber">
            <div className="tk">Largest category</div>
            <div className="tv" style={{ fontSize: '1rem' }}>{topCat.category}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-green">
            <div className="tk">% of sales</div>
            <div className="tv">{pctOfSales}%</div>
          </div>
        </div>
        <div className="rep-two-col" style={{ marginTop: 8 }}>
          <div className="reports-v2-chart-card">
            <h4>Expense categories</h4>
            <p className="rep-chart-sub">Spending breakdown by type</p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasExpenseDonutRef} />
            </div>
          </div>
          <div className="reports-v2-chart-card">
            <h4>Expenses vs sales</h4>
            <p className="rep-chart-sub">Cost vs revenue this period</p>
            <div className="rep-chart-canvas rep-tall">
              <canvas ref={canvasExpenseVsRef} />
            </div>
            {pctOfSales > 30 ? (
              <div className="rep-alert rep-alert-warn" style={{ marginTop: 10 }}>
                Cost ratio insight: Expense ratio is {pctOfSales}%. Healthy retail target is often under 30%. Review overhead.
              </div>
            ) : null}
          </div>
        </div>
        {cats.length > 0 ? (
          <div className="table-container" style={{ marginTop: 14 }}>
            <h3 style={{ padding: '12px 14px 0', margin: 0 }}>{t('reports.categoryBreakdown')}</h3>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>{t('reports.category')}</th>
                  <th>{t('reports.totalAmount')}</th>
                  <th>{t('reports.count')}</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((cat, index) => (
                  <tr key={index}>
                    <td>{cat.category}</td>
                    <td>{formatCurrency(cat.total)}</td>
                    <td>{cat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {expensesList?.expenses?.length ? (
          <>
            <div className="rep-sec-hd" style={{ marginTop: 20 }}>
              <div>
                <h3 className="rep-sec-title">Expense list</h3>
                <p className="rep-sec-sub">All recorded expenses this period</p>
              </div>
            </div>
            <div className="table-container">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>{t('reports.category')}</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {expensesList.expenses.map((expense) => {
                    const share = te > 0 ? Math.round(((parseFloat(expense.amount) || 0) / te) * 1000) / 10 : 0;
                    return (
                      <tr key={expense.expense_id}>
                        <td style={{ fontWeight: 700 }}>{expense.category}</td>
                        <td>{expense.expense_name}</td>
                        <td>{formatDate(expense.date)}</td>
                        <td className="profit-negative">{formatCurrency(expense.amount)}</td>
                        <td>{share}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="3">Total</th>
                    <th className="profit-negative">{formatCurrency(te)}</th>
                    <th>100%</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : !proOk ? (
          <p className="rep-sec-sub" style={{ marginTop: 16 }}>Upgrade to Pro to see the full expense list here.</p>
        ) : null}
      </div>
    );
  };

  // Render Expenses List
  const renderExpensesList = () => {
    if (loading && !expensesList) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!expensesList || !expensesList.expenses) return null;

    return (
      <div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Name</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expensesList.expenses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No expenses found for this period.</td>
                </tr>
              ) : (
                expensesList.expenses.map((expense) => (
                  <tr key={expense.expense_id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.expense_name}</td>
                    <td>{expense.category}</td>
                    <td className="profit-negative">{formatCurrency(expense.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Low Stock
  const renderLowStock = () => {
    if (loading && !lowStock) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!lowStock || !lowStock.products) return null;

    const prods = lowStock.products;
    const below = prods.filter((p) => (parseFloat(p.current_qty) || 0) <= (parseFloat(p.minimum_qty) || 5)).length;
    const critical = prods.filter((p) => (parseFloat(p.current_qty) || 0) < 1).length;
    const ok = prods.length === 0 ? '—' : Math.max(0, prods.length - below);

    return (
      <div className="report-content">
        <div className="rep-kpi-row-4" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <div className="rep-kpi-mini rep-accent-red">
            <div className="tk">Items below min</div>
            <div className="tv profit-negative">{below}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-red">
            <div className="tk">Critical (&lt; 1 unit)</div>
            <div className="tv profit-negative">{critical}</div>
          </div>
          <div className="rep-kpi-mini rep-accent-green">
            <div className="tk">Items OK</div>
            <div className="tv">{ok}</div>
          </div>
        </div>
        <div className="rep-sec-hd">
          <div>
            <h3 className="rep-sec-title">Low stock items</h3>
            <p className="rep-sec-sub">Products below minimum quantity threshold</p>
          </div>
          <span className="rep-badge rep-badge-err">{below} alert</span>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>{t('reports.productName')}</th>
                <th>{t('reports.currentQty')}</th>
                <th>{t('reports.minimumQty')}</th>
                <th>Stock level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {prods.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">{t('reports.noLowStockItems')}</td>
                </tr>
              ) : (
                prods.map((product) => {
                  const min = parseFloat(product.minimum_qty) || 5;
                  const q = parseFloat(product.current_qty) || 0;
                  const pct = min > 0 ? Math.min(100, Math.round((q / min) * 100)) : 0;
                  const crit = q < 1;
                  return (
                    <tr key={product.product_id}>
                      <td style={{ fontWeight: 700 }}>{product.product_name}</td>
                      <td className={crit ? 'profit-negative' : ''}>{product.current_qty}</td>
                      <td>{product.minimum_qty}</td>
                      <td>
                        <div className="rep-collect-bar" style={{ maxWidth: 140 }}>
                          <div className="rep-collect-fill" style={{ width: `${pct}%`, background: crit ? '#dc2626' : undefined }} />
                        </div>
                        <span style={{ fontSize: 12, marginLeft: 8 }}>{pct}%</span>
                      </td>
                      <td>
                        <span className={`rep-badge ${crit ? 'rep-badge-err' : 'rep-badge-warn'}`}>{crit ? 'Critical' : 'Low'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {prods.some((p) => (parseFloat(p.current_qty) || 0) < 1) ? (
          <div className="rep-alert rep-alert-err" style={{ marginTop: 14 }}>
            <strong>Immediate restock required:</strong>{' '}
            {prods.find((p) => (parseFloat(p.current_qty) || 0) < 1)?.product_name} has critically low stock. Reorder to avoid lost sales.
          </div>
        ) : null}
      </div>
    );
  };

  const periodChip = (key, label) => (
    <button
      type="button"
      key={key}
      className={`rep-chip ${filterType === key ? 'rep-chip-on' : ''}`}
      onClick={() => setFilterType(key)}
    >
      {label}
    </button>
  );

  return (
    <div className="content-container reports-v2-shell">
      <style>{reportsInlineStyles}</style>
      <div className="rep-root reports-inline">
        <header>
          <h1 className="rep-title">{t('reports.title')}</h1>
          <p className="rep-sub">{t('reports.subtitle')}</p>
        </header>

        {error ? <div className="rep-err">{error}</div> : null}

        <section className="rep-period" aria-label={t('reports.filterReports')}>
          <h2 className="rep-period-hd">{t('reports.filterReports')}</h2>
          <div className="rep-chips">
            {periodChip('today', 'Today')}
            {periodChip('daily', t('reports.daily'))}
            {periodChip('weekly', t('reports.weekly'))}
            {periodChip('monthly', t('reports.monthly'))}
            {periodChip('last3months', t('reports.last3Months'))}
            {periodChip('last6months', t('reports.last6Months'))}
            {periodChip('thisyear', t('reports.thisYear'))}
            {periodChip('lastyear', t('reports.lastYear'))}
            {periodChip('custom', t('reports.customRange'))}
          </div>
          {filterType === 'custom' ? (
            <div className="rep-custom">
              <div className="form-group">
                <label className="form-label" htmlFor="rep-c-start">{t('reports.startDate')}</label>
                <input
                  id="rep-c-start"
                  type="date"
                  className="form-input"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    if (e.target.value && customEndDate) {
                      setStartDate(e.target.value);
                      setEndDate(customEndDate);
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rep-c-end">{t('reports.endDate')}</label>
                <input
                  id="rep-c-end"
                  type="date"
                  className="form-input"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    if (customStartDate && e.target.value) {
                      setStartDate(customStartDate);
                      setEndDate(e.target.value);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className="rep-chip rep-chip-on"
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    if (new Date(customStartDate) > new Date(customEndDate)) {
                      alert(t('reports.startDateCannotBeAfter'));
                      return;
                    }
                    setStartDate(customStartDate);
                    setEndDate(customEndDate);
                  } else {
                    alert(t('reports.selectBothDates'));
                  }
                }}
              >
                {t('reports.apply')}
              </button>
            </div>
          ) : null}
          {filterType !== 'custom' ? (
            <div className="rep-range-note">
              <strong>{t('reports.dateRange')}</strong>{' '}
              {new Date(startDate).toLocaleDateString()} {t('common.to')} {new Date(endDate).toLocaleDateString()}
            </div>
          ) : null}
          <div className="rep-actions">
            <button type="button" className="rep-btn-ghost" onClick={handleClearFilters}>
              {t('reports.clearFilters')}
            </button>
          </div>
        </section>

        <nav className="rep-tabs-wrap" aria-label="Report views">
          <button
            type="button"
            className={`rep-tab ${activeTab === 'dashboard' ? 'rep-tab-on' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faGauge} /></span>
            {t('reports.dashboard')}
          </button>
          <button
            type="button"
            className={`rep-tab ${activeTab === 'sales' ? 'rep-tab-on' : ''}`}
            onClick={() => { setActiveTab('sales'); setSalesSubTab('summary'); }}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faCashRegister} /></span>
            {t('reports.sales')}
          </button>
          <button
            type="button"
            className={`rep-tab ${activeTab === 'profit' ? 'rep-tab-on' : ''}`}
            onClick={() => setActiveTab('profit')}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faChartLine} /></span>
            {t('reports.profit')}
          </button>
          <button
            type="button"
            className={`rep-tab ${activeTab === 'customers' ? 'rep-tab-on' : ''}`}
            onClick={() => { setActiveTab('customers'); setCustomerSubTab('due-list'); }}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faUsers} /></span>
            {t('reports.customers')}
          </button>
          <button
            type="button"
            className={`rep-tab ${activeTab === 'suppliers' ? 'rep-tab-on' : ''}`}
            onClick={() => { setActiveTab('suppliers'); setSupplierSubTab('payables'); }}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faTruck} /></span>
            {t('reports.suppliers')}
          </button>
          <button
            type="button"
            className={`rep-tab ${activeTab === 'expenses' ? 'rep-tab-on' : ''}`}
            onClick={() => { setActiveTab('expenses'); setExpenseSubTab('summary'); }}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faReceipt} /></span>
            {t('reports.expenses')}
          </button>
          <button
            type="button"
            className={`rep-tab ${activeTab === 'stock-low' ? 'rep-tab-on' : ''}`}
            onClick={() => setActiveTab('stock-low')}
            data-navigation="true"
          >
            <span className="rep-tab-ico" aria-hidden><FontAwesomeIcon icon={faTriangleExclamation} /></span>
            {t('reports.lowStock')}
          </button>
        </nav>

        <div className="rep-panel">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'profit' && renderProfit()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'suppliers' && renderSuppliers()}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'stock-low' && renderLowStock()}
        </div>
      </div>
    </div>
  );
};

export default Reports;
