import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../services/api';

const inviteModalStyles = `
.zb-invite-overlay{
  position:fixed;
  inset:0;
  z-index:30000;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  box-sizing:border-box;
  background:rgba(15,23,42,.32);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.zb-invite-modal{
  width:min(560px,calc(100vw - 48px));
  max-height:calc(100vh - 48px);
  overflow:auto;
  background:#fff;
  border-radius:16px;
  border:1px solid #e8e5df;
  box-shadow:0 24px 70px rgba(2,6,23,.28);
  font-family:'DM Sans',Inter,system-ui,sans-serif;
  animation:zbInviteIn .22s ease-out;
}
@keyframes zbInviteIn{
  from{opacity:0;transform:translateY(12px) scale(.98);}
  to{opacity:1;transform:translateY(0) scale(1);}
}
.zb-invite-modal .modal-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:18px 22px;
  border-bottom:1px solid #f1f5f9;
}
.zb-invite-modal .modal-header h2{
  margin:0;
  font-family:'Bricolage Grotesque','DM Sans',sans-serif;
  font-size:1.15rem;
  font-weight:800;
  color:#0f172a;
  letter-spacing:-.02em;
}
.zb-invite-modal .modal-close{
  width:36px;
  height:36px;
  border-radius:10px;
  border:1px solid #e5e7eb;
  background:#fff;
  color:#64748b;
  cursor:pointer;
  font-size:20px;
  line-height:1;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0;
}
.zb-invite-modal .modal-close:hover{background:#f8fafc;color:#0f172a;border-color:#d1d5db}
.zb-invite-modal .modal-content{padding:20px 22px 22px}
.zb-invite-modal .form-group{margin-bottom:14px}
.zb-invite-modal .form-group label{display:block;font-size:13px;font-weight:700;color:#475569;margin-bottom:6px}
.zb-invite-modal .form-input{
  width:100%;
  box-sizing:border-box;
  height:42px;
  padding:0 12px;
  border:1px solid #e5e7eb;
  border-radius:10px;
  font-size:14px;
  color:#111827;
  background:#fff;
}
.zb-invite-modal .form-input:focus{
  outline:none;
  border-color:#4f46e5;
  box-shadow:0 0 0 3px rgba(79,70,229,.15);
}
.zb-invite-modal .zb-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.zb-invite-modal .zb-form-grid__full{grid-column:1/-1}
@media(max-width:560px){.zb-invite-modal .zb-form-grid{grid-template-columns:1fr}}
.zb-invite-modal .modal-actions{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:10px;
  flex-wrap:wrap;
  margin-top:18px;
  padding-top:16px;
  border-top:1px solid #f1f5f9;
}
.zb-invite-modal .btn{
  height:42px;
  padding:0 18px;
  border-radius:11px;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  font-family:inherit;
  border:none;
}
.zb-invite-modal .btn:disabled{opacity:.65;cursor:not-allowed}
.zb-invite-modal .btn-primary{background:#4f46e5;color:#fff;box-shadow:0 4px 14px rgba(79,70,229,.25)}
.zb-invite-modal .btn-primary:hover:not(:disabled){background:#4338ca}
.zb-invite-modal .btn-secondary{background:#fff;color:#475569;border:1px solid #e5e7eb}
.zb-invite-modal .btn-secondary:hover{background:#f8fafc;border-color:#d1d5db;color:#0f172a}
.zb-invite-result{
  text-align:center;
  padding:8px 4px 4px;
}
.zb-invite-result__icon{
  width:56px;
  height:56px;
  margin:0 auto 14px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:28px;
  font-weight:800;
}
.zb-invite-result__icon--success{background:#dcfce7;color:#16a34a}
.zb-invite-result__icon--error{background:#fee2e2;color:#dc2626}
.zb-invite-result h3{
  margin:0 0 8px;
  font-family:'Bricolage Grotesque','DM Sans',sans-serif;
  font-size:1.2rem;
  font-weight:800;
  color:#0f172a;
}
.zb-invite-result p{
  margin:0;
  font-size:14px;
  line-height:1.55;
  color:#475569;
}
.zb-invite-result .email-highlight{
  display:inline-block;
  margin-top:8px;
  padding:6px 12px;
  border-radius:8px;
  background:#eef2ff;
  color:#3730a3;
  font-weight:700;
  word-break:break-all;
}
.zb-invite-result .modal-actions{justify-content:center;border-top:none;padding-top:20px;margin-top:20px}
`;

/**
 * Invite staff by email → POST /api/users/invitations.
 * Shows success/error inside the modal (toast is hidden behind this overlay).
 */
