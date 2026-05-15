/**
 * User-facing copy when the API is unreachable (offline / network) — not "start backend on port 5000".
 */

export const OFFLINE_CHANGES_SAVED_MESSAGE =
  'Your changes are saved on this device. Once you are connected to the internet, they will sync and appear here.';

export const OFFLINE_CONNECTION_BANNER_MESSAGE =
  'You are offline or the server is unreachable. Your changes are saved on this device and will sync when you are back online.';

export function isLikelyConnectivityError(error) {
  if (!error) return false;
  const code = error.code;
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'ECONNREFUSED' ||
    code === 'ERR_NETWORK' ||
    code === 'ETIMEDOUT' ||
    msg.includes('network error') ||
    msg.includes('network')
  );
}

export function getConnectivityErrorMessage(error) {
  if (isLikelyConnectivityError(error)) {
    return OFFLINE_CHANGES_SAVED_MESSAGE;
  }
  return null;
}
