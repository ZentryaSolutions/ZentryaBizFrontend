import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchDashboardData } from '../lib/workspaceQueries';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { isZbWebOnlyMode } from '../lib/appMode';
import { withCurrentScope } from '../utils/appRouteScope';
import { DashboardWeeklyChart, DashboardSnapshotDonut } from './DashboardCharts';
import './Dashboard.css';

function formatPk(amount) {
  const n = Number(amount) || 0;
  const hasDec = Math.abs(n % 1) > 1e-6;
  return `PKR ${n.toLocaleString('en-US', {
    minimumFractionDigits: hasDec ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function fmtLongDate(isoYmd, fallback) {
  if (!isoYmd) return fallback || '';
  const s = String(isoYmd).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

/** Align with backend BUSINESS_TIMEZONE when possible */
function businessTodayYmdClient() {
  try {
    const tz = process.env.REACT_APP_BUSINESS_TIMEZONE || 'Asia/Karachi';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function addCalendarDaysYmd(ymd, deltaDays) {
  const raw = String(ymd || '').slice(0, 10);
  const parts = raw.split('-').map(Number);
  let base = parts.length >= 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  if (Number.isNaN(base.getTime())) base = new Date();
  base.setDate(base.getDate() + deltaDays);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Always return 7-point series so Chart.js always renders (old APIs omit weeklyTrend). */
function normalizeWeeklyTrend(api) {
  const anchor = api?.businessToday || businessTodayYmdClient();
  const dayKeys = [];
  const displayLabels = [];
  for (let i = -6; i <= 0; i += 1) {
    const ymd = addCalendarDaysYmd(anchor, i);
    dayKeys.push(ymd);
    const [yy, mm, dd] = ymd.split('-').map(Number);
    displayLabels.push(
      new Date(yy, mm - 1, dd).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    );
  }
  const z7 = () => Array(7).fill(0);
  const w = api?.weeklyTrend;
  if (!w || !Array.isArray(w.labels) || w.labels.length === 0) {
    return { labels: displayLabels, revenue: z7(), expenses: z7(), profit: z7() };
  }

  const rev = (w.revenue || []).map((n) => Number(n) || 0);
  const exp = (w.expenses || []).map((n) => Number(n) || 0);
  const prof = (w.profit || []).map((n) => Number(n) || 0);
  const apiDays = Array.isArray(w.days) ? w.days.map((d) => String(d).slice(0, 10)) : null;

  if (apiDays && apiDays.length === 7) {
    const mapSeries = (arr) => {
      const by = {};
      apiDays.forEach((d, idx) => {
        by[d] = Number(arr[idx]) || 0;
      });
      return dayKeys.map((d) => (Object.prototype.hasOwnProperty.call(by, d) ? by[d] : 0));
    };
    return {
      labels: displayLabels,
      revenue: mapSeries(rev.length ? rev : z7()),
      expenses: mapSeries(exp.length ? exp : z7()),
      profit: mapSeries(prof.length ? prof : z7()),
    };
  }

  if (w.labels.length === 7 && rev.length === 7) {
    return {
      labels: w.labels,
      revenue: rev,
      expenses: exp.length === 7 ? exp : z7(),
      profit: prof.length === 7 ? prof : z7(),
    };
  }

  return { labels: displayLabels, revenue: z7(), expenses: z7(), profit: z7() };
}

function paymentBadge(row) {
  const total = Number(row.total_amount) || 0;
  const paid = Number(row.paid_amount) || 0;
  const due = typeof row.due_remaining === 'number' ? row.due_remaining : Math.max(0, total - paid);
  const pt = String(row.payment_type || '').toLowerCase();
  if (paid + 1e-2 >= total) return { cls: 'zb-paid', text: 'Paid' };
  if (due > 1e-2 || pt === 'split' || pt === 'credit') return { cls: 'zb-partial', text: 'Partial' };
  return { cls: 'zb-paid', text: 'Paid' };
}

function Svg({ children, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" {...rest}>
      {children}
    </svg>
  );
}

function DashboardSkeleton({ t }) {
  return (
    <div className="zb-dash dashboard--loading" style={{ animation: 'fadeIn .4s ease both' }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{ height: 28, borderRadius: 8, background: '#e8e5df', maxWidth: 280, marginBottom: 10 }}
          aria-hidden
        />
        <div style={{ height: 14, borderRadius: 6, background: '#f4f3ef', maxWidth: 200 }} aria-hidden />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5,1fr)',
          gap: 12,
          marginBottom: 18,
          opacity: 0.85,
        }}
      >
        {[1, 2, 3, 4, 5].map((k) => (
          <div
            key={k}
            style={{ height: 120, borderRadius: 16, background: '#fff', border: '1px solid #e8e5df' }}
            aria-hidden
          />
        ))}
      </div>
      <p style={{ fontSize: 13, color: '#9c9890', marginTop: 8 }}>{t('dashboard.loading')}</p>
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeShopId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const admin = isAdmin();

  const {
    data: dashboardData,
    isLoading: loading,
    isError: loadFailed,
  } = useQuery({
    queryKey: zbKeys(activeShopId).dashboard(),
    queryFn: fetchDashboardData,
    enabled: Boolean(activeShopId),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).dashboard() });
    };
    window.addEventListener('data-refresh', handleRefresh);
    return () => window.removeEventListener('data-refresh', handleRefresh);
  }, [activeShopId, queryClient]);

  const weeklyTrend = useMemo(() => normalizeWeeklyTrend(dashboardData), [dashboardData]);

  const topSellingItems = dashboardData?.topSellingItems || [];
  const recentBills = dashboardData?.recentBills || [];
  const billsMonthTotals = dashboardData?.billsMonthTotals || { invoiceCount: 0, totalOutstanding: 0 };
  const activityRaw = dashboardData?.activity ?? dashboardData?.recent_activity;
  const activity = Array.isArray(activityRaw) ? activityRaw : [];
  const ms = dashboardData?.monthSnapshot ?? dashboardData?.month_snapshot ?? {};
  const lowPeek = dashboardData?.lowStockPeek;

  const maxRev =
    topSellingItems.length > 0
      ? Math.max(...topSellingItems.map((it) => Number(it.revenue) || 0), 1)
      : 1;

  const go = (scopePath) => navigate(withCurrentScope(location.pathname, scopePath));

  if (loading && !dashboardData) {
    return <DashboardSkeleton t={t} />;
  }

  if (!dashboardData && loadFailed) {
    const webOnly = isZbWebOnlyMode();
    return (
      <div className="content-container">
        <div className="zb-dash">
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">
            {webOnly
              ? t('dashboard.hintMissingApiSession', {
                  defaultValue:
                    'You are signed in with Supabase, but the browser never got a POS API session. After login, POST /api/auth/zb-simple-session must return 200 and set sessionId (sent as header x-session-id). Sign out and sign in again while watching Network → zb-simple-session. On production, REACT_APP_BACKEND_URL must be your deployed API URL (not localhost).',
                })
              : t('dashboard.hintBackendOrCors', {
                  defaultValue:
                    'Dashboard data failed to load. This is usually CORS blocking the OPTIONS preflight (403) between your frontend and API, REACT_APP_BACKEND_URL pointing at the wrong host, or an invalid x-session-id. Confirm the backend allows your site origin with credentials and headers x-session-id, x-shop-id, x-device-id.',
                })}
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="content-container">
        <div className="error-message">{t('dashboard.failedToLoad')}</div>
      </div>
    );
  }

  const profitMarginPct = admin ? dashboardData.todayProfitMarginPct : null;

  const dateBadge = fmtLongDate(
    dashboardData.businessToday,
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  );

  const todayCollected = dashboardData.todayCollected ?? 0;
  const todayBillCount = dashboardData.todayBillCount ?? 0;

  const profLine = admin
    ? `${profitMarginPct != null ? `${profitMarginPct}% margin` : 'Margin —'}`
    : 'Restricted';

  return (
    <div className="zb-dash anim">
      <div className="page-hd">
        <div>
          <div className="ph-title">Today&apos;s Overview</div>
          <div className="ph-sub">Live business snapshot · Auto-refreshing</div>
        </div>
        <div className="date-badge" role="note">
          <Svg width={12} height={12}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </Svg>
          {dateBadge}
        </div>
      </div>

      {dashboardData.lowStockCount > 0 && lowPeek ? (
        <div
          className="zb-stock-alert"
          role="button"
          tabIndex={0}
          onClick={() => go('/reports?tab=stock-low')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              go('/reports?tab=stock-low');
            }
          }}
        >
          <div className="zb-sa-icon" aria-hidden>
            <Svg width={16} height={16}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </Svg>
          </div>
          <span className="zb-sa-text">
            <strong>Low Stock Alert:</strong> {lowPeek.product_name} has only{' '}
            <strong>{lowPeek.quantity_in_stock} unit(s)</strong> remaining (minimum: {lowPeek.minimum}). Reorder soon.
          </span>
          <span style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700, color: '#b45309' }}>
            View Stock →
          </span>
        </div>
      ) : null}

      <div className="zb-qa-row">
        <button type="button" className="zb-qa-btn zb-qa-primary" onClick={() => go('/billing')}>
          <Svg width={13} height={13}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </Svg>
          New Sale
        </button>
        {admin ? (
          <button type="button" className="zb-qa-btn" onClick={() => go('/purchases')}>
            Add Purchase
          </button>
        ) : null}
        {admin ? (
          <button type="button" className="zb-qa-btn" onClick={() => go('/expenses')}>
            Add Expense
          </button>
        ) : null}
        <button type="button" className="zb-qa-btn" onClick={() => go('/customers')}>
          Add Customer
        </button>
        <button type="button" className="zb-qa-btn" onClick={() => go('/reports')}>
          View Reports
        </button>
      </div>

      <div className="zb-kpi-grid">
        <div className="zb-kpi" role="presentation">
          <div className="zb-kpi-stripe" style={{ background: 'linear-gradient(90deg,#4f46e5,#818cf8)' }} />
          <div className="zb-kpi-top">
            <div className="zb-kpi-icon" style={{ background: '#eef2ff' }}>
              <Svg width={15} height={15} stroke="#4f46e5">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </Svg>
            </div>
            <span className="kpi-badge" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              Today
            </span>
          </div>
          <div className="zb-kpi-label">Today&apos;s Sale</div>
          <div className="zb-kpi-val" style={{ color: '#4f46e5' }}>
            {formatPk(dashboardData.todaySale)}
          </div>
          <div className="zb-kpi-sub">
            {todayBillCount} invoice{todayBillCount === 1 ? '' : 's'} today
          </div>
        </div>

        <div className="zb-kpi" role="presentation">
          <div className="zb-kpi-stripe" style={{ background: 'linear-gradient(90deg,#15803d,#4ade80)' }} />
          <div className="zb-kpi-top">
            <div className="zb-kpi-icon" style={{ background: '#f0fdf4' }}>
              <Svg width={15} height={15} stroke="#15803d">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </Svg>
            </div>
            <span className="kpi-badge" style={{ background: '#f0fdf4', color: '#15803d' }}>
              {profitMarginPct != null ? `${profitMarginPct}%` : '—'}
            </span>
          </div>
          <div className="zb-kpi-label">Today&apos;s Profit</div>
          <div className="zb-kpi-val" style={{ color: admin ? '#15803d' : '#9c9890' }}>
            {admin && dashboardData.todayProfit != null ? formatPk(dashboardData.todayProfit) : '—'}
          </div>
          <div className={`zb-kpi-sub ${admin ? 'up' : ''}`}>{profLine}</div>
        </div>

        <div className="zb-kpi" role="presentation">
          <div className="zb-kpi-stripe" style={{ background: 'linear-gradient(90deg,#2563eb,#60a5fa)' }} />
          <div className="zb-kpi-top">
            <div className="zb-kpi-icon" style={{ background: '#eff6ff' }}>
              <Svg width={15} height={15} stroke="#2563eb">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="3" />
              </Svg>
            </div>
            <span className="kpi-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
              Collected
            </span>
          </div>
          <div className="zb-kpi-label">Collected on Bills</div>
          <div className="zb-kpi-val" style={{ color: '#2563eb' }}>
            {formatPk(todayCollected)}
          </div>
          <div className="zb-kpi-sub">
            From {todayBillCount} invoice{todayBillCount === 1 ? '' : 's'} today (paid amounts)
          </div>
        </div>

        <div className="zb-kpi" role="presentation">
          <div className="zb-kpi-stripe" style={{ background: 'linear-gradient(90deg,#d97706,#fcd34d)' }} />
          <div className="zb-kpi-top">
            <div className="zb-kpi-icon" style={{ background: '#fffbeb' }}>
              <Svg width={15} height={15} stroke="#d97706">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </Svg>
            </div>
            <span className="kpi-badge" style={{ background: '#fffbeb', color: '#b45309' }}>
              Pending
            </span>
          </div>
          <div className="zb-kpi-label">Outstanding Due</div>
          <div className="zb-kpi-val" style={{ color: '#d97706' }}>
            {formatPk(dashboardData.customerDue)}
          </div>
          <div className="zb-kpi-sub" style={{ color: '#dc2626' }}>
            {dashboardData.customerDueCustomerCount ?? 0} customer
            {(dashboardData.customerDueCustomerCount || 0) === 1 ? '' : 's'}
          </div>
        </div>

        <div
          className="zb-kpi"
          role="button"
          tabIndex={0}
          onClick={() => go('/reports?tab=stock-low')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              go('/reports?tab=stock-low');
            }
          }}
        >
          <div className="zb-kpi-stripe" style={{ background: 'linear-gradient(90deg,#dc2626,#f87171)' }} />
          <div className="zb-kpi-top">
            <div className="zb-kpi-icon" style={{ background: '#fef2f2' }}>
              <Svg width={15} height={15} stroke="#dc2626">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </Svg>
            </div>
            <span className="kpi-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
              Alert
            </span>
          </div>
          <div className="zb-kpi-label">Low Stock</div>
          <div className="zb-kpi-val" style={{ color: '#dc2626' }}>
            {dashboardData.lowStockCount}
          </div>
          <div className="zb-kpi-sub">Items at or below minimum</div>
        </div>
      </div>

      <div className="zb-card" style={{ marginBottom: 16 }}>
        <div className="zb-card-hd">
          <div>
            <div className="zb-card-t">Sales Trend — This Week</div>
            <div className="zb-card-s">
              {admin ? 'Daily revenue, cost and profit comparison' : 'Daily revenue and expenses'}
            </div>
          </div>
          <div className="zb-leg" aria-hidden>
            <span className="zb-leg-i">
              <span className="zb-leg-dot" style={{ background: '#4f46e5' }} />
              Revenue
            </span>
            {admin ? (
              <span className="zb-leg-i">
                <span className="zb-leg-dot" style={{ background: '#15803d' }} />
                Profit
              </span>
            ) : null}
            <span className="zb-leg-i">
              <span className="zb-leg-dot" style={{ background: '#dc2626' }} />
              Expenses
            </span>
          </div>
        </div>
        <div className="zb-chart-box">
          <div className="zb-chart-h">
            <DashboardWeeklyChart weeklyTrend={weeklyTrend} isProfitVisible={admin} />
          </div>
        </div>
      </div>

      <div className="zb-two">
        <div className="zb-card">
          <div className="zb-card-hd">
            <div>
              <div className="zb-card-t">Top Selling Items</div>
              <div className="zb-card-s">Best performers · {ms.label || 'This month'}</div>
            </div>
            <button type="button" className="zb-card-link" onClick={() => go('/reports?tab=sales')}>
              View All →
            </button>
          </div>

          <div>
            {topSellingItems.length ? (
              topSellingItems.map((it, idx) => {
              const pct = Math.max(18, Math.round(((Number(it.revenue) || 0) / maxRev) * 100));
              const low = Number(it.quantity_in_stock) <= 5;
              const colors = ['#4f46e5', '#15803d', '#2563eb', '#d97706', '#dc2626'];
              return (
                <React.Fragment key={`seller-${it.product_id ?? idx}-${idx}`}>
                  <div className="zb-seller-row">
                    <div className={`zb-rank${idx === 0 ? ' gold' : ''}`}>{idx + 1}</div>
                    <div>
                      <div className="zb-sn">{it.product_name}</div>
                      <div className="zb-sm">
                        {it.category_name} · {it.quantity_sold} units sold
                      </div>
                    </div>
                    <div>
                      <div className="zb-amt">{formatPk(it.revenue)}</div>
                      <div style={{ textAlign: 'right', marginTop: 3 }}>
                        <span className={`zb-badge ${low ? 'zb-partial' : 'zb-paid'}`}>{low ? 'Low Stock' : 'In Stock'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="zb-bar-wrap">
                    <div className="zb-bar-bg">
                      <div className="zb-bar-f" style={{ width: `${pct}%`, background: colors[idx % colors.length] }} />
                    </div>
                  </div>
                </React.Fragment>
              );
              })
            ) : (
              <div style={{ padding: '22px', color: '#9c9890', fontSize: 13 }}>
                No product sales recorded this calendar month yet.
              </div>
            )}
          </div>

          <div className="zb-mini">
            <div>
              <div className="v" style={{ color: '#4f46e5' }}>
                {Math.round(ms.unitsSold ?? 0).toLocaleString('en-US')}
              </div>
              <div className="l">Units Sold (month)</div>
            </div>
            <div>
              <div className="v" style={{ color: '#15803d' }}>
                {formatPk(ms.totalSales ?? 0)}
              </div>
              <div className="l">Monthly Revenue</div>
            </div>
          </div>
        </div>

        <div className="zb-card">
          <div className="zb-card-hd">
            <div>
              <div className="zb-card-t">Recent Bills</div>
              <div className="zb-card-s">Latest in {ms.label || 'this month'}</div>
            </div>
            <button type="button" className="zb-card-link" onClick={() => go('/invoices')}>
              View All →
            </button>
          </div>
          <div>
            {recentBills.length ? (
              recentBills.map((b) => {
                const badge = paymentBadge(b);
                const invLabel = b.invoice_number ? `#${b.invoice_number}` : `#${b.sale_id}`;
                return (
                  <button
                    key={b.sale_id}
                    type="button"
                    className="zb-bill"
                    onClick={() => go('/invoices')}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ marginBottom: 3 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4f46e5' }}>{invLabel}</span>
                        <span className={`zb-badge ${badge.cls}`}>{badge.text}</span>
                      </div>
                      <div className="zb-sn">{b.customer_name || 'Walk-in Customer'}</div>
                      <div style={{ fontSize: 11.5, color: '#b0aca4', marginTop: 2 }}>
                        {fmtLongDate(b.date, '')}
                      </div>
                    </div>
                    <div>
                      <div className="zb-amt">{formatPk(b.total_amount)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', textAlign: 'right', marginTop: 2 }}>
                        Paid: {formatPk(Number(b.paid_amount ?? 0))}
                      </div>
                      {(b.due_remaining || 0) > 1e-2 ? (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#d97706',
                            textAlign: 'right',
                          }}
                        >
                          Due: {formatPk(b.due_remaining)}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '22px', color: '#9c9890', fontSize: 13 }}>No bills in this month yet.</div>
            )}
          </div>
          <div className="zb-mini">
            <div>
              <div className="v">{billsMonthTotals.invoiceCount}</div>
              <div className="l">Total Invoices</div>
            </div>
            <div>
              <div className="v" style={{ color: '#dc2626' }}>
                {formatPk(billsMonthTotals.totalOutstanding)}
              </div>
              <div className="l">Total Outstanding</div>
            </div>
          </div>
        </div>
      </div>

      <div className="zb-split">
        <div className="zb-card">
          <div className="zb-card-hd">
            <div>
              <div className="zb-card-t">Recent Activity</div>
              <div className="zb-card-s">Merged from sales, expenses & stock</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: '#4f46e5', background: '#eef2ff' }}>
              <span className="zb-tb-live-dot" style={{ width: 6, height: 6, background: '#4f46e5' }} />
              Live
            </span>
          </div>
          <div style={{ padding: '4px 0 8px' }}>
            {activity.length ? (
              activity.map((a, i) => (
                <div
                  key={`${i}-${a.sort}`}
                  className="zb-act"
                  style={{ borderBottom: i === activity.length - 1 ? 'none' : undefined }}
                >
                  <span style={{ marginTop: 6, flexShrink: 0, width: 8, height: 8, borderRadius: 999, background: a.accent }} />
                  <div style={{ flex: 1, lineHeight: 1.5 }}>
                    <strong>{a.headline}</strong> {a.detail}
                  </div>
                  <span className="zb-act-t">{a.when}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', fontSize: 13, color: '#9c9890' }}>No recent activity lines.</div>
            )}
          </div>
        </div>

        <div className="zb-card">
          <div className="zb-card-hd">
            <div>
              <div className="zb-card-t">Monthly Snapshot</div>
              <div className="zb-card-s">{ms.label || 'Calendar month'} · donut shows relative scale</div>
            </div>
          </div>
          <div className="zb-snap">
            <div style={{ height: 180, marginBottom: 8, position: 'relative' }}>
              <DashboardSnapshotDonut
                netProfit={
                  admin && ms.netProfit != null ? Math.max(0, Number(ms.netProfit) || 0) : 0
                }
                totalExpenses={ms.totalExpenses ?? 0}
                creditOutstanding={ms.creditOutstanding ?? dashboardData.customerDue ?? 0}
              />
              {!admin ? (
                <p style={{ fontSize: 11, color: '#9c9890', textAlign: 'center', marginTop: 4 }}>
                  Profit slice hidden for cashier role (expenses vs credit shown).
                </p>
              ) : null}
            </div>
            <div className="zb-sn-row">
              <span className="sn-left">
                <span style={{ width: 9, height: 9, borderRadius: 999, background: '#15803d' }} aria-hidden /> Net Profit
              </span>
              <span className="sn-val" style={{ color: admin ? '#15803d' : '#9c9890' }}>
                {admin && ms.netProfit != null ? formatPk(ms.netProfit) : '—'}
              </span>
            </div>
            <div className="zb-sn-row">
              <span className="sn-left">
                <span style={{ width: 9, height: 9, borderRadius: 999, background: '#dc2626' }} aria-hidden />{' '}
                Expenses
              </span>
              <span className="sn-val" style={{ color: '#dc2626' }}>
                {formatPk(ms.totalExpenses)}
              </span>
            </div>
            <div className="zb-sn-row">
              <span className="sn-left">
                <span style={{ width: 9, height: 9, borderRadius: 999, background: '#d97706' }} aria-hidden /> Credit
              </span>
              <span className="sn-val" style={{ color: '#d97706' }}>
                {formatPk(ms.creditOutstanding ?? dashboardData.customerDue)}
              </span>
            </div>
            <div className="zb-sn-row">
              <span className="sn-left">
                <span style={{ width: 9, height: 9, borderRadius: 999, background: '#2563eb' }} aria-hidden /> Collected
              </span>
              <span className="sn-val" style={{ color: '#2563eb' }}>
                {formatPk(ms.cashCollected)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
