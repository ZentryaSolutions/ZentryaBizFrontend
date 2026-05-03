import React from 'react';
import { Link } from 'react-router-dom';
import './AuthPages.css';

function IconShop() {
  return (
    <svg className="zb-auth__featureSvg" width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="9 22 9 12 15 12 15 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBars() {
  return (
    <svg className="zb-auth__featureSvg" width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 21V10M12 21V6M20 21V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg className="zb-auth__featureSvg" width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M2 21a6.5 6.5 0 0 1 11.5-1.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="8" r="2.75" stroke="currentColor" strokeWidth="2" />
      <path d="M15 21a4 4 0 0 1 7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Matches marketing reference (login + signup right panel). */
const BRAND_FEATURE_ROWS = [
  { key: 'inv', Icon: IconShop, text: 'Multi-shop billing & inventory' },
  { key: 'rep', Icon: IconBars, text: 'Real-time sales reports' },
  { key: 'vc', Icon: IconPeople, text: 'Vendor & customer management' },
];

function HomeHouseIcon() {
  return (
    <svg className="zb-auth__backHomeIcon" width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5L12 3l9 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 9.8V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{ title: string; subtitle?: string; heroTitle?: string; heroText?: string; children?: React.ReactNode }} props
 */
export default function AuthLayout({ title, subtitle, heroTitle, heroText, children }) {
  return (
    <div className="zb-auth">
      <div className="zb-auth__glow" aria-hidden="true" />
      <div className="zb-auth__card zb-auth__card--split">
        <div className="zb-auth__left">
          <div className="zb-auth__topRow">
            <Link to="/" className="zb-auth__brandLink">
              <span className="zb-auth__logoWrap">
                <img
                  className="zb-auth__logoImg"
                  src={`${process.env.PUBLIC_URL}/companylogo.jpeg`}
                  alt=""
                  width={40}
                  height={40}
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.visibility = 'hidden';
                  }}
                />
              </span>
              <span className="zb-auth__brandLinkText">Zentrya Biz</span>
            </Link>
            <Link to="/" className="zb-auth__backHome">
              <HomeHouseIcon />
              Home
            </Link>
          </div>

          <div className="zb-auth__header">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          {children}
        </div>

        <aside className="zb-auth__right" aria-hidden="true">
          <div className="zb-auth__rightPattern" />
          <div className="zb-auth__rightGlowCorner" />

          <div className="zb-auth__rightTop">
            <span className="zb-auth__livePill">
              <span className="zb-auth__liveDot" />
              Live bills · 3 open
            </span>
            <div className="zb-auth__promoCard">
              <div className="zb-auth__promoCardMain">
                <div className="zb-auth__promoLabel">Today&apos;s revenue</div>
                <div className="zb-auth__promoValue">PKR 84,200</div>
                <div className="zb-auth__promoDelta">+12% vs yesterday</div>
              </div>
              <div className="zb-auth__promoMeta">Bills today: 38 · Open tabs: 3</div>
            </div>
          </div>

          <div className="zb-auth__rightInner">
            {heroTitle ? <h2 className="zb-auth__heroTitle">{heroTitle}</h2> : null}
            {heroText ? <p className="zb-auth__heroText">{heroText}</p> : null}
            <ul className="zb-auth__featureList">
              {BRAND_FEATURE_ROWS.map(({ key, Icon, text }) => (
                <li key={key} className="zb-auth__featureItem">
                  <span className="zb-auth__featureIcon">
                    <Icon />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
