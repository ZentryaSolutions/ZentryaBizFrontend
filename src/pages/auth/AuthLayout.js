import React from 'react';
import { Link } from 'react-router-dom';
import './AuthPages.css';

export default function AuthLayout({ title, subtitle, heroTitle, heroText, children }) {
  return (
    <div className="zb-auth">
      <div className="zb-auth__glow" aria-hidden="true" />
      <div className="zb-auth__card zb-auth__card--split">
        <div className="zb-auth__left">
          <Link to="/" className="zb-auth__brandLink">
            <span className="zb-auth__logoWrap">
              <img
                className="zb-auth__logoImg"
                src={`${process.env.PUBLIC_URL}/companylogo.jpeg`}
                alt="Company logo"
                width={40}
                height={40}
                decoding="async"
              />
            </span>
            <span className="zb-auth__brandLinkText">Zentrya Biz</span>
          </Link>

          <div className="zb-auth__header">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>

          {children}

          <div className="zb-auth__footer">
            <Link to="/">← Back to home</Link>
          </div>
        </div>

        <aside className="zb-auth__right" aria-hidden="true">
          <div className="zb-auth__rightInner">
            {heroTitle ? <h2 className="zb-auth__heroTitle">{heroTitle}</h2> : null}
            {heroText ? <p className="zb-auth__heroText">{heroText}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
