import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faCalendarDays,
  faChartSimple,
  faCreditCard,
  faDollarSign,
  faEllipsis,
  faMagnifyingGlass,
  faMoneyBillWave,
  faPen,
  faTag,
  faTrash,
  faBuildingColumns,
  faFloppyDisk,
} from '@fortawesome/free-solid-svg-icons';
import { expensesAPI, reportsAPI } from '../services/api';
import {
  getConnectivityErrorMessage,
  isOfflineQueuedResponse,
} from '../lib/offlineUserMessages';
import { computePresetDateRange } from '../lib/reportsQueryUtils';
import Pagination from './Pagination';
import './Expenses.css';

/** Preset categories — user picks from list (no free typing). */
const EXPENSE_CATEGORY_PRESETS = [
  'Rent / Office Space',
  'Shop Rent',
  'Utilities (Electricity, Water, Internet)',
  'Salaries / Wages',
  'Inventory / Stock Purchase',
  'Marketing / Advertising',
  'Travel / Transport',
  'Maintenance / Repairs',
  'Office Supplies',
  'Taxes / Licenses',
  'Meals',
  'Miscellaneous',
  'Other',
];

const ZX_EXPENSE_MODAL_CSS = `
.zx-exp-modal-overlay{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:20px!important;background:rgba(17,24,39,.45)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;z-index:10050!important;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}
.zx-exp-modal{background:#fff!important;border-radius:22px!important;width:100%!important;max-width:480px!important;max-height:min(90vh,720px)!important;display:flex!important;flex-direction:column!important;box-shadow:0 25px 50px -12px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.04)!important;overflow:hidden!important}
.zx-exp-modal-hd{display:flex!important;align-items:flex-start!important;gap:14px!important;padding:22px 24px 16px!important;border-bottom:1px solid #f3f4f6!important}
.zx-exp-modal-hd-ico{width:44px!important;height:44px!important;border-radius:12px!important;background:#ffe4e6!important;color:#e11d48!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:18px!important;flex-shrink:0!important}
.zx-exp-modal-hd-text{flex:1!important;min-width:0!important}
.zx-exp-modal-hd-text h2{margin:0!important;font-size:19px!important;font-weight:700!important;color:#111827!important;letter-spacing:-.02em!important;line-height:1.2!important}
.zx-exp-modal-hd-text p{margin:4px 0 0!important;font-size:14px!important;font-weight:500!important;color:#6b7280!important;line-height:1.4!important}
.zx-exp-modal-close{margin-left:auto!important;width:36px!important;height:36px!important;border:none!important;border-radius:10px!important;background:transparent!important;color:#9ca3af!important;font-size:22px!important;line-height:1!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important}
.zx-exp-modal-close:hover{background:#f3f4f6!important;color:#374151!important}
.zx-exp-modal-body{padding:20px 24px 8px!important;overflow-y:auto!important;flex:1!important;min-height:0!important}
.zx-exp-modal-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:14px 16px!important}
.zx-exp-modal-grid .zx-exp-field-full{grid-column:1/-1!important}
.zx-exp-field label{display:block!important;font-size:12px!important;font-weight:600!important;color:#374151!important;margin:0 0 6px!important}
.zx-exp-field label .req{color:#ef4444!important;margin-left:2px!important}
.zx-exp-field input,.zx-exp-field select,.zx-exp-field textarea{width:100%!important;box-sizing:border-box!important;font-family:inherit!important;font-size:14px!important;font-weight:500!important;color:#111827!important;padding:11px 12px!important;border:1px solid #e5e7eb!important;border-radius:10px!important;background:#fafafa!important;transition:border-color .12s,box-shadow .12s!important}
.zx-exp-field textarea{min-height:44px!important;resize:vertical!important}
.zx-exp-field input:focus,.zx-exp-field select:focus,.zx-exp-field textarea:focus{outline:none!important;border-color:#5e5adb!important;box-shadow:0 0 0 3px rgba(94,90,219,.15)!important;background:#fff!important}
.zx-exp-field select{cursor:pointer!important}
.zx-exp-modal-ft{display:flex!important;justify-content:flex-end!important;gap:10px!important;padding:16px 24px 22px!important;border-top:1px solid #f3f4f6!important;background:#fff!important}
.zx-exp-modal-btn-cancel{padding:10px 18px!important;font-size:13px!important;font-weight:600!important;font-family:inherit!important;color:#374151!important;background:#fff!important;border:1px solid #e5e7eb!important;border-radius:10px!important;cursor:pointer!important}
.zx-exp-modal-btn-cancel:hover{background:#f9fafb!important;border-color:#d1d5db!important}
.zx-exp-modal-btn-save{display:inline-flex!important;align-items:center!important;gap:8px!important;padding:10px 18px!important;font-size:13px!important;font-weight:600!important;font-family:inherit!important;color:#fff!important;background:#111827!important;border:none!important;border-radius:10px!important;cursor:pointer!important}
.zx-exp-modal-btn-save:hover{background:#1f2937!important}
.zx-exp-modal-btn-save:disabled{opacity:.65!important;cursor:not-allowed!important}
@media(max-width:520px){.zx-exp-modal-grid{grid-template-columns:1fr!important}}
`;

