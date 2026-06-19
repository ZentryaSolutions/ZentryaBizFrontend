import React, { useState } from 'react';
import ModalOverlay from '../../components/ModalOverlay';

const cardStyle = {
  background: '#fff',
  borderRadius: 16,
  padding: '24px 22px',
  maxWidth: 420,
  width: 'min(420px, calc(100vw - 32px))',
  boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
};

export default function SignupRoleModal({ onConfirm, loading = false, error = '' }) {
  const [choice, setChoice] = useState('shop_owner');

  return (
    <ModalOverlay onClose={() => {}} className="modal-overlay modal-overlay--signup-role">
      <div
        className="signup-role-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-role-title"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="signup-role-title" style={{ margin: '0 0 6px', fontSize: 20, color: '#0f172a' }}>
          How will you use Zentrya Biz?
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.45 }}>
          Pick the role for this account. You can open assigned shops as staff, or create and manage your own shops as an owner.
        </p>

        {error ? (
          <div style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <label
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 12,
              border: `2px solid ${choice === 'shop_owner' ? '#2563eb' : '#e2e8f0'}`,
              background: choice === 'shop_owner' ? '#eff6ff' : '#fff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="signupRole"
              value="shop_owner"
              checked={choice === 'shop_owner'}
              onChange={() => setChoice('shop_owner')}
              style={{ marginTop: 3 }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: 14, color: '#0f172a' }}>Shop owner</strong>
              <span style={{ fontSize: 12, color: '#64748b' }}>Create shops, billing, inventory, and team.</span>
            </span>
          </label>

          <label
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 12,
              border: `2px solid ${choice === 'cashier' ? '#2563eb' : '#e2e8f0'}`,
              background: choice === 'cashier' ? '#eff6ff' : '#fff',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="signupRole"
              value="cashier"
              checked={choice === 'cashier'}
              onChange={() => setChoice('cashier')}
              style={{ marginTop: 3 }}
            />
            <span>
              <strong style={{ display: 'block', fontSize: 14, color: '#0f172a' }}>Cashier / Staff</strong>
              <span style={{ fontSize: 12, color: '#64748b' }}>Work in shops assigned by your administrator.</span>
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => onConfirm?.(choice)}
          style={{
            width: '100%',
            minHeight: 44,
            border: 0,
            borderRadius: 999,
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </ModalOverlay>
  );
}
