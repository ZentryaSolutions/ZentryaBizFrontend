import React, { useEffect, useRef, useState } from 'react';
import { isGoogleSignInConfigured, mountGoogleSignInButton } from '../lib/googleAuth';

/**
 * Google Sign-In — always visible on login/signup. GIS button when REACT_APP_GOOGLE_CLIENT_ID is set.
 */
export default function GoogleSignInButton({
  onCredential,
  onMissingConfig,
  disabled = false,
  className = '',
}) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const configured = isGoogleSignInConfigured();

  useEffect(() => {
    if (!configured || disabled) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const ok = await mountGoogleSignInButton(hostRef.current, (credential) => {
          if (credential) onCredential?.(credential);
        });
        if (!cancelled) {
          setReady(Boolean(ok));
          setErr(ok ? '' : 'Could not load Google button');
        }
      } catch (e) {
        if (!cancelled) {
          setReady(false);
          setErr(e.message || 'Google sign-in unavailable');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, onCredential, disabled]);

  const handlePlaceholderClick = () => {
    const msg = 'Google sign-in is not available yet. Please use email and password for now.';
    setErr(msg);
    onMissingConfig?.(msg);
  };

  return (
    <div className={`zb-auth__googleWrap ${className}`.trim()}>
      {configured ? (
        <div
          ref={hostRef}
          className="zb-auth__googleBtnHost"
          style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
          aria-hidden={!ready}
        />
      ) : (
        <button
          type="button"
          className="zb-auth__googleFallback"
          disabled={disabled}
          onClick={handlePlaceholderClick}
        >
          <span className="zb-auth__googleFallbackIcon" aria-hidden>
            <svg viewBox="0 0 18 18" focusable="false">
              <path
                fill="#4285f4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
              />
              <path
                fill="#34a853"
                d="M9 18c2.43 0 4.47-.8 5.95-2.18l-2.91-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"
              />
              <path
                fill="#fbbc05"
                d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.16.28-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"
              />
              <path
                fill="#ea4335"
                d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
              />
            </svg>
          </span>
          Continue with Google
        </button>
      )}
      {err ? <p className="zb-auth__googleErr">{err}</p> : null}
    </div>
  );
}
