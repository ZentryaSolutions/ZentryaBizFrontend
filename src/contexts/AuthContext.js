/**
 * Auth: Supabase only — zb_signup / zb_login RPC + table zb_simple_users (see database SQL).
 * Session uses sessionStorage → closing the tab/window logs the user out (no separate backend).
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { getServerUrl } from '../utils/connectionStatus';
import { authAPI } from '../services/api';
import { queryClient } from '../lib/queryClient';

const SS_UID = 'zb_simple_uid';
const SS_USER = 'zb_simple_username';
const SS_NAME = 'zb_simple_full_name';
const SS_EMAIL = 'zb_simple_email';
const SS_SHOP = 'zb_active_shop_id';

/** One-time move from old localStorage so existing users stay signed in until they close the tab. */
function migrateLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  const uid = localStorage.getItem(SS_UID);
  if (uid && !sessionStorage.getItem(SS_UID)) {
    sessionStorage.setItem(SS_UID, uid);
    sessionStorage.setItem(SS_USER, localStorage.getItem(SS_USER) || '');
    sessionStorage.setItem(SS_NAME, localStorage.getItem(SS_NAME) || '');
    localStorage.removeItem(SS_UID);
    localStorage.removeItem(SS_USER);
    localStorage.removeItem(SS_NAME);
  }
  const shop = localStorage.getItem(SS_SHOP);
  if (shop && !sessionStorage.getItem(SS_SHOP)) {
    sessionStorage.setItem(SS_SHOP, shop);
    localStorage.removeItem(SS_SHOP);
  }
}

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function persistSession(uid, username, fullName, email = null) {
  sessionStorage.setItem(SS_UID, uid);
  sessionStorage.setItem(SS_USER, username || '');
  sessionStorage.setItem(SS_NAME, fullName || '');
  if (email && String(email).trim()) {
    sessionStorage.setItem(SS_EMAIL, String(email).trim().toLowerCase());
  } else {
    sessionStorage.removeItem(SS_EMAIL);
  }
}

function clearSession() {
  sessionStorage.removeItem(SS_UID);
  sessionStorage.removeItem(SS_USER);
  sessionStorage.removeItem(SS_NAME);
  sessionStorage.removeItem(SS_EMAIL);
}

/** After zb_login, create Node session: zb_simple_users → users + session (see POST /api/auth/zb-simple-session). */
async function tryEstablishNodeSession(username, password) {
  const deviceId = localStorage.getItem('deviceId') || 'unknown';
  const cfg = {
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    // Allow backend time for DB retries (see backend/db.js) on slow Supabase/network paths.
    timeout: 60000,
  };
  const base = getServerUrl();
  const save = (data) => {
    if (data?.sessionId) {
      localStorage.setItem('sessionId', data.sessionId);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
  };
  try {
    const { data } = await axios.post(`${base}/auth/zb-simple-session`, { username, password }, cfg);
    if (data?.sessionId) {
      save(data);
      return;
    }
  } catch (e) {
    if (e.response?.status === 503) {
      console.warn(
        '[Zentrya Biz] API session failed — database unreachable:',
        e.response?.data?.message || e.message
      );
    }
    // fall through — legacy-only account or old backend
  }
  try {
    const { data } = await axios.post(`${base}/auth/login`, { username, password }, cfg);
    save(data);
  } catch {
    /* Zentrya-only or API down */
  }
}

export const AuthProvider = ({ children }) => {
  if (typeof window !== 'undefined') {
    migrateLegacyLocalStorage();
  }

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeShopId, setActiveShopIdState] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(SS_SHOP) || '' : ''
  );

  const setActiveShopId = (shopId) => {
    const v = shopId || '';
    setActiveShopIdState(v);
    if (v) sessionStorage.setItem(SS_SHOP, v);
    else sessionStorage.removeItem(SS_SHOP);
    try {
      const uid = user?.id || sessionStorage.getItem(SS_UID);
      if (v && uid) localStorage.setItem(`zb_last_shop_${String(uid)}`, v);
    } catch {
      /* ignore quota */
    }
  };

  const applyLocalUser = (uid) => {
    const username = sessionStorage.getItem(SS_USER) || '';
    const name = sessionStorage.getItem(SS_NAME) || username;
    const email = sessionStorage.getItem(SS_EMAIL) || null;
    setUser({
      id: uid,
      username,
      name,
      email,
      user_metadata: { full_name: name },
    });
  };

  const refreshProfile = async (uid = user?.id || sessionStorage.getItem(SS_UID)) => {
    if (!supabase || !uid) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) throw error;
    setProfile(data || null);
    return data;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const uid = sessionStorage.getItem(SS_UID);
      if (!uid) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        applyLocalUser(uid);
        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        if (!cancelled) {
          if (error || !data) {
            clearSession();
            setUser(null);
            setProfile(null);
          } else {
            setProfile(data);
          }
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unwrapRpc = (data) => {
    if (data == null) return null;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  };

  const signInWithPassword = async (email, password) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    const em = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return { success: false, error: 'Enter a valid email address' };
    }
    const { data: raw, error } = await supabase.rpc('zb_login', {
      p_username: em,
      p_password: password,
    });
    if (error) return { success: false, error: error.message };
    const data = unwrapRpc(raw);
    if (!data?.ok) return { success: false, error: data?.error || 'Login failed' };

    persistSession(data.user_id, data.username, data.full_name, em);
    applyLocalUser(data.user_id);
    await tryEstablishNodeSession(em, password);
    try {
      await refreshProfile(data.user_id);
    } catch {
      setProfile(null);
    }
    return { success: true };
  };

  const signUpWithEmail = async ({ password, fullName, email, otp }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    const em = String(email || '').trim().toLowerCase();
    const code = String(otp || '').trim();
    if (!em || !em.includes('@')) {
      return { success: false, error: 'Enter a valid email address' };
    }
    if (!/^\d{6}$/.test(code)) {
      return { success: false, error: 'Enter the 6-digit code sent to your email' };
    }

    try {
      const res = await authAPI.zbSignupWithOtp({
        fullName: fullName || '',
        email: em,
        /** Older backends still validate `username`; login id is the email. */
        username: em,
        password,
        otp: code,
      });
      const data = res.data;
      const status = res.status;
      if (status >= 400 || !data?.ok) {
        return {
          success: false,
          error: data?.error || data?.message || 'Signup failed',
        };
      }

      persistSession(data.user_id, data.username, data.full_name, em);
      applyLocalUser(data.user_id);
      await tryEstablishNodeSession(em, password);
      try {
        await refreshProfile(data.user_id);
      } catch {
        setProfile(null);
      }
      return { success: true, userId: data.user_id };
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Signup failed';
      return { success: false, error: msg };
    }
  };

  const signInWithGoogle = async () => ({
    success: false,
    error: 'Google sign-in is not enabled.',
  });

  const logout = async () => {
    clearSession();
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    queryClient.clear();
    setUser(null);
    setProfile(null);
    setActiveShopId('');
  };

  /** Owner = shop account holder (signup + creates shops); admin = elevated. Salesman = staff. */
  const isAdmin = () => {
    const r = profile?.role;
    return r === 'admin' || r === 'owner';
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      activeShopId,
      setActiveShopId,
      refreshProfile,
      signInWithPassword,
      signUpWithEmail,
      signInWithGoogle,
      logout,
      isAdmin,
    }),
    [user, profile, loading, activeShopId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
