import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faDollarSign, faLocationDot, faPhone, faReceipt, faBook } from '@fortawesome/free-solid-svg-icons';
import { customersAPI, customerPaymentsAPI, salesAPI } from '../services/api';
import './CustomerDetailView.css';
import './SupplierDetailView.css';

const CustomerDetailView = ({ customerId, onClose, readOnly = false }) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loadingSalesHistory, setLoadingSalesHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState('ledger');
  const [viewSaleModal, setViewSaleModal] = useState(null);
  const [viewPaymentModal, setViewPaymentModal] = useState(null);

  useEffect(() => {
    fetchCustomerDetails();
    fetchSalesHistory();
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customersAPI.getById(customerId);
      setCustomer(response.data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError(err.response?.data?.error || t('customers.failedToLoadDetails'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSave = async () => {
    await fetchCustomerDetails();
    await fetchSalesHistory();
    setPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const fetchSalesHistory = async () => {
    try {
      setLoadingSalesHistory(true);
      const [salesRes, payRes] = await Promise.all([
        salesAPI.getAll({ customer_id: customerId, limit: 500 }),
        customerPaymentsAPI.getAll({ customer_id: customerId }),
      ]);
      setSalesHistory(Array.isArray(salesRes.data) ? salesRes.data : []);
      setPaymentsHistory(Array.isArray(payRes.data) ? payRes.data : []);
    } catch (err) {
      console.error('Error fetching customer sales history:', err);
      setSalesHistory([]);
      setPaymentsHistory([]);
    } finally {
      setLoadingSalesHistory(false);
    }
  };

  const purchaseAndPaymentRows = useMemo(() => {
    const rows = [];
    salesHistory.forEach((sale) => {
      rows.push({
        kind: 'sale',
        id: `s-${sale.sale_id}`,
        ts: new Date(sale.date).getTime(),
        tie: Number(sale.sale_id) || 0,
        sale,
      });
    });
    paymentsHistory.forEach((payment) => {
      rows.push({
        kind: 'payment',
        id: `p-${payment.payment_id}`,
        ts: new Date(payment.payment_date).getTime(),
        tie: Number(payment.payment_id) || 0,
        payment,
      });
    });
    rows.sort((a, b) => {
      if (b.ts !== a.ts) return b.ts - a.ts;
      if (a.kind !== b.kind) return a.kind === 'payment' ? -1 : 1;
      return b.tie - a.tie;
    });
    return rows;
  }, [salesHistory, paymentsHistory]);

  const ledgerRows = useMemo(
    () =>
      [...salesHistory].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || Number(b.sale_id || 0) - Number(a.sale_id || 0)
      ),
    [salesHistory]
  );

  const paymentRows = useMemo(
    () =>
      [...paymentsHistory].sort(
        (a, b) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime() ||
          Number(b.payment_id || 0) - Number(a.payment_id || 0)
      ),
    [paymentsHistory]
  );

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  const formatDateShort = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const previousDue = parseFloat(customer?.opening_balance) || 0;
  const currentRemainingDue = parseFloat(customer?.current_due) || 0;

  if (loading && !customer) {
    return (
      <div className="content-container cdv2">
        <div className="cdv2-loading">
          <span className="cdv2-loading-ring" aria-hidden />
          <p>{t('common.loading')} {t('customers.customerDetails').toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="content-container cdv2">
        <div className="error-message">{error}</div>
        <button className="cdv2-btn cdv2-btn--ghost" onClick={onClose}>{t('customers.backToCustomers')}</button>
      </div>
    );
  }

  const initials = String(customer?.name || 'CU')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
  const lastMovementDate = customer?.last_sale_date || customer?.last_payment_date || customer?.created_at || null;
  const isActive = (() => {
    if (!lastMovementDate) return false;
    const ts = new Date(lastMovementDate).getTime();
    if (Number.isNaN(ts)) return false;
    const diffDays = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  })();

  return (
    <div className="content-container sdv cdv-skin">
      <div className="sdv-topbar">
        <button className="sdv-back" onClick={onClose}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <div className="sdv-breadcrumb">
          <span>Customers</span>
          <span>›</span>
          <strong>{customer?.name || 'Customer'}</strong>
        </div>
      </div>

      {error ? <div className="cdv2-alert">{error}</div> : null}

      <section className="sdv-hero">
        <div className="sdv-hero-bg" aria-hidden="true" />
        <div className="sdv-hero-row">
          <div className="sdv-hero-id">
            <div className="sdv-avatar">{initials}</div>
            <div>
              <h2>{customer?.name || 'Customer'}</h2>
              <div className="sdv-hero-meta">
                <span><FontAwesomeIcon icon={faPhone} /> {customer?.phone || '-'}</span>
                <span><FontAwesomeIcon icon={faLocationDot} /> {customer?.address || '-'}</span>
                <span className={`sdv-status ${isActive ? 'due' : 'settled'}`}>{isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <div className="sdv-balance">
            <span>Current Due</span>
            <strong className={currentRemainingDue > 0 ? 'due' : 'settled'}>{formatCurrency(Math.abs(currentRemainingDue))}</strong>
            <small>Opening + sales - payments</small>
          </div>
        </div>
        <div className="sdv-hero-divider" />
        <div className="sdv-hero-foot">
          <div className="sdv-kpis">
            <div><strong>{salesHistory.length}</strong><span>Total Sales</span></div>
            <div><strong>{paymentsHistory.length}</strong><span>Total Payments</span></div>
            <div><strong>{formatCurrency(previousDue)}</strong><span>Opening Balance</span></div>
          </div>
          {!readOnly ? (
            <div className="sdv-hero-actions">
              <button
                className="sdv-btn light"
                onClick={() => {
                  setEditingPayment(null);
                  setPaymentModalOpen(true);
                }}
              >
                <FontAwesomeIcon icon={faDollarSign} /> Receive Payment
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="sdv-cards">
        <article className="sdv-card">
          <div className="sdv-card-top"><span className="icon open"><FontAwesomeIcon icon={faBook} /></span><span className="tag">Opening</span></div>
          <strong>{formatCurrency(previousDue)}</strong>
          <p>Opening Balance</p>
        </article>
        <article className="sdv-card">
          <div className="sdv-card-top"><span className="icon credit"><FontAwesomeIcon icon={faReceipt} /></span><span className="tag">Due</span></div>
          <strong>{formatCurrency(currentRemainingDue)}</strong>
          <p>Current Due</p>
        </article>
        <article className="sdv-card">
          <div className="sdv-card-top"><span className="icon paid"><FontAwesomeIcon icon={faDollarSign} /></span><span className="tag">Payments</span></div>
          <strong>{formatCurrency(paymentsHistory.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0))}</strong>
          <p>Total Received</p>
        </article>
      </section>

      <section className="sdv-grid">
        <div className="sdv-maincard">
          <div className="card-content">
            {loadingSalesHistory ? (
              <div className="cdv2-loading-row">{t('common.loading')}...</div>
            ) : (
              <div>
                <div className="cdv2-historyTabs">
                  <button
                    type="button"
                    className={`cdv2-historyTab ${historyTab === 'ledger' ? 'is-active' : ''}`}
                    onClick={() => setHistoryTab('ledger')}
                  >
                    Ledger
                  </button>
                  <button
                    type="button"
                    className={`cdv2-historyTab ${historyTab === 'payments' ? 'is-active' : ''}`}
                    onClick={() => setHistoryTab('payments')}
                  >
                    Payments
                  </button>
                </div>

                {historyTab === 'ledger' ? (
                  <div className="cdv2-table-wrap">
                    <table className="cdv2-table">
                      <thead>
                        <tr>
                          <th>{t('customers.invoiceOrPayment')}</th>
                          <th>{t('common.date')}</th>
                          <th className="cdv2-num">{t('customers.totalAmount')}</th>
                          <th className="cdv2-num">{t('customers.paidAmount')}</th>
                          <th className="cdv2-num">{t('customers.udharOnBill')}</th>
                          <th>{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.length === 0 ? (
                          <tr><td colSpan="6" className="cdv2-empty">{t('customers.noSalesRecords')}</td></tr>
                        ) : (
                          ledgerRows.map((sale) => {
                            const total = parseFloat(sale.total_amount) || 0;
                            const paid = parseFloat(sale.paid_amount) || 0;
                            const udhar = Math.max(0, total - paid);
                            const invoiceCode =
                              sale.invoice_number && String(sale.invoice_number).trim()
                                ? sale.invoice_number
                                : `Bill-${String(sale.sale_id || '').padStart(5, '0')}`;
                            return (
                              <tr key={`ledger-${sale.sale_id}`}>
                                <td><strong>{invoiceCode}</strong></td>
                                <td>{formatDateShort(sale.date)}</td>
                                <td className="cdv2-num">{formatCurrency(total)}</td>
                                <td className="cdv2-num">{formatCurrency(paid)}</td>
                                <td className={`cdv2-num ${udhar > 0 ? 'cdv2-num--due' : 'cdv2-num--ok'}`}>{formatCurrency(udhar)}</td>
                                <td>
                                  <div className="cdv2-rowActions">
                                    <button type="button" className="cdv2-rowActionBtn" onClick={() => setViewSaleModal(sale)}>View</button>
                                    {!readOnly ? (
                                      <button
                                        type="button"
                                        className="cdv2-rowActionBtn"
                                        onClick={() => setViewSaleModal(sale)}
                                        title="Invoice edit opens from sales module"
                                      >
                                        Edit
                                      </button>
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
                ) : (
                  <div className="cdv2-table-wrap">
                    <table className="cdv2-table">
                      <thead>
                        <tr>
                          <th>{t('expenses.notes')}</th>
                          <th>{t('common.date')}</th>
                          <th className="cdv2-num">{t('customers.paymentReceivedColumn')}</th>
                          <th>{t('customers.paymentMethod')}</th>
                          <th>{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentRows.length === 0 ? (
                          <tr><td colSpan="5" className="cdv2-empty">{t('customers.noPaymentsFound')}</td></tr>
                        ) : (
                          paymentRows.map((p) => (
                            <tr key={`pay-${p.payment_id}`} className="cdv2-row-payment">
                              <td>
                                <span className="cdv2-payment-tag">{t('customers.rowPaymentReceived')}</span>
                                {p.notes ? <div className="cdv2-note">{p.notes}</div> : null}
                              </td>
                              <td>{formatDateShort(p.payment_date)}</td>
                              <td className="cdv2-num cdv2-num--ok">{formatCurrency(p.amount)}</td>
                              <td>{p.payment_method || 'cash'}</td>
                              <td>
                                <div className="cdv2-rowActions">
                                  <button type="button" className="cdv2-rowActionBtn" onClick={() => setViewPaymentModal(p)}>View</button>
                                  {!readOnly ? (
                                    <button
                                      type="button"
                                      className="cdv2-rowActionBtn"
                                      onClick={() => {
                                        setEditingPayment(p);
                                        setPaymentModalOpen(true);
                                      }}
                                    >
                                      Edit
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div className="sdv-tab-footer">
                      <span>{paymentRows.length} payment{paymentRows.length !== 1 ? 's' : ''}</span>
                      {!readOnly ? (
                        <button
                          className="sdv-footer-action"
                          onClick={() => {
                            setEditingPayment(null);
                            setPaymentModalOpen(true);
                          }}
                        >
                          + Receive Payment
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <aside className="sdv-side">
          <div className="sdv-side-card">
            <div className="hd">Customer Info</div>
            <div className="row"><label>Name</label><p>{customer?.name || '-'}</p></div>
            <div className="row"><label>Phone</label><p>{customer?.phone || '-'}</p></div>
            <div className="row"><label>Address</label><p>{customer?.address || '-'}</p></div>
            <div className="row"><label>Type</label><p>{customer?.customer_type || 'cash'}</p></div>
          </div>
          <div className="sdv-side-card">
            <div className="hd">Balance Breakdown</div>
            <div className="split"><span>Opening balance</span><strong>{formatCurrency(previousDue)}</strong></div>
            <div className="split"><span>Current due</span><strong>{formatCurrency(currentRemainingDue)}</strong></div>
            <div className={`total ${currentRemainingDue > 0 ? 'due' : 'settled'}`}>
              <span>{currentRemainingDue > 0 ? 'Receivable' : 'Cleared'}</span>
              <strong>{formatCurrency(Math.abs(currentRemainingDue))}</strong>
            </div>
          </div>
        </aside>
      </section>

      {paymentModalOpen ? (
        <CustomerPaymentModal
          customerId={customerId}
          customerName={customer?.name}
          payment={editingPayment}
          onSave={handlePaymentSave}
          onClose={() => {
            setPaymentModalOpen(false);
            setEditingPayment(null);
          }}
        />
      ) : null}

      {viewSaleModal ? (
        <div className="modal-overlay" onClick={() => setViewSaleModal(null)}>
          <div className="modal cdv2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <button className="modal-close" onClick={() => setViewSaleModal(null)}>×</button>
            </div>
            <div className="modal-content">
              <p><strong>Invoice:</strong> {viewSaleModal.invoice_number || `Bill-${String(viewSaleModal.sale_id || '').padStart(5, '0')}`}</p>
              <p><strong>Date:</strong> {formatDateShort(viewSaleModal.date)}</p>
              <p><strong>Total:</strong> {formatCurrency(viewSaleModal.total_amount)}</p>
              <p><strong>Paid:</strong> {formatCurrency(viewSaleModal.paid_amount)}</p>
              <p><strong>Udhar:</strong> {formatCurrency(Math.max(0, (parseFloat(viewSaleModal.total_amount) || 0) - (parseFloat(viewSaleModal.paid_amount) || 0)))}</p>
            </div>
          </div>
        </div>
      ) : null}

      {viewPaymentModal ? (
        <div className="modal-overlay" onClick={() => setViewPaymentModal(null)}>
          <div className="modal cdv2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment Details</h2>
              <button className="modal-close" onClick={() => setViewPaymentModal(null)}>×</button>
            </div>
            <div className="modal-content">
              <p><strong>Date:</strong> {formatDateShort(viewPaymentModal.payment_date)}</p>
              <p><strong>Amount:</strong> {formatCurrency(viewPaymentModal.amount)}</p>
              <p><strong>Method:</strong> {viewPaymentModal.payment_method || 'cash'}</p>
              <p><strong>Notes:</strong> {viewPaymentModal.notes || '-'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const CustomerPaymentModal = ({ customerId, customerName, payment, onSave, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    amount: payment?.amount?.toString() || '',
    payment_date: payment?.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    payment_method: payment?.payment_method || 'cash',
    notes: payment?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('customers.amountMustBeGreaterThanZero');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const submitData = {
        customer_id: customerId,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes.trim() || null,
      };

      if (payment) {
        await customerPaymentsAPI.update(payment.payment_id, submitData);
      } else {
        await customerPaymentsAPI.create(submitData);
      }
      await onSave();
    } catch (err) {
      alert(err.response?.data?.error || (payment ? t('customers.failedToUpdatePayment') : t('customers.failedToCreatePayment')));
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay cdv2-modal-overlay" onClick={onClose}>
      <div className="modal cdv2-modal cdv2-modal--centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{payment ? t('customers.editPayment') : t('customers.receivePayment')}</h2>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-content">
          {customerName ? (
            <div className="cdv2-customer-chip">
              <span>{t('customers.customer')}</span>
              <strong>{customerName}</strong>
            </div>
          ) : null}

          <div className="zb-form-grid zb-form-grid--2">
            <div className="form-group">
              <label className="form-label">{t('expenses.amount')} *</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              {errors.amount ? <div className="error-text">{errors.amount}</div> : null}
            </div>
            <div className="form-group">
              <label className="form-label">{t('customers.paymentMethod')}</label>
              <select
                className="form-input"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="cash">{t('billing.cash')}</option>
                <option value="bank">{t('billing.bankTransfer')}</option>
              </select>
            </div>
            <div className="form-group zb-form-grid__full">
              <label className="form-label">{t('common.date')}</label>
              <input
                type="date"
                className="form-input"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group zb-form-grid__full">
              <label className="form-label">{t('expenses.notes')} ({t('common.optional')})</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('customers.paymentNotesPlaceholder')}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="cdv2-btn cdv2-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="cdv2-btn cdv2-btn--primary" disabled={saving}>
              {saving ? t('common.loading') : payment ? t('customers.updatePayment') : t('customers.savePayment')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CustomerDetailView;
