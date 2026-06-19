/**
 * Auth: Supabase only — zb_signup / zb_login RPC + table zb_simple_users (see database SQL).
 * "Remember me" (login): localStorage + 4-day expiry. Without it: tab session only (sessionStorage).
 */

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { getServerUrl } from '../utils/connectionStatus';
import { authAPI } from '../services/api';
import { queryClient } from '../lib/queryClient';
import { notifyBackendSessionChanged } from '../lib/appMode';
import { getDeviceId } from '../utils/deviceFingerprint';
import { clearOfflineMutationQueue } from '../lib/offlineMutationQueue';

const SS_UID = 'zb_simple_uid';
const SS_USER = 'zb_simple_username';
const SS_NAME = 'zb_simple_full_name';
const SS_EMAIL = 'zb_simple_email';
const SS_SHOP = 'zb_active_shop_id';
const SS_PENDING_UID = 'zb_pending_uid';
const SS_PENDING_USER = 'zb_pending_username';
const SS_PENDING_NAME = 'zb_pending_full_name';
const SS_PENDING_EMAIL = 'zb_pending_email';
const SS_PENDING_OTP_KIND = 'zb_pending_otp_kind';
const SS_PENDING_REMEMBER = 'zb_pending_remember';
const SS_PENDING_AUTH_METHOD = 'zb_pending_auth_method';

/** Epoch ms when local auth + POS session should be treated as expired (4-day browser session). */
const LS_EXPIRES = 'zb_auth_expires_at';
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function isInvalidCredentialsHint(hint) {
  const h = String(hint || '').toLowerCase();
  return (
    h.includes('http 401') ||
    h.includes('invalid credentials') ||
    h.includes('not found or incorrect') ||
    h.includes('username/password') ||
    h.includes('email or password')
  );
}

/** User-facing login errors — no API / zb-simple-session jargon. */
function formatLoginError(hint) {
  const raw = String(hint || '');
  const h = raw.toLowerCase();
  if (h.includes('google sign-in') || h.includes('continue with google')) {
    return raw.includes('Gmail') || raw.includes('Google')
      ? raw
      : 'This account uses Google sign-in. Click Continue with Google — your Gmail password is not used here.';
  }
  if (isInvalidCredentialsHint(hint)) {
    return 'Email or Password incorrect';
  }
  if (h.includes('too many') || h.includes('please wait')) {
    return String(hint || 'Too many login attempts. Please wait and try again.');
  }
  if (h.includes('err_network') || h.includes('network error') || h.includes('unreachable')) {
    return 'Cannot reach server. Check your connection and try again.';
  }
  return 'Email or Password incorrect';
}

