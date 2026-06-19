import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDay,
  faDownload,
  faEye,
  faMagnifyingGlass,
  faRotateLeft,
  faSackDollar,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchReturnsList } from '../lib/workspaceQueries';
import { withCurrentScope } from '../utils/appRouteScope';
import { formatItemCountLabel } from '../utils/itemCountLabel';
import { returnsWorkspaceStyles } from '../styles/returnsWorkspaceStyles';
import PageLoadingCenter from './PageLoadingCenter';
import Pagination from './Pagination';
import { posApiQueriesEnabled } from '../lib/appMode';
import { getConnectivityErrorMessage, isLikelyConnectivityError } from '../lib/offlineUserMessages';
import './Sales.css';

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
};

function saleLocalDateKey(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function initialsFromName(name) {
  if (!name || !String(name).trim()) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateSubline(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

const Returns = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeShopId } = useAuth();

  const {
    data: returns = [],
    isLoading,
    isError,
    error: queryErr,
  } = useQuery({
    queryKey: zbKeys(activeShopId).returnsList(),
    queryFn: fetchReturnsList,
    enabled: posApiQueriesEnabled(activeShopId),
    placeholderData: keepPreviousData,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [refundFilter, setRefundFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const errorBanner = useMemo(() => {
    if (!isError || !queryErr) return null;
    if (isLikelyConnectivityError(queryErr)) {
      return { text: getConnectivityErrorMessage(queryErr), variant: 'offline' };
    }
    return {
      text: queryErr.response?.data?.error || t('returns.failedToLoad', { defaultValue: 'Failed to load returns' }),
      variant: 'error',
    };
  }, [isError, queryErr, t]);

  const metrics = useMemo(() => {
    let todayCount = 0;
    let todayAmount = 0;
    let totalAmount = 0;
    let cashN = 0;
    let creditN = 0;
    returns.forEach((row) => {
      const amt = Number(row.total_amount) || 0;
      totalAmount += amt;
      const dKey = saleLocalDateKey(row.return_date);
      if (isToday(dKey)) {
        todayCount += 1;
        todayAmount += amt;
      }
      if (String(row.refund_type || '').toLowerCase() === 'credit') creditN += 1;
      else cashN += 1;
    });
    return {
      todayCount,
      todayAmount,
      totalAmount,
      totalCount: returns.length,
      cashN,
      creditN,
    };
  }, [returns]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return returns.filter((row) => {
      if (refundFilter !== 'all' && String(row.refund_type || '').toLowerCase() !== refundFilter) {
        return false;
      }
      if (dateFilter && saleLocalDateKey(row.return_date) !== dateFilter) return false;
      if (!q) return true;
      const num = String(row.return_number || '').toLowerCase();
      const orig = String(row.original_invoice_number || '').toLowerCase();
      const cust = String(row.customer_name || '').toLowerCase();
      const reason = String(row.return_reason || '').toLowerCase();
      return num.includes(q) || orig.includes(q) || cust.includes(q) || reason.includes(q);
    });
  }, [returns, searchQuery, refundFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  const fromRow = filtered.length ? start + 1 : 0;
  const toRow = Math.min(start + itemsPerPage, filtered.length);

  const openDetail = (returnId) => {
    navigate(withCurrentScope(location.pathname, `/returns/${returnId}`));
  };

  const handleExportCsv = () => {
    const header = ['Return #', 'Date', 'Original invoice', 'Customer', 'Refund type', 'Total', 'Reason'];
    const lines = filtered.map((r) =>
      [
        r.return_number,
        r.return_date,
        r.original_invoice_number || '',
        r.customer_name || '',
        r.refund_type || 'cash',
        r.total_amount,
        r.return_reason || '',
      ]
        .map((c) => {
          const s = String(c ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returns-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="content-container sales-page">
        <PageLoadingCenter message={`${t('common.loading')}…`} />
      </div>
    );
  }

  return (
    <div className="content-container sales-page sal2">
      <style>{returnsWorkspaceStyles}</style>

      {errorBanner ? (
        <div className={`sal2-err${errorBanner.variant === 'offline' ? ' sal2-err--offline' : ''}`}>
          {errorBanner.text}
        </div>
      ) : null}

      <div className="sal2-kpis">
        <div className="sal2-kpi sal2-kpi--orange">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faCalendarDay} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--today">
              {t('returns.pillToday', { defaultValue: 'Today' })}
            </span>
          </div>
          <div className="sal2-kpi-val">{metrics.todayCount}</div>
          <div className="sal2-kpi-lbl">{t('returns.kpiTodayReturns', { defaultValue: 'Returns today' })}</div>
          <div className="sal2-kpi-sub">{formatCurrency(metrics.todayAmount)}</div>
        </div>
        <div className="sal2-kpi sal2-kpi--green">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faSackDollar} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--total">
              {t('returns.pillTotal', { defaultValue: 'All time' })}
            </span>
          </div>
          <div className="sal2-kpi-val">{formatCurrency(metrics.totalAmount)}</div>
          <div className="sal2-kpi-lbl">{t('returns.kpiTotalRefunded', { defaultValue: 'Total refunded' })}</div>
          <div className="sal2-kpi-sub">
            {t('returns.kpiReturnCount', { count: metrics.totalCount, defaultValue: '{{count}} returns' })}
          </div>
        </div>
        <div className="sal2-kpi sal2-kpi--blue">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faRotateLeft} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--pending">
              {t('returns.pillCash', { defaultValue: 'Cash' })}
            </span>
          </div>
          <div className="sal2-kpi-val">{metrics.cashN}</div>
          <div className="sal2-kpi-lbl">{t('returns.kpiCashReturns', { defaultValue: 'Cash refunds' })}</div>
        </div>
        <div className="sal2-kpi sal2-kpi--purple">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faRotateLeft} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--sales">
              {t('returns.pillCredit', { defaultValue: 'Credit' })}
            </span>
          </div>
          <div className="sal2-kpi-val">{metrics.creditN}</div>
          <div className="sal2-kpi-lbl">{t('returns.kpiCreditReturns', { defaultValue: 'Credit to account' })}</div>
        </div>
      </div>

      <header className="sal2-hd">
        <div>
          <h1 className="sal2-hd-tit">{t('returns.title', { defaultValue: 'Sales returns' })}</h1>
          <p className="sal2-hd-sub">
            {t('returns.subtitle', {
              defaultValue: 'Credit notes, refunds, and stock restored from returned items.',
            })}
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="sal2-new"
            onClick={() => navigate(withCurrentScope(location.pathname, '/sales'))}
          >
            {t('returns.fromSales', { defaultValue: 'Return from Sales' })}
          </button>
        ) : null}
      </header>

      <div className="sal2-toolbar-wrap">
        <div className="sal2-toolbar">
          <div className="sal2-search-wrap">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              type="search"
              className="sal2-search"
              placeholder={t('returns.searchPlaceholder', {
                defaultValue: 'Search return #, invoice, customer, reason…',
              })}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              autoComplete="off"
            />
          </div>
          <select
            className="sal2-select"
            value={refundFilter}
            onChange={(e) => {
              setRefundFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label={t('returns.refundType', { defaultValue: 'Refund type' })}
          >
            <option value="all">{t('returns.allRefundTypes', { defaultValue: 'All refund types' })}</option>
            <option value="cash">{t('returns.refundCash', { defaultValue: 'Cash refund' })}</option>
            <option value="credit">{t('returns.refundCredit', { defaultValue: 'Credit to account' })}</option>
          </select>
          <input
            type="date"
            className="sal2-date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label={t('sales.date', { defaultValue: 'Date' })}
          />
          <button type="button" className="sal2-export" onClick={handleExportCsv}>
            <FontAwesomeIcon icon={faDownload} />
            {t('sales.exportCsv', { defaultValue: 'Export CSV' })}
          </button>
        </div>
      </div>

      <section className="sal2-shell" aria-label={t('returns.listTitle', { defaultValue: 'Returns list' })}>
        <div className="sal2-shell-hd">
          <h2 className="sal2-shell-tit">{t('returns.listTitle', { defaultValue: 'Returns' })}</h2>
          <span className="sal2-shell-meta">
            {t('sales.showingInvoicesRange', {
              from: fromRow,
              to: toRow,
              total: filtered.length,
              defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
            })}
          </span>
        </div>

        <div className="sal2-table-wrap">
          <table className="sal2-table">
            <thead>
              <tr>
                <th>{t('returns.colReturn', { defaultValue: 'Return #' })}</th>
                <th>{t('returns.colOriginal', { defaultValue: 'Original invoice' })}</th>
                <th>{t('sales.customer', { defaultValue: 'Customer' })}</th>
                <th>{t('sales.items', { defaultValue: 'Items' })}</th>
                <th>{t('sales.totalAmount', { defaultValue: 'Amount' })}</th>
                <th>{t('returns.refundType', { defaultValue: 'Refund' })}</th>
                <th>{t('returns.colReason', { defaultValue: 'Reason' })}</th>
                <th>{t('sales.actions', { defaultValue: 'Actions' })}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="sal2-empty">
                    {searchQuery || refundFilter !== 'all' || dateFilter
                      ? t('returns.noResults', { defaultValue: 'No returns match your filters.' })
                      : t('returns.empty', {
                          defaultValue: 'No returns yet. Process a return from Sales on any invoice.',
                        })}
                  </td>
                </tr>
              ) : (
                paginated.map((row) => {
                  const refundKey = String(row.refund_type || 'cash').toLowerCase();
                  return (
                    <tr key={row.return_id}>
                      <td>
                        <button
                          type="button"
                          className="sal2-inv-btn"
                          onClick={() => openDetail(row.return_id)}
                        >
                          {row.return_number}
                        </button>
                        <div className="sal2-inv-sub">{formatDateSubline(row.return_date)}</div>
                      </td>
                      <td>
                        <span className="sal2-cust-name">{row.original_invoice_number || '—'}</span>
                      </td>
                      <td>
                        <div className="sal2-cust">
                          <span className="sal2-av" aria-hidden>
                            {initialsFromName(row.customer_name || t('sales.cashCustomer'))}
                          </span>
                          <div>
                            <span className="sal2-cust-name">
                              {row.customer_name || t('sales.cashCustomer', { defaultValue: 'Cash customer' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sal2-items-badge">
                          {formatItemCountLabel(row.item_count, t) ?? '—'}
                        </span>
                        {row.items_preview ? (
                          <div className="sal2-items-preview" title={row.items_preview}>
                            {row.items_preview}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="sal2-amt">{formatCurrency(row.total_amount)}</span>
                      </td>
                      <td>
                        <span
                          className={`ret2-pill ret2-pill--${refundKey === 'credit' ? 'credit' : 'cash'}`}
                        >
                          {refundKey === 'credit'
                            ? t('returns.refundCredit', { defaultValue: 'Credit' })
                            : t('returns.refundCash', { defaultValue: 'Cash' })}
                        </span>
                      </td>
                      <td>
                        <div className="sal2-inv-sub sal2-inv-sub--reason" title={row.return_reason}>
                          {row.return_reason || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="sal2-actions">
                          <button
                            type="button"
                            className="sal2-iconbtn"
                            title={t('common.view', { defaultValue: 'View' })}
                            onClick={() => openDetail(row.return_id)}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > itemsPerPage ? (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(n) => {
              setItemsPerPage(n);
              setCurrentPage(1);
            }}
            totalItems={filtered.length}
          />
        ) : null}
      </section>
    </div>
  );
};

export default Returns;
