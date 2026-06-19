import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { returnsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { withCurrentScope } from '../utils/appRouteScope';
import { formatItemCountLabel, sumItemQuantities } from '../utils/itemCountLabel';
import { returnsWorkspaceStyles } from '../styles/returnsWorkspaceStyles';
import PageLoadingCenter from './PageLoadingCenter';
import { posApiQueriesEnabled } from '../lib/appMode';
import { getConnectivityErrorMessage, isLikelyConnectivityError } from '../lib/offlineUserMessages';
import './Sales.css';

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
};

function formatDateLong(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function fetchReturnDetail({ queryKey }) {
  const returnId = queryKey[3];
  const res = await returnsAPI.getById(returnId);
  return res.data;
}

export default function ReturnDetailView({ readOnly = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { returnId } = useParams();
  const { activeShopId } = useAuth();

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: zbKeys(activeShopId).returnDetail(returnId),
    queryFn: fetchReturnDetail,
    enabled: posApiQueriesEnabled(activeShopId) && Boolean(returnId),
  });

  const goBack = () => navigate(withCurrentScope(location.pathname, '/returns'));

  if (isLoading) {
    return (
      <div className="content-container sales-page">
        <PageLoadingCenter message={`${t('common.loading')}…`} />
      </div>
    );
  }

  if (isError || !detail) {
    const msg = isLikelyConnectivityError(error)
      ? getConnectivityErrorMessage(error)
      : error?.response?.data?.error || t('returns.failedToLoadDetail', { defaultValue: 'Could not load return.' });
    return (
      <div className="content-container sales-page sal2 ret2-detail">
        <style>{returnsWorkspaceStyles}</style>
        <button type="button" className="ret2-back" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> {t('common.back', { defaultValue: 'Back' })}
        </button>
        <div className="sal2-err">{msg}</div>
      </div>
    );
  }

  const refundKey = String(detail.refund_type || 'cash').toLowerCase();
  const items = Array.isArray(detail.items) ? detail.items : [];
  const itemCount = sumItemQuantities(items) || items.length;
  const lineDiscount = Number(detail.discount) || 0;

  return (
    <div className="content-container sales-page sal2 ret2-detail">
      <style>{returnsWorkspaceStyles}</style>

      <button type="button" className="ret2-back" onClick={goBack}>
        <FontAwesomeIcon icon={faArrowLeft} /> {t('returns.backToList', { defaultValue: 'All returns' })}
      </button>

      <div className="ret2-hero">
        <div className="ret2-hero-top">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
            <div className="ret2-hero-ico" aria-hidden>
              <FontAwesomeIcon icon={faRotateLeft} />
            </div>
            <div>
              <h1 className="ret2-hero-tit">{detail.return_number}</h1>
              <p className="ret2-hero-sub">
                {formatDateLong(detail.return_date)}
                {detail.original_invoice_number ? (
                  <>
                    {' · '}
                    {t('returns.refInvoice', { defaultValue: 'Original' })}{' '}
                    {detail.original_sale?.sale_id && !readOnly ? (
                      <button
                        type="button"
                        className="ret2-link-btn"
                        onClick={() =>
                          navigate(withCurrentScope(location.pathname, '/sales'), {
                            state: { highlightSaleId: detail.original_sale.sale_id },
                          })
                        }
                      >
                        {detail.original_invoice_number}
                      </button>
                    ) : (
                      <strong>{detail.original_invoice_number}</strong>
                    )}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <span className={`ret2-pill ret2-pill--${refundKey === 'credit' ? 'credit' : 'cash'}`}>
            {refundKey === 'credit'
              ? t('returns.refundCredit', { defaultValue: 'Credit to account' })
              : t('returns.refundCash', { defaultValue: 'Cash refund' })}
          </span>
        </div>

        <div className="ret2-grid">
          <div className="ret2-stat">
            <div className="ret2-stat-lbl">{t('returns.totalRefunded', { defaultValue: 'Total refunded' })}</div>
            <div className="ret2-stat-val">{formatCurrency(detail.total_amount)}</div>
          </div>
          <div className="ret2-stat">
            <div className="ret2-stat-lbl">{t('sales.customer', { defaultValue: 'Customer' })}</div>
            <div className="ret2-stat-val" style={{ fontSize: '0.95rem' }}>
              {detail.customer_name || t('sales.cashCustomer', { defaultValue: 'Cash customer' })}
            </div>
          </div>
          <div className="ret2-stat">
            <div className="ret2-stat-lbl">{t('sales.method', { defaultValue: 'Payment' })}</div>
            <div className="ret2-stat-val" style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>
              {detail.payment_type || refundKey}
            </div>
          </div>
        </div>
      </div>

      {detail.return_reason ? (
        <section className="ret2-card">
          <div className="ret2-card-hd">{t('returns.colReason', { defaultValue: 'Return reason' })}</div>
          <div className="ret2-reason">{detail.return_reason}</div>
        </section>
      ) : null}

      <section className="sal2-shell">
        <div className="sal2-shell-hd">
          <h2 className="sal2-shell-tit">{t('returns.itemsReturned', { defaultValue: 'Items returned' })}</h2>
          <span className="sal2-shell-meta">
            {formatItemCountLabel(itemCount, t)}
          </span>
        </div>
        <div className="sal2-table-wrap">
          <table className="sal2-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>{t('returns.colProduct', { defaultValue: 'Product' })}</th>
                <th>{t('returns.colQty', { defaultValue: 'Qty' })}</th>
                <th>{t('returns.colUnitPrice', { defaultValue: 'Unit price' })}</th>
                <th>{t('returns.colDiscount', { defaultValue: 'Discount' })}</th>
                <th>{t('returns.colLineTotal', { defaultValue: 'Line total' })}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="sal2-empty">
                    {t('returns.noItems', { defaultValue: 'No line items recorded.' })}
                  </td>
                </tr>
              ) : (
                items.map((line, idx) => (
                  <tr key={line.return_item_id || line.sale_item_id || idx}>
                    <td>
                      <span className="sal2-cust-name">{line.product_name || `Product #${line.product_id}`}</span>
                      {line.sku ? <div className="sal2-cust-sub">SKU: {line.sku}</div> : null}
                    </td>
                    <td>{Number(line.quantity)}</td>
                    <td>{formatCurrency(line.selling_price)}</td>
                    <td>{formatCurrency(line.line_discount)}</td>
                    <td>
                      <span className="sal2-amt">
                        {formatCurrency(line.line_total ?? Number(line.selling_price) * Number(line.quantity))}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 ? (
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '14px' }}>
                    {t('returns.subtotal', { defaultValue: 'Subtotal' })}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span className="sal2-amt">{formatCurrency(detail.subtotal)}</span>
                  </td>
                </tr>
                {lineDiscount > 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, padding: '14px', color: '#64748b' }}>
                      {t('returns.lineDiscounts', { defaultValue: 'Line discounts' })}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <span className="sal2-amt">−{formatCurrency(lineDiscount)}</span>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 800, padding: '14px' }}>
                    {t('returns.totalRefunded', { defaultValue: 'Total refunded' })}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span className="sal2-amt">{formatCurrency(detail.total_amount)}</span>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      {detail.original_sale ? (
        <section className="ret2-card">
          <div className="ret2-card-hd">{t('returns.originalSale', { defaultValue: 'Original sale' })}</div>
          <div className="ret2-reason" style={{ paddingTop: 12 }}>
            <div>
              <strong>{detail.original_sale.invoice_number}</strong> — {formatDateLong(detail.original_sale.date)}
            </div>
            <div style={{ marginTop: 8, color: '#64748b' }}>
              {t('returns.originalTotal', { defaultValue: 'Invoice total' })}:{' '}
              {formatCurrency(detail.original_sale.total_amount)}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