/** If user already chose persistent login, copy shop id from session → local once. */
function migrateLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  const lsUid = localStorage.getItem(SS_UID);
  const ssShop = sessionStorage.getItem(SS_SHOP);
  const lsShop = localStorage.getItem(SS_SHOP);
  if (lsUid && ssShop && !lsShop) {
    localStorage.setItem(SS_SHOP, ssShop);
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

// Prevent API hammering on login (zb-simple-session) → backend may rate-limit (429).
let zbNodeSessionInFlight = null;
let zbNodeSessionCooldownUntilMs = 0;

function isExpiredPlanValue(plan) {
  return String(plan || '').trim().toLowerCase() === 'expired';
}

function persistSession(uid, username, fullName, email = null, rememberLong = true) {
  if (rememberLong) {
    const exp = Date.now() + FOUR_DAYS_MS;
    localStorage.setItem(SS_UID, uid);
    localStorage.setItem(SS_USER, username || '');
    localStorage.setItem(SS_NAME, fullName || '');
    localStorage.setItem(LS_EXPIRES, String(exp));
    if (email && String(email).trim()) {
      localStorage.setItem(SS_EMAIL, String(email).trim().toLowerCase());
    } else {
      localStorage.removeItem(SS_EMAIL);
    }
    try {
      sessionStorage.removeItem(SS_UID);
      sessionStorage.removeItem(SS_USER);
      sessionStorage.removeItem(SS_NAME);
      sessionStorage.removeItem(SS_EMAIL);
    } catch {
      /* ignore */
    }
  } else {
    try {
      localStorage.removeItem(SS_UID);
      localStorage.removeItem(SS_USER);
      localStorage.removeItem(SS_NAME);
      localStorage.removeItem(SS_EMAIL);
      localStorage.removeItem(LS_EXPIRES);
      localStorage.removeItem(SS_SHOP);
    } catch {
      /* ignore */
    }
    sessionStorage.setItem(SS_UID, uid);
    sessionStorage.setItem(SS_USER, username || '');
    sessionStorage.setItem(SS_NAME, fullName || '');
    if (email && String(email).trim()) {
      sessionStorage.setItem(SS_EMAIL, String(email).trim().toLowerCase());
    } else {
      sessionStorage.removeItem(SS_EMAIL);
    }
  }
}

/** POS `sessionId` for `x-session-id` — local when "remember me", else tab-only. */
function storePosSessionId(sessionId, rememberLong = true) {
  if (!sessionId) return;
  if (rememberLong) {
    try {
      sessionStorage.removeItem('sessionId');
    } catch {
      /* ignore */
    }
    localStorage.setItem('sessionId', sessionId);
  } else {
    try {
      localStorage.removeItem('sessionId');
    } catch {
      /* ignore */
    }
    sessionStorage.setItem('sessionId', sessionId);
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SS_UID);
    sessionStorage.removeItem(SS_USER);
    sessionStorage.removeItem(SS_NAME);
    sessionStorage.removeItem(SS_EMAIL);
    sessionStorage.removeItem(SS_SHOP);
    sessionStorage.removeItem('sessionId');
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(SS_UID);
    localStorage.removeItem(SS_USER);
    localStorage.removeItem(SS_NAME);
    localStorage.removeItem(SS_EMAIL);
    localStorage.removeItem(SS_SHOP);
    localStorage.removeItem(LS_EXPIRES);
    localStorage.removeItem('sessionId');
  } catch {
    /* ignore */
  }
}

function persistPendingOtp(uid, username, fullName, email, otpKind = 'mfa', rememberLong = true) {
  sessionStorage.setItem(SS_PENDING_UID, String(uid || ''));
  sessionStorage.setItem(SS_PENDING_USER, String(username || ''));
  sessionStorage.setItem(SS_PENDING_NAME, String(fullName || ''));
  sessionStorage.setItem(SS_PENDING_EMAIL, String(email || '').trim().toLowerCase());
  sessionStorage.setItem(SS_PENDING_OTP_KIND, String(otpKind || 'mfa'));
  sessionStorage.setItem(SS_PENDING_REMEMBER, rememberLong ? '1' : '0');
}

function clearPendingOtp() {
  sessionStorage.removeItem(SS_PENDING_UID);
  sessionStorage.removeItem(SS_PENDING_USER);
  sessionStorage.removeItem(SS_PENDING_NAME);
  sessionStorage.removeItem(SS_PENDING_EMAIL);
  sessionStorage.removeItem(SS_PENDING_OTP_KIND);
  sessionStorage.removeItem(SS_PENDING_REMEMBER);
  sessionStorage.removeItem(SS_PENDING_AUTH_METHOD);
}

function hasPosApiSession() {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId'));
}

function shouldPromptSignupRole(profileRow) {
  if (!hasPosApiSession()) return false;
  const kind = profileRow?.signup_kind;
  return kind == null || String(kind).trim() === '';
}

/**
 * After zb_login, create Node session (POST /api/auth/zb-simple-session → sessionId → x-session-id).
 * @returns {{ ok: true }} | {{ ok: true, pendingOtp: true, emailHint?: string, otpKind?: string }} | {{ ok: false, hint: string }}
 */
