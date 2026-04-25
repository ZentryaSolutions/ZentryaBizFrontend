import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faGear, faRightFromBracket, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { settingsAPI } from '../services/api';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import Notifications from './Notifications';
import ProfileMenu from './ProfileMenu';
import { withCurrentScope } from '../utils/appRouteScope';
import './Header.css';

const Header = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { user, logout, isAdmin, activeShopId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState('');

  const fetchStoreName = useCallback(async () => {
    let resolved = '';

    try {
      const response = await settingsAPI.get();
      const data = response.data;

      if (data && data.other_app_settings) {
        const otherSettings = typeof data.other_app_settings === 'string'
          ? JSON.parse(data.other_app_settings)
          : data.other_app_settings;

        const name =
          otherSettings?.shop_name ||
          otherSettings?.businessInfo?.shopName ||
          (typeof data.shop_name === 'string' ? data.shop_name : null);
        if (name && String(name).trim()) {
          resolved = String(name).trim();
        }
      } else if (data?.shop_name) {
        resolved = String(data.shop_name).trim();
      }
    } catch (error) {
      console.error('[Header] Error fetching store name:', error);
    }

    // Same source of truth as Settings: Supabase `shops.name` overrides API JSON when set
    if (isSupabaseBrowserConfigured() && supabase && activeShopId) {
      try {
        const { data: shopRow, error } = await supabase
          .from('shops')
          .select('name')
          .eq('id', activeShopId)
          .maybeSingle();
        if (!error && shopRow?.name && String(shopRow.name).trim()) {
          resolved = String(shopRow.name).trim();
        }
      } catch {
        /* keep resolved from settings */
      }
    }

    setStoreName(resolved);
  }, [activeShopId]);

  useEffect(() => {
    if (user) {
      fetchStoreName();
    }
  }, [user, fetchStoreName]);

  useEffect(() => {
    const onShopDisplayUpdated = () => {
      if (user) fetchStoreName();
    };
    window.addEventListener('zb-shop-display-updated', onShopDisplayUpdated);
    return () => window.removeEventListener('zb-shop-display-updated', onShopDisplayUpdated);
  }, [user, fetchStoreName]);

  const navActive = (path) => {
    if (path === '/users') return location.pathname.endsWith('/users') || location.pathname.includes('/users/');
    if (path === '/settings') return location.pathname.endsWith('/settings') || location.pathname.includes('/settings/');
    return false;
  };

  if (!user) {
    return null;
  }

  const handleHeaderLogout = async () => {
    if (window.confirm(t('auth.confirmLogout'))) {
      await logout();
    }
  };

  const logoSrc = `${process.env.PUBLIC_URL}/companylogo.jpeg`;
  const displayUserName = user?.full_name || user?.name || user?.username || 'User';

  return (
    <header className="app-header">
      <div className="header-left">
        {onMenuClick ? (
          <button
            type="button"
            className="header-menu-toggle"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            data-navigation="true"
          >
            <FontAwesomeIcon icon={faBars} className="header-menu-toggle-icon" aria-hidden />
          </button>
        ) : null}
        <div className="header-brand">
          <img
            className="header-brandLogo"
            src={logoSrc}
            alt=""
            width={48}
            height={48}
            decoding="async"
          />
          <h1 className="store-name" title={storeName || t('app.brandName')}>
            {storeName || t('app.brandName')}
          </h1>
        </div>
        <nav className="header-nav-links" aria-label="Workspace">
          {isAdmin() ? (
            <button
              type="button"
              className={`header-nav-link ${navActive('/users') ? 'header-nav-link--active' : ''}`}
              onClick={() => navigate(withCurrentScope(location.pathname, '/users'))}
              data-navigation="true"
            >
              <FontAwesomeIcon icon={faUsers} className="header-nav-link-icon" aria-hidden />
              {t('menu.users')}
            </button>
          ) : null}
          <button
            type="button"
            className={`header-nav-link ${navActive('/settings') ? 'header-nav-link--active' : ''}`}
            onClick={() => navigate(withCurrentScope(location.pathname, '/settings'))}
            data-navigation="true"
          >
            <FontAwesomeIcon icon={faGear} className="header-nav-link-icon" aria-hidden />
            {t('menu.settings')}
          </button>
        </nav>
      </div>

      <div className="header-right">
        <Notifications />
        <div className="header-profile-actions">
          <ProfileMenu user={user} profileLabel={displayUserName} />
          <button
            type="button"
            className="header-logout-btn"
            onClick={handleHeaderLogout}
            aria-label={t('auth.logout')}
            title={t('auth.logout')}
            data-navigation="true"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="header-logout-icon" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

