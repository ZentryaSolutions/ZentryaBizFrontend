/** Fired when POS `sessionId` is set or cleared (localStorage or sessionStorage). Lets prefetch/queries re-run. */
export const ZB_BACKEND_SESSION_CHANGED = 'zb-backend-session-changed';

export function notifyBackendSessionChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ZB_BACKEND_SESSION_CHANGED));
}

/** `x-session-id` source for `/api/*` — set after zb-simple-session (or LAN login). */
export function hasPosBackendSession() {
  if (typeof window === 'undefined') return false;
  return !!(
    sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId')
  );
}

/** Gate React Query (and prefetch) so we do not hammer the API with naked 401s before session exists. */
export function posApiQueriesEnabled(shopId) {
  return Boolean(shopId) && hasPosBackendSession();
}

/** Logged in via Supabase zb_simple_* only — no Express / HisaabKitab session. */
export function isZbWebOnlyMode() {
  if (typeof window === 'undefined') return false;
  const uid =
    localStorage.getItem('zb_simple_uid') || sessionStorage.getItem('zb_simple_uid');
  const sid =
    sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId');
  return !!uid && !sid;
}
