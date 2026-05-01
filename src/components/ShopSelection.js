import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faChevronRight,
  faCreditCard,
  faHouse,
  faPlus,
  faStore,
} from '@fortawesome/free-solid-svg-icons';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { isUnlimitedShops } from '../utils/planFeatures';
import { marketingHomeQuery } from '../utils/workspacePaths';
import './ShopSelection.css';

/** Stored in `shops.business_type` (text). No DB migration needed for new labels. */
const BUSINESS_TYPES = [
  'General',
  'Hardware',
  'Plumbing',
  'Electrical',
  'Paint & Sanitary',
  'Grocery',
  'Pharmacy',
  'Electronics',
  'Mobile & Accessories',
  'Garments / Textile',
  'Restaurant / Food',
  'Cosmetics & Beauty',
  'Auto Parts',
  'Stationery',
  'Furniture',
  'Wholesale',
  'Mixed',
];

export default function ShopSelection() {
  const nav = useNavigate();
  const { user, activeShopId, setActiveShopId, profile, refreshProfile, logout } = useAuth();
  const accountEmail = user?.email;
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedRole, setResolvedRole] = useState('');
  const [pageError, setPageError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    business_type: 'General',
  });

  const shopLimitNum =
    profile?.shop_limit != null && profile.shop_limit !== '' ? Number(profile.shop_limit) : 1;
  const unlimitedShops = isUnlimitedShops(shopLimitNum);

  const canCreateMore = useMemo(() => {
    if (unlimitedShops) return true;
    return shops.length < shopLimitNum;
  }, [shopLimitNum, shops.length, unlimitedShops]);

  const isEmpty = !loading && shops.length === 0;

  const fetchShops = async () => {
    if (!supabase || !user?.id) return;
    setPageError('');
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('shop_users')
        .select('role, shop:shops(id, name, phone, address, business_type, city, currency, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false, referencedTable: 'shops' });
      if (e) throw e;
      const mapped = (data || [])
        .map((row) => ({ ...row.shop, memberRole: row.role }))
        .filter(Boolean);
      const dbRoles = mapped.map((row) => String(row.memberRole || '').toLowerCase());
      const hasManageRole = dbRoles.some((role) =>
        ['owner', 'admin', 'administrator'].includes(role)
      );
      const hasStaffRole = dbRoles.some((role) =>
        ['cashier', 'seller', 'salesman', 'staff'].includes(role)
      );
      setResolvedRole(hasManageRole ? 'admin' : hasStaffRole ? 'cashier' : '');
      setShops(mapped);
    } catch (e) {
      setPageError(e.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (activeShopId) {
      nav('/app', { replace: true });
    }
  }, [activeShopId, nav]);

  const selectShop = (id) => {
    setActiveShopId(id);
    nav('/app', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(parts[0]).slice(0, 2).toUpperCase();
  };

  const displayName = user?.full_name || user?.name || user?.username || 'User';
  const accountRole = String(profile?.role || '').toLowerCase();
  const effectiveRole = accountRole || resolvedRole;
  const canManageShops =
    effectiveRole === 'owner' || effectiveRole === 'admin' || effectiveRole === 'administrator';
  const planLabel = String(profile?.plan || 'free')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  const shopsUsed = shops.length;
  const shopUsageLabel = unlimitedShops ? `${shopsUsed} used` : `${shopsUsed}/${shopLimitNum} used`;

  const handleLogout = async () => {
    if (window.confirm('Logout?')) {
      await logout?.();
    }
  };

  const openCreateModal = () => {
    setFormError('');
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setFormError('');
    setShowCreate(false);
  };

  const createShop = async (e) => {
    e.preventDefault();
    if (!supabase || !user?.id) return;
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Shop name is required');
      return;
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim() || phoneDigits.length < 10) {
      setFormError('Enter a valid mobile number (at least 10 digits).');
      return;
    }
    if (!canCreateMore) {
      setFormError('Shop limit reached for your plan.');
      return;
    }

    setCreating(true);
    try {
      const { data: shop, error: insErr } = await supabase
        .from('shops')
        .insert([
          {
            owner_id: user.id,
            name: form.name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim() || null,
            business_type: form.business_type,
            city: null,
            currency: 'PKR',
          },
        ])
        .select('id')
        .single();
      if (insErr) throw insErr;

      await refreshProfile?.();
      setFormError('');
      setShowCreate(false);
      setForm({ name: '', phone: '', address: '', business_type: 'General' });

      selectShop(shop.id);
    } catch (e) {
      setFormError(e.message || 'Failed to create shop');
    } finally {
      setCreating(false);
    }
  };

  if (!isSupabaseBrowserConfigured()) {
    return (
      <div className="content-container">
        <div className="page-header">
          <h1 className="page-title">Select a shop</h1>
        </div>
        <div className="card">
          <div className="error-message">
            Supabase is not configured. Add <code>REACT_APP_SUPABASE_URL</code> and{' '}
            <code>REACT_APP_SUPABASE_ANON_KEY</code> in the frontend <code>.env</code>.
          </div>
        </div>
      </div>
    );
  }

  const logoSrc = `${process.env.PUBLIC_URL}/companylogo.jpeg`;

  const marketingLink = (sectionId) => {
    if (!user?.id) return sectionId ? `/#${sectionId}` : '/';
    const q = marketingHomeQuery(user.id);
    return {
      pathname: '/',
      ...(q ? { search: q } : {}),
      ...(sectionId ? { hash: `#${sectionId}` } : {}),
    };
  };

  return (
    <div className="zb-shopSel zb-shopSel--shell">
      <aside className="zb-shopSel__sidebar" aria-label="Workspace navigation">
        <div className="zb-shopSel__sidebarHead">
          <Link to={marketingLink()} className="zb-shopSel__sidebarBrand">
            <span className="zb-shopSel__navLogoWrap zb-shopSel__navLogoWrap--sidebar">
              <img src={logoSrc} alt="" className="zb-shopSel__navLogo" width={32} height={32} decoding="async" />
            </span>
            <span className="zb-shopSel__sidebarBrandText">Zentrya Biz</span>
          </Link>
        </div>

        <nav className="zb-shopSel__sidebarNav" aria-label="Workspace">
          <p className="zb-shopSel__sidebarSection">Workspace</p>
          <span className="zb-shopSel__sidebarItem zb-shopSel__sidebarItem--active" aria-current="page">
            <FontAwesomeIcon icon={faBuilding} className="zb-shopSel__sidebarItemIcon" aria-hidden="true" />
            <span className="zb-shopSel__sidebarItemLabel">Organizations</span>
          </span>
          <Link className="zb-shopSel__sidebarItem" to={marketingLink()}>
            <FontAwesomeIcon icon={faHouse} className="zb-shopSel__sidebarItemIcon" aria-hidden="true" />
            <span className="zb-shopSel__sidebarItemLabel">Home</span>
          </Link>
          <Link className="zb-shopSel__sidebarItem" to={marketingLink('pricing')}>
            <FontAwesomeIcon icon={faCreditCard} className="zb-shopSel__sidebarItemIcon" aria-hidden="true" />
            <span className="zb-shopSel__sidebarItemLabel">Plans &amp; pricing</span>
          </Link>
        </nav>

        <div className="zb-shopSel__sidebarFoot">
          <div className="zb-shopSel__sidebarUser">
            <span className="zb-shopSel__sidebarUserAvatar" aria-hidden="true">
              {getInitials(displayName)}
            </span>
            <div className="zb-shopSel__sidebarUserText">
              <div className="zb-shopSel__sidebarUserName" title={displayName}>
                {displayName}
              </div>
              {accountEmail ? (
                <div className="zb-shopSel__sidebarUserEmail" title={accountEmail}>
                  {accountEmail}
                </div>
              ) : null}
            </div>
          </div>
          <button type="button" className="zb-shopSel__sidebarLogout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="zb-shopSel__mainWrap">
        <main className="zb-shopSel__mainInner">
          <div className="zb-shopSel__board">
            <header className="zb-shopSel__mainHead">
              <div className="zb-shopSel__mainHeadCopy">
                <p className="zb-shopSel__eyebrow">Workspace</p>
                <h1 className="zb-shopSel__title">
                  {canManageShops ? (isEmpty ? 'Create a shop' : 'Choose a shop') : 'Your shops'}
                </h1>
                <p className="zb-shopSel__lead">
                  {canManageShops
                    ? isEmpty
                      ? 'Add your first shop to open the app.'
                      : 'Select a shop to continue.'
                    : 'Select a shop you have access to.'}
                </p>
                <div className="zb-shopSel__summary" aria-label="Plan and shop usage">
                  <div className="zb-shopSel__summaryItem">
                    <span className="zb-shopSel__summaryLabel">Active plan</span>
                    <strong className="zb-shopSel__summaryValue">{planLabel}</strong>
                  </div>
                  <div className="zb-shopSel__summaryItem">
                    <span className="zb-shopSel__summaryLabel">Shops</span>
                    <strong className="zb-shopSel__summaryValue">{shopUsageLabel}</strong>
                  </div>
                </div>
              </div>
              {!isEmpty && canManageShops && canCreateMore ? (
                <button type="button" className="zb-shopSel__addShopBtn" onClick={openCreateModal}>
                  New shop
                </button>
              ) : null}
            </header>

            {pageError ? <div className="zb-shopSel__error">{pageError}</div> : null}

            {loading ? (
              <div className="zb-shopSel__loadingPanel" aria-live="polite" aria-busy="true">
                <div className="zb-shopSel__loadingMark">
                  <FontAwesomeIcon icon={faStore} className="zb-shopSel__loadingIcon" />
                </div>
                <h3 className="zb-shopSel__loadingTitle">Loading shops</h3>
                <p className="zb-shopSel__loadingHint">Please wait…</p>
              </div>
            ) : isEmpty ? (
              <div className="zb-shopSel__emptySimple">
                <div className="zb-shopSel__emptyCard">
                  <div className="zb-shopSel__emptyIcon" aria-hidden="true">
                    <FontAwesomeIcon icon={faStore} className="zb-shopSel__emptyIconSvg" />
                  </div>
                  <h2 className="zb-shopSel__emptyTitle">
                    {canManageShops ? 'No shops yet' : 'No assigned shops'}
                  </h2>
                  <p className="zb-shopSel__emptyText">
                    {canManageShops
                      ? 'Create a shop to get started.'
                      : 'Ask your administrator to add you to a shop.'}
                  </p>
                  {canManageShops ? (
                    <>
                      <button
                        type="button"
                        className="zb-shopSel__addShopBtn zb-shopSel__addShopBtn--large"
                        onClick={openCreateModal}
                        disabled={!canCreateMore}
                      >
                        Create shop
                      </button>
                      {!canCreateMore ? (
                        <p className="zb-shopSel__emptyLimitNote">
                          Shop limit reached. <a href="/#pricing">View plans</a>
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="zb-shopSel__shopsSection">
                <div className="zb-shopSel__grid">
                  {shops.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="zb-shopSel__card zb-shopSel__card--shop"
                      onClick={() => selectShop(s.id)}
                    >
                      <div className="zb-shopSel__cardHead">
                        <span className="zb-shopSel__cardGlyph" aria-hidden="true">
                          <FontAwesomeIcon icon={faStore} />
                        </span>
                        <span className="zb-shopSel__cardChevron" aria-hidden="true">
                          <FontAwesomeIcon icon={faChevronRight} />
                        </span>
                      </div>
                      <div className="zb-shopSel__cardBody">
                        <div className="zb-shopSel__cardName">{s.name}</div>
                        <div className="zb-shopSel__cardMeta">
                          {s.business_type ? <span>{s.business_type}</span> : null}
                          {s.city ? <span>• {s.city}</span> : null}
                          {s.currency ? <span>• {s.currency}</span> : null}
                        </div>
                        <div className="zb-shopSel__cardRolePill">
                          {s.memberRole === 'owner' || s.memberRole === 'admin' ? 'Owner / Admin' : 'Cashier'}
                        </div>
                      </div>
                    </button>
                  ))}

                  {canManageShops && canCreateMore ? (
                    <button
                      type="button"
                      className="zb-shopSel__card zb-shopSel__card--create"
                      onClick={openCreateModal}
                    >
                      <div className="zb-shopSel__plus" aria-hidden="true">
                        <FontAwesomeIcon icon={faPlus} className="zb-shopSel__plusIcon" />
                      </div>
                      <div className="zb-shopSel__createText">New shop</div>
                      <span className="zb-shopSel__createHint">Add another workspace</span>
                    </button>
                  ) : canManageShops ? (
                    <a className="zb-shopSel__card zb-shopSel__card--upgrade" href="/#pricing">
                      <div className="zb-shopSel__plus zb-shopSel__plus--muted" aria-hidden="true">
                        <FontAwesomeIcon icon={faCreditCard} />
                      </div>
                      <div className="zb-shopSel__createText">More shops</div>
                      <span className="zb-shopSel__upgradeHint">Plans &amp; pricing</span>
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showCreate && canManageShops ? (
        <div className="zb-shopSel__modalBackdrop" role="presentation" onClick={closeCreateModal}>
          <div className="zb-shopSel__modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="zb-shopSel__modalHeader">
              <div className="zb-shopSel__modalTitle">New shop</div>
              <button type="button" className="zb-shopSel__close" onClick={closeCreateModal} disabled={creating} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={createShop} className="zb-shopSel__form">
              {formError ? (
                <div className="zb-shopSel__error zb-shopSel__error--modal" role="alert">
                  {formError}
                </div>
              ) : null}
              <div className="zb-shopSel__formSection">
                <span className="zb-shopSel__formSectionLabel">Shop details</span>
                <div className="zb-shopSel__formRow">
                  <div className="zb-shopSel__field">
                    <label htmlFor="zb-shop-name">Shop name</label>
                    <input
                      id="zb-shop-name"
                      className="zb-shopSel__control"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="e.g. Ali Electronics"
                      autoComplete="organization"
                    />
                  </div>
                  <div className="zb-shopSel__field">
                    <label htmlFor="zb-shop-phone">Mobile number</label>
                    <input
                      id="zb-shop-phone"
                      className="zb-shopSel__control"
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      required
                      placeholder="e.g. 0300 1234567"
                      autoComplete="tel"
                    />
                    <span className="zb-shopSel__fieldHint">Used on invoices and shop settings.</span>
                  </div>
                </div>
                <div className="zb-shopSel__field">
                  <label htmlFor="zb-shop-address">Shop address</label>
                  <textarea
                    id="zb-shop-address"
                    className="zb-shopSel__textarea"
                    rows={3}
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Street, area (optional)"
                    autoComplete="street-address"
                  />
                </div>
                <div className="zb-shopSel__field">
                  <label htmlFor="zb-shop-type">Business type</label>
                  <select
                    id="zb-shop-type"
                    className="zb-shopSel__select zb-shopSel__control"
                    value={form.business_type}
                    onChange={(e) => setForm((p) => ({ ...p, business_type: e.target.value }))}
                  >
                      {BUSINESS_TYPES.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                </div>
              </div>

              <button className="zb-shopSel__formSubmit" type="submit" disabled={creating || !canCreateMore}>
                {creating ? (
                  <>
                    <span className="zb-shopSel__formSubmitSpinner" aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  'Create and open'
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
