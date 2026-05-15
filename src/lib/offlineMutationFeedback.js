import { isOfflineQueuedResponse } from './offlineUserMessages';

export const OFFLINE_SAVED_EVENT = 'zb-offline-saved-notice';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function notifyOfflineQueuedSaved() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OFFLINE_SAVED_EVENT));
}

/** Call from axios success interceptor when a mutation was queued offline. */
export function maybeNotifyOfflineQueuedResponse(response) {
  if (!isOfflineQueuedResponse(response)) return;
  const method = String(response.config?.method || 'get').toUpperCase();
  if (MUTATING.has(method)) notifyOfflineQueuedSaved();
}
