import { isOfflineQueuedResponse } from './offlineUserMessages';

export function offlineOptsFromResponse(response) {
  return { offlineQueued: isOfflineQueuedResponse(response) };
}

export async function invalidateUnlessOffline(queryClient, queryKey, opts) {
  if (opts?.offlineQueued) return;
  await queryClient.invalidateQueries({ queryKey });
}
