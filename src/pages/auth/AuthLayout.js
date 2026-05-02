import React from 'react';
import { Link } from 'react-router-dom';
import { AUTH_FEATURE_ICONS, IconHome } from './authIcons';
import './AuthPages.css';

const DEFAULT_FEATURES = [
  'Multi-shop billing & inventory',
  'Real-time sales reports',
  'Vendor & customer management',
];

/**
 * Split auth shell: form left, dark marketing panel right.
 * Logo: /companylogo.jpeg (place your asset in public/)
 */
export default function AuthLayout({
  title,
  subtitle,
  heroTitle,
  heroText,
  children,
  brandName = 'Zentrya Biz',
  features = DEFAULT_FEATURES,
}) {
  const logoSrc = `${process.env.PUBLIC_URL}/companylogo.jpeg`;

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
                  src={logoSrc}
                  alt=""
                  width={36}
                  height={36}
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </span>
              <span className="zb-auth__brandLinkText">{brandName}</span>
            </Link>
            <Link to="/" className="zb-auth__backHome" title="Back to home">
              <IconHome className="zb-auth__backHomeIcon" />
              <span>Home</span>
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
              <div className="zb-auth__promoLabel">Today&apos;s revenue</div>
              <div className="zb-auth__promoValue">PKR 84,200</div>
              <div className="zb-auth__promoDelta">+12% vs yesterday</div>
              <div className="zb-auth__promoMeta">Bills today: 38 · Open tabs: 3</div>
            </div>
          </div>

          <div className="zb-auth__rightInner">
            {heroTitle ? <h2 className="zb-auth__heroTitle">{heroTitle}</h2> : null}
            {heroText ? <p className="zb-auth__heroText">{heroText}</p> : null}
            {Array.isArray(features) && features.length > 0 ? (
              <ul className="zb-auth__featureList">
                {features.map((line, i) => {
                  const Icon = AUTH_FEATURE_ICONS[i % AUTH_FEATURE_ICONS.length];
                  return (
                    <li key={line} className="zb-auth__featureItem">
                      <span className="zb-auth__featureIcon" aria-hidden>
                        {Icon ? <Icon className="zb-auth__featureSvg" /> : null}
                      </span>
                      <span>{line}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
