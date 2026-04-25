import React, { useState, useEffect, useMemo } from 'react';
import { supplierPaymentsAPI, suppliersAPI } from '../services/api';
import Pagination from './Pagination';
import './SupplierPayments.css';

const SupplierPayments = ({ readOnly = false }) => {
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  useEffect(() => {
    fetchPayments();
    fetchSuppliers();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = selectedSupplier ? { supplier_id: selectedSupplier } : {};
      const response = await supplierPaymentsAPI.getAll(params);
      setPayments(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching supplier payments:', err);
      setError(err.response?.data?.error || 'Failed to load supplier payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedSupplier]);

  const handleAdd = () => {
    setEditingPayment(null);
    setModalOpen(true);
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setModalOpen(true);
  };

  const handleDelete = async (paymentId) => {
    try {
      await supplierPaymentsAPI.delete(paymentId);
      await fetchPayments();
      await fetchSuppliers(); // Refresh to update balances
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert(err.response?.data?.error || 'Failed to delete payment');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingPayment(null);
  };

  const handleModalSave = async () => {
    await fetchPayments();
    await fetchSuppliers(); // Refresh to update balances
    handleModalClose();
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments;
  }, [payments]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSupplier]);

  if (loading) {
    return (
      <div className="content-container">
        <div className="loading">Loading supplier payments...</div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">Supplier Payments</h1>
        <p className="page-subtitle">Record payments made to suppliers</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!readOnly && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <div className="card-header-content">
              <h2>Supplier Payments</h2>
              <button className="btn btn-primary" onClick={handleAdd}>
                + Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, maxWidth: '400px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontSize: '13px' }}>Filter by Supplier</label>
              <select
                className="form-input"
                value={selectedSupplier || ''}
                onChange={(e) => setSelectedSupplier(e.target.value ? parseInt(e.target.value) : null)}
                style={{ fontSize: '14px', width: '100%' }}
              >
                <option value="">All Suppliers</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name} {s.current_payable_balance > 0 ? `(Balance: ${formatCurrency(s.current_payable_balance)})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedSupplier && (
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedSupplier(null)}
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-content">
            <h2>Payments List</h2>
            {readOnly && (
              <span className="read-only-notice">Read-only mode: Editing disabled</span>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="supplier-payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {selectedSupplier 
                      ? `No payments found for ${suppliers.find(s => s.supplier_id === selectedSupplier)?.name || 'selected supplier'}.` 
                      : 'No payments found. Click "Record Payment" to get started.'}
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td><strong>{payment.supplier_name}</strong></td>
                    <td style={{ fontWeight: 'bold', color: '#059669' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>
                      <span className="payment-method-badge">
                        {payment.payment_method || 'cash'}
                      </span>
                    </td>
                    <td>{payment.notes || '-'}</td>
                    <td className="actions-cell">
                      {!readOnly ? (
                        <>
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(payment)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => setDeleteConfirm(payment.payment_id)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="read-only-label">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredPayments.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPayments.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this payment? This will update the supplier balance.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <SupplierPaymentModal
          payment={editingPayment}
          suppliers={suppliers}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

const SupplierPaymentModal = ({ payment, suppliers, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    supplier_id: payment?.supplier_id?.toString() || '',
    amount: payment?.amount?.toString() || '',
    payment_method: payment?.payment_method || 'cash',
    payment_date: payment?.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    notes: payment?.notes || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.supplier_id) {
      newErrors.supplier_id = 'Supplier is required';
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Check if payment exceeds balance
    const selectedSupplier = suppliers.find(s => s.supplier_id === parseInt(formData.supplier_id));
    if (selectedSupplier && amount > parseFloat(selectedSupplier.current_payable_balance || 0)) {
      newErrors.amount = `Payment amount exceeds payable balance (${formatCurrency(selectedSupplier.current_payable_balance)})`;
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
        supplier_id: parseInt(formData.supplier_id),
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
      const errorMessage = err.response?.data?.error || `Failed to ${payment ? 'update' : 'create'} payment`;
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  const selectedSupplier = suppliers.find(s => s.supplier_id === parseInt(formData.supplier_id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal supplier-payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{payment ? 'Edit Payment' : 'Record Supplier Payment'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-payment-form">
          <div className="form-group">
            <label className="form-label">
              Supplier <span className="required">*</span>
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              className={`form-input ${errors.supplier_id ? 'error' : ''}`}
              disabled={!!payment}
            >
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.name} {s.current_payable_balance > 0 ? `(Balance: ${formatCurrency(s.current_payable_balance)})` : ''}
                </option>
              ))}
            </select>
            {errors.supplier_id && <span className="error-message">{errors.supplier_id}</span>}
            {selectedSupplier && (
              <p className="form-help-text" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Current Payable Balance: <strong>{formatCurrency(selectedSupplier.current_payable_balance)}</strong>
              </p>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Amount (PKR) <span className="required">*</span>
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
              <label className="form-label">Payment Method</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="form-input"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                name="payment_date"
                value={formData.payment_date}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
              placeholder="Payment notes..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : (payment ? 'Update Payment' : 'Record Payment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierPayments;




