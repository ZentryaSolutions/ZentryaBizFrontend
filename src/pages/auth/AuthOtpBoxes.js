import React, { useCallback, useEffect, useRef } from 'react';
import './AuthPages.css';

const LENGTH = 6;

function digitsArray(value) {
  const s = String(value || '').replace(/\D/g, '').slice(0, LENGTH);
  return Array.from({ length: LENGTH }, (_, i) => s[i] || '');
}

export default function AuthOtpBoxes({
  idPrefix = 'zb-otp',
  value = '',
  onChange,
  disabled = false,
  autoFocus = false,
  className = '',
}) {
  const inputsRef = useRef([]);
  const safe = String(value || '').replace(/\D/g, '').slice(0, LENGTH);

  const setSafe = useCallback(
    (next) => {
      onChange?.(String(next || '').replace(/\D/g, '').slice(0, LENGTH));
    },
    [onChange]
  );

  const focusAt = useCallback((i) => {
    const el = inputsRef.current[i];
    if (el && !disabled) {
      requestAnimationFrame(() => el.focus());
    }
  }, [disabled]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      focusAt(0);
    }
  }, [autoFocus, disabled, focusAt]);

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const d = raw.slice(-1);
    const arr = digitsArray(safe);
    if (d) {
      arr[i] = d;
      setSafe(arr.join(''));
      if (i < LENGTH - 1) focusAt(i + 1);
    } else {
      arr[i] = '';
      setSafe(arr.join(''));
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = digitsArray(safe);
      if (arr[i]) {
        arr[i] = '';
        setSafe(arr.join(''));
      } else if (i > 0) {
        arr[i - 1] = '';
        setSafe(arr.join(''));
        focusAt(i - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      focusAt(i - 1);
    }
    if (e.key === 'ArrowRight' && i < LENGTH - 1) {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LENGTH);
    setSafe(text);
    const idx = Math.min(Math.max(0, text.length), LENGTH - 1);
    focusAt(idx);
  };

  const setRef = (i) => (el) => {
    inputsRef.current[i] = el;
  };

  const arr = digitsArray(safe);

  return (
    <div
      className={`zb-auth__otpWrap${safe.length === LENGTH ? ' zb-auth__otpWrap--complete' : ''}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Enter 6-digit verification code"
    >
      {arr.map((ch, i) => (
        <div
          key={i}
          className={[
            'zb-auth__otpBox',
            ch ? 'zb-auth__otpBox--filled' : '',
            disabled ? 'zb-auth__otpBox--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            ref={setRef(i)}
            id={`${idPrefix}-${i}`}
            className="zb-auth__otpInput"
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={ch}
            disabled={disabled}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
          />
        </div>
      ))}
    </div>
  );
}
