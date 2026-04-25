import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { customersAPI, customerPaymentsAPI, salesAPI } from '../services/api';
import './CustomerDetailView.css';

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

  return (
    <div className="content-container cdv2">
      <header className="cdv2-hero">
        <div className="cdv2-hero-accent" aria-hidden />
        <div className="cdv2-hero-inner">
          <div>
            <span className="cdv2-eyebrow">{t('menu.customers')}</span>
            <h1 className="cdv2-title">{t('customers.customerDetails')}</h1>
            <p className="cdv2-subtitle">{t('customers.customerDetailsSubtitle')}</p>
          </div>
          <button className="cdv2-btn cdv2-btn--ghost" onClick={onClose}>? {t('customers.backToCustomers')}</button>
        </div>
      </header>

      {error ? <div className="cdv2-alert">{error}</div> : null}

      {customer ? (
        <section className={`cdv2-balance ${currentRemainingDue > 0 ? 'cdv2-balance--due' : 'cdv2-balance--clear'}`}>
          <div className="cdv2-balance-main">
            <span className="cdv2-balance-label">{t('customers.currentRemainingDue')}</span>
            <strong className="cdv2-balance-amount">{formatCurrency(currentRemainingDue)}</strong>
          </div>
          <div className="cdv2-balance-actions">
            {!readOnly ? (
              <button
                type="button"
                className="cdv2-btn cdv2-btn--primary"
                onClick={() => {
                  setEditingPayment(null);
                  setPaymentModalOpen(true);
                }}
              >
                + {t('customers.receivePayment')}
              </button>
            ) : null}
            <span className="cdv2-status-pill">
              {currentRemainingDue > 0 ? t('customers.amountDue') : currentRemainingDue === 0 ? t('customers.allPaid') : t('customers.advancePaid')}
            </span>
          </div>
        </section>
      ) : null}

      <section className="cdv2-panel">
        <div className="cdv2-panel-head">
          <h2>{t('customers.customerInformation')}</h2>
        </div>
        <div className="cdv2-info-grid">
          <div className="cdv2-info-item">
            <span>{t('customers.customerName')}</span>
            <strong>{customer?.name || 'N/A'}</strong>
          </div>
          <div className="cdv2-info-item">
            <span>{t('customers.mobileNumber')}</span>
            <strong>{customer?.phone || '-'}</strong>
          </div>
          <div className="cdv2-info-item">
            <span>{t('customers.address')}</span>
            <strong>{customer?.address || '-'}</strong>
          </div>
          <div className="cdv2-info-item">
            <span>{t('customers.customerType')}</span>
            <strong className="cdv2-capitalize">{customer?.customer_type || 'cash'}</strong>
          </div>
          <div className="cdv2-info-item">
            <span>{t('customers.openingBalance')}</span>
            <strong>{formatCurrency(previousDue)}</strong>
          </div>
          {customer?.credit_limit ? (
            <div className="cdv2-info-item">
              <span>{t('customers.creditLimit')}</span>
              <strong>{formatCurrency(customer.credit_limit)}</strong>
            </div>
          ) : null}
        </div>
        <p className="cdv2-hint">{t('customers.openingBalanceHint')}</p>
      </section>

      {customer ? (
        <section className="cdv2-panel cdv2-panel--history">
          <div className="cdv2-panel-head">
            <h2>{t('customers.purchaseHistory')}</h2>
          </div>
          <p className="cdv2-hint">{t('customers.purchaseHistoryHint')}</p>

          {loadingSalesHistory ? (
            <div className="cdv2-loading-row">{t('common.loading')}...</div>
          ) : purchaseAndPaymentRows.length === 0 ? (
            <div className="cdv2-empty">{t('customers.noSalesRecords')}</div>
          ) : (
            <div className="cdv2-table-wrap">
              <table className="cdv2-table">
                <colgroup>
                  <col className="cdv2-col-main" />
                  <col className="cdv2-col-date" />
                  <col className="cdv2-col-money" />
                  <col className="cdv2-col-money" />
                  <col className="cdv2-col-money" />
                  <col className="cdv2-col-money" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t('customers.invoiceOrPayment')}</th>
                    <th>{t('common.date')}</th>
                    <th className="cdv2-num">{t('customers.totalAmount')}</th>
                    <th className="cdv2-num">{t('customers.paidAmount')}</th>
                    <th className="cdv2-num">{t('customers.udharOnBill')}</th>
                    <th className="cdv2-num">{t('customers.paymentReceivedColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseAndPaymentRows.map((row) => {
                    if (row.kind === 'sale') {
                      const sale = row.sale;
                      const total = parseFloat(sale.total_amount) || 0;
                      const paid = parseFloat(sale.paid_amount) || 0;
                      const udhar = Math.max(0, total - paid);
                      return (
                        <tr key={row.id}>
                          <td><strong>{sale.invoice_number || '-'}</strong></td>
                          <td>{formatDateShort(sale.date)}</td>
                          <td className="cdv2-num">{formatCurrency(total)}</td>
                          <td className="cdv2-num">{formatCurrency(paid)}</td>
                          <td className={`cdv2-num ${udhar > 0 ? 'cdv2-num--due' : 'cdv2-num--ok'}`}>{formatCurrency(udhar)}</td>
                          <td className="cdv2-num cdv2-muted">-</td>
                        </tr>
                      );
                    }

                    const p = row.payment;
                    const amt = parseFloat(p.amount) || 0;
                    const note = (p.notes && String(p.notes).trim()) || '';
                    return (
                      <tr key={row.id} className="cdv2-row-payment">
                        <td>
                          <span className="cdv2-payment-tag">{t('customers.rowPaymentReceived')}</span>
                          {p.payment_method ? <span className="cdv2-payment-method">({p.payment_method})</span> : null}
                          {note ? <div className="cdv2-note">{note}</div> : null}
                        </td>
                        <td>{formatDateShort(p.payment_date)}</td>
                        <td className="cdv2-num cdv2-muted">-</td>
                        <td className="cdv2-num cdv2-muted">-</td>
                        <td className="cdv2-num cdv2-muted">-</td>
                        <td className="cdv2-num cdv2-num--ok">{formatCurrency(amt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cdv2-modal" onClick={(e) => e.stopPropagation()}>
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
          <div className="form-row">
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
            <div className="form-group">
              <label className="form-label">{t('common.date')}</label>
              <input
                type="date"
                className="form-input"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('expenses.notes')} ({t('common.optional')})</label>
            <textarea
              className="form-input"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('customers.paymentNotesPlaceholder')}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="cdv2-btn cdv2-btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="cdv2-btn cdv2-btn--primary" disabled={saving}>
              {saving ? t('common.loading') : payment ? t('customers.updatePayment') : t('customers.savePayment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerDetailView;
