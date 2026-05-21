import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { whatsappModalStyles } from '../styles/salesWorkspaceStyles';

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
    <>
      <style>{whatsappModalStyles}</style>
      <div className="sal2-modal-overlay" onClick={onClose} role="presentation">
        <div
          className="sal2-wa-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="wa-modal-title"
          aria-describedby="wa-modal-desc"
        >
          <div className="sal2-wa-modal__hd">
            <div className="sal2-wa-modal__ico" aria-hidden>
              <FontAwesomeIcon icon={faCommentDots} />
            </div>
            <div className="sal2-wa-modal__hdText">
              <h2 id="wa-modal-title" className="sal2-wa-modal__tit">
                Send via WhatsApp
              </h2>
              <p id="wa-modal-desc" className="sal2-wa-modal__sub">
                Enter the customer&apos;s mobile number to share this invoice on WhatsApp.
              </p>
            </div>
            <button type="button" className="sal2-wa-modal__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <form className="sal2-wa-modal__body" onSubmit={handleSubmit}>
            <label htmlFor="wa-customer-phone" className="sal2-wa-modal__label">
              Customer WhatsApp number
            </label>
            <input
              id="wa-customer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="sal2-wa-modal__input"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErr('');
                setFallbackUrl('');
              }}
              placeholder="0300 1234567"
              autoFocus
            />
            <p className="sal2-wa-modal__hint">Pakistan format: 03XX XXXXXXX (you will tap Send in WhatsApp)</p>

            {err ? (
              <p className="sal2-wa-modal__err" role="alert">
                {err}
              </p>
            ) : null}

            {fallbackUrl ? (
              <div className="sal2-wa-modal__link">
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setTimeout(onClose, 300)}
                >
                  Open WhatsApp manually →
                </a>
              </div>
            ) : null}

            <div className="sal2-wa-modal__ft">
              <button type="button" className="sal2-wa-modal__btnCancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="sal2-wa-modal__btnGo">
                <FontAwesomeIcon icon={faCommentDots} />
                Open WhatsApp
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
