/**
 * Browser Supabase client (publishable key). CRA only exposes REACT_APP_* vars.
 * NEXT_PUBLIC_* is for Next.js — kept as fallback if you ever switch bundler.
 */
import { createClient } from '@supabase/supabase-js';

const url =
  process.env.REACT_APP_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const key =
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabase =
  url && key ? createClient(url, key, { auth: { persistSession: true } }) : null;

export function isSupabaseBrowserConfigured() {
  return !!(url && key);
}