const ZX_EXPENSE_MOBILE_CSS = `
@media (max-width: 768px) {
  .zx-exp-head-row {
    flex-wrap: wrap;
    gap: 10px;
  }

  /* Period chips: wrap nicely instead of overflowing */
  .zx-exp-toolbar .zx-exp-period-shell {
    flex-wrap: wrap;
    gap: 10px;
  }
  .zx-exp-toolbar .zx-exp-period-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .zx-exp-toolbar .zx-exp-range-chip {
    width: 100%;
    justify-content: flex-start;
  }

  .zx-exp-custom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
}
`;

const PERIOD_FILTERS = [
  { key: 'daily', tKey: 'expenses.daily' },
  { key: 'weekly', tKey: 'expenses.weekly' },
  { key: 'monthly', tKey: 'expenses.monthly' },
  { key: 'last3months', tKey: 'expenses.last3Months' },
  { key: 'last6months', tKey: 'expenses.last6Months' },
  { key: 'thisyear', tKey: 'expenses.thisYear' },
  { key: 'custom', tKey: 'expenses.custom' },
];

const EXPENSE_FILTER_KEYS = new Set(PERIOD_FILTERS.map((p) => p.key));

/** Preset + custom — same rules as Reports (rolling 7-day “weekly”, etc.) */
function getDateRangeForFilter(filterType, customStartDate, customEndDate) {
  return computePresetDateRange(filterType, customStartDate, customEndDate);
}

