import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightToBracket } from '@fortawesome/free-solid-svg-icons';
import './Header.css';

/**
 * Top bar for unauthenticated routes — matches workspace header button styling (see Header.js / zb-tb-myshops).
 */
export default function PublicTopBar() {
  const navigate = useNavigate();

  return (
    <header className="app-header zb-topbar">
      <div className="header-left">
        <button
          type="button"
          className="zb-tb-myshops"
          onClick={() => navigate('/login')}
          data-navigation="true"
          title="Log in"
        >
          <FontAwesomeIcon icon={faArrowRightToBracket} aria-hidden />
          Log in
        </button>
        <span className="zb-tb-divider" aria-hidden />
        <Link
          to="/"
          className="zb-tb-title"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Zentrya Biz
        </Link>
      </div>
      <div className="zb-tb-fill" />
    </header>
  );
}
