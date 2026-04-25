import React, { useState, useEffect } from 'react';
import './SupplierModal.css';

const SupplierModal = ({ supplier, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    address: '',
    notes: '',
    opening_balance: '0',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_number: supplier.contact_number || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
        opening_balance: supplier.opening_balance?.toString() || '0',
      });
    } else {
      setFormData({
        name: '',
        contact_number: '',
        address: '',
        notes: '',
        opening_balance: '0',
      });
    }
  }, [supplier]);

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
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal supplier-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-form">
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

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-input"
              placeholder="Internal notes (optional)"
              rows="3"
            />
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
            <p className="form-help-text" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {supplier ? 'Note: Amount already owed cannot be changed if supplier has transactions.' : 'Enter the amount this supplier already owes you (if any) when adding them.'}
            </p>
          </div>

          {supplier && supplier.current_payable_balance !== undefined && (
            <div className="balance-display" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>Current Payable Balance (Auto-calculated)</label>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                color: parseFloat(supplier.current_payable_balance) > 0 ? '#dc2626' : parseFloat(supplier.current_payable_balance) === 0 ? '#059669' : '#64748b'
              }}>
                {formatCurrency(supplier.current_payable_balance)}
              </div>
              <p className="balance-help" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Balance = Amount Already Owed + Credit Purchases − Payments
              </p>
            </div>
          )}

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
              {saving ? 'Saving...' : (supplier ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;