async function tryEstablishNodeSession(username, password, rememberLong = true) {
  const now = Date.now();
  if (now < zbNodeSessionCooldownUntilMs) {
    const secs = Math.max(1, Math.ceil((zbNodeSessionCooldownUntilMs - now) / 1000));
    return { ok: false, hint: `Too many login attempts. Please wait ${secs}s and try again.` };
  }
  if (zbNodeSessionInFlight) {
    return zbNodeSessionInFlight;
  }

  let hint = '';
  let deviceId;
  try {
    deviceId = getDeviceId();
  } catch {
    deviceId = localStorage.getItem('deviceId') || localStorage.getItem('device_id') || 'unknown';
  }
  const cfg = {
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    timeout: 60000,
  };
  const base = getServerUrl();
  const save = (data) => {
    if (data?.sessionId) {
      storePosSessionId(data.sessionId, rememberLong);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      notifyBackendSessionChanged();
    }
  };

  zbNodeSessionInFlight = (async () => {
    try {
      const { data } = await axios.post(`${base}/auth/zb-simple-session`, { username, password }, cfg);
      if (data?.success && data?.requiresOtp) {
        return {
          ok: true,
          pendingOtp: true,
          emailHint: data.emailHint || '',
          otpKind: data.otpKind === 'new_device' ? 'new_device' : 'mfa',
          user_id: data.user_id,
          username: data.username,
          full_name: data.full_name,
          email: data.email,
          plan: data.plan,
          trial_ends_at: data.trial_ends_at,
          stripe_current_period_end: data.stripe_current_period_end,
        };
      }
      if (data?.sessionId) {
        save(data);
        return {
          ok: true,
          user_id: data.user_id,
          username: data.username,
          full_name: data.full_name,
          email: data.email,
          plan: data.plan,
          trial_ends_at: data.trial_ends_at,
          stripe_current_period_end: data.stripe_current_period_end,
        };
      }
      hint = isInvalidCredentialsHint(data?.message || data?.error)
        ? 'Email or Password incorrect'
        : data?.message || data?.error || 'zb-simple-session returned no sessionId';
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || String(e);
      const code = e.response?.status;
      if (e.response?.data?.authMethod === 'google' || String(msg).toLowerCase().includes('google sign-in')) {
        hint = msg;
      } else if (code === 401 || isInvalidCredentialsHint(msg)) {
        hint = 'Email or Password incorrect';
      } else if (code === 429) {
        hint = 'Too many requests. Please wait a bit and try again.';
      } else {
        hint = code ? `zb-simple-session HTTP ${code}: ${msg}` : msg;
      }

      // Rate limited: back off locally so we don't keep hammering.
      if (code === 429) {
        zbNodeSessionCooldownUntilMs = Date.now() + 30 * 1000;
        try {
          localStorage.removeItem('sessionId');
          sessionStorage.removeItem('sessionId');
          localStorage.removeItem('user');
          notifyBackendSessionChanged();
        } catch {
          /* ignore */
        }
      }

      if (code === 503) {
        console.warn('[Zentrya Biz] API session failed — database unreachable:', msg);
      } else if (e.code === 'ERR_NETWORK' || !e.response) {
        console.warn(
          '[Zentrya Biz] API session unreachable (REACT_APP_BACKEND_URL, LAN override in localStorage hisaabkitab_server_url on production, or CORS):',
          msg
        );
      } else {
        console.warn('[Zentrya Biz] zb-simple-session:', code, msg);
      }
    }

    // If rate-limited, do NOT attempt legacy fallback (would just add more requests).
    if (Date.now() < zbNodeSessionCooldownUntilMs) {
      return { ok: false, hint: 'Too many requests. Please wait a bit and try again.' };
    }

    try {
      const { data } = await axios.post(`${base}/auth/login`, { username, password }, cfg);
      save(data);
    } catch (_) {
      /* legacy login only */
    }

    return localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId')
      ? { ok: true }
      : {
          ok: false,
          hint:
            hint ||
            'POS API session missing. Uses API base: ' +
              base +
              ' — clear LAN server override in Settings → Connection / localStorage key hisaabkitab_server_url.',
        };
  })().finally(() => {
    zbNodeSessionInFlight = null;
  });

  return zbNodeSessionInFlight;
}

/**
 * Google Sign-In → POST /auth/google (does not use zb_login or password).
 */
