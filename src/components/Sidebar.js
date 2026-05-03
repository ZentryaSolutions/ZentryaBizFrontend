import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBagShopping,
  faCartShopping,
  faChartColumn,
  faCircleUser,
  faClipboardList,
  faDollarSign,
  faFileInvoice,
  faGear,
  faShop,
  faTableCells,
  faTags,
  faTruck,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { withCurrentScope } from '../utils/appRouteScope';
import { settingsAPI } from '../services/api';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import './Sidebar.css';

const SectionNav = ({ label, children }) => (
  <>
    <div className="zb-sb-sect">{label}</div>
    <ul className="menu-list">{children}</ul>
  </>
);

const NavBtn = ({ item, isActive, onNav }) => {
  const { t } = useTranslation();
  return (
    <li>
      <button
        type="button"
        className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
        title={t(item.labelKey)}
        onClick={() => onNav(item.path)}
        data-navigation="true"
      >
        <span className="menu-icon" aria-hidden>
          <FontAwesomeIcon icon={item.icon} fixedWidth />
        </span>
        <span className="menu-label">{t(item.labelKey)}</span>
      </button>
    </li>
  );
};

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout, isAdmin, activeShopId } = useAuth();
  const [shopLabel, setShopLabel] = useState('');

  const shopLogoCandidates = useMemo(
    () => [`${process.env.PUBLIC_URL || ''}/companylogo.jpeg`, `${process.env.PUBLIC_URL || ''}/logo192.png`],
    []
  );
  const [brandLogoIdx, setBrandLogoIdx] = useState(0);
  const hasBrandImage = brandLogoIdx < shopLogoCandidates.length;
  const brandLogoSrc = hasBrandImage ? shopLogoCandidates[brandLogoIdx] : '';

  const reloadShopLabel = useCallback(async () => {
    let resolved = '';
    try {
      const response = await settingsAPI.get();
      const data = response.data;
      if (data?.other_app_settings) {
        const other =
          typeof data.other_app_settings === 'string'
            ? JSON.parse(data.other_app_settings)
            : data.other_app_settings;
        const name = other?.shop_name || other?.businessInfo?.shopName || data?.shop_name;
        if (name && String(name).trim()) resolved = String(name).trim();
      } else if (data?.shop_name) resolved = String(data.shop_name).trim();
    } catch {
      /* ignore */
    }
    if (isSupabaseBrowserConfigured() && supabase && activeShopId) {
      try {
        const { data: shopRow } = await supabase
          .from('shops')
          .select('name')
          .eq('id', activeShopId)
          .maybeSingle();
        if (shopRow?.name && String(shopRow.name).trim()) {
          resolved = String(shopRow.name).trim();
        }
      } catch {
        /* ignore */
      }
    }
    setShopLabel(resolved);
  }, [activeShopId]);

  useEffect(() => {
    if (activeShopId) reloadShopLabel();
  }, [activeShopId, reloadShopLabel]);

  useEffect(() => {
    const onUpd = () => {
      reloadShopLabel();
    };
    window.addEventListener('zb-shop-display-updated', onUpd);
    return () => window.removeEventListener('zb-shop-display-updated', onUpd);
  }, [reloadShopLabel]);

  /** Reference UI: grid dashboard, invoice, bag inventory; storefront sales, dollar expenses; truck suppliers; Users vs Customers icons differ */
  const menuMain = [
    { id: 'dashboard', labelKey: 'menu.dashboard', path: '/app', icon: faTableCells },
    { id: 'billing', labelKey: 'menu.billing', path: '/billing', icon: faFileInvoice },
    { id: 'products', labelKey: 'menu.products', path: '/inventory', icon: faBagShopping },
  ];

  const menuPeople = [
    { id: 'customers', labelKey: 'menu.customers', path: '/customers', icon: faCircleUser },
    {
      id: 'suppliers',
      labelKey: 'menu.suppliers',
      path: '/suppliers',
      icon: faTruck,
      adminOnly: true,
    },
  ];

  const menuFinance = [
    { id: 'sales', labelKey: 'menu.sales', path: '/sales', icon: faShop },
    {
      id: 'purchases',
      labelKey: 'menu.purchases',
      path: '/purchases',
      icon: faCartShopping,
      adminOnly: true,
    },
    {
      id: 'expenses',
      labelKey: 'menu.expenses',
      path: '/expenses',
      icon: faDollarSign,
      adminOnly: true,
    },
    {
      id: 'reports',
      labelKey: 'menu.reports',
      path: '/reports',
      icon: faChartColumn,
      adminOnly: true,
    },
  ];

  const menuTail = [
    { id: 'categories', labelKey: 'menu.categories', path: '/categories', icon: faTags },
    { id: 'rate-list', labelKey: 'menu.rateList', path: '/rate-list', icon: faClipboardList },
    { id: 'users', labelKey: 'menu.users', path: '/users', icon: faUser, adminOnly: true },
    { id: 'settings', labelKey: 'menu.settings', path: '/settings', icon: faGear },
  ];

  const filterItems = (items) =>
    items.filter((item) => {
      if (item.adminOnly && !isAdmin()) return false;
      return true;
    });

  const isActive = (path) =>
    location.pathname.endsWith(path) || location.pathname.includes(`${path}/`);

  const collapseRailAfterNav = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1025px)').matches) return;
    requestAnimationFrame(() => {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function' && el.closest?.('.sidebar')) {
        el.blur();
      }
    });
  }, []);

  const handleNav = (path) => {
    navigate(withCurrentScope(location.pathname, path));
    if (onMobileClose) onMobileClose();
    collapseRailAfterNav();
  };

  const displayName = user?.full_name || user?.name || user?.username || 'User';

  const initials = (label) => {
    const parts = String(label || '')
      .trim()
      .split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0]) return parts[0].substring(0, 2).toUpperCase();
    return 'ZB';
  };

  const confirmLogout = async () => {
    if (window.confirm(t('auth.confirmLogout'))) await logout();
  };

  return (
    <>
      {mobileOpen ? (
        <div
          className="sidebar-backdrop"
          role="presentation"
          aria-hidden="true"
          onClick={onMobileClose}
        />
      ) : null}
      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="zb-sidebar-brand">
          <div className="zb-sb-logo-wrap">
            {hasBrandImage ? (
              <img
                src={brandLogoSrc}
                alt=""
                className="zb-sb-logo-img"
                decoding="async"
                onError={() => setBrandLogoIdx((i) => i + 1)}
              />
            ) : (
              <span className="zb-sb-logo-fallback" aria-hidden>
                Z
              </span>
            )}
          </div>
          <span className="zb-sb-name" title={shopLabel || ''}>
            {shopLabel || 'Shop'}
          </span>
        </div>

        <nav className="sidebar-nav zb-sb-nav">
          <SectionNav label="Main">
            {filterItems(menuMain).map((item) => (
              <NavBtn key={item.id} item={item} isActive={isActive} onNav={handleNav} />
            ))}
          </SectionNav>

          <SectionNav label="People">
            {filterItems(menuPeople).map((item) => (
              <NavBtn key={item.id} item={item} isActive={isActive} onNav={handleNav} />
            ))}
          </SectionNav>

          <SectionNav label="Finance">
            {filterItems(menuFinance).map((item) => (
              <NavBtn key={item.id} item={item} isActive={isActive} onNav={handleNav} />
            ))}
          </SectionNav>

          <SectionNav label="Settings">
            {filterItems(menuTail).map((item) => (
              <NavBtn key={item.id} item={item} isActive={isActive} onNav={handleNav} />
            ))}
          </SectionNav>
        </nav>

        <div className="zb-sb-bottom">
          <div className="zb-sb-user">
            <div className="zb-sb-av">{initials(displayName)}</div>
            <div className="zb-sb-meta">
              <div className="zb-sb-un">{displayName}</div>
              {user?.email ? (
                <div className="zb-sb-em" title={user.email}>
                  {user.email}
                </div>
              ) : null}
            </div>
            <button type="button" className="zb-sb-logout" title={t('auth.logout')} onClick={confirmLogout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
