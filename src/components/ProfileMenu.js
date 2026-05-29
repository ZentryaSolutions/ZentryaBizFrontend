import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faGear } from '@fortawesome/free-solid-svg-icons';
import { settingsAPI } from '../services/api';
import { withCurrentScope } from '../utils/appRouteScope';
import { hasPosBackendSession, ZB_BACKEND_SESSION_CHANGED } from '../lib/appMode';
import './ProfileMenu.css';

function profileDisplayLabel(user, profileLabel) {
  const fromProp = profileLabel != null ? String(profileLabel).trim() : '';
  if (fromProp) return fromProp;
  return user?.full_name || user?.name || user?.username || 'User';
}

const ProfileMenu = ({ user, profileLabel, workspaceNav = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!hasPosBackendSession()) return;
        const response = await settingsAPI.get();
        const data = response.data;
        const raw = data?.other_app_settings;
        const other = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
        const bi = other.businessInfo;
        if (!cancelled && bi) {
          setOwnerName(bi.ownerName || '');
        }
      } catch (e) {
        /* optional */
      }
    };
    const onSess = () => {
      if (user) void load();
    };
    window.addEventListener(ZB_BACKEND_SESSION_CHANGED, onSess);
    if (user) void load();
    return () => {
      cancelled = true;
      window.removeEventListener(ZB_BACKEND_SESSION_CHANGED, onSess);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const portal = document.getElementById('zb-profile-menu-portal');
      if (portal && portal.contains(event.target)) return;
      if (containerRef.current && containerRef.current.contains(event.target)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleProfileSettings = () => {
    setIsOpen(false);
    navigate(withCurrentScope(location.pathname, '/settings'));
  };

  const menuPanel = (
    <>
      <div className="profile-info">
        <div className="profile-avatar-large">
          {getInitials(user?.full_name || user?.name || user?.username || 'U')}
        </div>
        <div className="profile-details">
          <h4 className="profile-name">{user?.full_name || user?.name || user?.username || 'User'}</h4>
          {user?.email ? (
            <p className="profile-email" title={user.email}>
              {user.email}
            </p>
          ) : null}
          {ownerName ? <p className="profile-role">{ownerName}</p> : null}
        </div>
      </div>

      <div className="profile-menu-divider" />

      <div className="profile-menu-items">
        <button type="button" className="profile-menu-item" onClick={handleProfileSettings}>
          <FontAwesomeIcon icon={faGear} className="menu-item-icon" aria-hidden />
          <span>{t('header.profileSettings')}</span>
        </button>
      </div>
    </>
  );

  const portalMenu =
    isOpen &&
    createPortal(
      <div
        id="zb-profile-menu-portal"
        className="profile-menu-overlay"
        role="presentation"
        onClick={() => setIsOpen(false)}
      >
        <div
          className="profile-dropdown profile-dropdown--sheet"
          role="menu"
          aria-label={t('header.profileMenu')}
          onClick={(e) => e.stopPropagation()}
        >
          {menuPanel}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="profile-menu-container" ref={containerRef}>
      <div
        className={`profile-avatar-hover-wrap${isOpen ? ' profile-avatar-hover-wrap--menu-open' : ''}`}
      >
        <button
          type="button"
          className={`profile-avatar-btn profile-avatar-btn--icon${workspaceNav ? ' profile-avatar-btn--workspace' : ''}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-label={t('header.profileMenu')}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          data-navigation="true"
        >
          {workspaceNav ? (
            getInitials(user?.full_name || user?.name || user?.username || 'U')
          ) : (
            <FontAwesomeIcon icon={faCircleUser} className="profile-avatar-icon" aria-hidden />
          )}
        </button>
        <div className="profile-hover-card" role="tooltip">
          <div className="profile-hover-name">{profileDisplayLabel(user, profileLabel)}</div>
          {user?.email ? (
            <div className="profile-hover-email" title={user.email}>
              {user.email}
            </div>
          ) : null}
        </div>
      </div>

      {portalMenu}
    </div>
  );
};

export default ProfileMenu;