function loadExpenseFiltersFromStorage(shopId) {
  if (!shopId) return null;
  try {
    const raw = sessionStorage.getItem(`zb_expenses_filters_${shopId}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    if (!EXPENSE_FILTER_KEYS.has(p.filterType)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Local calendar YYYY-MM-DD (matches <input type="date">); NOT UTC from toISOString() */
function localCalendarYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** API / DB value → YYYY-MM-DD for filters + date input (handles "YYYY-MM-DD" and ISO strings) */
function expenseDateToYmd(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(val.trim());
    if (m) return m[1];
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function formatPk(amount) {
  const n = Number(amount) || 0;
  const hasDec = Math.abs(n % 1) > 1e-6;
  return `PKR ${n.toLocaleString('en-US', {
    minimumFractionDigits: hasDec ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function categoryTone(cat) {
  const s = String(cat || '?');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = s.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return {
    bg: `hsl(${hue} 65% 94%)`,
    fg: `hsl(${hue} 42% 30%)`,
    dot: `hsl(${hue} 58% 46%)`,
  };
}

function methodPill(pm, t) {
  const m = String(pm || '').toLowerCase().replace(/\s+/g, '_');
  const map = {
    cash: { bg: '#ecfdf5', fg: '#047857', icon: faMoneyBillWave, label: t('billing.cash') },
    card: { bg: '#eef2ff', fg: '#4338ca', icon: faCreditCard, label: t('billing.card') },
    bank_transfer: { bg: '#eff6ff', fg: '#1d4ed8', icon: faBuildingColumns, label: t('billing.bankTransfer') },
    bank: { bg: '#eff6ff', fg: '#1d4ed8', icon: faBuildingColumns, label: t('billing.bankTransfer') },
    transfer: { bg: '#eff6ff', fg: '#1d4ed8', icon: faBuildingColumns, label: t('billing.bankTransfer') },
  };
  const d = map[m] || { bg: '#f3f4f6', fg: '#374151', icon: faEllipsis, label: pm || t('billing.other') };
  return { ...d, raw: pm };
}

const Expenses = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { shopId } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterType, setFilterType] = useState(() => {
    const p = loadExpenseFiltersFromStorage(shopId);
    return p?.filterType && EXPENSE_FILTER_KEYS.has(p.filterType) ? p.filterType : 'daily';
  });
  const [customStartDate, setCustomStartDate] = useState(() => {
    const p = loadExpenseFiltersFromStorage(shopId);
    return p?.filterType === 'custom' && p.customStartDate ? p.customStartDate : '';
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const p = loadExpenseFiltersFromStorage(shopId);
    return p?.filterType === 'custom' && p.customEndDate ? p.customEndDate : '';
  });
  const [startDate, setStartDate] = useState(() => {
    const p = loadExpenseFiltersFromStorage(shopId);
    const ft = p?.filterType && EXPENSE_FILTER_KEYS.has(p.filterType) ? p.filterType : 'daily';
    const cs = ft === 'custom' && p?.customStartDate ? p.customStartDate : '';
    const ce = ft === 'custom' && p?.customEndDate ? p.customEndDate : '';
    return getDateRangeForFilter(ft, cs, ce).start;
  });
  const [endDate, setEndDate] = useState(() => {
    const p = loadExpenseFiltersFromStorage(shopId);
    const ft = p?.filterType && EXPENSE_FILTER_KEYS.has(p.filterType) ? p.filterType : 'daily';
    const cs = ft === 'custom' && p?.customStartDate ? p.customStartDate : '';
    const ce = ft === 'custom' && p?.customEndDate ? p.customEndDate : '';
    return getDateRangeForFilter(ft, cs, ce).end;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [monthlySalesTotal, setMonthlySalesTotal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');

  const rangeRef = useRef({ start: startDate, end: endDate });
  rangeRef.current = { start: startDate, end: endDate };

  useEffect(() => {
    let cancelled = false;
    async function fetchMonthSales() {
      try {
        const today = new Date();
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const todayStr = localCalendarYmd(today);
        const { data } = await reportsAPI.getSalesSummary({ start_date: monthStart, end_date: todayStr });
        if (!cancelled) setMonthlySalesTotal(Number(data?.totalSales ?? 0) || 0);
      } catch {
        if (!cancelled) setMonthlySalesTotal(null);
      }
    }
    fetchMonthSales();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    updateDateRange();
  }, [filterType]); // eslint-disable-line react-hooks/exhaustive-deps -- range derived from preset/custom in updateDateRange()

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps -- load when API range changes

  useEffect(() => {
    if (!shopId) return;
    try {
      sessionStorage.setItem(
        `zb_expenses_filters_${shopId}`,
        JSON.stringify({
          filterType,
          customStartDate,
          customEndDate,
        }),
      );
    } catch {
      /* quota / private mode */
    }
  }, [shopId, filterType, customStartDate, customEndDate]);

  const updateDateRange = () => {
    const { start, end } = getDateRangeForFilter(filterType, customStartDate, customEndDate);
    setStartDate(start);
    setEndDate(end);
  };

  const fetchExpenses = async ({ silent = false, start, end } = {}) => {
    const s = start ?? rangeRef.current.start;
    const e = end ?? rangeRef.current.end;
    try {
      if (!silent) setLoading(true);
      const response = await expensesAPI.getAll({ start_date: s, end_date: e });
      setExpenses(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(
        getConnectivityErrorMessage(err) || err.response?.data?.error || t('expenses.failedToLoad')
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const onDataRefresh = () => {
      fetchExpenses({ silent: true });
    };
    window.addEventListener('data-refresh', onDataRefresh);
    return () => window.removeEventListener('data-refresh', onDataRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch current range; fetch uses rangeRef
  }, []);

  const handleSave = async (data) => {
    try {
      const res = editingExpense
        ? await expensesAPI.update(editingExpense.expense_id, data)
        : await expensesAPI.create(data);
      if (isOfflineQueuedResponse(res)) {
        setModalOpen(false);
        setEditingExpense(null);
        return;
      }
      const saved = res?.data;
      const savedYmd = expenseDateToYmd(data?.expense_date ?? saved?.expense_date);
      let s = rangeRef.current.start;
      let e = rangeRef.current.end;
      if (savedYmd && (savedYmd < s || savedYmd > e)) {
        s = savedYmd < s ? savedYmd : s;
        e = savedYmd > e ? savedYmd : e;
        setStartDate(s);
        setEndDate(e);
        setFilterType('custom');
        setCustomStartDate(s);
        setCustomEndDate(e);
        rangeRef.current = { start: s, end: e };
      }
      await fetchExpenses({ silent: true, start: s, end: e });
      setModalOpen(false);
      setEditingExpense(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      const res = await expensesAPI.delete(expenseId);
      if (isOfflineQueuedResponse(res)) return;
      await fetchExpenses({ silent: true });
    } catch (err) {
      alert(getConnectivityErrorMessage(err) || err.response?.data?.error || t('expenses.failedToDelete'));
    }
  };

  const totalExpensesCount = expenses.length;
  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const averageAmount = totalExpensesCount > 0 ? totalAmount / totalExpensesCount : 0;
  const highestAmount = expenses.length > 0 ? Math.max(...expenses.map((e) => Number(e.amount || 0))) : 0;
  const topExpenseRow = useMemo(() => {
    if (!expenses.length) return null;
    return expenses.reduce((best, row) => {
      const amt = Number(row.amount || 0);
      return !best || amt > Number(best.amount || 0) ? row : best;
    }, null);
  }, [expenses]);

  const revenuePctSubtitle = useMemo(() => {
    if (monthlySalesTotal != null && monthlySalesTotal > 0 && totalAmount > 0) {
      return t('expenses.kpiPctOfMonthlyRevenue', {
        pct: ((totalAmount / monthlySalesTotal) * 100).toFixed(1),
        defaultValue: '{{pct}}% of monthly revenue',
      });
    }
    return t('expenses.kpiTotalSubFallback', {
      defaultValue: 'Compared to invoice sales this month',
    });
  }, [monthlySalesTotal, totalAmount, t]);

  const highestSub = topExpenseRow
    ? `${topExpenseRow.expense_category || ''}${topExpenseRow.notes ? ` — ${String(topExpenseRow.notes).slice(0, 42)}${String(topExpenseRow.notes).length > 42 ? '…' : ''}` : ''}`.trim() || '—'
    : '—';

  const categoryOptions = useMemo(() => {
    const u = [...new Set(expenses.map((e) => String(e.expense_category || '').trim()).filter(Boolean))];
    u.sort((a, b) => a.localeCompare(b));
    return u;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      const cat = String(e.expense_category || '');
      const notes = String(e.notes || '');
      const method = String(e.payment_method || '').toLowerCase().replace(/\s+/g, '_');
      const methodNeedle = filterMethod.replace(/-/g, '_');
      if (filterCategory !== 'all' && cat !== filterCategory) return false;
      if (filterMethod !== 'all' && method !== methodNeedle) return false;
      if (!q) return true;
      return cat.toLowerCase().includes(q) || notes.toLowerCase().includes(q) || method.toLowerCase().includes(q);
    });
  }, [expenses, searchQuery, filterCategory, filterMethod]);

  const filteredTotal = filteredExpenses.reduce((s, exp) => s + Number(exp.amount || 0), 0);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => setCurrentPage(1), [startDate, endDate, searchQuery, filterCategory, filterMethod]);

  const activePeriodDef = PERIOD_FILTERS.find((p) => p.key === filterType);
  const periodChipLabel = activePeriodDef ? t(activePeriodDef.tKey) : filterType;

  if (loading) {
    return (
      <div className="zx-exp-root">
        <div style={{ padding: '48px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 500 }}>
          {t('common.loading')} {t('expenses.title').toLowerCase()}...
        </div>
      </div>
    );
  }

  const openModal = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  return (
    <div className="zx-exp-root">
      <div className="zx-exp-head-row">
        <div className="zx-exp-titles">
          <h1 className="zx-exp-title">{t('expenses.title')}</h1>
          <p className="zx-exp-subtitle">{t('expenses.subtitle')}</p>
        </div>
        {!readOnly && (
          <button type="button" className="zx-exp-btn-add" onClick={openModal}>
            + {t('expenses.addExpense')}
          </button>
        )}
      </div>

      {error && (
        <div
          className={`error-message${
            String(error).includes('saved on this device') ? ' exp-error--offline' : ''
          }`}
        >
          {error}
        </div>
      )}

      <div className="zx-exp-toolbar">
        <div className="zx-exp-period-shell">
          <span className="zx-exp-period-label">{t('expenses.periodFilterLabel', { defaultValue: 'Period' })}</span>
          <span className="zx-exp-period-vbar" aria-hidden />
          <div className="zx-exp-period-btns">
            {PERIOD_FILTERS.map(({ key, tKey }) => (
              <button
                key={key}
                type="button"
                className={`zx-exp-pill ${filterType === key ? 'is-active' : ''}`}
                onClick={() => setFilterType(key)}
              >
                {t(tKey)}
              </button>
            ))}
          </div>
          <span className="zx-exp-range-chip">
            <FontAwesomeIcon icon={faCalendarDays} /> {periodChipLabel}
          </span>
        </div>
        {filterType === 'custom' && (
          <div className="zx-exp-custom-row">
            <div className="form-group">
              <label className="form-label">{t('expenses.startDate')}</label>
              <input
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
              <label className="form-label">{t('expenses.endDate')}</label>
              <input
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
              className="zx-exp-btn-add"
              style={{ background: 'var(--zx-accent, #5e5adb)' }}
              onClick={() => {
                if (customStartDate && customEndDate) {
                  if (new Date(customStartDate) > new Date(customEndDate)) {
                    alert(t('expenses.startDateAfterEndDate'));
                    return;
                  }
                  setStartDate(customStartDate);
                  setEndDate(customEndDate);
                } else alert(t('expenses.selectBothDates'));
              }}
            >
              {t('common.apply')}
            </button>
          </div>
        )}
        {filterType !== 'custom' && (
          <div className="zx-exp-strip">
            <strong>{t('expenses.dateRange')}:</strong>{' '}
            {new Date(startDate).toLocaleDateString()} {t('common.to')} {new Date(endDate).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="zx-exp-kpis">
        <div className="zx-exp-kpi blue">
          <div className="zx-exp-kpi-top">
            <div className="zx-exp-kpi-ico"><FontAwesomeIcon icon={faCalendarDays} /></div>
            <div className="zx-exp-kpi-body">
              <p className="zx-exp-kpi-label">{t('expenses.periodKpiShort', { defaultValue: 'Period' })}</p>
              <p className="zx-exp-kpi-val">{totalExpensesCount}</p>
              <p className="zx-exp-kpi-sub">{t('expenses.kpiCountSub', { defaultValue: 'Expenses recorded' })}</p>
            </div>
          </div>
        </div>
        <div className="zx-exp-kpi red">
          <div className="zx-exp-kpi-top">
            <div className="zx-exp-kpi-ico"><FontAwesomeIcon icon={faDollarSign} /></div>
            <div className="zx-exp-kpi-body">
              <p className="zx-exp-kpi-label">{t('expenses.totalKpiShort', { defaultValue: 'Total' })}</p>
              <p className="zx-exp-kpi-val">{formatPk(totalAmount)}</p>
              <p className="zx-exp-kpi-sub">{revenuePctSubtitle}</p>
            </div>
          </div>
        </div>
        <div className="zx-exp-kpi green">
          <div className="zx-exp-kpi-top">
            <div className="zx-exp-kpi-ico"><FontAwesomeIcon icon={faChartSimple} /></div>
            <div className="zx-exp-kpi-body">
              <p className="zx-exp-kpi-label">{t('expenses.avgKpiShort', { defaultValue: 'Avg' })}</p>
              <p className="zx-exp-kpi-val">{formatPk(averageAmount)}</p>
              <p className="zx-exp-kpi-sub">{t('expenses.kpiAvgSub', { defaultValue: 'Mean across all entries' })}</p>
            </div>
          </div>
        </div>
        <div className="zx-exp-kpi amber">
          <div className="zx-exp-kpi-top">
            <div className="zx-exp-kpi-ico"><FontAwesomeIcon icon={faArrowTrendUp} /></div>
            <div className="zx-exp-kpi-body">
              <p className="zx-exp-kpi-label">{t('expenses.highestKpiShort', { defaultValue: 'Highest' })}</p>
              <p className="zx-exp-kpi-val">{formatPk(highestAmount)}</p>
              <p className="zx-exp-kpi-sub">{highestSub}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="zx-exp-panel">
        <header className="zx-exp-panel-hd">
          <div className="zx-exp-panel-titles">
            <h2 className="zx-exp-panel-title">{t('expenses.allExpensesTitle', { defaultValue: 'All Expenses' })}</h2>
            <span className="zx-exp-badge">{filteredExpenses.length} {t('expenses.entriesLabel', { defaultValue: 'entries' })}</span>
          </div>
          {!readOnly && (
            <button type="button" className="zx-exp-btn-add" onClick={openModal}>
              + {t('expenses.addExpense')}
            </button>
          )}
        </header>

        <div className="zx-exp-filters-row">
          <div className="zx-exp-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              type="search"
              placeholder={t('expenses.searchPlaceholder', { defaultValue: 'Search by category or notes...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <select className="zx-exp-dd" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">{t('expenses.allCategories', { defaultValue: 'All Categories' })}</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="zx-exp-dd" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
              <option value="all">{t('expenses.allMethods', { defaultValue: 'All Methods' })}</option>
              <option value="cash">Cash</option>
              <option value="card">{t('billing.card')}</option>
              <option value="bank_transfer">{t('billing.bankTransfer')}</option>
              <option value="other">{t('billing.other')}</option>
            </select>
          </div>
        </div>

        <div className="zx-exp-table-wrap">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('expenses.categoryCol', { defaultValue: 'Category' }).toUpperCase()}</th>
                <th>{t('expenses.amount').toUpperCase()}</th>
                <th>{t('expenses.methodCol', { defaultValue: 'Method' }).toUpperCase()}</th>
                <th>{t('expenses.expenseDate', { defaultValue: 'Date' }).toUpperCase()}</th>
                <th>{t('expenses.notes').toUpperCase()}</th>
                <th>{t('expenses.shareCol', { defaultValue: 'Share' }).toUpperCase()}</th>
                <th>{t('common.actions').toUpperCase()}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="zx-exp-empty">{t('expenses.noExpensesForDateRange')}</td>
                </tr>
              ) : (
                paginatedExpenses.map((expense, idx) => {
                  const globalIdx = startIndex + idx + 1;
                  const amtNum = Number(expense.amount || 0);
                  const share = filteredTotal > 0 ? (amtNum / filteredTotal) * 100 : 0;
                  const tones = categoryTone(expense.expense_category);
                  const mh = methodPill(expense.payment_method, t);
                  const iso = expenseDateToYmd(expense.expense_date);
                  let dateLabel = '-';
                  if (iso) {
                    const [y, mo, da] = iso.split('-').map(Number);
                    dateLabel = new Date(y, mo - 1, da).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }
                  return (
                    <tr key={expense.expense_id}>
                      <td>{globalIdx}</td>
                      <td>
                        <span
                          className="zx-exp-cat-pill"
                          style={{ background: tones.bg, color: tones.fg }}
                        >
                          <span className="zx-exp-cat-dot" style={{ background: tones.dot }} aria-hidden />
                          <FontAwesomeIcon icon={faTag} style={{ fontSize: '11px', opacity: 0.85 }} />
                          {' '}{expense.expense_category || '—'}
                        </span>
                      </td>
                      <td className="zx-exp-amt">{formatPk(expense.amount)}</td>
                      <td>
                        <span className="zx-exp-method-pill" style={{ background: mh.bg, color: mh.fg }}>
                          <FontAwesomeIcon icon={mh.icon} style={{ fontSize: '11px' }} /> {mh.label}
                        </span>
                      </td>
                      <td>{dateLabel}</td>
                      <td style={{ maxWidth: 200 }}>
                        <span title={expense.notes}>{expense.notes || '—'}</span>
                      </td>
                      <td className="zx-exp-share-cell">
                        <div className="zx-exp-share-pct">{share.toFixed(1)}%</div>
                        <div className="zx-exp-share-track">
                          <div
                            className="zx-exp-share-fill"
                            style={{ width: `${Math.min(100, share)}%`, background: tones.dot }}
                          />
                        </div>
                      </td>
                      <td>
                        {!readOnly && (
                          <div className="zx-exp-actions">
                            <button
                              type="button"
                              className="zx-exp-ico-btn"
                              title={t('common.edit')}
                              onClick={() => { setEditingExpense(expense); setModalOpen(true); }}
                            >
                              <FontAwesomeIcon icon={faPen} />
                            </button>
                            <button
                              type="button"
                              className="zx-exp-ico-btn danger"
                              title={t('common.delete')}
                              onClick={() => handleDelete(expense.expense_id)}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="zx-exp-footer-row">
          <span>
            {filteredExpenses.length > 0 ? (
              <>
                {t('expenses.totalExpensesFoot', { defaultValue: 'Total Expenses' })}
                {' '}
                <strong className="zx-sum">{formatPk(filteredTotal)}</strong>
              </>
            ) : '\u00a0'}
          </span>
          <span style={{ opacity: filteredExpenses.length ? 1 : 0.6 }}>
            {filteredExpenses.length === 0
              ? t('expenses.showingZero', { defaultValue: 'Showing 0 of 0 entries' })
              : t('expenses.showingPaged', {
                from: startIndex + 1,
                to: Math.min(startIndex + itemsPerPage, filteredExpenses.length),
                total: filteredExpenses.length,
                defaultValue: 'Showing {{from}}-{{to}} of {{total}} entries',
              })}
          </span>
        </div>

        {filteredExpenses.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredExpenses.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(next) => {
              setItemsPerPage(next);
              setCurrentPage(1);
            }}
          />
        )}
      </section>

      {modalOpen && (
        <ExpenseModal
          key={editingExpense?.expense_id ?? 'create'}
          expense={editingExpense}
          date={startDate}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingExpense(null); }}
        />
      )}
    </div>
  );
};

const ExpenseModal = ({ expense, date, onSave, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    expense_category: expense?.expense_category || '',
    amount: expense?.amount != null && expense?.amount !== '' ? String(expense.amount) : '',
    expense_date: expenseDateToYmd(expense?.expense_date) || date,
    payment_method: expense?.payment_method || 'cash',
    notes: expense?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const categorySelectOptions = useMemo(() => {
    const cur = String(expense?.expense_category || '').trim();
    const base = [...EXPENSE_CATEGORY_PRESETS];
    if (cur && !base.includes(cur)) base.unshift(cur);
    return base;
  }, [expense?.expense_category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.expense_category || formData.expense_category.trim() === '') {
      alert(t('expenses.fillAllFields'));
      return;
    }
    const rawAmt = String(formData.amount).replace(/,/g, '').trim();
    const amt = parseFloat(rawAmt);
    if (rawAmt === '' || Number.isNaN(amt) || amt <= 0) {
      alert(t('expenses.invalidAmount', { defaultValue: 'Enter a valid amount greater than zero.' }));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...formData,
        amount: String(amt),
      });
    } catch (err) {
      alert(getConnectivityErrorMessage(err) || err.response?.data?.error || t('expenses.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(expense);
  const title = isEdit ? t('expenses.editExpense') : t('expenses.addExpense');
  const subtitle = t('expenses.modalSubtitle', { defaultValue: 'Record a business expense entry' });

  return (
    <>
      <style>{ZX_EXPENSE_MODAL_CSS}</style>
      <style>{ZX_EXPENSE_MOBILE_CSS}</style>
      <div className="zx-exp-modal-overlay" role="presentation" onClick={onClose}>
        <div className="zx-exp-modal" role="dialog" aria-labelledby="zx-exp-modal-title" onClick={(e) => e.stopPropagation()}>
          <header className="zx-exp-modal-hd">
            <div className="zx-exp-modal-hd-ico" aria-hidden>
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className="zx-exp-modal-hd-text">
              <h2 id="zx-exp-modal-title">{title}</h2>
              <p>{subtitle}</p>
            </div>
            <button type="button" className="zx-exp-modal-close" onClick={onClose} aria-label={t('common.close', { defaultValue: 'Close' })}>×</button>
          </header>
          <form onSubmit={handleSubmit}>
            <div className="zx-exp-modal-body">
              <div className="zx-exp-modal-grid">
                <div className="zx-exp-field zx-exp-field-full">
                  <label htmlFor="zx-exp-cat">
                    {t('expenses.expenseCategory')}
                    <span className="req">*</span>
                  </label>
                  <select
                    id="zx-exp-cat"
                    required
                    value={formData.expense_category}
                    onChange={(e) => setFormData({ ...formData, expense_category: e.target.value })}
                  >
                    <option value="" disabled>
                      {t('expenses.selectCategoryPlaceholder', { defaultValue: 'Select category...' })}
                    </option>
                    {categorySelectOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="zx-exp-field">
                  <label htmlFor="zx-exp-amt">
                    {t('expenses.amountPKR', { defaultValue: 'Amount (PKR)' })}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="zx-exp-amt"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    placeholder={t('expenses.amountPlaceholder', { defaultValue: 'e.g. 5000' })}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="zx-exp-field">
                  <label htmlFor="zx-exp-pm">{t('expenses.paymentMethod')}</label>
                  <select
                    id="zx-exp-pm"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  >
                    <option value="cash">{t('billing.cash')}</option>
                    <option value="card">{t('billing.card')}</option>
                    <option value="bank_transfer">{t('billing.bankTransfer')}</option>
                    <option value="other">{t('billing.other')}</option>
                  </select>
                </div>
                <div className="zx-exp-field zx-exp-field-full">
                  <label htmlFor="zx-exp-dt">{t('expenses.expenseDate', { defaultValue: 'Date' })}</label>
                  <input
                    id="zx-exp-dt"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  />
                </div>
                <div className="zx-exp-field zx-exp-field-full">
                  <label htmlFor="zx-exp-notes">{t('expenses.notesOptional', { defaultValue: 'Notes (optional)' })}</label>
                  <input
                    id="zx-exp-notes"
                    type="text"
                    maxLength={500}
                    placeholder={t('expenses.notesPlaceholder', { defaultValue: 'e.g. Monthly rent payment' })}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <footer className="zx-exp-modal-ft">
              <button type="button" className="zx-exp-modal-btn-cancel" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="zx-exp-modal-btn-save" disabled={saving}>
                <FontAwesomeIcon icon={faFloppyDisk} />
                {saving ? t('common.loading') : t('expenses.saveExpense', { defaultValue: 'Save Expense' })}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </>
  );
};

export default Expenses;
