import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBasketShopping,
  faBoxesStacked,
  faCartShopping,
  faChartColumn,
  faClipboardList,
  faFileInvoice,
  faHouse,
  faTags,
  faUser,
  faUserGroup,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { withCurrentScope } from '../utils/appRouteScope';
import './Sidebar.css';

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [railLocked, setRailLocked] = useState(false);

  const menuItems = [
    { id: 'dashboard', labelKey: 'menu.dashboard', path: '/app', icon: faHouse },
    { id: 'billing', labelKey: 'menu.billing', path: '/billing', icon: faFileInvoice },
    { id: 'sales', labelKey: 'menu.sales', path: '/sales', icon: faBasketShopping },
    { id: 'products', labelKey: 'menu.products', path: '/inventory', icon: faBoxesStacked },
    { id: 'customers', labelKey: 'menu.customers', path: '/customers', icon: faUser },
    { id: 'suppliers', labelKey: 'menu.suppliers', path: '/suppliers', icon: faUserGroup, adminOnly: true },
    { id: 'purchases', labelKey: 'menu.purchases', path: '/purchases', icon: faCartShopping, adminOnly: true },
    { id: 'expenses', labelKey: 'menu.expenses', path: '/expenses', icon: faWallet, adminOnly: true },
    { id: 'rate-list', labelKey: 'menu.rateList', path: '/rate-list', icon: faClipboardList },
    { id: 'reports', labelKey: 'menu.reports', path: '/reports', icon: faChartColumn, adminOnly: true },
    { id: 'categories', labelKey: 'menu.categories', path: '/categories', icon: faTags },
  ];

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => {
    // Check admin-only restriction
    if (item.adminOnly && !isAdmin()) {
      return false;
    }
    return true;
  });

  const isActive = (path) => {
    return location.pathname.endsWith(path) || location.pathname.includes(`${path}/`);
  };

  const collapseRailAfterNav = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1025px)').matches) return;
    setRailLocked(true);
    requestAnimationFrame(() => {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function' && el.closest?.('.sidebar')) {
        el.blur();
      }
    });
  }, []);

  const handleRailMouseLeave = useCallback(() => {
    setRailLocked(false);
  }, []);

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
      <aside
        className={`sidebar${mobileOpen ? ' sidebar--open' : ''}${railLocked ? ' sidebar--rail-locked' : ''}`}
        onMouseLeave={handleRailMouseLeave}
      >
      <nav className="sidebar-nav">
        <ul className="menu-list">
          {visibleMenuItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
                title={t(item.labelKey)}
                onClick={() => {
                  navigate(withCurrentScope(location.pathname, item.path));
                  if (onMobileClose) onMobileClose();
                  collapseRailAfterNav();
                }}
                data-navigation="true"
              >
                <span className="menu-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={item.icon} fixedWidth />
                </span>
                <span className="menu-label">{t(item.labelKey)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
    </>
  );
};

export default Sidebar;

