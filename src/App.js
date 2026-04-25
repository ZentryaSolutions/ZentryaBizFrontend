import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import ProductDetailView from './components/ProductDetailView';
import Billing from './components/Billing';
import Suppliers from './components/Suppliers';
import SupplierPayments from './components/SupplierPayments';
import Customers from './components/Customers';
import Categories from './components/Categories';
import Purchases from './components/Purchases';
import Expenses from './components/Expenses';
import RateList from './components/RateList';
import Invoices from './components/Invoices';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Users from './components/Users';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateNotification from './components/UpdateNotification';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import SignupVerifyPage from './pages/auth/SignupVerifyPage';
import StaffInvitePage from './pages/auth/StaffInvitePage';
import ShopSelection from './components/ShopSelection';
// License system removed — plans handled via Stripe + Supabase.
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isExpiredPlan } from './utils/planFeatures';
import { isZbWebOnlyMode } from './lib/appMode';
import {
  shopsPath,
  parseShopsPath,
  userIdFromPublicUrlParam,
  isDashSeparatedUuid,
  marketingHomeQuery,
} from './utils/workspacePaths';
import { appBasePath, extractAppScope, isLegacyAppPath } from './utils/appRouteScope';
// Inner component that uses location (must be inside Router)
function AppContentWithRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  return <AppContent location={location} navigate={navigate} />;
}

