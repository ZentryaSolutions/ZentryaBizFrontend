import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseBrowserConfigured } from '../../lib/supabaseClient';
import { authAPI, otpAPI } from '../../services/api';
import AuthPasswordField from './AuthPasswordField';
import AuthOtpBoxes from './AuthOtpBoxes';
import { IconEnvelope } from './authIcons';
import './AuthPages.css';

const REMEMBER_EMAIL_KEY = 'zb_auth_remember_email';

export default function LoginPage() {
  const { signInWithPassword } = useAuth();
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
  }, []);

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
    setLoading(true);
    try {
      const r = await signInWithPassword(email, password);
      if (!r.success) {
        setError(r.error || 'Login failed');
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
              <div className="zb-auth__notice zb-auth__notice--warn">
                Add <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in{' '}
                <code>.env</code>.
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
            </form>

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
