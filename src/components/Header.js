import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { settingsAPI } from '../services/api';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import Notifications from './Notifications';
import ProfileMenu from './ProfileMenu';
import { shopsPath } from '../utils/workspacePaths';
import './Header.css';

function workspaceTitle(pathname) {
  const p = pathname || '';
  if (/\/app(?:\/|$)/.test(p)) return 'Dashboard';
  if (p.includes('/billing')) return 'Billing';
  if (p.includes('/inventory/product/')) return 'Product';
  if (p.includes('/inventory')) return 'Inventory';
  if (p.includes('/customers')) return 'Customers';
  if (p.includes('/suppliers')) return 'Suppliers';
  if (p.includes('/purchases')) return 'Purchases';
  if (p.includes('/expenses')) return 'Expenses';
  if (p.includes('/rate-list')) return 'Rate List';
  if (p.includes('/invoices')) return 'Invoices';
  if (p.includes('/sales')) return 'Sales';
  if (p.includes('/reports')) return 'Reports';
  if (p.includes('/categories')) return 'Categories';
  if (p.includes('/users')) return 'Users';
  if (p.includes('/settings')) return 'Settings';
  return 'Zentrya Biz';
}

const Header = ({ onMenuClick }) => {
  const { t } = useTranslation();
  const { user, activeShopId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState('');

  const fetchStoreName = useCallback(async () => {
    let resolved = '';

    try {
      const response = await settingsAPI.get();
      const data = response.data;

      if (data && data.other_app_settings) {
        const otherSettings =
          typeof data.other_app_settings === 'string'
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
        /* keep */
      }
    }

    setStoreName(resolved);
  }, [activeShopId]);

  useEffect(() => {
    if (user) fetchStoreName();
  }, [user, fetchStoreName]);

  useEffect(() => {
    const onShopDisplayUpdated = () => {
      if (user) fetchStoreName();
    };
    window.addEventListener('zb-shop-display-updated', onShopDisplayUpdated);
    return () => window.removeEventListener('zb-shop-display-updated', onShopDisplayUpdated);
  }, [user, fetchStoreName]);

  if (!user) {
    return null;
  }

  const displayUserName = user?.full_name || user?.name || user?.username || 'User';

  return (
    <header className="app-header zb-topbar">
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
        <button
          type="button"
          className="zb-tb-myshops"
          onClick={() => user?.id && navigate(shopsPath(user.id))}
          data-navigation="true"
          title={t('app.myShops', { defaultValue: 'My Shops' })}
        >
          <FontAwesomeIcon icon={faChevronLeft} style={{ width: '0.65rem' }} aria-hidden />
          My Shops
        </button>
        <span className="zb-tb-divider" aria-hidden />
        <span className="zb-tb-title">{workspaceTitle(location.pathname)}</span>
      </div>

      <div className="zb-tb-fill" />

      <div className="header-right">
        <div className="zb-tb-live">
          <span className="zb-tb-live-dot" aria-hidden />
          Live
        </div>
        <span className="zb-tb-divider" aria-hidden />
        <Notifications />
        <span className="zb-tb-shop-label" title={storeName}>
          {storeName || 'Shop'}
        </span>
        <ProfileMenu user={user} profileLabel={displayUserName} />
      </div>
    </header>
  );
};

export default Header;