async function tryEstablishGoogleSession(credential, rememberLong = true) {
  let deviceId;
  try {
    deviceId = getDeviceId();
  } catch {
    deviceId = localStorage.getItem('deviceId') || 'unknown';
  }
  const cfg = {
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    timeout: 60000,
  };
  const base = getServerUrl();
  const save = (data) => {
    if (data?.sessionId) {
      storePosSessionId(data.sessionId, rememberLong);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      notifyBackendSessionChanged();
    }
  };

  try {
    const { data } = await axios.post(`${base}/auth/google`, { credential }, cfg);
    if (data?.success && data?.requiresOtp) {
      return {
        ok: true,
        pendingOtp: true,
        emailHint: data.emailHint || '',
        otpKind: data.otpKind === 'new_device' ? 'new_device' : 'mfa',
        user_id: data.user_id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        plan: data.plan,
        trial_ends_at: data.trial_ends_at,
        stripe_current_period_end: data.stripe_current_period_end,
        isNewAccount: Boolean(data.isNewAccount),
        needsSignupRole: Boolean(data.needsSignupRole),
      };
    }
    if (data?.sessionId) {
      save(data);
      return {
        ok: true,
        user_id: data.user_id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        plan: data.plan,
        trial_ends_at: data.trial_ends_at,
        stripe_current_period_end: data.stripe_current_period_end,
        isNewAccount: Boolean(data.isNewAccount),
        needsSignupRole: Boolean(data.needsSignupRole),
      };
    }
    const hint = data?.message || data?.error || 'Google sign-in returned no session';
    return { ok: false, hint };
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || e.message || String(e);
    const code = e.response?.status;
    if (code === 404) {
      return {
        ok: false,
        hint: 'Google sign-in is not active on the backend yet. Redeploy the backend and try again.',
      };
    }
    return { ok: false, hint: code ? `Google sign-in HTTP ${code}: ${msg}` : msg };
  }
}

async function completeZbNodeLoginWithOtp(username, password, otp, otpKind = 'mfa', rememberLong = true) {
  let deviceId;
  try {
    deviceId = getDeviceId();
  } catch {
    deviceId = localStorage.getItem('deviceId') || localStorage.getItem('device_id') || 'unknown';
  }
  const cfg = {
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    timeout: 60000,
  };
  const base = getServerUrl();
  try {
    const { data } = await axios.post(
      `${base}/auth/zb-simple-session/verify-otp`,
      { username, password, otp, otpKind },
      cfg
    );
    if (data?.sessionId) {
      storePosSessionId(data.sessionId, rememberLong);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      notifyBackendSessionChanged();
      return { ok: true };
    }
    return {
      ok: false,
      hint: data?.message || data?.error || 'No session returned',
    };
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || e.message || String(e);
    const code = e.response?.status;
    const msgLc = String(msg || '').toLowerCase();
    if (code === 400 && (msgLc.includes('incorrect') || msgLc.includes('invalid') || msgLc.includes('otp'))) {
      return { ok: false, hint: 'Invalid OTP' };
    }
    return {
      ok: false,
      hint: code ? `Verify OTP HTTP ${code}: ${msg}` : msg,
    };
  }
}

async function completeGoogleLoginWithOtp(email, otp, otpKind = 'mfa', rememberLong = true) {
  let deviceId;
  try {
    deviceId = getDeviceId();
  } catch {
    deviceId = localStorage.getItem('deviceId') || 'unknown';
  }
  const cfg = {
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    timeout: 60000,
  };
  const base = getServerUrl();
  try {
    const { data } = await axios.post(
      `${base}/auth/google/verify-otp`,
      {
        email: String(email || '').trim().toLowerCase(),
        otp,
        otpKind,
      },
      cfg
    );
    if (data?.sessionId) {
      storePosSessionId(data.sessionId, rememberLong);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      notifyBackendSessionChanged();
      return {
        ok: true,
        user_id: data.user_id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        needsSignupRole: Boolean(data.needsSignupRole),
        isNewAccount: Boolean(data.isNewAccount),
      };
    }
    return {
      ok: false,
      hint: data?.message || data?.error || 'No session returned',
    };
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || e.message || String(e);
    const code = e.response?.status;
    const msgLc = String(msg || '').toLowerCase();
    if (code === 400 && (msgLc.includes('incorrect') || msgLc.includes('invalid') || msgLc.includes('otp'))) {
      return { ok: false, hint: 'Invalid OTP' };
    }
    return {
      ok: false,
      hint: code ? `Verify OTP HTTP ${code}: ${msg}` : msg,
    };
  }
}

