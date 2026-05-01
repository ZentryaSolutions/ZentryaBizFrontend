import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './SupplierModal.css';

const SupplierModal = ({ supplier, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    email: '',
    address: '',
    opening_balance: '0',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_number: supplier.contact_number || '',
        email: supplier.email || '',
        address: supplier.address || '',
        opening_balance: supplier.opening_balance?.toString() || '0',
      });
    } else {
      setFormData({
        name: '',
        contact_number: '',
        email: '',
        address: '',
        opening_balance: '0',
      });
    }
  }, [supplier]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const validate = () => {
    const newErrors = {};

    // Name: required
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    // Amount Already Owed: numeric
    const openingBalance = parseFloat(formData.opening_balance);
    if (isNaN(openingBalance)) {
      newErrors.opening_balance = 'Amount already owed must be a valid number';
    }

    const em = String(formData.email || '').trim();
    if (!em) {
      newErrors.email = t('suppliers.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      newErrors.email = t('suppliers.invalidEmail');
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
    // Clear error for this field
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
        name: formData.name.trim(),
        contact_number: formData.contact_number.trim() || null,
        email: formData.email.trim(),
        address: formData.address.trim() || null,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      };

      await onSave(submitData);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save supplier';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toFixed(2)}`;
  };

  return (
    createPortal(
      <div className="modal-overlay supplier-modal-overlay" onClick={onClose}>
      <div className="modal supplier-modal supplier-modal--wide supplier-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header supplier-modal-header">
          <h2>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-form">
          <div className="zb-form-grid zb-form-grid--2">
            <div className="form-group">
              <label className="form-label">
                Supplier Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="Enter supplier name"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="text"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                className="form-input"
                placeholder="Phone number (optional)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Supplier email"
                autoComplete="email"
                required
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Amount Already Owed (PKR)
              </label>
              <input
                type="number"
                name="opening_balance"
                value={formData.opening_balance}
                onChange={handleChange}
                step="0.01"
                className={`form-input ${errors.opening_balance ? 'error' : ''}`}
                placeholder="0.00"
              />
              {errors.opening_balance && (
                <span className="error-message">{errors.opening_balance}</span>
              )}
              <p className="form-help-text">
                {supplier ? 'Note: Amount already owed cannot be changed if supplier has transactions.' : 'Enter the amount this supplier already owes you (if any) when adding them.'}
              </p>
            </div>

            <div className="form-group zb-form-grid__full">
              <label className="form-label">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-input"
                placeholder="Supplier address (optional)"
                rows="3"
              />
            </div>

          </div>

          {supplier && supplier.current_payable_balance !== undefined && (
            <div className="balance-display zb-form-grid__full">
              <label className="form-label balance-label">Current Payable Balance (Auto-calculated)</label>
              <div
                className={`balance-value ${
                  parseFloat(supplier.current_payable_balance) > 0
                    ? 'negative'
                    : parseFloat(supplier.current_payable_balance) === 0
                      ? 'positive'
                      : ''
                }`}
              >
                {formatCurrency(supplier.current_payable_balance)}
              </div>
              <p className="balance-help">
                Balance = Amount Already Owed + Credit Purchases − Payments
              </p>
            </div>
          )}

          <div className="modal-actions supplier-form-actions">
            <button
              type="button"
              className="btn btn-secondary supplier-btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary supplier-btn-save"
              disabled={saving}
            >
              {saving ? 'Saving...' : (supplier ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
      document.body
    )
  );
};

export default SupplierModal;






