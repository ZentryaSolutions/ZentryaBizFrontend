import React, { useId, useState } from 'react';
import { IconEye, IconEyeOff, IconLock } from './authIcons';
import './AuthPages.css';

export default function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  autoFocus,
  /** When true, show label above field (e.g. forgot-password steps). */
  showLabel = false,
}) {
  const [visible, setVisible] = useState(false);
  const genId = useId();
  const fieldId = id || `zb-auth-pw-${genId}`;

  return (
    <>
      <label
        className={showLabel ? 'zb-auth__label' : 'zb-auth__label zb-auth__label--sr'}
        htmlFor={fieldId}
      >
        {label}
      </label>
      <div className="zb-auth__field zb-auth__field--password">
        <IconLock className="zb-auth__fieldIcon" />
        <input
          id={fieldId}
          className="zb-auth__fieldInput"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="zb-auth__peek"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <IconEyeOff className="zb-auth__peekIcon" /> : <IconEye className="zb-auth__peekIcon" />}
        </button>
      </div>
    </>
  );
}