export default function InviteStaffModal({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'cashier',
  });
  const [phase, setPhase] = useState('form'); // form | sending | success | error
  const [sentEmail, setSentEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSuccessDone = () => {
    onSuccess?.();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const em = String(formData.email || '').trim().toLowerCase();
    if (!em) {
      setErrorMessage(t('users.fillRequiredFields', { defaultValue: 'Please fill required fields.' }));
      setPhase('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErrorMessage(t('users.invalidEmail', { defaultValue: 'Enter a valid email address.' }));
      setPhase('error');
      return;
    }

    setSubmitting(true);
    setPhase('sending');
    setErrorMessage('');

    try {
      const response = await usersAPI.sendInvitation({
        email: em,
        username: em,
        name: (formData.name || '').trim(),
        role: formData.role,
      });
      const data = response.data || {};

      if (data.emailed) {
        setSentEmail(data.email || em);
        setPhase('success');
        return;
      }

      if (data.inviteUrl) {
        try {
          await navigator.clipboard.writeText(data.inviteUrl);
        } catch {
          /* clipboard optional */
        }
      }

      setErrorMessage(
        data.message ||
          t('users.inviteEmailNotConfigured', {
            defaultValue:
              'Invitation was saved but email could not be sent. Add MS Graph or SMTP in backend/env.email.local and restart the server.',
          })
      );
      setPhase('error');
    } catch (err) {
      const d = err.response?.data;
      const msg =
        [d?.message, d?.detail].filter(Boolean).join('\n') ||
        err.message ||
        t('users.inviteFailed', { defaultValue: 'Failed to send invitation.' });
      setErrorMessage(msg);
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    phase === 'success'
      ? t('users.invitationSentTitle', { defaultValue: 'Invitation sent' })
      : phase === 'error'
        ? t('users.invitationFailedTitle', { defaultValue: 'Could not send invitation' })
        : t('users.addUser');

  return createPortal(
    <>
      <style>{inviteModalStyles}</style>
      <div
        className="zb-invite-overlay"
        onClick={handleClose}
        role="presentation"
        aria-hidden={false}
      >
        <div
          className="zb-invite-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="zb-invite-title"
        >
          <div className="modal-header">
            <h2 id="zb-invite-title">{title}</h2>
            <button
              type="button"
              className="modal-close"
              onClick={handleClose}
              disabled={submitting}
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              ×
            </button>
          </div>

          <div className="modal-content">
            {phase === 'success' ? (
              <div className="zb-invite-result">
                <div className="zb-invite-result__icon zb-invite-result__icon--success" aria-hidden>
                  ✓
                </div>
                <h3>{t('users.invitationSentTitle', { defaultValue: 'Invitation sent' })}</h3>
                <p>
                  {t('users.invitationSentTo', {
                    defaultValue: 'An invitation email was sent to:',
                  })}
                </p>
                <span className="email-highlight">{sentEmail}</span>
                <div className="modal-actions">
                  <button type="button" className="btn btn-primary" onClick={handleSuccessDone}>
                    {t('common.ok', { defaultValue: 'OK' })}
                  </button>
                </div>
              </div>
            ) : phase === 'error' ? (
              <div className="zb-invite-result">
                <div className="zb-invite-result__icon zb-invite-result__icon--error" aria-hidden>
                  !
                </div>
                <h3>{t('users.invitationFailedTitle', { defaultValue: 'Could not send invitation' })}</h3>
                <p>{errorMessage}</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setPhase('form')}>
                    {t('common.tryAgain', { defaultValue: 'Try again' })}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="zb-form-grid">
                  <div className="form-group zb-form-grid__full">
                    <label htmlFor="invite-email">{t('users.email')} *</label>
                    <input
                      id="invite-email"
                      type="email"
                      autoComplete="email"
                      className="form-input"
                      value={formData.email}
                      disabled={submitting}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                    <p style={{ marginTop: 6, fontSize: 13, color: '#667085', lineHeight: 1.4 }}>
                      {t('users.staffLoginHint')}
                    </p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="invite-name">{t('users.name')}</label>
                    <input
                      id="invite-name"
                      type="text"
                      className="form-input"
                      value={formData.name}
                      disabled={submitting}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="invite-role">{t('users.role')}</label>
                    <select
                      id="invite-role"
                      className="form-input"
                      value={formData.role}
                      disabled={submitting}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="cashier">{t('auth.cashier')}</option>
                      <option value="administrator">{t('auth.admin')}</option>
                    </select>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting
                      ? t('users.sendingInvitation', { defaultValue: 'Sending…' })
                      : t('users.sendInvitation', { defaultValue: 'Send Invitation' })}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
