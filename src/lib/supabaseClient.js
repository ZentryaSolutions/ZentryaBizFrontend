/**
 * Browser Supabase client. CRA embeds env at build time from `frontend/.env` locally
 * or from Vercel Project → Environment Variables (must trigger a redeploy after changes).
 *
 * Supports legacy JWT anon keys (eyJ...) and newer publishable keys (sb_publishable_...).
 */
import { createClient } from '@supabase/supabase-js';

function firstNonEmpty(...keys) {
  for (const envKey of keys) {
    const raw = process.env[envKey];
    if (raw == null) continue;
    const s = String(raw).trim();
    if (s) return s;
  }
  return '';
}

const url = firstNonEmpty('REACT_APP_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');

const key = firstNonEmpty(
  'REACT_APP_SUPABASE_PUBLISHABLE_KEY',
  'REACT_APP_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
);

function buildClient() {
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  } catch (e) {
    console.error(
      '[Supabase] createClient failed (check URL/key; publishable keys need a recent @supabase/supabase-js):',
      e
    );
    return null;
  }
}

export const supabase = buildClient();

/** True only when a client was created — same as having valid env at build time and a working key format. */
export function isSupabaseBrowserConfigured() {
  return supabase != null;
}
