import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';

const StaffInvitePage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const initialAction = useMemo(() => params.get('action') || '', [params]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showRegisteredPrompt, setShowRegisteredPrompt] = useState(false);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setMessage('Invalid invitation link.');
      setLoading(false);
      return;
    }
    try {
      const res = await authAPI.getStaffInvite(token);
      setInvite(res.data?.invitation || null);
    } catch (e) {
      setMessage(e.response?.data?.error || 'Invitation not found.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleReject = useCallback(async () => {
    try {
      setSubmitting(true);
      const res = await authAPI.rejectStaffInvite(token);
      setMessage(res.data?.message || 'Invitation rejected.');
      setInvite((prev) => (prev ? { ...prev, status: 'rejected' } : prev));
    } catch (e) {
      setMessage(e.response?.data?.error || 'Failed to reject invitation.');
    } finally {
      setSubmitting(false);
    }
  }, [token]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  useEffect(() => {
    if (!loading && initialAction === 'reject' && invite?.status === 'pending') {
      handleReject();
    }
  }, [loading, initialAction, invite, handleReject]);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await authAPI.acceptStaffInvite(token, { password });
      setMessage(res.data?.message || 'Registration completed successfully. Please sign in.');
      setInvite((prev) => (prev ? { ...prev, status: 'accepted' } : prev));
      setTimeout(() => navigate('/login'), 1200);
    } catch (e2) {
      setMessage(e2.response?.data?.error || e2.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExistingAccountYes = async () => {
    try {
      setSubmitting(true);
      const res = await authAPI.acceptStaffInviteExisting(token);
      setMessage(res.data?.message || 'Invitation accepted. Please log in.');
      setTimeout(() => navigate('/login'), 900);
    } catch (e) {
      setMessage(e.response?.data?.error || 'Could not accept as existing account. Choose "No" and set password.');
    } finally {
      setSubmitting(false);
      setShowRegisteredPrompt(false);
    }
  };

  if (loading) {
    return (
      <div className="invite-page">
        <div className="invite-card">Loading invitation...</div>
      </div>
    );
  }

  const logoSrc = `${process.env.PUBLIC_URL}/companylogo.jpeg`;

  return (
    <div className="invite-page">
      <style>{`
        .invite-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,#f3f6ff 0%,#eef2f9 100%)}
        .invite-card{width:100%;max-width:520px;background:#fff;border:1px solid #e4e7ec;border-radius:18px;box-shadow:0 14px 34px rgba(16,24,40,.12);padding:24px}
        .invite-brand{display:flex;align-items:center;gap:12px;margin-bottom:10px}
        .invite-logo{width:52px;height:52px;border-radius:12px;object-fit:cover;border:1px solid #e4e7ec}
        .invite-brand-sub{margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#667085}
        .invite-title{margin:2px 0 0;font-size:28px;line-height:1.2;color:#0f172a}
        .invite-copy{margin:14px 0;color:#344054}
        .invite-message{margin-bottom:12px;padding:10px 12px;border-radius:10px;background:#eef4ff;color:#1d4ed8;font-size:14px}
        .invite-actions{display:flex;gap:10px}
        .invite-btn{border:0;border-radius:10px;padding:10px 16px;font-weight:600;cursor:pointer}
        .invite-btn:disabled{opacity:.6;cursor:not-allowed}
        .invite-btn--primary{background:#4f46e5;color:#fff}
        .invite-btn--secondary{background:#f3f4f6;color:#374151}
        .invite-form{margin-top:10px}
        .invite-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
        .invite-field label{font-weight:600;color:#344054}
        .invite-field input{width:100%;border:1px solid #d0d5dd;border-radius:10px;padding:10px 12px;outline:none}
        .invite-field input:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(129,140,248,.25)}
      `}</style>
      <div className="invite-card">
        <div className="invite-brand">
          <img src={logoSrc} alt="Company logo" className="invite-logo" />
          <div>
            <p className="invite-brand-sub">Zentrya Biz</p>
            <h1 className="invite-title">Staff Invitation</h1>
          </div>
        </div>
        {invite ? (
          <p className="invite-copy">
            You are invited as <strong>{invite.role}</strong> at <strong>{invite.storeName}</strong> for <strong>{invite.email}</strong>.
          </p>
        ) : null}
        {message ? <div className="invite-message">{message}</div> : null}

        {invite?.status === 'pending' && !showPasswordForm ? (
          <div className="invite-actions">
            <button className="invite-btn invite-btn--primary" type="button" onClick={() => setShowRegisteredPrompt(true)} disabled={submitting}>
              Accept
            </button>
            <button className="invite-btn invite-btn--secondary" type="button" onClick={handleReject} disabled={submitting}>
              Reject
            </button>
          </div>
        ) : null}

        {invite?.status === 'pending' && showPasswordForm ? (
          <form onSubmit={handleAccept} className="invite-form">
            <div className="invite-field">
              <label>Set Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="invite-field">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button className="invite-btn invite-btn--primary" type="submit" disabled={submitting}>Register</button>
          </form>
        ) : null}

        {showRegisteredPrompt ? (
          <div style={{ marginTop: 12, border: '1px solid #e4e7ec', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
            <p style={{ margin: '0 0 10px', color: '#334155', fontWeight: 600 }}>
              Are you already registered on this app?
            </p>
            <div className="invite-actions">
              <button className="invite-btn invite-btn--primary" type="button" onClick={handleExistingAccountYes} disabled={submitting}>
                Yes
              </button>
              <button
                className="invite-btn invite-btn--secondary"
                type="button"
                onClick={() => {
                  setShowRegisteredPrompt(false);
                  setShowPasswordForm(true);
                }}
                disabled={submitting}
              >
                No
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StaffInvitePage;
