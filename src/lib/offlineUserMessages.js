/**
 * User-facing copy when the API is unreachable (offline / network) — not "start backend on port 5000".
 */

export const OFFLINE_SAVED_POPUP_TITLE = "You're offline";

export const OFFLINE_SAVED_POPUP_BODY =
  'Your changes are saved on this device. As soon as you connect to the internet, they will sync automatically.';

export const OFFLINE_SAVED_POPUP_BODY_UR =
  'آپ فی الوقت آف لائن ہیں۔ انٹرنیٹ سے کنیکٹ ہوتے ہی آپ کی تبدیلیاں محفوظ ہو جائیں گی۔';

export const OFFLINE_CHANGES_SAVED_MESSAGE = OFFLINE_SAVED_POPUP_BODY;

export const OFFLINE_CONNECTION_BANNER_MESSAGE =
  'You are offline or the server is unreachable. Your changes are saved on this device and will sync when you are back online.';

/** List-page banner from a failed react-query fetch. */
export function buildConnectivityErrorBanner(isError, queryError, fallbackMsg) {
  if (!isError || !queryError) return null;
  if (isLikelyConnectivityError(queryError)) {
    return { text: getConnectivityErrorMessage(queryError), variant: 'offline' };
  }
  return {
    text: queryError.response?.data?.error || fallbackMsg,
    variant: 'error',
  };
}

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

/** Axios response from offline mutation queue (202 + offlineQueued). */
export function isOfflineQueuedResponse(response) {
  return response?.status === 202 && response?.data?.offlineQueued === true;
}
