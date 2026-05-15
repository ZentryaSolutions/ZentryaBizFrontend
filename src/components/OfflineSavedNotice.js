import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowUp, faWifi } from '@fortawesome/free-solid-svg-icons';
import { OFFLINE_SAVED_EVENT } from '../lib/offlineMutationFeedback';
import {
  OFFLINE_SAVED_POPUP_BODY,
  OFFLINE_SAVED_POPUP_BODY_UR,
  OFFLINE_SAVED_POPUP_TITLE,
} from '../lib/offlineUserMessages';
import './OfflineSavedNotice.css';

const AUTO_DISMISS_MS = 7000;

/**
 * Global popup after an offline-queued mutation (customer, supplier, purchase, billing, etc.).
 */
export default function OfflineSavedNotice() {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener(OFFLINE_SAVED_EVENT, show);
    return () => window.removeEventListener(OFFLINE_SAVED_EVENT, show);
  }, [show]);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, dismiss]);

  if (!open) return null;

  return createPortal(
    <div className="zb-offline-saved-root" role="dialog" aria-live="polite" aria-labelledby="zb-offline-saved-title">
      <button type="button" className="zb-offline-saved-backdrop" aria-label="Close" onClick={dismiss} />
      <div className="zb-offline-saved-card">
        <button type="button" className="zb-offline-saved-close" onClick={dismiss} aria-label="Close">
          ×
        </button>
        <div className="zb-offline-saved-icon" aria-hidden>
          <FontAwesomeIcon icon={faWifi} className="zb-offline-saved-wifi" />
          <FontAwesomeIcon icon={faCloudArrowUp} className="zb-offline-saved-cloud" />
        </div>
        <h2 id="zb-offline-saved-title" className="zb-offline-saved-title">
          {OFFLINE_SAVED_POPUP_TITLE}
        </h2>
        <p className="zb-offline-saved-body">{OFFLINE_SAVED_POPUP_BODY}</p>
        <p className="zb-offline-saved-ur" dir="rtl" lang="ur">
          {OFFLINE_SAVED_POPUP_BODY_UR}
        </p>
        <button type="button" className="zb-offline-saved-ok" onClick={dismiss}>
          OK
        </button>
      </div>
    </div>,
    document.body
  );
}
