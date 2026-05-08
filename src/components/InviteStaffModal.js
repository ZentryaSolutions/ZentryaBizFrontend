import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Users.css';

/**
 * Invite staff by email (same payload as Users page → POST /api/users/invitations).
 */
export default function InviteStaffModal({ onClose, onSave }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'cashier',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const em = String(formData.email || '').trim().toLowerCase();
    if (!em) {
      alert(t('users.fillRequiredFields'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      alert(t('users.invalidEmail'));
      return;
    }
    onSave({
      email: em,
      username: em,
      name: (formData.name || '').trim(),
      role: formData.role,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('users.addUser')}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="zb-form-grid zb-form-grid--2">
              <div className="form-group zb-form-grid__full">
                <label>{t('users.email')} *</label>
                <input
                  type="email"
                  autoComplete="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <p className="form-hint" style={{ marginTop: 6, fontSize: 13, color: '#667085' }}>
                  {t('users.staffLoginHint')}
                </p>
              </div>
              <div className="form-group">
                <label>{t('users.name')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('users.role')}</label>
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="cashier">{t('auth.cashier')}</option>
                  <option value="administrator">{t('auth.admin')}</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary">
                Send Invitation
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
