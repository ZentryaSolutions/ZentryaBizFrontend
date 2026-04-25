/** Logged in via Supabase zb_simple_* only — no Express / HisaabKitab session. */
export function isZbWebOnlyMode() {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem('zb_simple_uid') && !localStorage.getItem('sessionId');
}
