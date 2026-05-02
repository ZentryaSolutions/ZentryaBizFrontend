import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faSackDollar,
  faStore,
  faTriangleExclamation,
  faUsers,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { fetchDashboardData } from '../lib/workspaceQueries';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { isZbWebOnlyMode } from '../lib/appMode';
import { withCurrentScope } from '../utils/appRouteScope';
import './Dashboard.css';

function DashboardSkeleton({ t }) {
  return (
    <div className="content-container dashboard dashboard--loading">
      <div className="page-header">
        <div className="dashboard-skel dashboard-skel--title" />
        <div className="dashboard-skel dashboard-skel--subtitle" />
      </div>
      <div className="dashboard-summary-cards">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="dashboard-summary-card dashboard-summary-card--skeleton">
            <div className="dashboard-skel dashboard-skel--icon" />
            <div className="dashboard-skel-block">
              <div className="dashboard-skel dashboard-skel--line sm" />
              <div className="dashboard-skel dashboard-skel--line lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-insights">
        <div className="dashboard-section">
          <div className="card">
            <div className="card-header">
              <div className="dashboard-skel dashboard-skel--heading" />
            </div>
            <div className="card-content">
              <div className="dashboard-skel-table">
                {[1, 2, 3, 4].map((r) => (
                  <div key={r} className="dashboard-skel dashboard-skel--row" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="dashboard-section">
          <div className="card">
            <div className="card-header">
              <div className="dashboard-skel dashboard-skel--heading" />
            </div>
            <div className="card-content">
              <div className="dashboard-skel-table">
                {[1, 2, 3].map((r) => (
                  <div key={r} className="dashboard-skel dashboard-skel--row" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="dashboard-loading-hint">{t('dashboard.loading')}</p>
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();

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

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount || 0).toFixed(2)}`;
  };

  if (loading && !dashboardData) {
    return <DashboardSkeleton t={t} />;
  }

  if (!dashboardData) {
    if (loadFailed && isZbWebOnlyMode()) {
      return (
        <div className="content-container">
          <div className="zb-dashFallback">
            <h1 className="page-title">{t('dashboard.title')}</h1>
            <p className="page-subtitle">
              The POS API on port 5000 needs a <strong>server session</strong> (<code>x-session-id</code>), not only Supabase login. If the backend is running but this message stays, the dashboard request is likely returning <strong>401</strong> (check DevTools → Network → <code>dashboard</code>).
            </p>
            <div className="card zb-dashFallback__card">
              <p className="zb-dashFallback__lead">
                <strong>Supabase</strong> handles Zentrya login in the browser. <strong>Dashboard / billing / stock</strong> use the Node API, which expects the same username/password to exist in the HisaabKitab <code>users</code> table (or log in again after signup so the app can attach a server session).
              </p>
              <ul className="zb-dashFallback__list">
                <li>Ensure <code>npm start</code> is running and <code>backend/.env</code> has <code>DATABASE_URL</code>.</li>
                <li><strong>Log out</strong> and <strong>log in again</strong> — the app tries to open a Node session automatically when credentials match <code>users</code>.</li>
                <li>If you only use <code>zb_simple_users</code> (SQL signup) and have no row in <code>users</code>, create one in DB or use first-time setup so POS API auth exists.</li>
              </ul>
              <p className="zb-dashFallback__hint">Until <code>/api/reports/dashboard</code> returns 200, KPI cards stay hidden.</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="content-container">
        <div className="error-message">{t('dashboard.failedToLoad')}</div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <p className="page-subtitle">{t('dashboard.subtitle')}</p>
      </div>

      {/* Summary Cards - 6 Cards */}
      <div className="dashboard-summary-cards">
        <div className="dashboard-summary-card">
          <div className="summary-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faSackDollar} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{t('dashboard.todaySale')}</div>
            <div className="summary-card-value">{formatCurrency(dashboardData.todaySale)}</div>
          </div>
        </div>

        <div className="dashboard-summary-card">
          <div className="summary-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{t('dashboard.todayProfit')}</div>
            <div className={`summary-card-value ${dashboardData.todayProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {dashboardData.todayProfit !== null && dashboardData.todayProfit !== undefined 
                ? formatCurrency(dashboardData.todayProfit) 
                : t('dashboard.notAvailable')}
            </div>
          </div>
        </div>

        <div className="dashboard-summary-card">
          <div className="summary-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faWallet} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{t('dashboard.cashInHand')}</div>
            <div className="summary-card-value">
              {dashboardData.cashInHand !== null && dashboardData.cashInHand !== undefined 
                ? formatCurrency(dashboardData.cashInHand) 
                : t('dashboard.notAvailable')}
            </div>
          </div>
        </div>

        <div 
          className="dashboard-summary-card clickable"
          onClick={() => navigate(withCurrentScope(location.pathname, '/reports?tab=customers'))}
        >
          <div className="summary-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{t('dashboard.customerDue')}</div>
            <div className="summary-card-value profit-negative">{formatCurrency(dashboardData.customerDue)}</div>
            <div className="summary-card-hint">{t('dashboard.clickToViewList')}</div>
          </div>
        </div>

        <div 
          className="dashboard-summary-card clickable"
          onClick={() => navigate(withCurrentScope(location.pathname, '/reports?tab=suppliers'))}
        >
          <div className="summary-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faStore} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{t('dashboard.supplierDue')}</div>
            <div className="summary-card-value profit-negative">
              {dashboardData.supplierDue !== null && dashboardData.supplierDue !== undefined 
                ? formatCurrency(dashboardData.supplierDue) 
                : t('dashboard.notAvailable')}
            </div>
            <div className="summary-card-hint">{t('dashboard.clickToViewList')}</div>
          </div>
        </div>

        <div 
          className="dashboard-summary-card clickable"
          onClick={() => navigate(withCurrentScope(location.pathname, '/reports?tab=stock-low'))}
        >
          <div className="summary-card-icon" aria-hidden="true">
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">{t('dashboard.lowStockItems')}</div>
            <div className="summary-card-value">{dashboardData.lowStockCount}</div>
            <div className="summary-card-hint">{t('dashboard.clickToViewList')}</div>
          </div>
        </div>
      </div>

      {/* Quick Insights Section */}
      <div className="dashboard-insights">
        {/* Top Selling Items */}
        <div className="dashboard-section">
          <div className="card">
            <div className="card-header">
              <h2>{t('dashboard.topSellingItems')} ({t('dashboard.todaySale')})</h2>
            </div>
            <div className="card-content">
              {dashboardData.topSellingItems && dashboardData.topSellingItems.length > 0 ? (
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>{t('common.name')}</th>
                      <th>{t('dashboard.quantitySold')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topSellingItems.map((item) => (
                      <tr key={item.product_id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity_sold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-message">{t('dashboard.noSalesToday')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="dashboard-section">
          <div className="card">
            <div className="card-header">
              <h2>{t('dashboard.recentBills')} ({t('dashboard.todaySale')})</h2>
            </div>
            <div className="card-content">
              {dashboardData.recentBills && dashboardData.recentBills.length > 0 ? (
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>{t('billing.invoiceNumber')}</th>
                      <th>{t('billing.customerName')}</th>
                      <th>{t('common.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentBills.map((bill) => (
                      <tr 
                        key={bill.sale_id}
                        className="clickable-row"
                        onClick={() => navigate(withCurrentScope(location.pathname, '/invoices'))}
                      >
                        <td>{bill.invoice_number}</td>
                        <td>{bill.customer_name}</td>
                        <td>{formatCurrency(bill.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-message">{t('dashboard.noBillsToday')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
