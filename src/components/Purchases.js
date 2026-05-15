import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBagShopping,
  faCircleCheck,
  faClock,
  faDollarSign,
  faEye,
  faMagnifyingGlass,
  faPenToSquare,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { purchasesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchInventoryBundle, fetchPurchasesList } from '../lib/workspaceQueries';
import { purchasesWorkspaceStyles } from '../styles/purchasesWorkspaceStyles';
import PageLoadingCenter from './PageLoadingCenter';
import Pagination from './Pagination';
import PurchaseModal from './PurchaseModal';
import { posApiQueriesEnabled } from '../lib/appMode';
import { getConnectivityErrorMessage, isLikelyConnectivityError } from '../lib/offlineUserMessages';
import { offlineOptsFromResponse } from '../lib/offlineWorkspace';
import './Purchases.css';

function purchaseInThisMonth(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function enrichPurchase(p) {
  const total = Number(p.total_amount) || 0;
  const pt = String(p.payment_type || 'cash').toLowerCase();
  const isCash = pt === 'cash';
  return {
    ...p,
    _paid: isCash ? total : 0,
    _balance: isCash ? 0 : total,
    _status: isCash ? 'paid' : 'pending',
  };
}

function formatOrderRef(id) {
  const n = Number(id);
  const s = Number.isFinite(n) ? String(n) : String(id);
  return `PO-${s.padStart(3, '0')}`;
}

const Purchases = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: purchases = [],
    isLoading: purchasesLoading,
    isError: purchasesErr,
    error: purchasesQueryErr,
  } = useQuery({
    queryKey: zbKeys(activeShopId).purchasesList(),
    queryFn: fetchPurchasesList,
    enabled: posApiQueriesEnabled(activeShopId),
    placeholderData: keepPreviousData,
  });

  const { data: bundle, isLoading: bundleLoading } = useQuery({
    queryKey: zbKeys(activeShopId).inventoryBundle(),
    queryFn: fetchInventoryBundle,
    enabled: posApiQueriesEnabled(activeShopId),
    placeholderData: keepPreviousData,
  });
  const suppliers = bundle?.suppliers ?? [];
  const products = bundle?.products ?? [];

  const loading = purchasesLoading || bundleLoading;

  const errorBanner = useMemo(() => {
    if (!purchasesErr || !purchasesQueryErr) return null;
    if (isLikelyConnectivityError(purchasesQueryErr)) {
      return { text: getConnectivityErrorMessage(purchasesQueryErr), variant: 'offline' };
    }
    return {
      text: purchasesQueryErr.response?.data?.error || t('purchases.failedToLoad'),
      variant: 'error',
    };
  }, [purchasesErr, purchasesQueryErr, t]);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const invalidatePurchasesAndStock = async (opts) => {
    if (opts?.offlineQueued) return;
    await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).purchasesList() });
    await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
  };

  const handleView = async (purchaseId) => {
    try {
      const response = await purchasesAPI.getById(purchaseId);
      setViewingPurchase(response.data);
    } catch (err) {
      alert(t('purchases.failedToLoadDetails'));
    }
  };

  const handleDelete = async (purchaseId) => {
    if (!window.confirm(t('purchases.deleteConfirm'))) return;
    try {
      const res = await purchasesAPI.delete(purchaseId);
      await invalidatePurchasesAndStock(offlineOptsFromResponse(res));
    } catch (err) {
      const connectivity = getConnectivityErrorMessage(err);
      alert(connectivity || err.response?.data?.error || t('purchases.purchaseFailed'));
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  const enriched = useMemo(() => purchases.map(enrichPurchase), [purchases]);

  const metrics = useMemo(() => {
    let ordersThisMonth = 0;
    let totalPurchased = 0;
    let outstanding = 0;
    let totalPaid = 0;
    enriched.forEach((p) => {
      const total = Number(p.total_amount) || 0;
      if (purchaseInThisMonth(p.date)) ordersThisMonth += 1;
      totalPurchased += total;
      totalPaid += p._paid;
      outstanding += p._balance;
    });
    return { ordersThisMonth, totalPurchased, outstanding, totalPaid };
  }, [enriched]);

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return enriched.filter((p) => {
      if (paymentFilter !== 'all' && String(p.payment_type).toLowerCase() !== paymentFilter) return false;
      if (statusFilter !== 'all' && p._status !== statusFilter) return false;
      if (!q) return true;
      const name = (p.supplier_name || '').toLowerCase();
      const idStr = String(p.purchase_id);
      const ref = formatOrderRef(p.purchase_id).toLowerCase();
      if (name.includes(q)) return true;
      if (digits && idStr.includes(digits)) return true;
      if (q && ref.includes(q.replace(/\s/g, ''))) return true;
      return false;
    });
  }, [enriched, searchQuery, paymentFilter, statusFilter]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPurchases = filteredPurchases.slice(startIndex, startIndex + itemsPerPage);

  const tableTotalValue = useMemo(
    () => filteredPurchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0),
    [filteredPurchases]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, paymentFilter, statusFilter]);

  if (loading) {
    return (
      <div className="content-container purchases-page">
        <PageLoadingCenter message={`${t('common.loading')} ${t('purchases.title').toLowerCase()}…`} />
      </div>
    );
  }

  if (viewingPurchase && !editingPurchase) {
    return (
      <PurchaseDetailView
        purchase={viewingPurchase}
        onClose={() => {
          setViewingPurchase(null);
        }}
        onDelete={handleDelete}
        onEdit={() => setEditingPurchase(viewingPurchase)}
        readOnly={readOnly}
      />
    );
  }

  if (editingPurchase) {
    return (
      <PurchaseModal
        suppliers={suppliers}
        products={products}
        purchase={editingPurchase}
        onSave={async (opts) => {
          await invalidatePurchasesAndStock(opts);
          setEditingPurchase(null);
          setViewingPurchase(null);
        }}
        onClose={() => {
          setEditingPurchase(null);
          setViewingPurchase(null);
        }}
      />
    );
  }

  const fromRow = filteredPurchases.length === 0 ? 0 : startIndex + 1;
  const toRow = startIndex + paginatedPurchases.length;

  return (
    <div className="content-container purchases-page pur2">
      <style>{purchasesWorkspaceStyles}</style>

      <header className="pur2-hd">
        <div>
          <h1 className="pur2-title">{t('purchases.title')}</h1>
          <p className="pur2-sub">{t('purchases.subtitle')}</p>
        </div>
        {!readOnly ? (
          <button type="button" className="pur2-new" onClick={() => setModalOpen(true)}>
            + {t('purchases.newPurchase')}
          </button>
        ) : null}
      </header>

      {errorBanner ? (
        <div className={`pur2-err${errorBanner.variant === 'offline' ? ' pur2-err--offline' : ''}`}>
          {errorBanner.text}
        </div>
      ) : null}

      <div className="pur2-kpis">
        <div className="pur2-kpi pur2-kpi--blue">
          <div className="pur2-kpi-h">
            <span className="pur2-kpi-lbl">{t('purchases.totalOrders')}</span>
            <span className="pur2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faBagShopping} />
            </span>
          </div>
          <div className="pur2-kpi-val">{metrics.ordersThisMonth}</div>
          <div className="pur2-kpi-sub">{t('purchases.thisMonth')}</div>
        </div>
        <div className="pur2-kpi pur2-kpi--ink">
          <div className="pur2-kpi-h">
            <span className="pur2-kpi-lbl">{t('purchases.totalPurchased')}</span>
            <span className="pur2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faDollarSign} />
            </span>
          </div>
          <div className="pur2-kpi-val">{formatCurrency(metrics.totalPurchased)}</div>
          <div className="pur2-kpi-sub">{t('purchases.acrossAllOrders')}</div>
        </div>
        <div className="pur2-kpi pur2-kpi--red">
          <div className="pur2-kpi-h">
            <span className="pur2-kpi-lbl">{t('purchases.outstandingPayable')}</span>
            <span className="pur2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faClock} />
            </span>
          </div>
          <div className="pur2-kpi-val">{formatCurrency(metrics.outstanding)}</div>
          <div className="pur2-kpi-sub">{t('purchases.creditNotPaid')}</div>
        </div>
        <div className="pur2-kpi pur2-kpi--green">
          <div className="pur2-kpi-h">
            <span className="pur2-kpi-lbl">{t('purchases.totalPaidLabel')}</span>
            <span className="pur2-kpi-ico" aria-hidden>
              <FontAwesomeIcon icon={faCircleCheck} />
            </span>
          </div>
          <div className="pur2-kpi-val">{formatCurrency(metrics.totalPaid)}</div>
          <div className="pur2-kpi-sub">{t('purchases.clearedPayments')}</div>
        </div>
      </div>

      <section className="pur2-shell" aria-label={t('purchases.purchaseOrders')}>
        <div className="pur2-shell-hd">
          <h2 className="pur2-shell-tit">{t('purchases.purchaseOrders')}</h2>
          <span className="pur2-badge">{t('purchases.ordersBadge', { count: filteredPurchases.length })}</span>
        </div>

        <div className="pur2-toolbar">
          <div className="pur2-search-wrap">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              type="search"
              className="pur2-search"
              placeholder={t('purchases.searchOrders')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <select className="pur2-select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} aria-label={t('purchases.paymentType')}>
            <option value="all">{t('purchases.allPaymentTypes')}</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit</option>
          </select>
          <select className="pur2-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t('purchases.status')}>
            <option value="all">{t('purchases.allStatuses')}</option>
            <option value="paid">{t('purchases.paidStatus')}</option>
            <option value="pending">{t('purchases.pendingStatus')}</option>
          </select>
        </div>

        <div className="pur2-table-wrap">
          <table className="pur2-table">
            <thead>
              <tr>
                <th>{t('purchases.orderId')}</th>
                <th>{t('purchases.supplier')}</th>
                <th>{t('purchases.purchaseDate')}</th>
                <th>{t('purchases.items')}</th>
                <th>{t('purchases.totalAmount')}</th>
                <th>{t('purchases.paid')}</th>
                <th>{t('purchases.balance')}</th>
                <th>{t('purchases.paymentType')}</th>
                <th>{t('purchases.status')}</th>
                <th>{t('purchases.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="pur2-empty">
                    {t('purchases.noPurchases')}
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((purchase) => (
                  <tr key={purchase.purchase_id}>
                    <td>
                      <button type="button" className="pur2-link" onClick={() => handleView(purchase.purchase_id)}>
                        #{formatOrderRef(purchase.purchase_id)}
                      </button>
                    </td>
                    <td className="pur2-sup">{purchase.supplier_name || '—'}</td>
                    <td className="pur2-date">{formatDate(purchase.date)}</td>
                    <td>
                      <span className="pur2-items-badge">{purchase.item_count ?? 0}</span>
                    </td>
                    <td className="pur2-amt">{formatCurrency(purchase.total_amount)}</td>
                    <td className="pur2-paid">{formatCurrency(purchase._paid)}</td>
                    <td className={purchase._balance > 0 ? 'pur2-bal' : 'pur2-bal0'}>{formatCurrency(purchase._balance)}</td>
                    <td>
                      <span className="pur2-pay">{purchase.payment_type}</span>
                    </td>
                    <td>
                      <span className={`pur2-st pur2-st--${purchase._status === 'paid' ? 'paid' : purchase._status === 'partial' ? 'partial' : 'pending'}`}>
                        {purchase._status === 'paid' ? t('purchases.paidStatus') : t('purchases.pendingStatus')}
                      </span>
                    </td>
                    <td>
                      <div className="pur2-actions">
                        <button type="button" className="pur2-iconbtn" title={t('common.view')} onClick={() => handleView(purchase.purchase_id)}>
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        {!readOnly ? (
                          <>
                            <button
                              type="button"
                              className="pur2-iconbtn"
                              title={t('common.edit')}
                              onClick={async () => {
                                try {
                                  const response = await purchasesAPI.getById(purchase.purchase_id);
                                  setEditingPurchase(response.data);
                                } catch (err) {
                                  alert(t('purchases.failedToLoadForEdit'));
                                }
                              }}
                            >
                              <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button type="button" className="pur2-iconbtn pur2-iconbtn--del" title={t('common.delete')} onClick={() => handleDelete(purchase.purchase_id)}>
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pur2-foot">
          <div className="pur2-foot-total">
            {t('purchases.totalValueLabel')} <strong>{formatCurrency(tableTotalValue)}</strong>
          </div>
          <div className="pur2-foot-meta">
            {t('purchases.showingRange', { from: fromRow, to: toRow, total: filteredPurchases.length })}
          </div>
        </div>

        {filteredPurchases.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPurchases.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        ) : null}
      </section>

      {modalOpen ? (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          onSave={async (opts) => {
            await invalidatePurchasesAndStock(opts);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
};

const PurchaseDetailView = ({ purchase, onClose, onDelete, onEdit, readOnly }) => {
  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">Purchase Details</h1>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          ← Back to Purchases
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2>Purchase Information</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', padding: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Purchase ID</label>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>#{purchase.purchase_id}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Supplier</label>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{purchase.supplier_name || 'N/A'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Date</label>
              <div style={{ fontSize: '16px', color: '#475569' }}>{formatDate(purchase.date)}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Payment Type</label>
              <div>
                <span className={`payment-badge ${purchase.payment_type}`} style={{ textTransform: 'capitalize' }}>
                  {purchase.payment_type}
                </span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Total Items</label>
              <div style={{ fontSize: '16px', color: '#475569' }}>{purchase.items?.length || 0} item(s)</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Total Amount</label>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{formatCurrency(purchase.total_amount)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Purchase Items</h2>
        </div>
        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Cost Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items && purchase.items.length > 0 ? (
                purchase.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.item_name || 'N/A'}</strong>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.cost_price)}</td>
                    <td>
                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: '700' }}>
                  Total:
                </td>
                <td style={{ fontWeight: '700', fontSize: '18px', color: '#059669' }}>{formatCurrency(purchase.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            Edit Purchase
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this purchase? This will reverse stock updates.')) {
                onDelete(purchase.purchase_id);
                onClose();
              }
            }}
          >
            Delete Purchase
          </button>
        </div>
      )}
    </div>
  );
};

export default Purchases;
