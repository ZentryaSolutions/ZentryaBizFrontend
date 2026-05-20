import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { isZbWebOnlyMode } from '../lib/appMode';
import {
  getOfflineQueueCount,
  subscribeOfflineQueueChanged,
  flushOfflineMutationQueue,
} from '../lib/offlineMutationQueue';
import './OfflineTopBanner.css';

/**
 * App-wide top bar indicator for offline / sync (does not change offline save workflow).
 */
export default function OfflineTopBanner() {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [serverReachable, setServerReachable] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncedFlash, setSyncedFlash] = useState(false);

  const isOffline = !browserOnline || !serverReachable;

  useEffect(() => {
    const refreshPending = () => {
      getOfflineQueueCount().then((n) => setPending(n));
    };
    refreshPending();
    const unsub = subscribeOfflineQueueChanged(refreshPending);
    return unsub;
  }, []);

  useEffect(() => {
    if (isZbWebOnlyMode()) return undefined;

    const onOnline = () => {
      setBrowserOnline(true);
      void flushOfflineMutationQueue().then(() => {
        setSyncedFlash(true);
        window.setTimeout(() => setSyncedFlash(false), 3000);
      });
    };
    const onOffline = () => setBrowserOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (isZbWebOnlyMode()) return undefined;

    let alive = true;
    const ping = async () => {
      try {
        const r = await api.get('/health', { timeout: 8000 });
        if (!alive) return;
        const ok = r?.data?.status === 'ok';
        setServerReachable(ok);
        if (ok) void flushOfflineMutationQueue();
      } catch {
        if (alive) setServerReachable(false);
      }
    };

    ping();
    const id = window.setInterval(ping, 45000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  if (isZbWebOnlyMode()) return null;

  if (syncedFlash && !isOffline) {
    return (
      <div className="zb-offline-topbar zb-offline-topbar--synced" role="status">
        <span className="zb-offline-topbar__dot" aria-hidden />
        Synced
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div className="zb-offline-topbar zb-offline-topbar--offline" role="status">
      <span className="zb-offline-topbar__dot" aria-hidden />
      <span>
        Offline — bills saving locally
        {pending > 0 ? ` · ${pending} pending` : ''}
      </span>
    </div>
  );
}
