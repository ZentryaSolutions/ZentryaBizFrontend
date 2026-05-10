import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseBrowserConfigured, supabase } from '../../lib/supabaseClient';
import { authAPI, otpAPI } from '../../services/api';
import AuthPasswordField from './AuthPasswordField';
import AuthOtpBoxes from './AuthOtpBoxes';
import { IconEnvelope } from './authIcons';
import './AuthPages.css';

const REMEMBER_EMAIL_KEY = 'zb_auth_remember_email';
const PENDING_OTP_EMAIL_KEY = 'zb_pending_email';
const PENDING_OTP_KIND_KEY = 'zb_pending_otp_kind';

export default function LoginPage() {
  const {
    signInWithPassword,
    completeSignInWithNodeOtp,
    completeGoogleOAuthFromRedirect,
    completeSignInWithGoogleOtp,
    signInWithGoogle,
    logout,
  } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPass, setForgotPass] = useState('');
  const [forgotPass2, setForgotPass2] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [passwordResetBanner, setPasswordResetBanner] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [nodeOtpStep, setNodeOtpStep] = useState(false);
  const [nodeOtpKind, setNodeOtpKind] = useState('mfa');
  const [loginOtp, setLoginOtp] = useState('');
  const [nodeOtpHint, setNodeOtpHint] = useState('');
  const [otpSending, setOtpSending] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const next = searchParams.get('next') || '/app';
  const justRegistered = searchParams.get('registered') === '1';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }

    // If a 2FA login was started, keep OTP UI visible on refresh.
    try {
      const pendingEmail = sessionStorage.getItem(PENDING_OTP_EMAIL_KEY);
      const kind = sessionStorage.getItem(PENDING_OTP_KIND_KEY);
      if (pendingEmail && String(pendingEmail).trim()) {
        setEmail(String(pendingEmail).trim());
        setNodeOtpStep(true);
        setNodeOtpKind(kind === 'new_device' ? 'new_device' : 'mfa');
        setNodeOtpHint(
          kind === 'new_device'
            ? 'New browser — enter the security code we emailed you.'
            : 'Enter the code we sent to your email.'
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* After Google OAuth redirect, exchange Supabase token for POS session */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseBrowserConfigured() || !supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      setLoading(true);
      setError('');
      const r = await completeGoogleOAuthFromRedirect();
      if (cancelled) return;
      if (!r.success) {
        if (r.skipped) {
          setLoading(false);
          return;
        }
        setError(r.error || 'Google sign-in failed');
        setLoading(false);
        return;
      }
      if (r.pendingOtp) {
        const k = r.otpKind === 'new_device' ? 'new_device' : 'mfa';
        setNodeOtpKind(k);
        setNodeOtpStep(true);
        setLoginOtp('');
        const em =
          (session.user?.email && String(session.user.email).trim().toLowerCase()) ||
          (() => {
            try {
              return sessionStorage.getItem(PENDING_OTP_EMAIL_KEY) || '';
            } catch {
              return '';
            }
          })();
        if (em) setEmail(em);
        if (k === 'new_device') {
          setNodeOtpHint(
            r.emailHint
              ? `We don’t recognize this browser. Code sent to ${r.emailHint}`
              : 'We don’t recognize this browser — enter the code we sent to your email.'
          );
        } else {
          setNodeOtpHint(
            r.emailHint ? `Code sent to ${r.emailHint}` : 'Enter the code we sent to your email.'
          );
        }
        setLoading(false);
        return;
      }
      try {
        const savedEmail = session.user?.email?.trim();
        const rememberLong = sessionStorage.getItem('zb_oauth_remember') !== '0';
        if (rememberLong && savedEmail) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, savedEmail);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      nav(next, { replace: true });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on /login after OAuth redirect
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    if (!isSupabaseBrowserConfigured()) {
      setError(
        'Supabase is not in this build yet. On your PC: copy `frontend/env.template` to `frontend/.env`, paste the same REACT_APP_* values as on Vercel, then restart `npm start`. On Vercel: confirm variables exist and redeploy so the bundle picks them up.'
      );
      return;
    }
    setLoading(true);
    try {
      const r = await signInWithGoogle(rememberMe);
      if (!r.success) setError(r.error || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setMode('forgot');
    setForgotEmail(email.trim() || '');
    setForgotStep(1);
    setForgotOtp('');
    setForgotPass('');
    setForgotPass2('');
    setForgotError('');
    setForgotSuccess('');
    setError('');
    setPasswordResetBanner(false);
  };

  const backToLogin = () => {
    setMode('login');
    setForgotError('');
    setForgotSuccess('');
    setForgotStep(1);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!isSupabaseBrowserConfigured()) {
      setError(
        'Supabase is not in this build yet. On your PC: copy `frontend/env.template` to `frontend/.env`, paste the same REACT_APP_* values as on Vercel, then restart `npm start`. On Vercel: confirm variables exist and redeploy so the bundle picks them up.'
      );
      return;
    }
    setLoading(true);
    try {
      const r = await signInWithPassword(email, password, rememberMe);
      if (!r.success) {
        setError(r.error || 'Login failed');
        setLoading(false);
        return;
      }
      if (r.pendingOtp) {
        const k = r.otpKind === 'new_device' ? 'new_device' : 'mfa';
        setNodeOtpKind(k);
        setNodeOtpStep(true);
        setLoginOtp('');
        if (k === 'new_device') {
          setNodeOtpHint(
            r.emailHint
              ? `We don’t recognize this browser. Code sent to ${r.emailHint}`
              : 'We don’t recognize this browser — enter the code we sent to your email.'
          );
        } else {
          setNodeOtpHint(r.emailHint ? `Code sent to ${r.emailHint}` : 'Enter the code we sent to your email.');
        }
        setLoading(false);
        return;
      }
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      nav(next, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyNodeOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = loginOtp.replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      let googleOtp = false;
      try {
        googleOtp = sessionStorage.getItem('zb_google_otp_pending') === '1';
      } catch {
        googleOtp = false;
      }
      const r = googleOtp
        ? await completeSignInWithGoogleOtp(email.trim().toLowerCase(), code)
        : await completeSignInWithNodeOtp(email.trim().toLowerCase(), password, code);
      if (!r.success) {
        setError(r.error || 'Verification failed');
        setLoading(false);
        return;
      }
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      setNodeOtpStep(false);
      setLoginOtp('');
      nav(next, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Enter a valid email');
      return;
    }
    setError('');
    setOtpSending(true);
    try {
      let isGooglePending = false;
      try {
        isGooglePending = sessionStorage.getItem('zb_google_otp_pending') === '1';
      } catch {
        isGooglePending = false;
      }
      if (isGooglePending) {
        if (!supabase) {
          setError('Google sign-in is unavailable.');
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError('Google session expired. Use Continue with Google again.');
          return;
        }
        const { data } = await authAPI.zbSimpleSessionOauth({ access_token: session.access_token });
        if (!(data?.success && data?.requiresOtp)) {
          setError(data?.error || data?.message || 'Could not resend code. Try signing in again.');
          return;
        }
        setNodeOtpHint('A new code was sent to your email.');
        return;
      }
      if (nodeOtpKind === 'new_device') {
        const { data } = await authAPI.zbSimpleSession({ username: em, password });
        if (!(data?.success && data?.requiresOtp)) {
          setError(data?.error || data?.message || 'Could not resend security code. Try signing in again.');
          return;
        }
        setNodeOtpHint('A new security code was sent to your email.');
      } else {
        await otpAPI.request({ email: em, purpose: 'login' });
        setNodeOtpHint('A new code was sent to your email.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not send code';
      setError(msg);
    } finally {
      setOtpSending(false);
    }
  };

  const cancelNodeOtpLogin = async () => {
    let googlePending = false;
    try {
      googlePending = sessionStorage.getItem('zb_google_otp_pending') === '1';
    } catch {
      googlePending = false;
    }
    setNodeOtpStep(false);
    setNodeOtpKind('mfa');
    setLoginOtp('');
    setNodeOtpHint('');
    setError('');
    try {
      if (googlePending && supabase) await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem('zb_google_otp_pending');
    } catch {
      /* ignore */
    }
    await logout();
  };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    const em = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setForgotError('Enter a valid email address');
      return;
    }
    setForgotLoading(true);
    try {
      await otpAPI.request({ email: em, purpose: 'reset' });
      setForgotSuccess('We sent a code to your email. Enter it below with your new password.');
      setForgotStep(2);
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not send code';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    const em = forgotEmail.trim().toLowerCase();
    if (!/^\d{6}$/.test(forgotOtp.trim())) {
      setForgotError('Enter the 6-digit code');
      return;
    }
    if (forgotPass.length < 4) {
      setForgotError('Password must be at least 4 characters');
      return;
    }
    if (forgotPass !== forgotPass2) {
      setForgotError('Passwords do not match');
      return;
    }
    setForgotLoading(true);
    try {
      const { data, status } = await authAPI.zbResetPasswordAfterOtp({
        email: em,
        otp: forgotOtp.trim(),
        newPassword: forgotPass,
      });
      if (status >= 400 || !data?.ok) {
        setForgotError(data?.error || 'Could not reset password');
        return;
      }
      setEmail(em);
      setPassword('');
      setMode('login');
      setForgotStep(1);
      setError('');
      setForgotSuccess('');
      setForgotOtp('');
      setForgotPass('');
      setForgotPass2('');
      setPasswordResetBanner(true);
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Reset failed';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const layoutTitle = mode === 'login' ? 'Sign in' : 'Reset password';
  const layoutSubtitle =
    mode === 'login'
      ? 'Use your email and password for your Zentrya Biz account.'
      : 'We’ll email you a code, then you can choose a new password.';
  const heroTitle = mode === 'login' ? 'Welcome back' : 'Secure your account';
  const heroText =
    mode === 'login'
      ? 'Manage your shops, sales, and daily hisaab from one calm dashboard. Glad to see you again.'
      : 'Choose a strong password and you’ll be back to your workspace in a moment.';

  return (
    <AuthLayout
      title={layoutTitle}
      subtitle={layoutSubtitle}
      heroTitle={heroTitle}
      heroText={heroText}
    >
      <div className="zb-auth__panelWrap">
        {mode === 'login' ? (
          <div className="zb-auth__panel zb-auth__panel--visible" key="login">
            {!isSupabaseBrowserConfigured() ? (
              <div className="zb-auth__notice">
                <strong>Local dev:</strong> create <code>frontend/.env</code> (copy from <code>env.template</code>)
                with <code>REACT_APP_SUPABASE_URL</code> plus either <code>REACT_APP_SUPABASE_PUBLISHABLE_KEY</code>{' '}
                or <code>REACT_APP_SUPABASE_ANON_KEY</code>, then restart <code>npm start</code>.
                <br />
                <strong>Vercel:</strong> same variables must be set on the frontend project — after changing them,
                trigger a new deployment (bundle is built with those values).
              </div>
            ) : null}
            {justRegistered ? (
              <div className="zb-auth__notice zb-auth__notice--success">
                Account created. Log in with your email and password.
              </div>
            ) : null}
            {passwordResetBanner ? (
              <div className="zb-auth__notice zb-auth__notice--success">
                Password updated. Log in with your new password.
              </div>
            ) : null}
            {error ? <div className="zb-auth__notice zb-auth__notice--error">{error}</div> : null}

            {!nodeOtpStep ? (
              <form className="zb-auth__form zb-auth__form--modern" onSubmit={handleLogin}>
                <label className="zb-auth__label zb-auth__label--sr" htmlFor="zb-login-email">
                  Email
                </label>
                <div className="zb-auth__field">
                  <IconEnvelope className="zb-auth__fieldIcon" />
                  <input
                    id="zb-login-email"
                    className="zb-auth__fieldInput"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    required
                  />
                </div>

                <AuthPasswordField
                  id="zb-login-password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                />

                <div className="zb-auth__optionsRow">
                  <label className="zb-auth__remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="zb-auth__linkBtn" onClick={openForgot}>
                    Forgot password?
                  </button>
                </div>

                <button
                  className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? 'Logging in…' : 'Login'}</span>
                </button>

                <div className="zb-auth__divider" aria-hidden="true">
                  or
                </div>

                <button
                  type="button"
                  className="zb-auth__btnGoogle"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                >
                  <svg className="zb-auth__btnGoogleIcon" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.178-5.23C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303a12.02 12.02 0 0 1-4.087 5.571l.003-.002 6.19 5.207C38.739 35.209 44 30.096 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </form>
            ) : (
              <>
                <p className="zb-auth__hint">{nodeOtpHint}</p>
                <form className="zb-auth__form zb-auth__form--modern zb-auth__form--stagger" onSubmit={handleVerifyNodeOtp}>
                  <label className="zb-auth__label" htmlFor="zb-login-node-otp-0">
                    Verification code
                  </label>
                  <AuthOtpBoxes
                    idPrefix="zb-login-node-otp"
                    value={loginOtp}
                    onChange={setLoginOtp}
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
                    type="submit"
                    disabled={loading}
                  >
                    <span>{loading ? 'Verifying…' : 'Continue'}</span>
                  </button>
                </form>
                <div className="zb-auth__switch">
                  <button type="button" className="zb-auth__linkBtn" disabled={otpSending || loading} onClick={handleResendLoginOtp}>
                    {otpSending ? 'Sending…' : 'Resend code'}
                  </button>
                  <button type="button" className="zb-auth__linkBtn" disabled={loading} onClick={cancelNodeOtpLogin}>
                    Cancel and use another account
                  </button>
                </div>
              </>
            )}

            <div className="zb-auth__switch">
              Don’t have an account? <Link to="/signup">Sign up</Link>
            </div>
          </div>
        ) : (
          <div className="zb-auth__panel zb-auth__panel--visible zb-auth__panel--forgot" key="forgot">
            <button type="button" className="zb-auth__backBtn" onClick={backToLogin}>
              ← Back to log in
            </button>

            {forgotError ? <div className="zb-auth__notice zb-auth__notice--error">{forgotError}</div> : null}
            {forgotSuccess && forgotStep === 2 ? (
              <div className="zb-auth__notice zb-auth__notice--success">{forgotSuccess}</div>
            ) : null}

            {forgotStep === 1 ? (
              <form className="zb-auth__form zb-auth__form--modern zb-auth__form--stagger" onSubmit={handleSendResetOtp}>
                <p className="zb-auth__hint">Enter the email for your account. If it exists, we’ll send a verification code.</p>
                <label className="zb-auth__label zb-auth__label--sr" htmlFor="zb-forgot-email">
                  Email
                </label>
                <div className="zb-auth__field">
                  <IconEnvelope className="zb-auth__fieldIcon" />
                  <input
                    id="zb-forgot-email"
                    className="zb-auth__fieldInput"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    required
                  />
                </div>
                <button
                  className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
                  type="submit"
                  disabled={forgotLoading}
                >
                  <span>{forgotLoading ? 'Sending…' : 'Send verification code'}</span>
                </button>
              </form>
            ) : (
              <form className="zb-auth__form zb-auth__form--modern zb-auth__form--stagger" onSubmit={handleResetPassword}>
                <label className="zb-auth__label" htmlFor="zb-forgot-otp-0">
                  Verification code
                </label>
                <AuthOtpBoxes
                  idPrefix="zb-forgot-otp"
                  value={forgotOtp}
                  onChange={setForgotOtp}
                  disabled={forgotLoading}
                  autoFocus
                />

                <AuthPasswordField
                  id="zb-forgot-pass"
                  label="New password"
                  showLabel
                  value={forgotPass}
                  onChange={(e) => setForgotPass(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                  minLength={4}
                />

                <AuthPasswordField
                  id="zb-forgot-pass2"
                  label="Confirm new password"
                  showLabel
                  value={forgotPass2}
                  onChange={(e) => setForgotPass2(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                  minLength={4}
                />

                <button
                  className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
                  type="submit"
                  disabled={forgotLoading}
                >
                  <span>{forgotLoading ? 'Saving…' : 'Set new password'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
