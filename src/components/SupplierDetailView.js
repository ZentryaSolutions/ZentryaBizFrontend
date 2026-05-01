import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBook,
  faChartLine,
  faCircle,
  faDollarSign,
  faLocationDot,
  faPhone,
  faReceipt,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { suppliersAPI, supplierPaymentsAPI, purchasesAPI, productsAPI } from '../services/api';
import Pagination from './Pagination';
import './SupplierDetailView.css';
import './Purchases.css';

const SupplierDetailView = ({ supplierId, onClose, readOnly = false }) => {
  const { t } = useTranslation();
  const [supplier, setSupplier] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [payments, setPayments] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ledger');
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deletePaymentConfirm, setDeletePaymentConfirm] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deletePurchaseConfirm, setDeletePurchaseConfirm] = useState(null);
  const [newPurchaseModalOpen, setNewPurchaseModalOpen] = useState(false);
  const hasOpenModal =
    paymentModalOpen ||
    newPurchaseModalOpen ||
    Boolean(editingPurchase) ||
    Boolean(viewingPurchase) ||
    Boolean(deletePaymentConfirm) ||
    Boolean(deletePurchaseConfirm);

  useEffect(() => {
    fetchSupplierDetails();
    fetchLedger();
    fetchPayments();
    fetchPurchases();
    fetchProducts();
  }, [supplierId]);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'purchases') {
      fetchPurchases();
    }
  }, [activeTab, supplierId]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (hasOpenModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previous || '';
    }
    return () => {
      document.body.style.overflow = previous || '';
    };
  }, [hasOpenModal]);

  const fetchSupplierDetails = async () => {
    try {
      const response = await suppliersAPI.getById(supplierId);
      setSupplier(response.data);
    } catch (err) {
      console.error('Error fetching supplier details:', err);
      setError(err.response?.data?.error || t('suppliers.failedToLoadDetails'));
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const response = await suppliersAPI.getLedger(supplierId);
      setLedger(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching supplier ledger:', err);
      setError(err.response?.data?.error || t('suppliers.failedToLoadLedger'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const response = await supplierPaymentsAPI.getAll({ supplier_id: supplierId });
      setPayments(response.data || []);
    } catch (err) {
      console.error('Error fetching supplier payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoadingPurchases(true);
      const response = await purchasesAPI.getAll();
      const filteredPurchases = (response.data || []).filter(p => p.supplier_id === supplierId);
      setPurchases(filteredPurchases);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handlePurchaseDelete = async (purchaseId) => {
    try {
      await purchasesAPI.delete(purchaseId);
      await fetchPurchases();
      await fetchSupplierDetails();
      await fetchLedger();
      setDeletePurchaseConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || t('purchases.purchaseFailed'));
    }
  };

  const handlePurchaseSave = async () => {
    await fetchPurchases();
    await fetchProducts();
    await fetchSupplierDetails();
    await fetchLedger();
    setEditingPurchase(null);
    setViewingPurchase(null);
  };

  const handlePaymentSave = async () => {
    await fetchPayments();
    await fetchSupplierDetails();
    await fetchLedger();
    setPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const handlePaymentDelete = async (paymentId) => {
    try {
      await supplierPaymentsAPI.delete(paymentId);
      await fetchPayments();
      await fetchSupplierDetails();
      await fetchLedger();
      setDeletePaymentConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || t('suppliers.failedToDeletePayment'));
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const sortByLatestDate = (items, getDate) =>
    [...(items || [])].sort((a, b) => {
      const da = new Date(getDate(a) || 0).getTime();
      const db = new Date(getDate(b) || 0).getTime();
      return db - da;
    });

  // Pagination for ledger transactions (latest first)
  const ledgerTransactions = sortByLatestDate(ledger?.transactions || [], (x) => x?.transaction_date);
  const ledgerTotalPages = Math.ceil(ledgerTransactions.length / itemsPerPage);
  const ledgerStartIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = ledgerTransactions.slice(ledgerStartIndex, ledgerStartIndex + itemsPerPage);

  // Pagination for payments (latest first)
  const sortedPayments = sortByLatestDate(payments, (x) => x?.payment_date || x?.created_at);
  const paymentsTotalPages = Math.ceil(sortedPayments.length / itemsPerPage);
  const paymentsStartIndex = (paymentsPage - 1) * itemsPerPage;
  const paginatedPayments = sortedPayments.slice(paymentsStartIndex, paymentsStartIndex + itemsPerPage);

  // Pagination for purchases (latest first)
  const sortedPurchases = sortByLatestDate(purchases, (x) => x?.date || x?.created_at);
  const purchasesTotalPages = Math.ceil(sortedPurchases.length / itemsPerPage);
  const purchasesStartIndex = (purchasesPage - 1) * itemsPerPage;
  const paginatedPurchases = sortedPurchases.slice(purchasesStartIndex, purchasesStartIndex + itemsPerPage);

  if (loading && !supplier) {
    return (
      <div className="content-container">
        <div className="loading">{t('common.loading')} {t('suppliers.supplierDetails').toLowerCase()}...</div>
      </div>
    );
  }

  if (error && !supplier) {
    return (
      <div className="content-container">
        <div className="error-message">{error}</div>
        <button className="btn btn-secondary" onClick={onClose}>{t('suppliers.backToSuppliers')}</button>
      </div>
    );
  }

  const balance = parseFloat(supplier?.current_payable_balance || 0);
  const creditPurchases = parseFloat(supplier?.total_credit_purchases || 0);
  const totalPaid = parseFloat(supplier?.total_paid || 0);
  const lifetimeValue = parseFloat(supplier?.opening_balance || 0) + creditPurchases;
  const purchaseOrdersCount = purchases.length;
  const paymentCount = payments.length;
  const lastMovementDate =
    supplier?.last_purchase_date || supplier?.last_payment_date || supplier?.created_at || null;
  const isRecentlyActive = (() => {
    if (!lastMovementDate) return false;
    const movementTs = new Date(lastMovementDate).getTime();
    if (Number.isNaN(movementTs)) return false;
    const diffDays = Math.floor((Date.now() - movementTs) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  })();
  const initials = String(supplier?.name || 'SP')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
  const activityItems = [
    ...(sortedPurchases[0]
      ? [
          {
            type: 'purchase',
            title: 'Purchase recorded',
            meta: `${formatCurrency(sortedPurchases[0].total_amount)} · ${formatDateShort(sortedPurchases[0].date)}`,
          },
        ]
      : []),
    ...(sortedPayments[0]
      ? [
          {
            type: 'payment',
            title: 'Payment made',
            meta: `${formatCurrency(sortedPayments[0].amount)} · ${formatDateShort(sortedPayments[0].payment_date)}`,
          },
        ]
      : []),
  ];

  return (
    <div className="content-container sdv">
      <div className="sdv-topbar">
        <button className="sdv-back" onClick={onClose}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <div className="sdv-breadcrumb">
          <span>Suppliers</span>
          <span>›</span>
          <strong>{supplier?.name || 'Supplier'}</strong>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <section className="sdv-hero">
        <div className="sdv-hero-bg" aria-hidden="true" />
        <div className="sdv-hero-row">
          <div className="sdv-hero-id">
            <div className="sdv-avatar">{initials}</div>
            <div>
              <h2>{supplier?.name || 'Supplier'}</h2>
              <div className="sdv-hero-meta">
                <span>
                  <FontAwesomeIcon icon={faPhone} /> {supplier?.contact_number || '-'}
                </span>
                <span>
                  <FontAwesomeIcon icon={faLocationDot} /> {supplier?.address || '-'}
                </span>
                <span className={`sdv-status ${isRecentlyActive ? 'due' : 'settled'}`}>
                  {isRecentlyActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div className="sdv-balance">
            <span>Current Payable</span>
            <strong className={balance > 0 ? 'due' : 'settled'}>{formatCurrency(Math.abs(balance))}</strong>
            <small>Opening + purchases - payments</small>
          </div>
        </div>

        <div className="sdv-hero-divider" />
        <div className="sdv-hero-foot">
          <div className="sdv-kpis">
            <div>
              <strong>{purchaseOrdersCount}</strong>
              <span>Purchase Orders</span>
            </div>
            <div>
              <strong>{formatCurrency(totalPaid)}</strong>
              <span>Total Paid</span>
            </div>
            <div>
              <strong>{formatCurrency(lifetimeValue)}</strong>
              <span>Lifetime Value</span>
            </div>
          </div>
          {!readOnly ? (
            <div className="sdv-hero-actions">
              <button className="sdv-btn light" onClick={() => setPaymentModalOpen(true)}>
                <FontAwesomeIcon icon={faDollarSign} /> Record Payment
              </button>
              <button className="sdv-btn dark" onClick={() => setNewPurchaseModalOpen(true)}>
                <FontAwesomeIcon icon={faReceipt} /> New Purchase
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="sdv-cards">
        <article className="sdv-card">
          <div className="sdv-card-top">
            <span className="icon open">
              <FontAwesomeIcon icon={faTruck} />
            </span>
            <span className="tag">Opening</span>
          </div>
          <strong>{formatCurrency(supplier?.opening_balance || 0)}</strong>
          <p>Opening Balance</p>
        </article>
        <article className="sdv-card">
          <div className="sdv-card-top">
            <span className="icon credit">
              <FontAwesomeIcon icon={faReceipt} />
            </span>
            <span className="tag">Credit</span>
          </div>
          <strong>{formatCurrency(creditPurchases)}</strong>
          <p>Credit Purchases</p>
        </article>
        <article className="sdv-card">
          <div className="sdv-card-top">
            <span className="icon paid">
              <FontAwesomeIcon icon={faDollarSign} />
            </span>
            <span className="tag">Paid</span>
          </div>
          <strong>{formatCurrency(totalPaid)}</strong>
          <p>Total Payments</p>
        </article>
      </section>

      <section className="sdv-grid">
        <div className="sdv-maincard">
          <div className="sdv-tabs">
            <button className={`tab-button ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>
              <FontAwesomeIcon icon={faTruck} /> Purchase History
            </button>
            <button className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
              <FontAwesomeIcon icon={faDollarSign} /> Payments
            </button>
            <button className={`tab-button ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
              <FontAwesomeIcon icon={faBook} /> Ledger
            </button>
          </div>

          <div className="card-content">
            {activeTab === 'purchases' && (
              <div className="table-container">
                <table className="supplier-payments-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPurchases ? (
                      <tr><td colSpan="4">Loading purchases...</td></tr>
                    ) : paginatedPurchases.length === 0 ? (
                      <tr><td colSpan="4">{t('suppliers.noPurchasesFound')}</td></tr>
                    ) : (
                      paginatedPurchases.map((purchase) => (
                        <tr key={purchase.purchase_id}>
                          <td>Purchase #{purchase.purchase_id}</td>
                          <td>{formatDateShort(purchase.date)}</td>
                          <td>{formatCurrency(purchase.total_amount)}</td>
                          <td style={{ textTransform: 'capitalize' }}>{purchase.payment_type || 'cash'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="sdv-tab-footer">
                  <span>{sortedPurchases.length} order{sortedPurchases.length !== 1 ? 's' : ''}</span>
                  {!readOnly ? (
                    <button className="sdv-footer-action" onClick={() => setNewPurchaseModalOpen(true)}>
                      + New Purchase
                    </button>
                  ) : null}
                </div>
                {purchases.length > 0 ? (
                  <Pagination
                    currentPage={purchasesPage}
                    totalPages={purchasesTotalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={purchases.length}
                    onPageChange={setPurchasesPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPage(newItemsPerPage);
                      setPurchasesPage(1);
                    }}
                  />
                ) : null}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="table-container">
                <table className="supplier-payments-table">
                  <thead>
                    <tr>
                      <th>Note</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPayments ? (
                      <tr><td colSpan="4">Loading payments...</td></tr>
                    ) : paginatedPayments.length === 0 ? (
                      <tr><td colSpan="4">{t('suppliers.noPaymentsFound')}</td></tr>
                    ) : (
                      paginatedPayments.map((payment) => (
                        <tr key={payment.payment_id}>
                          <td>{payment.notes || 'Payment to supplier'}</td>
                          <td>{formatDateShort(payment.payment_date)}</td>
                          <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatCurrency(payment.amount)}</td>
                          <td>{payment.payment_method || 'cash'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="sdv-tab-footer">
                  <span>{sortedPayments.length} payment{sortedPayments.length !== 1 ? 's' : ''}</span>
                  {!readOnly ? (
                    <button className="sdv-footer-action" onClick={() => setPaymentModalOpen(true)}>
                      + Record Payment
                    </button>
                  ) : null}
                </div>
                {payments.length > 0 ? (
                  <Pagination
                    currentPage={paymentsPage}
                    totalPages={paymentsTotalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={payments.length}
                    onPageChange={setPaymentsPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPage(newItemsPerPage);
                      setPaymentsPage(1);
                    }}
                  />
                ) : null}
              </div>
            )}

            {activeTab === 'ledger' && (
              <div className="table-container">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5">Loading ledger...</td></tr>
                    ) : paginatedTransactions.length === 0 ? (
                      <tr><td colSpan="5">{t('suppliers.noTransactionsFound')}</td></tr>
                    ) : (
                      paginatedTransactions.map((transaction, index) => {
                        const isPurchase = transaction.transaction_type === 'Purchase';
                        const runningBalance = parseFloat(transaction.running_balance || 0);
                        return (
                          <tr key={`${transaction.transaction_type}-${transaction.transaction_id}-${index}`}>
                            <td>{formatDateShort(transaction.transaction_date)}</td>
                            <td>{isPurchase ? 'Purchase' : 'Payment'}</td>
                            <td>{transaction.description || '-'}</td>
                            <td style={{ textAlign: 'right', color: isPurchase ? '#dc2626' : '#16a34a' }}>
                              {isPurchase ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(runningBalance)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {ledgerTransactions.length > 0 ? (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={ledgerTotalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={ledgerTransactions.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPage(newItemsPerPage);
                      setCurrentPage(1);
                    }}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        <aside className="sdv-side">
          <div className="sdv-side-card">
            <div className="hd">Supplier Info</div>
            <div className="row"><label>Company</label><p>{supplier?.name || '-'}</p></div>
            <div className="row"><label>Phone</label><p>{supplier?.contact_number || '-'}</p></div>
            <div className="row"><label>Email</label><p>{supplier?.email || '-'}</p></div>
            <div className="row"><label>Address</label><p>{supplier?.address || '-'}</p></div>
            <div className="row"><label>Notes</label><p>{supplier?.notes || '-'}</p></div>
          </div>
          <div className="sdv-side-card">
            <div className="hd">Balance Breakdown</div>
            <div className="split"><span>Opening balance</span><strong>{formatCurrency(supplier?.opening_balance || 0)}</strong></div>
            <div className="split"><span>+ Credit purchases</span><strong>{formatCurrency(creditPurchases)}</strong></div>
            <div className="split"><span>- Payments made</span><strong>{formatCurrency(totalPaid)}</strong></div>
            <div className={`total ${balance > 0 ? 'due' : 'settled'}`}>
              <span>{balance > 0 ? 'Amount Owed' : 'Settled'}</span>
              <strong>{formatCurrency(Math.abs(balance))}</strong>
            </div>
          </div>
          <div className="sdv-side-card">
            <div className="hd">Activity</div>
            {activityItems.length === 0 ? (
              <div className="empty-activity">No activity yet</div>
            ) : (
              activityItems.map((item, idx) => (
                <div className="activity" key={`${item.type}-${idx}`}>
                  <span className={`dot ${item.type === 'payment' ? 'pay' : 'purchase'}`}>
                    <FontAwesomeIcon icon={item.type === 'payment' ? faDollarSign : faChartLine} />
                  </span>
                  <div>
                    <p>{item.title}</p>
                    <small>{item.meta}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <SupplierPaymentModal
          payment={editingPayment}
          supplierId={supplierId}
          supplierName={supplier?.name}
          currentBalance={supplier?.current_payable_balance || 0}
          onClose={() => {
            setPaymentModalOpen(false);
            setEditingPayment(null);
          }}
          onSave={handlePaymentSave}
        />
      )}

      {/* Delete Payment Confirmation */}
      {deletePaymentConfirm && (
        <div className="modal-overlay" onClick={() => setDeletePaymentConfirm(null)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('common.confirmDelete')}</h3>
            <p>{t('suppliers.deletePaymentConfirm')}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeletePaymentConfirm(null)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handlePaymentDelete(deletePaymentConfirm)}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Detail View Modal */}
      {viewingPurchase && !editingPurchase && (
        <PurchaseDetailModal
          purchase={viewingPurchase}
          onClose={() => setViewingPurchase(null)}
          onEdit={() => {
            setEditingPurchase(viewingPurchase);
            setViewingPurchase(null);
          }}
          onDelete={(purchaseId) => {
            if (window.confirm(t('suppliers.deletePurchaseConfirm'))) {
              handlePurchaseDelete(purchaseId);
              setViewingPurchase(null);
            }
          }}
          readOnly={readOnly}
        />
      )}

      {/* New Purchase Modal */}
      {newPurchaseModalOpen && (
        <PurchaseEditModal
          purchase={null}
          supplierId={supplierId}
          supplierName={supplier?.name}
          products={products}
          onSave={async () => {
            await handlePurchaseSave();
            setNewPurchaseModalOpen(false);
          }}
          onClose={() => setNewPurchaseModalOpen(false)}
        />
      )}

      {/* Purchase Edit Modal */}
      {editingPurchase && (
        <PurchaseEditModal
          purchase={editingPurchase}
          supplierId={supplierId}
          supplierName={supplier?.name}
          products={products}
          onSave={handlePurchaseSave}
          onClose={() => {
            setEditingPurchase(null);
            setViewingPurchase(null);
          }}
        />
      )}

      {/* Delete Purchase Confirmation */}
      {deletePurchaseConfirm && (
        <div className="modal-overlay" onClick={() => setDeletePurchaseConfirm(null)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('common.confirmDelete')}</h3>
            <p>{t('suppliers.deletePurchaseConfirmFull')}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeletePurchaseConfirm(null)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  handlePurchaseDelete(deletePurchaseConfirm);
                  setDeletePurchaseConfirm(null);
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Purchase Detail Modal Component
const PurchaseDetailModal = ({ purchase, onClose, onEdit, onDelete, readOnly }) => {
  const { t } = useTranslation();
  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (typeof document === 'undefined') return null;

  return createPortal((
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', zIndex: 2001, backgroundColor: '#ffffff' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '20px', backgroundColor: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{t('purchases.purchaseDetails')}</h2>
          <button className="modal-close" onClick={onClose} style={{ fontSize: '24px', color: '#64748b' }}>×</button>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#ffffff' }}>
          {/* Purchase Information Card */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2>{t('purchases.purchaseInformation')}</h2>
            </div>
            <div className="card-content">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', padding: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{t('purchases.purchaseId')}</label>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>#{purchase.purchase_id}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{t('purchases.supplier')}</label>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{purchase.supplier_name || 'N/A'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{t('common.date')}</label>
              <div style={{ fontSize: '16px', color: '#475569' }}>{formatDate(purchase.date)}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{t('purchases.paymentType')}</label>
              <div>
                <span className={`payment-badge ${purchase.payment_type || 'cash'}`} style={{ textTransform: 'capitalize' }}>
                  {purchase.payment_type || 'cash'}
                </span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{t('purchases.totalItems')}</label>
              <div style={{ fontSize: '16px', color: '#475569' }}>{purchase.items?.length || 0} {t('purchases.items')}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>{t('purchases.totalAmount')}</label>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{formatCurrency(purchase.total_amount)}</div>
            </div>
              </div>
            </div>
          </div>

          {/* Items Table Card */}
          <div className="card">
            <div className="card-header">
              <h2>{t('purchases.purchaseItems')}</h2>
            </div>
            <div className="table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>{t('inventory.productName')}</th>
                    <th>{t('billing.qty')}</th>
                    <th>{t('purchases.costPrice')}</th>
                    <th style={{ textAlign: 'right' }}>{t('billing.subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items && purchase.items.length > 0 ? (
                    purchase.items.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.item_name || 'N/A'}</strong></td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.cost_price)}</td>
                        <td style={{ textAlign: 'right' }}><strong>{formatCurrency(item.subtotal || (item.quantity * item.cost_price))}</strong></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-state">{t('purchases.noItemsFound')}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'right', fontWeight: '700', padding: '16px' }}>{t('common.total')}:</td>
                    <td style={{ fontWeight: '700', fontSize: '18px', color: '#059669', padding: '16px', textAlign: 'right' }}>
                      {formatCurrency(purchase.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          {!readOnly && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-primary" onClick={onEdit}>
                {t('purchases.editPurchase')}
              </button>
              <button className="btn btn-danger" onClick={() => onDelete(purchase.purchase_id)}>
                {t('purchases.deletePurchase')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ), document.body);
};

// Purchase Edit Modal Component (simplified version for supplier detail view)
const PurchaseEditModal = ({ purchase, supplierId, supplierName, products, onSave, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    supplier_id: supplierId.toString(),
    payment_type: purchase?.payment_type || 'cash',
    date: purchase?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    items: purchase?.items?.map(item => ({
      item_id: item.item_id || item.product_id,
      quantity: item.quantity,
      cost_price: item.cost_price,
    })) || [],
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddItem = () => {
    if (!selectedProduct || !itemQty || !itemPrice) return;
    const existingIndex = formData.items.findIndex(i => i.item_id === selectedProduct.product_id);
    if (existingIndex >= 0) {
      const updated = [...formData.items];
      updated[existingIndex].quantity += parseInt(itemQty);
      updated[existingIndex].cost_price = parseFloat(itemPrice);
      setFormData({...formData, items: updated});
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          item_id: selectedProduct.product_id,
          quantity: parseInt(itemQty),
          cost_price: parseFloat(itemPrice),
        }]
      });
    }
    setSelectedProduct(null);
    setItemQty('1');
    setItemPrice('');
  };

  const handleRemoveItem = (index) => {
    setFormData({...formData, items: formData.items.filter((_, i) => i !== index)});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert(t('purchases.addAtLeastOneItem'));
      return;
    }
    setSaving(true);
    try {
      await purchasesAPI.update(purchase.purchase_id, formData);
      await onSave();
    } catch (err) {
      alert(err.response?.data?.error || t('purchases.failedToUpdatePurchase'));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

  if (typeof document === 'undefined') return null;

  return createPortal((
    <div className="modal-overlay sdv-modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal purchase-modal sdv-form-modal sdv-form-modal--purchase" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', zIndex: 2001 }}>
        <div className="modal-header sdv-form-header">
          <div>
            <h2>{purchase ? 'Edit Purchase' : 'New Purchase'}</h2>
            <p className="sdv-form-subtitle">Credit purchase from {supplierName || 'supplier'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-content sdv-form-body">
          <div className="zb-form-grid zb-form-grid--2">
            <div className="form-group">
              <label className="form-label">{t('purchases.paymentType')}</label>
              <select className="form-input" value={formData.payment_type} onChange={(e) => setFormData({...formData, payment_type: e.target.value})}>
                <option value="cash">{t('billing.cash')}</option>
                <option value="credit">{t('billing.credit')}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('common.date')}</label>
              <input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
          </div>

          <div className="purchase-items-section">
            <h3>Items</h3>
            <div className="zb-form-grid zb-form-grid--2">
              <div className="form-group zb-form-grid__full">
                <label className="form-label">Product</label>
                <select className="form-input" value={selectedProduct?.product_id || ''} onChange={(e) => {
                  const product = products.find(p => p.product_id === parseInt(e.target.value));
                  setSelectedProduct(product || null);
                  setItemPrice(product?.purchase_price || '');
                }}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>
                    {p.item_name_english || p.name || 'Product'} (Stock: {p.quantity_in_stock || 0})
                  </option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input 
                  type="number" 
                  className="form-input purchase-input" 
                  min="1" 
                  value={itemQty} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!isNaN(val) && parseFloat(val) >= 0)) {
                      setItemQty(val);
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value || parseFloat(e.target.value) < 1) {
                      setItemQty('1');
                    }
                  }}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input purchase-input" 
                  min="0"
                  value={itemPrice} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!isNaN(val) && parseFloat(val) >= 0)) {
                      setItemPrice(val);
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value || parseFloat(e.target.value) < 0) {
                      setItemPrice('0');
                    }
                  }}
                  placeholder="Enter cost price"
                />
              </div>
              <div className="form-group zb-form-grid__full" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                <button type="button" className="btn btn-primary sdv-form-save" onClick={handleAddItem}>Add</button>
              </div>
            </div>

            {formData.items.length > 0 && (
              <table className="items-table" style={{ marginTop: '12px', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => {
                    const product = products.find(p => p.product_id === item.item_id);
                    const productName = product?.item_name_english || product?.name || 'N/A';
                    return (
                      <tr key={idx}>
                        <td>{productName}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.cost_price)}</td>
                        <td>{formatCurrency(item.quantity * item.cost_price)}</td>
                        <td><button type="button" className="btn-delete" onClick={() => handleRemoveItem(idx)}>Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>Total:</strong></td>
                    <td><strong>{formatCurrency(total)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="modal-actions sdv-form-actions">
            <button type="button" className="btn btn-secondary sdv-form-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary sdv-form-save" disabled={saving}>{saving ? t('common.loading') : purchase ? 'Update Purchase' : 'Save Purchase'}</button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
};

// Payment Modal Component
const SupplierPaymentModal = ({ payment, supplierId, supplierName, currentBalance, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    amount: payment?.amount?.toString() || '',
    payment_method: payment?.payment_method || 'cash',
    payment_date: payment?.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    notes: payment?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const newErrors = {};

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = t('suppliers.amountMustBeGreaterThanZero');
    }

    if (amount > parseFloat(currentBalance || 0)) {
      newErrors.amount = t('suppliers.paymentExceedsBalance', { balance: formatCurrency(currentBalance) });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        supplier_id: supplierId,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        notes: formData.notes.trim() || null,
      };

      if (payment) {
        await supplierPaymentsAPI.update(payment.payment_id, submitData);
      } else {
        await supplierPaymentsAPI.create(submitData);
      }
      await onSave();
    } catch (err) {
      const errorMessage = err.response?.data?.error || t('suppliers.failedToSavePayment', { action: payment ? t('common.update') : t('common.create') });
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  if (typeof document === 'undefined') return null;

  return createPortal((
    <div className="modal-overlay sdv-modal-overlay" onClick={onClose}>
      <div className="modal supplier-payment-modal sdv-form-modal sdv-form-modal--payment" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header sdv-form-header">
          <div>
            <h2>{payment ? 'Edit Payment' : 'Record Payment'}</h2>
            <p className="sdv-form-subtitle">To {supplierName || 'supplier'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-payment-form sdv-form-body">
          <div className="zb-form-grid zb-form-grid--2">
            <div className="form-group">
              <label className="form-label">
                {t('expenses.amount')} (PKR) <span className="required">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className={`form-input ${errors.amount ? 'error' : ''}`}
                placeholder="0.00"
              />
              {errors.amount && <span className="error-message">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">{t('expenses.paymentMethod')}</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="form-input"
              >
                <option value="cash">{t('billing.cash')}</option>
                <option value="card">{t('billing.card')}</option>
                <option value="bank_transfer">{t('billing.bankTransfer')}</option>
                <option value="cheque">{t('billing.cheque')}</option>
                <option value="other">{t('billing.other')}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('common.date')}</label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group zb-form-grid__full">
              <label className="form-label">{t('expenses.notes')} ({t('common.optional')})</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-input"
                placeholder={t('suppliers.paymentNotesPlaceholder')}
                rows="3"
              />
            </div>
          </div>

          <div className="modal-actions sdv-form-actions">
            <button
              type="button"
              className="btn btn-secondary sdv-form-cancel"
              onClick={onClose}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary sdv-form-save"
              disabled={saving}
            >
              {saving ? t('common.loading') : (payment ? t('suppliers.updatePayment') : t('suppliers.recordPayment'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
};

export default SupplierDetailView;
