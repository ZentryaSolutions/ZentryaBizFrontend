import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import AuthPasswordField from './AuthPasswordField';
import AuthOtpBoxes from './AuthOtpBoxes';
import { isSupabaseBrowserConfigured } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, otpAPI } from '../../services/api';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { IconEnvelope, IconUser } from './authIcons';
import { shopsPath } from '../../utils/workspacePaths';
import './AuthPages.css';

const PENDING_KEY = 'zb_pending_signup';
const PENDING_OTP_EMAIL_KEY = 'zb_pending_email';
const PENDING_AUTH_METHOD_KEY = 'zb_pending_auth_method';

export default function SignupPage() {
  const nav = useNavigate();
  const { signInWithGoogle, completeSignInWithGoogleOtp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState('shop_owner');

  const [googleOtpStep, setGoogleOtpStep] = useState(false);
  const [googleOtp, setGoogleOtp] = useState('');
  const [googleOtpEmail, setGoogleOtpEmail] = useState('');
  const [googleOtpHint, setGoogleOtpHint] = useState('');
  const [otpSending, setOtpSending] = useState(false);

  useEffect(() => {
    try {
      const pendingEmail = sessionStorage.getItem(PENDING_OTP_EMAIL_KEY);
      const method = sessionStorage.getItem(PENDING_AUTH_METHOD_KEY);
      if (pendingEmail && method === 'google') {
        setGoogleOtpEmail(String(pendingEmail).trim());
        setGoogleOtpStep(true);
        setGoogleOtpHint('Enter the code we sent to your email.');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleGoogleCredential = async (credential) => {
    setError('');
    setGoogleLoading(true);
    try {
      const r = await signInWithGoogle(credential, true);
      if (!r.success) {
        setError(r.error || 'Google sign-up failed');
        return;
      }
      if (r.pendingOtp) {
        const pendingEmail =
          r.email ||
          sessionStorage.getItem(PENDING_OTP_EMAIL_KEY) ||
          email.trim().toLowerCase();
        setGoogleOtpEmail(String(pendingEmail || '').trim().toLowerCase());
        setGoogleOtp('');
        setGoogleOtpStep(true);
        setGoogleOtpHint(
          r.otpKind === 'new_device'
            ? 'New browser — enter the security code we emailed you.'
            : r.emailHint
              ? `Code sent to ${r.emailHint}`
              : 'Enter the code we sent to your email.'
        );
        return;
      }
      if (r.needsSignupRole) return;
      nav(r.userId ? shopsPath(r.userId) : '/shops', { replace: true });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleVerifyGoogleOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = googleOtp.replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    const em = googleOtpEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Missing account email. Try Google sign-up again.');
      return;
    }
    setLoading(true);
    try {
      const r = await completeSignInWithGoogleOtp(em, code);
      if (!r.success) {
        setError(r.error || 'Verification failed');
        return;
      }
      setGoogleOtpStep(false);
      setGoogleOtp('');
      if (r.needsSignupRole) return;
      nav(r.userId ? shopsPath(r.userId) : '/shops', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResendGoogleOtp = async () => {
    const em = googleOtpEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Missing account email. Try Google sign-up again.');
      return;
    }
    setError('');
    setOtpSending(true);
    try {
      const { data } = await authAPI.googleResendOtp({ email: em });
      if (!data?.success) {
        setError(data?.error || 'Could not resend code');
        return;
      }
      setGoogleOtpHint('A new code was sent to your email.');
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not send code';
      setError(msg);
    } finally {
      setOtpSending(false);
    }
  };

  const cancelGoogleOtp = () => {
    setGoogleOtpStep(false);
    setGoogleOtp('');
    setGoogleOtpHint('');
    setError('');
    try {
      sessionStorage.removeItem(PENDING_OTP_EMAIL_KEY);
      sessionStorage.removeItem(PENDING_AUTH_METHOD_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');
    const em = email.trim().toLowerCase();
    const name = fullName.trim();
    if (name.length < 2) {
      setError('Enter your full name (at least 2 characters)');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Enter a valid email address');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      await otpAPI.request({ email: em, purpose: 'signup' });
      const payload = {
        fullName: name,
        email: em,
        password,
        accountType,
      };
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      nav('/signup/verify', { state: payload });
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not send verification code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={googleOtpStep ? 'Verify your email' : 'Create your account'}
      subtitle={
        googleOtpStep
          ? 'Enter the 6-digit code we sent to your email to finish Google sign-up.'
          : 'Enter your details, then confirm the verification code we email you.'
      }
      heroTitle="Get started with Zentrya Biz"
      heroText="Open your shop ledger, track sales, and keep your books clear. Create an account to get your workspace ready in minutes."
    >
      {!isSupabaseBrowserConfigured() ? (
        <div className="zb-auth__notice zb-auth__notice--warn">
          Add <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in <code>.env</code>.
        </div>
      ) : null}
      {error ? <div className="zb-auth__notice zb-auth__notice--error">{error}</div> : null}

      {googleOtpStep ? (
        <>
          <p className="zb-auth__hint">{googleOtpHint}</p>
          {googleOtpEmail ? (
            <p className="zb-auth__hint" style={{ marginTop: -6 }}>
              Account: <strong>{googleOtpEmail}</strong>
            </p>
          ) : null}
          <form className="zb-auth__form zb-auth__form--modern zb-auth__form--stagger" onSubmit={handleVerifyGoogleOtp}>
            <label className="zb-auth__label" htmlFor="zb-signup-google-otp-0">
              Verification code
            </label>
            <AuthOtpBoxes
              idPrefix="zb-signup-google-otp"
              value={googleOtp}
              onChange={setGoogleOtp}
              disabled={loading}
              autoFocus
            />
            <button
              className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
              type="submit"
              disabled={loading || googleLoading}
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
          </form>
          <div className="zb-auth__switch">
            <button
              type="button"
              className="zb-auth__linkBtn"
              disabled={otpSending || loading}
              onClick={handleResendGoogleOtp}
            >
              {otpSending ? 'Sending…' : 'Resend code'}
            </button>
            <button type="button" className="zb-auth__linkBtn" disabled={loading} onClick={cancelGoogleOtp}>
              Use another sign-up method
            </button>
          </div>
        </>
      ) : (
        <form className="zb-auth__form zb-auth__form--modern" onSubmit={handleContinue}>
          <label className="zb-auth__label zb-auth__label--sr" htmlFor="zb-signup-name">
            Full name
          </label>
          <div className="zb-auth__field">
            <IconUser className="zb-auth__fieldIcon" />
            <input
              id="zb-signup-name"
              className="zb-auth__fieldInput"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              required
              minLength={2}
            />
          </div>

          <label className="zb-auth__label zb-auth__label--sr" htmlFor="zb-signup-email">
            Email
          </label>
          <div className="zb-auth__field">
            <IconEnvelope className="zb-auth__fieldIcon" />
            <input
              id="zb-signup-email"
              className="zb-auth__fieldInput"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="Email"
              required
            />
          </div>

          <div className="zb-auth__signupAs" role="radiogroup" aria-label="Sign up as">
            <span className="zb-auth__signupAs-label">Sign up as</span>
            <div className="zb-auth__signupAs-options">
              <label className="zb-auth__signupAs-option">
                <input
                  type="radio"
                  name="accountType"
                  value="shop_owner"
                  checked={accountType === 'shop_owner'}
                  onChange={() => setAccountType('shop_owner')}
                />
                Shop owner
              </label>
              <label className="zb-auth__signupAs-option">
                <input
                  type="radio"
                  name="accountType"
                  value="cashier"
                  checked={accountType === 'cashier'}
                  onChange={() => setAccountType('cashier')}
                />
                Cashier
              </label>
            </div>
          </div>

          <AuthPasswordField
            id="zb-signup-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            required
            minLength={4}
          />

          <AuthPasswordField
            id="zb-signup-password-confirm"
            label="Confirm password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            required
            minLength={4}
          />

          <button
            className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
            type="submit"
            disabled={loading || googleLoading}
          >
            {loading ? 'Sending code…' : 'Create account'}
          </button>

          <div className="zb-auth__divider">or</div>
          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            onMissingConfig={(msg) => setError(msg)}
            disabled={loading || googleLoading}
          />
        </form>
      )}

      <div className="zb-auth__switch">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
}
