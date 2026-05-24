import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { shopsPath, marketingHomeQuery } from '../utils/workspacePaths';

/**
 * Shared marketing site header (landing + legal pages).
 */
export default function MarketingHeader() {
  const { user, activeShopId, logout } = useAuth();
  const workspacePath = activeShopId ? '/app' : shopsPath(user?.id);
  const mq = user?.id ? marketingHomeQuery(user.id) : '';
  const brandTo = user?.id != null ? { pathname: '/', ...(mq ? { search: mq } : {}) } : '/';

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <header className="zbx-nav">
      <Link to={brandTo} className="zbx-brand">
        <span className="zbx-brandMark">
          <img
            className="zbx-brandImg"
            src={`${process.env.PUBLIC_URL}/companylogo.jpeg`}
            alt=""
            width={44}
            height={44}
            decoding="async"
          />
        </span>
        <div className="zbx-brandLockup">
          <div className="zbx-brandTitle">
            <span className="zbx-brandWord">Zentrya</span>
            <span className="zbx-brandBadge">Biz</span>
          </div>
          <p className="zbx-brandTagline">
            <span className="zbx-brandTaglineMain">Run your business</span>
            <span className="zbx-brandTaglineDot" aria-hidden="true" />
            <span className="zbx-brandTaglineAccent">simply</span>
          </p>
        </div>
      </Link>
      <nav className="zbx-links">
        <a href="/#features">Features</a>
        <a href="/#pricing">Pricing</a>
        <a href="/#faq">FAQ</a>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
      </nav>
      <div className="zbx-actions">
        {user ? (
          <>
            <Link to={workspacePath} className="zbx-btn zbx-btnPrimary">
              My workspace
            </Link>
            <button type="button" className="zbx-btn zbx-btnGhost" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="zbx-btn zbx-btnGhost">
              Log in
            </Link>
            <Link to="/signup" className="zbx-btn zbx-btnPrimary">
              Start trial
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
