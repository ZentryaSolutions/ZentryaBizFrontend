import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SupplierModal.css';
import './CustomerModal.custom.css';

const CUSTOMER_MODAL_Z = 10060;

const CustomerModal = ({ customer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    previous_due: '0',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        previous_due: customer.opening_balance?.toString() || '0',
      });
    }
  }, [customer]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const validate = () => {
    const newErrors = {};

    // Name: required
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    // Phone: required
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required';
    }

    // Previous Due: numeric
    const previousDue = parseFloat(formData.previous_due);
    if (isNaN(previousDue)) {
      newErrors.previous_due = 'Previous Due must be a valid number';
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
        phone: formData.phone.trim(),
        address: formData.address.trim() || null,
        opening_balance: parseFloat(formData.previous_due) || 0,
      };

      await onSave(submitData);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save customer';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const overlay = (
    <div
      className="customer-modal-overlay zb-customer-modal-overlay"
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: CUSTOMER_MODAL_Z,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        boxSizing: 'border-box',
        background: 'rgba(17, 24, 39, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="modal supplier-modal supplier-modal--wide customer-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header customer-modal-header">
          <h2>{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-form">
          <div className="zb-form-grid zb-form-grid--2 customer-modal-grid">
            <div className="form-group">
              <label className="form-label">
                Customer Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer name"
              />
              {errors.name && <div className="error-text">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Mobile Number <span className="required">*</span>
              </label>
              <input
                type="text"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter mobile number"
              />
              {errors.phone && <div className="error-text">{errors.phone}</div>}
            </div>

            <div className="form-group zb-form-grid__full">
              <label className="form-label">Address (Optional)</label>
              <textarea
                name="address"
                className="form-input"
                rows="3"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter customer address"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Previous Due</label>
              <input
                type="number"
                step="0.01"
                name="previous_due"
                className="form-input"
                value={formData.previous_due}
                onChange={handleChange}
                placeholder="0.00"
              />
              <div className="form-hint">Amount customer already owes when added</div>
              {errors.previous_due && <div className="error-text">{errors.previous_due}</div>}
            </div>
          </div>

          <div className="modal-actions customer-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
};

export default CustomerModal;



