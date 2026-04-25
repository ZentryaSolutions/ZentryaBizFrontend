import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { shopsPath } from '../../utils/workspacePaths';
import { isSupabaseBrowserConfigured } from '../../lib/supabaseClient';
import { otpAPI } from '../../services/api';
import AuthOtpBoxes from './AuthOtpBoxes';
import './AuthPages.css';

const PENDING_KEY = 'zb_pending_signup';

function readPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.email || !o?.password) return null;
    const fullName = String(o.fullName || o.name || '').trim();
    if (fullName.length < 2) return null;
    return {
      fullName,
      email: String(o.email).trim().toLowerCase(),
      password: o.password,
    };
  } catch {
    return null;
  }
}

export default function SignupVerifyPage() {
  const { signUpWithEmail } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const fromNav = location.state;
  const [pending] = useState(() => {
    if (fromNav?.email && fromNav?.password) {
      const fullName = String(fromNav.fullName || fromNav.name || '').trim();
      if (fullName.length >= 2) {
        return {
          fullName,
          email: String(fromNav.email).trim().toLowerCase(),
          password: fromNav.password,
        };
      }
    }
    return readPending();
  });

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (fromNav?.email && fromNav?.password) {
      const fullName = String(fromNav.fullName || fromNav.name || '').trim();
      if (fullName.length >= 2) {
        try {
          sessionStorage.setItem(
            PENDING_KEY,
            JSON.stringify({
              fullName,
              email: String(fromNav.email).trim().toLowerCase(),
              password: fromNav.password,
            })
          );
        } catch {
          /* ignore */
        }
      }
    }
  }, [fromNav]);

  useEffect(() => {
    if (!pending) {
      nav('/signup', { replace: true });
    }
  }, [pending, nav]);

  const emailDisplay = useMemo(() => {
    if (!pending?.email) return '';
    const em = pending.email;
    const [u, d] = em.split('@');
    if (!d) return em;
    const mask = u.length <= 2 ? `${u[0] || '*'}*` : `${u.slice(0, 2)}…`;
    return `${mask}@${d}`;
  }, [pending]);

  if (!pending) {
    return null;
  }

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await otpAPI.request({ email: pending.email, purpose: 'signup' });
      setHint('A new code was sent. Check your inbox.');
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Could not send code';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const r = await signUpWithEmail({
        password: pending.password,
        fullName: pending.fullName,
        email: pending.email,
        otp,
      });
      if (!r.success) {
        setError(r.error || 'Verification failed');
        setLoading(false);
        return;
      }
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        /* ignore */
      }
      const uid = r.userId;
      nav(uid ? shopsPath(uid) : '/shops', { replace: true });
    } catch (err) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Enter the code we sent to ${emailDisplay}.`}
      heroTitle="Almost there"
      heroText="For your security, we confirm this inbox belongs to you. After you enter the code, your Zentrya Biz workspace will be ready."
    >
      {!isSupabaseBrowserConfigured() ? (
        <div className="zb-auth__notice zb-auth__notice--warn">
          Add <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in <code>.env</code>.
        </div>
      ) : null}
      {hint ? <div className="zb-auth__notice zb-auth__notice--success">{hint}</div> : null}
      {error ? <div className="zb-auth__notice zb-auth__notice--error">{error}</div> : null}

      <form className="zb-auth__form zb-auth__form--modern" onSubmit={handleVerify}>
        <p className="zb-auth__otpHint">Enter the 6-digit code</p>
        <AuthOtpBoxes
          idPrefix="zb-signup-verify-otp"
          value={otp}
          onChange={setOtp}
          disabled={loading}
          autoFocus
          className="zb-auth__otpWrap--signup"
        />

        <button
          className="zb-auth__submit zb-auth__submit--green zb-auth__submit--pill"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Verifying…' : 'Verify & create account'}
        </button>
      </form>

      <div className="zb-auth__optionsRow zb-auth__optionsRow--verify">
        <button type="button" className="zb-auth__linkBtn" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending…' : 'Resend code'}
        </button>
        <Link
          to="/signup"
          className="zb-auth__textLink"
          onClick={() => {
            try {
              sessionStorage.removeItem(PENDING_KEY);
            } catch {
              /* ignore */
            }
          }}
        >
          Edit details
        </Link>
      </div>

      <div className="zb-auth__switch">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
}
