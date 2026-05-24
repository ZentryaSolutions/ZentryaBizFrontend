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
    const msg =
      'Google sign-in is not configured. Add REACT_APP_GOOGLE_CLIENT_ID to frontend/.env (same Web client ID as backend GOOGLE_OAUTH_CLIENT_ID), then restart npm start.';
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
            G
          </span>
          Continue with Google
        </button>
      )}
      {err ? <p className="zb-auth__googleErr">{err}</p> : null}
      {!configured ? (
        <p className="zb-auth__googleHint">
          Set <code>REACT_APP_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> and restart the app.
        </p>
      ) : null}
    </div>
  );
}
