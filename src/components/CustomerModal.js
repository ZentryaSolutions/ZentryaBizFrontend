import React, { useState, useEffect } from 'react';
import './SupplierModal.css';

const CustomerModal = ({ customer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    previous_due: '0',
    customer_type: 'cash',
    credit_limit: '',
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
        customer_type: customer.customer_type || 'cash',
        credit_limit: customer.credit_limit?.toString() || '',
      });
    }
  }, [customer]);

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

    // Credit Limit: numeric if provided
    if (formData.credit_limit && formData.credit_limit.trim()) {
      const creditLimit = parseFloat(formData.credit_limit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        newErrors.credit_limit = 'Credit Limit must be a valid positive number';
      }
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
        customer_type: formData.customer_type,
        credit_limit: formData.credit_limit && formData.credit_limit.trim() ? parseFloat(formData.credit_limit) : null,
      };

      await onSave(submitData);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save customer';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal supplier-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{customer ? 'Edit Customer' : 'Add New Customer'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-form">
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

          <div className="form-group">
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Type</label>
              <select
                name="customer_type"
                className="form-input"
                value={formData.customer_type}
                onChange={handleChange}
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
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

          {formData.customer_type === 'credit' && (
            <div className="form-group">
              <label className="form-label">Credit Limit (Optional)</label>
              <input
                type="number"
                step="0.01"
                name="credit_limit"
                className="form-input"
                value={formData.credit_limit}
                onChange={handleChange}
                placeholder="Enter credit limit"
              />
              <div className="form-hint">Maximum amount customer can owe</div>
              {errors.credit_limit && <div className="error-text">{errors.credit_limit}</div>}
            </div>
          )}

          <div className="modal-actions">
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
};

export default CustomerModal;



