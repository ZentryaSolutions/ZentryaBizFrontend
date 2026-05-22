import React, { useEffect, useRef, useState } from 'react';
import { isGoogleSignInConfigured, mountGoogleSignInButton } from '../lib/googleAuth';

/**
 * Google Sign-In button (GIS). Hidden when REACT_APP_GOOGLE_CLIENT_ID is not set.
 */
export default function GoogleSignInButton({ onCredential, disabled = false, className = '' }) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isGoogleSignInConfigured() || disabled) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const ok = await mountGoogleSignInButton(hostRef.current, (credential) => {
          if (credential) onCredential?.(credential);
        });
        if (!cancelled) {
          setReady(Boolean(ok));
          setErr(ok ? '' : 'Could not render Google button');
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
  }, [onCredential, disabled]);

  if (!isGoogleSignInConfigured()) return null;

  return (
    <div className={`zb-auth__googleWrap ${className}`.trim()}>
      <div
        ref={hostRef}
        className="zb-auth__googleBtnHost"
        style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        aria-hidden={!ready}
      />
      {err ? <p className="zb-auth__googleErr">{err}</p> : null}
    </div>
  );
}
