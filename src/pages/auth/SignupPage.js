import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import AuthPasswordField from './AuthPasswordField';
import { isSupabaseBrowserConfigured } from '../../lib/supabaseClient';
import { otpAPI } from '../../services/api';
import { IconEnvelope, IconUser } from './authIcons';
import './AuthPages.css';

const PENDING_KEY = 'zb_pending_signup';

export default function SignupPage() {
  const nav = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      title="Create your account"
      subtitle="Enter your details, then confirm the verification code we email you."
      heroTitle="Get started with Zentrya Biz"
      heroText="Open your shop ledger, track sales, and keep hisaab clear. Create an account to get your workspace ready in minutes."
    >
      {!isSupabaseBrowserConfigured() ? (
        <div className="zb-auth__notice zb-auth__notice--warn">
          Add <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in <code>.env</code>.
        </div>
      ) : null}
      {error ? <div className="zb-auth__notice zb-auth__notice--error">{error}</div> : null}

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
          disabled={loading}
        >
          {loading ? 'Sending code…' : 'Create account'}
        </button>
      </form>

      <div className="zb-auth__switch">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </AuthLayout>
  );
}