export const AuthProvider = ({ children }) => {
  if (typeof window !== 'undefined') {
    migrateLegacyLocalStorage();
  }

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signupRolePrompt, setSignupRolePrompt] = useState(false);

  const [activeShopId, setActiveShopIdState] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem(SS_SHOP) || sessionStorage.getItem(SS_SHOP) || ''
      : ''
  );

  const setActiveShopId = (shopId) => {
    const v = shopId || '';
    setActiveShopIdState(v);
    const persistShop = Boolean(localStorage.getItem(SS_UID));
    if (v) {
      if (persistShop) {
        localStorage.setItem(SS_SHOP, v);
        try {
          sessionStorage.removeItem(SS_SHOP);
        } catch {
          /* ignore */
        }
      } else {
        sessionStorage.setItem(SS_SHOP, v);
        try {
          localStorage.removeItem(SS_SHOP);
        } catch {
          /* ignore */
        }
      }
    } else {
      try {
        localStorage.removeItem(SS_SHOP);
        sessionStorage.removeItem(SS_SHOP);
      } catch {
        /* ignore */
      }
    }
    try {
      const uid = user?.id || localStorage.getItem(SS_UID) || sessionStorage.getItem(SS_UID);
      if (v && uid) localStorage.setItem(`zb_last_shop_${String(uid)}`, v);
    } catch {
      /* ignore quota */
    }
  };

  const applyLocalUser = (uid) => {
    const username =
      localStorage.getItem(SS_USER) || sessionStorage.getItem(SS_USER) || '';
    const name = localStorage.getItem(SS_NAME) || sessionStorage.getItem(SS_NAME) || username;
    const email =
      localStorage.getItem(SS_EMAIL) || sessionStorage.getItem(SS_EMAIL) || null;
    setUser({
      id: uid,
      username,
      name,
      email,
      user_metadata: { full_name: name },
    });
  };

  const refreshProfile = async (
    uid = user?.id || localStorage.getItem(SS_UID) || sessionStorage.getItem(SS_UID)
  ) => {
    if (!supabase || !uid) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) throw error;
    setProfile(data || null);
    setSignupRolePrompt(shouldPromptSignupRole(data));
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
      const lsUid = localStorage.getItem(SS_UID);
      const ssUid = sessionStorage.getItem(SS_UID);
      const uid = lsUid || ssUid;
      if (!uid) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (lsUid) {
        const expRaw = localStorage.getItem(LS_EXPIRES);
        const exp = expRaw ? parseInt(expRaw, 10) : 0;
        if (!exp || Number.isNaN(exp) || Date.now() > exp) {
          clearSession();
          try {
            localStorage.removeItem('sessionId');
            sessionStorage.removeItem('sessionId');
            localStorage.removeItem('user');
            queryClient.clear();
            notifyBackendSessionChanged();
          } catch {
            /* ignore */
          }
          setActiveShopIdState('');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
      }
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        if (!cancelled) {
          if (error || !data) {
            clearSession();
            setUser(null);
            setProfile(null);
          } else if (!localStorage.getItem('sessionId') && !sessionStorage.getItem('sessionId')) {
            /* Supabase tab restore without POS API session → every /api call is 401 */
            clearSession();
            try {
              localStorage.removeItem('sessionId');
              sessionStorage.removeItem('sessionId');
              localStorage.removeItem('user');
              queryClient.clear();
              notifyBackendSessionChanged();
            } catch {
              /* ignore */
            }
            try {
              localStorage.removeItem(SS_SHOP);
              sessionStorage.removeItem(SS_SHOP);
            } catch {
              /* ignore */
            }
            setActiveShopIdState('');
            setUser(null);
            setProfile(null);
            console.warn(
              '[Zentrya Biz] Cleared stale browser session: zb_simple_* without sessionId. Sign in again so zb-simple-session can set x-session-id.'
            );
          } else {
            applyLocalUser(uid);
            setProfile(data);
            setSignupRolePrompt(shouldPromptSignupRole(data));
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

  const signInWithPassword = async (email, password, rememberLong = false) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' };
    const em = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      return { success: false, error: 'Enter a valid email address' };
    }

    const apiSess = await tryEstablishNodeSession(em, password, rememberLong);
    if (apiSess.ok && apiSess.pendingOtp) {
      // Do NOT mark user as logged-in yet; App.js would redirect away from /login.
      // Store minimal pending info so OTP page survives refresh.
      persistPendingOtp(
        apiSess.user_id,
        apiSess.username,
        apiSess.full_name,
        apiSess.email || em,
        apiSess.otpKind || 'mfa',
        rememberLong
      );
      setSignupRolePrompt(false);
      return {
        success: true,
        pendingOtp: true,
        emailHint: apiSess.emailHint || '',
        otpKind: apiSess.otpKind || 'mfa',
        email: apiSess.email || em,
      };
    }
    if (!apiSess.ok) {
      clearPendingOtp();
      clearSession();
      setUser(null);
      setProfile(null);
      try {
        localStorage.removeItem('sessionId');
        sessionStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        notifyBackendSessionChanged();
      } catch {
        /* ignore */
      }
      return {
        success: false,
        error: formatLoginError(apiSess.hint),
      };
    }

    clearPendingOtp();
    if (!apiSess.user_id) {
      return { success: false, error: 'Login succeeded but user profile was not returned. Please redeploy backend.' };
    }
    persistSession(apiSess.user_id, apiSess.username, apiSess.full_name, apiSess.email || em, rememberLong);
    applyLocalUser(apiSess.user_id);
    void refreshProfile(apiSess.user_id).catch(() => setProfile(null));
    return {
      success: true,
      userId: apiSess.user_id,
      subscriptionExpired: isExpiredPlanValue(apiSess.plan),
      plan: apiSess.plan,
      trialEndsAt: apiSess.trial_ends_at,
    };
  };

  const completeSignInWithNodeOtp = async (username, password, otp) => {
    const uid =
      localStorage.getItem(SS_UID) ||
      sessionStorage.getItem(SS_UID) ||
      sessionStorage.getItem(SS_PENDING_UID);
    const code = String(otp || '').replace(/\D/g, '').slice(0, 6);
    const otpKind = sessionStorage.getItem(SS_PENDING_OTP_KIND) || 'mfa';
    const rememberLong = sessionStorage.getItem(SS_PENDING_REMEMBER) !== '0';
    const r = await completeZbNodeLoginWithOtp(
      String(username || '').trim().toLowerCase(),
      password,
      code,
      otpKind === 'new_device' ? 'new_device' : 'mfa',
      rememberLong
    );
    if (!r.ok) {
      return { success: false, error: r.hint || 'Verification failed' };
    }
    const pendingUid = uid || '';
    const pendingUser = sessionStorage.getItem(SS_PENDING_USER) || '';
    const pendingName = sessionStorage.getItem(SS_PENDING_NAME) || pendingUser;
    const pendingEmail = sessionStorage.getItem(SS_PENDING_EMAIL) || null;
    clearPendingOtp();
    if (pendingUid) {
      persistSession(pendingUid, pendingUser, pendingName, pendingEmail, rememberLong);
      applyLocalUser(pendingUid);
    }
    try {
      if (pendingUid) await refreshProfile(pendingUid);
    } catch {
      setProfile(null);
    }
    return { success: true };
  };

  /** Sign in with Google (GIS credential). Email/password login unchanged. */
  const signInWithGoogle = async (credential, rememberLong = false) => {
    if (!credential) {
      return { success: false, error: 'Google sign-in was cancelled' };
    }
    const apiSess = await tryEstablishGoogleSession(credential, rememberLong);
    if (apiSess.ok && apiSess.pendingOtp) {
      persistPendingOtp(
        apiSess.user_id,
        apiSess.username,
        apiSess.full_name,
        apiSess.email,
        apiSess.otpKind || 'mfa',
        rememberLong
      );
      sessionStorage.setItem(SS_PENDING_AUTH_METHOD, 'google');
      setSignupRolePrompt(false);
      return {
        success: true,
        pendingOtp: true,
        emailHint: apiSess.emailHint || '',
        otpKind: apiSess.otpKind || 'mfa',
        email: apiSess.email || '',
        isNewAccount: Boolean(apiSess.isNewAccount),
        needsSignupRole: Boolean(apiSess.needsSignupRole),
      };
    }
    if (!apiSess.ok) {
      clearPendingOtp();
      return { success: false, error: apiSess.hint || 'Google sign-in failed' };
    }

    clearPendingOtp();
    sessionStorage.removeItem(SS_PENDING_AUTH_METHOD);
    persistSession(apiSess.user_id, apiSess.username, apiSess.full_name, apiSess.email, rememberLong);
    applyLocalUser(apiSess.user_id);
    try {
      await refreshProfile(apiSess.user_id);
    } catch {
      setProfile(null);
    }
    if (apiSess.needsSignupRole) {
      setSignupRolePrompt(true);
    }
    return {
      success: true,
      isNewAccount: Boolean(apiSess.isNewAccount),
      userId: apiSess.user_id,
      needsSignupRole: Boolean(apiSess.needsSignupRole),
      subscriptionExpired: isExpiredPlanValue(apiSess.plan),
      plan: apiSess.plan,
      trialEndsAt: apiSess.trial_ends_at,
    };
  };

  const completeSignInWithGoogleOtp = async (email, otp) => {
    const otpKind = sessionStorage.getItem(SS_PENDING_OTP_KIND) || 'mfa';
    const rememberLong = sessionStorage.getItem(SS_PENDING_REMEMBER) !== '0';
    const r = await completeGoogleLoginWithOtp(
      String(email || '').trim().toLowerCase(),
      otp,
      otpKind === 'new_device' ? 'new_device' : 'mfa',
      rememberLong
    );
    if (!r.ok) {
      return { success: false, error: r.hint || 'Verification failed' };
    }
    const pendingUser = sessionStorage.getItem(SS_PENDING_USER) || '';
    const pendingName = sessionStorage.getItem(SS_PENDING_NAME) || pendingUser;
    const pendingEmail = sessionStorage.getItem(SS_PENDING_EMAIL) || email;
    clearPendingOtp();
    sessionStorage.removeItem(SS_PENDING_AUTH_METHOD);
    if (r.user_id) {
      persistSession(r.user_id, r.username || pendingUser, r.full_name || pendingName, pendingEmail, rememberLong);
      applyLocalUser(r.user_id);
    }
    try {
      if (r.user_id) await refreshProfile(r.user_id);
    } catch {
      setProfile(null);
    }
    if (r.needsSignupRole) {
      setSignupRolePrompt(true);
    }
    return { success: true, needsSignupRole: Boolean(r.needsSignupRole), userId: r.user_id };
  };

  const completeSignupRole = async (accountType) => {
    const res = await authAPI.completeSignupRole({
      accountType: accountType === 'cashier' ? 'cashier' : 'shop_owner',
    });
    const uid = user?.id || localStorage.getItem(SS_UID) || sessionStorage.getItem(SS_UID);
    if (uid) await refreshProfile(uid);
    setSignupRolePrompt(false);
    return res.data;
  };

  const signUpWithEmail = async ({ password, fullName, email, otp, accountType }) => {
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
        accountType: accountType === 'cashier' ? 'cashier' : 'shop_owner',
      });
      const data = res.data;
      const status = res.status;
      if (status >= 400 || !data?.ok) {
        return {
          success: false,
          error: data?.error || data?.message || 'Signup failed',
        };
      }

      persistSession(data.user_id, data.username, data.full_name, em, true);
      applyLocalUser(data.user_id);
      const apiSess = await tryEstablishNodeSession(em, password, true);
      if (apiSess.pendingOtp) {
        clearSession();
        setUser(null);
        setProfile(null);
        try {
          localStorage.removeItem('sessionId');
          sessionStorage.removeItem('sessionId');
          localStorage.removeItem('user');
          notifyBackendSessionChanged();
        } catch {
          /* ignore */
        }
        return {
          success: false,
          error:
            'Account created. Open Sign in and enter your email and password — a security code may be emailed for this browser before the dashboard loads.',
        };
      }
      if (!apiSess.ok) {
        clearSession();
        setUser(null);
        setProfile(null);
        try {
          localStorage.removeItem('sessionId');
          sessionStorage.removeItem('sessionId');
          localStorage.removeItem('user');
          notifyBackendSessionChanged();
        } catch {
          /* ignore */
        }
        return {
          success: false,
          error:
            'Account created but POS API session failed. ' +
            (apiSess.hint || 'Check backend URL and zb-simple-session in Network.'),
        };
      }
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

  const logout = useCallback(async () => {
    try {
      await clearOfflineMutationQueue();
    } catch {
      /* ignore */
    }
    clearSession();
    localStorage.removeItem('user');
    notifyBackendSessionChanged();
    queryClient.clear();
    setUser(null);
    setProfile(null);
    setActiveShopIdState('');
    try {
      sessionStorage.removeItem(SS_SHOP);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const check = () => {
      const raw = localStorage.getItem(LS_EXPIRES);
      const exp = raw ? parseInt(raw, 10) : 0;
      if (exp && !Number.isNaN(exp) && Date.now() > exp) {
        void logout();
      }
    };
    const id = setInterval(check, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, logout]);

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
      signInWithGoogle,
      completeSignInWithNodeOtp,
      completeSignInWithGoogleOtp,
      signUpWithEmail,
      logout,
      isAdmin,
      signupRolePrompt,
      completeSignupRole,
    }),
    [user, profile, loading, activeShopId, logout, signupRolePrompt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
