import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDay,
  faCreditCard,
  faDownload,
  faEye,
  faFileInvoice,
  faHourglassHalf,
  faMagnifyingGlass,
  faMoneyBillWave,
  faPenToSquare,
  faPrint,
  faSackDollar,
  faTrash,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { salesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchSalesList } from '../lib/workspaceQueries';
import { withCurrentScope } from '../utils/appRouteScope';
import { salesWorkspaceStyles } from '../styles/salesWorkspaceStyles';
import PageLoadingCenter from './PageLoadingCenter';
import Pagination from './Pagination';
import { posApiQueriesEnabled } from '../lib/appMode';
import './Sales.css';

const EPS = 0.005;

function saleLocalDateKey(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameLocalDay(dateStr, refDate) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const r = refDate instanceof Date ? refDate : new Date(refDate);
  if (Number.isNaN(r.getTime())) return false;
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth() && d.getDate() === r.getDate();
}

function initialsFromName(name) {
  if (!name || !String(name).trim()) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function enrichSale(sale) {
  const total = Number(sale.total_amount) || 0;
  const paid = Number(sale.paid_amount) || 0;
  const due = Math.max(0, total - paid);
  const pt = String(sale.payment_type || sale.payment_mode || 'cash').toLowerCase();
  let statusKey = 'paid';
  if (due <= EPS) statusKey = 'paid';
  else if (pt === 'credit') statusKey = 'credit';
  else statusKey = 'partial';
  const rawIc = sale.item_count;
  const nIc = Number(rawIc);
  const ic = rawIc == null || rawIc === '' || Number.isNaN(nIc) ? null : nIc;
  return {
    ...sale,
    _due: due,
    _statusKey: statusKey,
    _itemCount: ic,
    _itemsPreview: sale.items_preview || '',
  };
}

function csvEscape(cell) {
  const s = cell == null ? '' : String(cell);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const Sales = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, activeShopId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: sales = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: zbKeys(activeShopId).salesList(),
    queryFn: fetchSalesList,
    enabled: posApiQueriesEnabled(activeShopId),
  });

  const error = useMemo(() => {
    if (!isError || !queryError) return null;
    return queryError.response?.data?.error || t('sales.failedToLoad');
  }, [isError, queryError, t]);

  const [selectedSale, setSelectedSale] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [editFormData, setEditFormData] = useState({
    payment_type: 'cash',
    paid_amount: 0,
    discount: 0,
    tax: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const formatCurrency = (amount) =>
    `PKR ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatInvoiceSubline = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} · ${timePart}`;
  };

  const enriched = useMemo(() => sales.map(enrichSale), [sales]);

  const metrics = useMemo(() => {
    const now = new Date();
    let todayRev = 0;
    let todayInv = 0;
    let totalRev = 0;
    let outstanding = 0;
    let unpaidPartial = 0;
    let creditN = 0;
    let partialN = 0;
    let paidN = 0;
    enriched.forEach((s) => {
      const total = Number(s.total_amount) || 0;
      totalRev += total;
      if (isSameLocalDay(s.date, now)) {
        todayRev += total;
        todayInv += 1;
      }
      if (s._due > EPS) {
        outstanding += s._due;
        unpaidPartial += 1;
      }
      if (s._statusKey === 'paid') paidN += 1;
      else if (s._statusKey === 'credit') creditN += 1;
      else partialN += 1;
    });
    return {
      todayRev,
      todayInv,
      totalRev,
      outstanding,
      unpaidPartial,
      totalInv: enriched.length,
      creditN,
      partialN,
      paidN,
    };
  }, [enriched]);

  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enriched.filter((sale) => {
      if (methodFilter !== 'all' && String(sale.payment_mode || sale.payment_type || '').toLowerCase() !== methodFilter) {
        return false;
      }
      if (statusFilter !== 'all' && sale._statusKey !== statusFilter) return false;
      if (dateFilter && saleLocalDateKey(sale.date) !== dateFilter) return false;
      if (!q) return true;
      const inv = (sale.invoice_number || '').toLowerCase();
      const cust = (sale.customer_name || '').toLowerCase();
      const prev = (sale._itemsPreview || '').toLowerCase();
      return inv.includes(q) || cust.includes(q) || prev.includes(q) || String(sale.sale_id).includes(q);
    });
  }, [enriched, searchQuery, statusFilter, methodFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, methodFilter, dateFilter]);

  const handleExportCsv = () => {
    const headers = [
      t('sales.invoiceNumber'),
      t('sales.date'),
      t('sales.customer'),
      t('sales.items'),
      t('sales.totalAmount'),
      t('sales.paidAmount'),
      t('sales.due'),
      t('sales.paymentMode'),
      t('sales.status'),
    ];
    const rows = filteredSales.map((s) => [
      s.invoice_number,
      formatDate(s.date),
      s.customer_name || t('sales.cashCustomer'),
      s._itemCount != null ? s._itemCount : '',
      s.total_amount,
      s.paid_amount,
      s._due,
      s.payment_mode || s.payment_type,
      s._statusKey,
    ]);
    const body = [headers.map(csvEscape), ...rows.map((r) => r.map(csvEscape))].join('\n');
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-invoices-${saleLocalDateKey(String(new Date()))}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewSale = async (saleId) => {
    try {
      const response = await salesAPI.getById(saleId);
      setSelectedSale(response.data);
    } catch (err) {
      console.error('Error fetching sale details:', err);
      alert(t('sales.failedToLoad'));
    }
  };

  const handleEdit = async (saleId) => {
    try {
      const response = await salesAPI.getById(saleId);
      const sale = response.data;
      setEditingSale(sale);
      setEditFormData({
        payment_type: sale.payment_mode || sale.payment_type || 'cash',
        paid_amount: sale.paid_amount || 0,
        discount: sale.discount || 0,
        tax: sale.tax || 0,
      });
    } catch (err) {
      console.error('Error fetching sale for edit:', err);
      alert(t('sales.failedToLoad'));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    try {
      setSaving(true);
      const updateData = {
        payment_type: editFormData.payment_type,
        paid_amount: parseFloat(editFormData.paid_amount) || 0,
        discount: parseFloat(editFormData.discount) || 0,
        tax: parseFloat(editFormData.tax) || 0,
      };
      await salesAPI.update(editingSale.sale_id, updateData);
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).salesList() });
      setEditingSale(null);
      alert(t('sales.updateSuccess'));
    } catch (err) {
      console.error('Error updating sale:', err);
      alert(err.response?.data?.error || t('sales.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (saleId) => {
    try {
      await salesAPI.delete(saleId);
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).salesList() });
      setDeleteConfirm(null);
      alert(t('sales.deleteSuccess'));
    } catch (err) {
      alert(err.response?.data?.error || t('sales.deleteFailed'));
    }
  };

  const handlePrintInvoice = (sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print invoice');
      return;
    }

    const saleData = selectedSale || sale;
    const items = saleData.items || [];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${saleData.invoice_number}</title>
          <style>
            @media print {
              @page { margin: 10mm; size: 80mm auto; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .shop-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .invoice-info {
              margin: 10px 0;
              font-size: 11px;
            }
            .invoice-info div {
              margin: 3px 0;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 11px;
            }
            .items-table th {
              text-align: left;
              border-bottom: 1px solid #000;
              padding: 5px 0;
              font-weight: bold;
            }
            .items-table td {
              padding: 4px 0;
              border-bottom: 1px dotted #ccc;
            }
            .items-table .qty { text-align: center; width: 15%; }
            .items-table .rate { text-align: right; width: 25%; }
            .items-table .total { text-align: right; width: 25%; }
            .totals {
              margin-top: 10px;
              border-top: 2px dashed #000;
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .grand-total {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .due-amount {
              color: #d32f2f;
              font-weight: bold;
              font-size: 13px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">My Shop</div>
          </div>
          
          <div class="invoice-info">
            <div><strong>Invoice:</strong> ${saleData.invoice_number}</div>
            <div><strong>Date:</strong> ${formatDate(saleData.date)}</div>
            <div><strong>Customer:</strong> ${saleData.customer_name || 'Cash Customer'}</div>
            ${saleData.payment_mode ? `<div><strong>Payment Mode:</strong> ${saleData.payment_mode}</div>` : ''}
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="rate">Rate</th>
                <th class="total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((item, idx) => {
                  const itemName = item.product_name || item.name || `Item ${idx + 1}`;
                  const qty = item.quantity || 0;
                  const rate = item.selling_price || 0;
                  const total = qty * rate;
                  return `
                  <tr>
                    <td>${itemName}</td>
                    <td class="qty">${qty}</td>
                    <td class="rate">${formatCurrency(rate)}</td>
                    <td class="total">${formatCurrency(total)}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
          
          <div class="totals">
            ${saleData.discount > 0 ? `<div class="total-row"><span>Subtotal:</span><span>${formatCurrency((saleData.total_amount || 0) + (saleData.discount || 0))}</span></div>` : ''}
            ${saleData.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-${formatCurrency(saleData.discount)}</span></div>` : ''}
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>${formatCurrency(saleData.total_amount)}</span>
            </div>
            <div class="total-row">
              <span>Paid Amount:</span>
              <span>${formatCurrency(saleData.paid_amount)}</span>
            </div>
            ${saleData.total_amount - saleData.paid_amount > 0 ? `<div class="total-row due-amount"><span>Remaining Due:</span><span>${formatCurrency(saleData.total_amount - saleData.paid_amount)}</span></div>` : ''}
          </div>
          
          <div class="footer">
            <div>Thank you for your business!</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const paymentMethodIcon = (mode) => {
    const m = String(mode || 'cash').toLowerCase();
    if (m === 'credit') return faCreditCard;
    if (m === 'split') return faMoneyBillWave;
    return faWallet;
  };

  const statusLabel = (key) => {
    if (key === 'paid') return t('sales.statusPaidLabel');
    if (key === 'credit') return t('sales.statusCreditLabel');
    return t('sales.statusPartialLabel');
  };

  const fromRow = filteredSales.length === 0 ? 0 : startIndex + 1;
  const toRow = startIndex + paginatedSales.length;

  if (loading) {
    return (
      <div className="content-container sales-page">
        <PageLoadingCenter message={`${t('common.loading')}…`} />
      </div>
    );
  }

  const portal = (node) => createPortal(node, document.body);

  return (
    <div className="content-container sales-page sal2">
      <style>{salesWorkspaceStyles}</style>

      {error ? <div className="sal2-err">{error}</div> : null}

      <div className="sal2-kpis">
        <div className="sal2-kpi sal2-kpi--blue">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faCalendarDay} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--today">{t('sales.pillToday')}</span>
          </div>
          <div className="sal2-kpi-val">{formatCurrency(metrics.todayRev)}</div>
          <div className="sal2-kpi-lbl">{t('sales.kpiTodayRevenue')}</div>
          <div className="sal2-kpi-sub">{t('sales.kpiInvoicesToday', { count: metrics.todayInv })}</div>
        </div>
        <div className="sal2-kpi sal2-kpi--green">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faSackDollar} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--total">{t('sales.pillTotal')}</span>
          </div>
          <div className="sal2-kpi-val">{formatCurrency(metrics.totalRev)}</div>
          <div className="sal2-kpi-lbl">{t('sales.kpiTotalRevenue')}</div>
          <div className="sal2-kpi-sub">{t('sales.kpiInvoicesOverall', { count: metrics.totalInv })}</div>
        </div>
        <div className="sal2-kpi sal2-kpi--orange">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faHourglassHalf} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--pending">{t('sales.pillPending')}</span>
          </div>
          <div className="sal2-kpi-val">{formatCurrency(metrics.outstanding)}</div>
          <div className="sal2-kpi-lbl">{t('sales.kpiOutstandingDue')}</div>
          <div className="sal2-kpi-sub">{t('sales.kpiUnpaidPartialBills', { count: metrics.unpaidPartial })}</div>
        </div>
        <div className="sal2-kpi sal2-kpi--purple">
          <div className="sal2-kpi-top">
            <span className="sal2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faFileInvoice} />
            </span>
            <span className="sal2-kpi-pill sal2-kpi-pill--sales">{t('sales.pillSales')}</span>
          </div>
          <div className="sal2-kpi-val">{metrics.totalInv}</div>
          <div className="sal2-kpi-lbl">{t('sales.kpiTotalInvoicesLabel')}</div>
          <div className="sal2-kpi-sub">
            {t('sales.kpiInvoiceMix', { credit: metrics.creditN, partial: metrics.partialN, paid: metrics.paidN })}
          </div>
        </div>
      </div>

      <header className="sal2-hd">
        <div>
          <h1 className="sal2-hd-tit">{t('sales.historyTitle')}</h1>
          <p className="sal2-hd-sub">{t('sales.historySubtitle')}</p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="sal2-new"
            onClick={() => navigate(withCurrentScope(location.pathname, '/billing'))}
          >
            + {t('sales.newBill')}
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
              placeholder={t('sales.searchToolbarPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <select className="sal2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t('sales.status')}>
            <option value="all">{t('sales.allStatuses')}</option>
            <option value="paid">{t('sales.statusPaidLabel')}</option>
            <option value="credit">{t('sales.statusCreditLabel')}</option>
            <option value="partial">{t('sales.statusPartialLabel')}</option>
          </select>
          <select className="sal2-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} aria-label={t('sales.method')}>
            <option value="all">{t('sales.allMethods')}</option>
            <option value="cash">{t('sales.cash')}</option>
            <option value="credit">{t('sales.credit')}</option>
            <option value="split">{t('sales.split')}</option>
          </select>
          <input type="date" className="sal2-date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} aria-label={t('sales.date')} />
          <button type="button" className="sal2-export" onClick={handleExportCsv}>
            <FontAwesomeIcon icon={faDownload} />
            {t('sales.exportCsv')}
          </button>
        </div>
      </div>

      <section className="sal2-shell" aria-label={t('sales.invoicesTitle')}>
        <div className="sal2-shell-hd">
          <h2 className="sal2-shell-tit">{t('sales.invoicesTitle')}</h2>
          <span className="sal2-shell-meta">{t('sales.showingInvoicesRange', { from: fromRow, to: toRow, total: filteredSales.length })}</span>
        </div>

        <div className="sal2-table-wrap">
          <table className="sal2-table">
            <thead>
              <tr>
                <th>{t('sales.invoice')}</th>
                <th>{t('sales.customer')}</th>
                <th>{t('sales.items')}</th>
                <th>{t('sales.totalAmount')}</th>
                <th>{t('sales.paidAmount')}</th>
                <th>{t('sales.method')}</th>
                <th>{t('sales.status')}</th>
                <th>{t('sales.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="sal2-empty">
                    {searchQuery || statusFilter !== 'all' || methodFilter !== 'all' || dateFilter ? t('sales.noSalesFound') : t('sales.noSales')}
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => {
                  const pm = sale.payment_mode || sale.payment_type || 'cash';
                  return (
                    <tr key={sale.sale_id}>
                      <td>
                        <button type="button" className="sal2-inv-btn" onClick={() => handleViewSale(sale.sale_id)}>
                          {sale.invoice_number}
                        </button>
                        <div className="sal2-inv-sub">{formatInvoiceSubline(sale.date)}</div>
                      </td>
                      <td>
                        <div className="sal2-cust">
                          <span className="sal2-av" aria-hidden>
                            {initialsFromName(sale.customer_name || t('sales.cashCustomer'))}
                          </span>
                          <div>
                            <span className="sal2-cust-name">{sale.customer_name || t('sales.cashCustomer')}</span>
                            <div className="sal2-cust-sub">{sale.customer_id ? t('sales.accountCustomer') : t('sales.walkInCustomer')}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sal2-items-badge">
                          {sale._itemCount != null ? t('sales.itemsCount', { count: sale._itemCount }) : '—'}
                        </span>
                        {sale._itemsPreview ? <div className="sal2-items-preview">{sale._itemsPreview}</div> : null}
                      </td>
                      <td className="sal2-amt">{formatCurrency(sale.total_amount)}</td>
                      <td>
                        <div className="sal2-paid-amt">{formatCurrency(sale.paid_amount)}</div>
                        {sale._due > EPS ? (
                          <div className="sal2-due-hint">{t('sales.dueLine', { amount: formatCurrency(sale._due) })}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className="sal2-method">
                          <FontAwesomeIcon icon={paymentMethodIcon(pm)} />
                          {pm}
                        </span>
                      </td>
                      <td>
                        <span className={`sal2-st sal2-st--${sale._statusKey === 'paid' ? 'paid' : sale._statusKey === 'credit' ? 'credit' : 'partial'}`}>
                          {statusLabel(sale._statusKey)}
                        </span>
                      </td>
                      <td>
                        <div className="sal2-actions">
                          <button type="button" className="sal2-iconbtn" title={t('common.viewDetails')} onClick={() => handleViewSale(sale.sale_id)}>
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button type="button" className="sal2-iconbtn" title={t('sales.printInvoice')} onClick={() => handlePrintInvoice(sale)}>
                            <FontAwesomeIcon icon={faPrint} />
                          </button>
                          {isAdmin() && !readOnly ? (
                            <>
                              <button type="button" className="sal2-iconbtn" title={t('common.edit')} onClick={() => handleEdit(sale.sale_id)} disabled={sale.is_finalized}>
                                <FontAwesomeIcon icon={faPenToSquare} />
                              </button>
                              <button type="button" className="sal2-iconbtn sal2-iconbtn--del" title={t('common.delete')} onClick={() => setDeleteConfirm(sale.sale_id)} disabled={sale.is_finalized}>
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredSales.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredSales.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        ) : null}
      </section>

      {selectedSale
        ? portal(
            <div className="sal2-modal-overlay" onClick={() => setSelectedSale(null)}>
              <div className="sal2-modal modal sales-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>
                    {t('sales.saleDetails')} - {selectedSale.invoice_number}
                  </h2>
                  <button type="button" className="modal-close" onClick={() => setSelectedSale(null)}>
                    ×
                  </button>
                </div>
                <div className="modal-content">
                  <div className="sales-detail-info">
                    <div>
                      <strong>{t('sales.date')}:</strong> {formatDate(selectedSale.date)}
                    </div>
                    <div>
                      <strong>{t('sales.customer')}:</strong> {selectedSale.customer_name || t('sales.cashCustomer')}
                    </div>
                    <div>
                      <strong>{t('sales.paymentMode')}:</strong> {selectedSale.payment_mode || 'cash'}
                    </div>
                  </div>

                  <table className="sales-items-table">
                    <thead>
                      <tr>
                        <th>{t('sales.productName')}</th>
                        <th>{t('sales.quantity')}</th>
                        <th>{t('sales.price')}</th>
                        <th>{t('sales.total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSale.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.product_name || item.name || 'N/A'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.selling_price)}</td>
                          <td>{formatCurrency(item.quantity * item.selling_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="sales-totals">
                    {selectedSale.discount > 0 && (
                      <div className="sales-total-row">
                        <span>{t('sales.subtotal')}:</span>
                        <span>{formatCurrency((selectedSale.total_amount || 0) + (selectedSale.discount || 0))}</span>
                      </div>
                    )}
                    {selectedSale.discount > 0 && (
                      <div className="sales-total-row">
                        <span>{t('sales.discount')}:</span>
                        <span>-{formatCurrency(selectedSale.discount)}</span>
                      </div>
                    )}
                    <div className="sales-total-row sales-grand-total">
                      <span>{t('sales.grandTotal')}:</span>
                      <span>{formatCurrency(selectedSale.total_amount)}</span>
                    </div>
                    <div className="sales-total-row">
                      <span>{t('sales.paidAmount')}:</span>
                      <span>{formatCurrency(selectedSale.paid_amount)}</span>
                    </div>
                    {selectedSale.total_amount - selectedSale.paid_amount > 0 && (
                      <div className="sales-total-row sales-due">
                        <span>{t('sales.remainingDue')}:</span>
                        <span>{formatCurrency(selectedSale.total_amount - selectedSale.paid_amount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn btn-primary" onClick={() => handlePrintInvoice(selectedSale)}>
                      {t('sales.printInvoice')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedSale(null)}>
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        : null}

      {editingSale
        ? portal(
            <div className="sal2-modal-overlay" onClick={() => setEditingSale(null)}>
              <div className="sal2-modal modal sales-edit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>
                    {t('sales.editSale')} - {editingSale.invoice_number}
                  </h2>
                  <button type="button" className="modal-close" onClick={() => setEditingSale(null)}>
                    ×
                  </button>
                </div>
                <div className="modal-content">
                  {editingSale.is_finalized ? (
                    <div className="error-message">{t('sales.cannotEditFinalized')}</div>
                  ) : (
                    <>
                      <div className="zb-form-grid zb-form-grid--2">
                        <div className="form-group zb-form-grid__full">
                          <label className="form-label">{t('sales.paymentMode')}</label>
                          <select
                            className="form-input"
                            value={editFormData.payment_type}
                            onChange={(e) => {
                              const newPaymentType = e.target.value;
                              setEditFormData({
                                ...editFormData,
                                payment_type: newPaymentType,
                                paid_amount:
                                  newPaymentType === 'cash'
                                    ? editingSale.total_amount
                                    : newPaymentType === 'credit'
                                      ? 0
                                      : editFormData.paid_amount,
                              });
                            }}
                          >
                            <option value="cash">{t('sales.cash')}</option>
                            <option value="credit">{t('sales.credit')}</option>
                            <option value="split">{t('sales.split')}</option>
                          </select>
                        </div>

                        {editFormData.payment_type === 'split' && (
                          <div className="form-group zb-form-grid__full">
                            <label className="form-label">{t('sales.paidAmount')}</label>
                            <input
                              type="number"
                              className="form-input"
                              value={editFormData.paid_amount}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  paid_amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              min="0"
                              max={editingSale.total_amount}
                              step="0.01"
                            />
                          </div>
                        )}

                        <div className="form-group">
                          <label className="form-label">{t('sales.discount')}</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editFormData.discount}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                discount: parseFloat(e.target.value) || 0,
                              })
                            }
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">{t('sales.tax')}</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editFormData.tax}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                tax: parseFloat(e.target.value) || 0,
                              })
                            }
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div
                        className="sales-totals"
                        style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}
                      >
                        <div className="sales-total-row">
                          <span>{t('sales.subtotal')}:</span>
                          <span>{formatCurrency((editingSale.subtotal || editingSale.total_amount) + (editFormData.discount || 0))}</span>
                        </div>
                        {editFormData.discount > 0 && (
                          <div className="sales-total-row">
                            <span>{t('sales.discount')}:</span>
                            <span>-{formatCurrency(editFormData.discount)}</span>
                          </div>
                        )}
                        {editFormData.tax > 0 && (
                          <div className="sales-total-row">
                            <span>{t('sales.tax')}:</span>
                            <span>+{formatCurrency(editFormData.tax)}</span>
                          </div>
                        )}
                        <div className="sales-total-row sales-grand-total">
                          <span>{t('sales.grandTotal')}:</span>
                          <span>{formatCurrency((editingSale.subtotal || editingSale.total_amount) - editFormData.discount + editFormData.tax)}</span>
                        </div>
                      </div>

                      <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                          {saving ? t('common.saving') : t('common.save')}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingSale(null)} disabled={saving}>
                          {t('common.cancel')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        : null}

      {deleteConfirm
        ? portal(
            <div className="sal2-modal-overlay" onClick={() => setDeleteConfirm(null)}>
              <div className="sal2-modal modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('sales.confirmDelete')}</h2>
                  <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)}>
                    ×
                  </button>
                </div>
                <div className="modal-content">
                  <p>{t('sales.deleteWarning')}</p>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                      {t('common.delete')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        : null}
    </div>
  );
};

export default Sales;
