import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal to enter customer WhatsApp number (replaces window.prompt).
 */
export default function WhatsAppSendModal({ open, initialPhone = '', onClose, onSend }) {
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');

  useEffect(() => {
    if (open) {
      setPhone(initialPhone || '');
      setErr('');
      setFallbackUrl('');
    }
  }, [open, initialPhone]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr('');
    setFallbackUrl('');
    try {
      const result = onSend(phone);
      if (!result || result.ok === false) {
        setErr(result?.error || 'Could not open WhatsApp.');
        if (result?.url) setFallbackUrl(result.url);
        return;
      }
      onClose();
    } catch (submitErr) {
      console.error('[WhatsApp]', submitErr);
      setErr('Something went wrong. Try again or use the link below.');
    }
  };

  const modal = (
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
            inputMode="tel"
            autoComplete="tel"
            className="sal2-search"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErr('');
              setFallbackUrl('');
            }}
            placeholder="e.g. 03001234567"
            autoFocus
            style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
          />
          {err ? (
            <p style={{ color: '#c62828', fontSize: 13, margin: '0 0 8px' }} role="alert">
              {err}
            </p>
          ) : null}
          {fallbackUrl ? (
            <p style={{ margin: '0 0 12px', fontSize: 13 }}>
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 700, color: '#16a34a' }}
                onClick={() => {
                  setTimeout(onClose, 300);
                }}
              >
                Open WhatsApp manually
              </a>
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Open WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
