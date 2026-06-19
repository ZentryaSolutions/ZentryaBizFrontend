import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-viewport modal backdrop (covers sidebar + top nav). Renders via portal on document.body.
 */
export default function ModalOverlay({ onClose, children, className = 'modal-overlay' }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={className} role="presentation" onClick={onClose}>
      {children}
    </div>,
    document.body
  );
}