// Inner App component (auth + app shell)
function AppContent({ location, navigate }) {
  const { i18n, t } = useTranslation();
  const { user, loading: authLoading, activeShopId, profile } = useAuth();
  const [activeMenu, setActiveMenu] = useState('dashboard');
  /** Server/LAN read-only (client mode) */
  const [connectionReadOnly, setConnectionReadOnly] = useState(false);
  const readOnlyMode = connectionReadOnly;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const zbWebOnly = isZbWebOnlyMode();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);
  
  // UI is English-only; keep i18n on en regardless of stored settings
  useEffect(() => {
    i18n.changeLanguage('en');
  }, [i18n]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    // Force re-fetch of data by updating key prop on components
    window.dispatchEvent(new Event('data-refresh'));
  };

  const handleGlobalBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`${scopedBase}/app`);
  };

  const handleGoMainPage = () => {
    const q = marketingHomeQuery(user?.id) || '';
    const hasQuery = q.includes('?');
    const shopPart = activeShopId ? `${hasQuery ? '&' : '?'}shop=${encodeURIComponent(activeShopId)}` : '';
    navigate(`/${q}${shopPart}`);
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  const searchParams = new URLSearchParams(location?.search || '');
  const marketingUidParam = searchParams.get('uid') || searchParams.get('u');
  const marketingResolved = userIdFromPublicUrlParam(marketingUidParam || '');
  const onMarketingHome =
    location?.pathname === '/' &&
    Boolean(user?.id) &&
    Boolean(marketingResolved) &&
    marketingResolved === String(user.id).toLowerCase();

  // Public pages (landing/auth)
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/verify" element={<SignupVerifyPage />} />
        <Route path="/staff-invite" element={<StaffInvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (location?.pathname === '/staff-invite') {
    return <StaffInvitePage />;
  }

  const { userId: shopsTargetUserId, raw: shopsPathRaw } = parseShopsPath(location?.pathname || '');
  const sessionUid = user?.id ? String(user.id).toLowerCase() : '';
  const onShopsPickerShape = shopsPathRaw != null;
  const onOwnShopsPicker = Boolean(sessionUid) && shopsTargetUserId === sessionUid;

  // Logged in: /shops (legacy) → short /{compact}/shops
  if (user && location?.pathname === '/shops') {
    return <Navigate to={shopsPath(user.id)} replace />;
  }

  // /{segment}/shops — galat / doosra user / invalid segment
  if (user && onShopsPickerShape && shopsTargetUserId !== sessionUid) {
    return <Navigate to={shopsPath(user.id)} replace />;
  }

  // Poori UUID wali purani URL → short URL
  if (user && onOwnShopsPicker && shopsPathRaw && isDashSeparatedUuid(shopsPathRaw)) {
    return <Navigate to={shopsPath(user.id)} replace />;
  }

  // Logged in: auth screens → workspace picker
  if (
    user &&
    (location?.pathname === '/login' ||
      location?.pathname === '/signup' ||
      location?.pathname === '/signup/verify')
  ) {
    return <Navigate to={shopsPath(user.id)} replace />;
  }

  // Logged in: landing page only when ?uid matches session (session stays in browser; URL shows id)
  if (user && onMarketingHome) {
    return <LandingPage />;
  }

  // Logged in: bare / or wrong uid → shop flow
  if (user && location?.pathname === '/') {
    return <Navigate to={shopsPath(user.id)} replace />;
  }

  // Must select a shop before entering app (unless browsing marketing home above)
  if (!activeShopId && !onOwnShopsPicker) {
    return <Navigate to={shopsPath(user.id)} replace />;
  }

  if (!activeShopId && onOwnShopsPicker) {
    return <ShopSelection />;
  }

  const scopedBase = appBasePath(user.id, activeShopId);
  const scopeInPath = extractAppScope(location?.pathname || '');
  const onLegacyAppPath = isLegacyAppPath(location?.pathname || '');

  if (scopeInPath) {
    if (scopeInPath.userId !== sessionUid || String(scopeInPath.shopId) !== String(activeShopId)) {
      return <Navigate to={`${scopedBase}/app`} replace />;
    }
  } else if (onLegacyAppPath) {
    return <Navigate to={`${scopedBase}${location.pathname}`} replace />;
  }

  // NEVER block startup - always show app
  // Activation is handled in Settings, not on startup

  // Main app
  return (
    <div className={`app${mobileNavOpen ? ' app--nav-open' : ''}${zbWebOnly ? ' app--zb-web' : ''}`}>
      <UpdateNotification />
      <Header onMenuClick={() => setMobileNavOpen(true)} />
      <ConnectionStatus 
        onRefresh={handleRefresh}
        readOnlyMode={readOnlyMode}
        setConnectionReadOnly={setConnectionReadOnly}
      />
      {profile && isExpiredPlan(profile.plan) && (
        <div
          role="status"
          style={{
            margin: '0 16px',
            padding: '10px 14px',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            color: '#92400e',
            fontSize: '14px',
          }}
        >
          Your subscription is expired. Renew from pricing / billing to restore Pro and Premium features.
        </div>
      )}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <main className="main-content">
        <div className="app-back-row">
          <button type="button" className="app-back-btn" onClick={handleGlobalBack}>
            ← {t('common.back')}
          </button>
          <button type="button" className="app-mainpage-btn" onClick={handleGoMainPage}>
            Go to Main Page
          </button>
        </div>
        <ErrorBoundary>
          <Routes>
            <Route path="/:uid/:shopId/app" element={<Dashboard key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route
              path="/:uid/:shopId/inventory/product/:productId"
              element={<ProductDetailView key={refreshTrigger} readOnly={readOnlyMode} />}
            />
            <Route path="/:uid/:shopId/inventory" element={<Inventory key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/billing" element={<Billing key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/suppliers" element={<Suppliers key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/supplier-payments" element={<SupplierPayments key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/customers" element={<Customers key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/categories" element={<Categories key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/purchases" element={<Purchases key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/expenses" element={<Expenses key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/rate-list" element={<RateList key={readOnlyMode} />} />
            <Route path="/:uid/:shopId/invoices" element={<Invoices key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/sales" element={<Sales key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/reports" element={<Reports key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="/:uid/:shopId/users" element={<Users key={refreshTrigger} />} />
            <Route path="/:uid/:shopId/settings" element={<Settings key={refreshTrigger} readOnly={readOnlyMode} />} />
            <Route path="*" element={<Navigate to={`${scopedBase}/app`} replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

// Main App component wrapped with AuthProvider and Router
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContentWithRouter />
      </Router>
    </AuthProvider>
  );
}

export default App;

