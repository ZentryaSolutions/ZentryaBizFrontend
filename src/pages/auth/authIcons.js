import React from 'react';

/** Compact home — auth “back” control */
export function IconHome({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1V10.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconEnvelope({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16v12H4V6zm0 0l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLock({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconUser({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6.5 19.5v-1.25A4.25 4.25 0 0 1 10.75 14h2.5a4.25 4.25 0 0 1 4.25 4.25v1.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconKey({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10.5 12h8M17.5 12v3M17.5 9v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/** Eye open — password visible */
export function IconEye({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/** Eye closed — password hidden */
export function IconEyeOff({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.3 10.3 0 0 1 12 5c6 0 10 6 10 6a18.3 18.3 0 0 1-4.9 4.9M6.3 6.3C4.2 7.7 2.7 9.6 2 12s4 6 10 6a9.7 9.7 0 0 0 4-.9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Auth promo panel: multi-shop / billing & inventory */
export function IconFeatureShopBilling({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 11L5.5 6H18.5L21 11V20h-4v-4H7v4H3V11z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M2 11h20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/** Auth promo panel: sales / reports */
export function IconFeatureReportLive({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path
        d="M7 20v-7M12 20V8M17 20v-11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Auth promo panel: vendors & customers */
export function IconFeaturePeople({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="7" r="2.75" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 19.5v-.5A4.25 4.25 0 0 1 8.25 15h1.5A4.25 4.25 0 0 1 14 19v.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M14.5 19.5V19a2.75 2.75 0 0 1 2.45-2.73"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const AUTH_FEATURE_ICONS = [IconFeatureShopBilling, IconFeatureReportLive, IconFeaturePeople];
