import React, { useState, useEffect } from 'react';

/**
 * Modal to enter customer WhatsApp number (replaces window.prompt — works on mobile / blocked prompts).
 */
export default function WhatsAppSendModal({ open, initialPhone = '', onClose, onSend }) {
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setPhone(initialPhone || '');
      setErr('');
    }
  }, [open, initialPhone]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = onSend(phone);
    if (result && result.ok === false) {
      setErr(result.error || 'Invalid phone number');
      return;
    }
    onClose();
  };

  return (
    <div className="sal2-modal-overlay" onClick={onClose} role="presentation">
      <div className="sal2-modal modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="wa-modal-title">
        <h3 id="wa-modal-title" style={{ marginTop: 0 }}>
          Send via WhatsApp
        </h3>
        <form onSubmit={handleSubmit}>
          <label htmlFor="wa-customer-phone" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
            Customer WhatsApp number
          </label>
          <input
            id="wa-customer-phone"
            type="tel"
            className="form-control"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErr('');
            }}
            placeholder="e.g. 03001234567"
            autoFocus
            style={{ width: '100%', marginBottom: 8 }}
          />
          {err ? (
            <p style={{ color: '#c62828', fontSize: 13, margin: '0 0 8px' }} role="alert">
              {err}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
