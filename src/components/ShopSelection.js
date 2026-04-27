import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faBolt,
  faBoxesStacked,
  faIndianRupeeSign,
  faMapLocationDot,
  faPhone,
  faReceipt,
  faShieldHalved,
  faStore,
  faTags,
  faUserGroup,
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
  const [shopComparison, setShopComparison] = useState([]);
  const [shopComparisonLoading, setShopComparisonLoading] = useState(false);
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
  const shopsUsed = shops.length;

  const canCreateMore = useMemo(() => {
    if (unlimitedShops) return true;
    return shops.length < shopLimitNum;
  }, [shopLimitNum, shops.length, unlimitedShops]);

  const isEmpty = !loading && shops.length === 0;

  const planUsagePct = unlimitedShops
    ? 0
    : Math.min(100, shopLimitNum > 0 ? (shopsUsed / shopLimitNum) * 100 : 0);
  const shopLimitDisplay = unlimitedShops ? '∞' : String(shopLimitNum);

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
      if (hasManageRole && mapped.length > 0) {
        fetchShopComparison(mapped);
      } else {
        setShopComparison([]);
      }
    } catch (e) {
      setPageError(e.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  const fetchShopComparison = async (shopRows) => {
    if (!supabase || !Array.isArray(shopRows) || shopRows.length === 0) {
      setShopComparison([]);
      return;
    }
    const shopIds = shopRows.map((s) => s.id).filter(Boolean);
    if (shopIds.length === 0) {
      setShopComparison([]);
      return;
    }
    setShopComparisonLoading(true);
    try {
      const [salesRes, purchasesRes, expensesRes] = await Promise.all([
        supabase.from('sales').select('shop_id,total_amount').in('shop_id', shopIds),
        supabase.from('purchases').select('shop_id,total_amount').in('shop_id', shopIds),
        supabase.from('expenses').select('shop_id,amount').in('shop_id', shopIds),
      ]);

      const salesRows = Array.isArray(salesRes?.data) ? salesRes.data : [];
      const purchaseRows = Array.isArray(purchasesRes?.data) ? purchasesRes.data : [];
      const expenseRows = Array.isArray(expensesRes?.data) ? expensesRes.data : [];

      const byShop = new Map();
      shopRows.forEach((shop) => {
        byShop.set(shop.id, {
          shopId: shop.id,
          shopName: shop.name || 'Untitled shop',
          revenue: 0,
          expenses: 0,
          purchases: 0,
          profit: 0,
        });
      });

      salesRows.forEach((row) => {
        const rec = byShop.get(row.shop_id);
        if (rec) rec.revenue += Number(row.total_amount || 0);
      });
      purchaseRows.forEach((row) => {
        const rec = byShop.get(row.shop_id);
        if (rec) rec.purchases += Number(row.total_amount || 0);
      });
      expenseRows.forEach((row) => {
        const rec = byShop.get(row.shop_id);
        if (rec) rec.expenses += Number(row.amount || 0);
      });

      const merged = [...byShop.values()].map((row) => ({
        ...row,
        profit: row.revenue - row.purchases - row.expenses,
      }));
      setShopComparison(merged);
    } catch (e) {
      console.warn('[ShopSelection] Shop comparison load failed:', e?.message || e);
      setShopComparison([]);
    } finally {
      setShopComparisonLoading(false);
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

  const year = new Date().getFullYear();
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
    <div className="zb-shopSel">
      <div className="zb-shopSel__bgGlow" aria-hidden="true" />
      <nav className="zb-shopSel__nav" aria-label="Main">
        <div className="zb-shopSel__navInner">
          <Link to={marketingLink()} className="zb-shopSel__navBrand">
            <span className="zb-shopSel__navLogoWrap">
              <img src={logoSrc} alt="" className="zb-shopSel__navLogo" width={36} height={36} decoding="async" />
            </span>
            <span className="zb-shopSel__navBrandText">Zentrya Biz</span>
          </Link>
          <div className="zb-shopSel__navLinks">
            <Link to={marketingLink()}>Home</Link>
            <Link to={marketingLink('features')}>Features</Link>
            <Link to={marketingLink('pricing')}>Pricing</Link>
            <Link to={marketingLink('faq')}>FAQ</Link>
          </div>
          <div className="zb-shopSel__navRight">
            <div className="zb-shopSel__profile zb-shopSel__profile--nav">
              <button type="button" className="zb-shopSel__avatarBtn" aria-label="Account menu">
                <span className="zb-shopSel__avatar">{getInitials(displayName)}</span>
              </button>
              <div className="zb-shopSel__profilePopover" role="menu" aria-label="Profile menu">
                <div className="zb-shopSel__profileName" title={displayName}>
                  {displayName}
                </div>
                {accountEmail ? (
                  <div className="zb-shopSel__profileEmail" title={accountEmail}>
                    {accountEmail}
                  </div>
                ) : null}
                <button type="button" className="zb-shopSel__logoutBtn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="zb-shopSel__shell">
        <header className="zb-shopSel__header">
          <div className="zb-shopSel__headerCopy">
            <p className="zb-shopSel__eyebrow">Your workspace</p>
            <h1 className="zb-shopSel__title">
              {canManageShops
                ? (isEmpty ? 'Let’s add your first shop' : 'Open a shop')
                : 'Shops where you have been added'}
            </h1>
            <p className="zb-shopSel__lead">
              {canManageShops
                ? (isEmpty
                    ? 'You’re on the free trial — no plan purchase needed yet. Create one shop to start billing and inventory.'
                    : 'Pick where you want to work, or add another if your plan allows.')
                : 'Choose any shop below to continue as cashier.'}
            </p>

            {canManageShops ? (
              <div className="zb-shopSel__planStrip" aria-label="Plan and shop limit">
                <div className="zb-shopSel__planStripTop">
                  <span className="zb-shopSel__pill zb-shopSel__pill--trial">14-day trial</span>
                  <span className="zb-shopSel__planMeta">
                    <span className="zb-shopSel__planMetaLabel">Shops on this plan</span>
                    <strong className="zb-shopSel__planMetaValue">
                      {shopsUsed} / {shopLimitDisplay} used
                    </strong>
                  </span>
                  <a className="zb-shopSel__planCompare" href="/#pricing">
                    Compare plans →
                  </a>
                </div>
                <div
                  className="zb-shopSel__planMeter"
                  role="progressbar"
                  aria-valuenow={shopsUsed}
                  aria-valuemin={0}
                  aria-valuemax={unlimitedShops ? Math.max(shopsUsed, 1) : shopLimitNum}
                  aria-label={`${shopsUsed} of ${shopLimitDisplay} shop slots used`}
                >
                  <div className="zb-shopSel__planMeterTrack">
                    <div className="zb-shopSel__planMeterFill" style={{ width: `${planUsagePct}%` }} />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!isEmpty && canManageShops ? (
            <div className="zb-shopSel__headerActions">
              {canCreateMore ? (
                <button
                  type="button"
                  className="zb-shopSel__addShopBtn"
                  onClick={openCreateModal}
                >
                  Add shop
                </button>
              ) : (
                <div className="zb-shopSel__limitReached" role="status">
                  <span className="zb-shopSel__limitBadge">Plan limit reached</span>
                  <a className="zb-shopSel__upgradeLink" href="/#pricing">
                    Upgrade for more shops
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </header>

        {pageError ? <div className="zb-shopSel__error">{pageError}</div> : null}

        {loading ? (
          <div
            style={{
              minHeight: '320px',
              borderRadius: '18px',
              border: '1px solid #d8e2ff',
              background: 'linear-gradient(160deg,#f8faff 0%,#f1f5ff 100%)',
              display: 'grid',
              placeItems: 'center',
              padding: '28px',
              textAlign: 'center',
            }}
            aria-live="polite"
            aria-busy="true"
          >
            <div>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  margin: '0 auto 14px',
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg,#4f46e5,#6366f1)',
                  boxShadow: '0 14px 30px rgba(79,70,229,.28)',
                  position: 'relative',
                  animation: 'zbShopPulse 1.2s ease-in-out infinite',
                }}
              >
                <FontAwesomeIcon
                  icon={faStore}
                  style={{
                    color: '#fff',
                    fontSize: '30px',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
              <h3 style={{ margin: '0 0 6px', color: '#1f2a5a', fontSize: '20px' }}>
                Setting up your workspace
              </h3>
              <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                Checking your role and loading shops...
              </p>
            </div>
            <style>{`
              @keyframes zbShopPulse {
                0%,100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-4px) scale(1.04); }
              }
            `}</style>
          </div>
        ) : isEmpty ? (
          <div className="zb-shopSel__emptyLayout">
            <div className="zb-shopSel__emptyMain">
              <div className="zb-shopSel__emptyCard">
                <div className="zb-shopSel__emptyIcon" aria-hidden="true">
                  <FontAwesomeIcon icon={faStore} className="zb-shopSel__emptyIconSvg" />
                </div>
                <h2 className="zb-shopSel__emptyTitle">{canManageShops ? 'No shop yet' : 'No assigned shops yet'}</h2>
                <p className="zb-shopSel__emptyText">
                  {canManageShops
                    ? 'Add your business name and you’ll land on the dashboard. You can invite salesmen later from settings.'
                    : 'You are signed in as cashier. Ask your admin to add you to a shop.'}
                </p>
                {canManageShops ? (
                  <>
                    <button
                      type="button"
                      className="zb-shopSel__addShopBtn zb-shopSel__addShopBtn--large"
                      onClick={openCreateModal}
                      disabled={!canCreateMore}
                    >
                      Create your first shop
                    </button>
                    {!canCreateMore ? (
                      <p className="zb-shopSel__emptyLimitNote">
                        You’ve used all shops on your plan.{' '}
                        <a href="/#pricing">Upgrade</a> to add more.
                      </p>
                    ) : null}
                  </>
                ) : null}
                <p className="zb-shopSel__emptyHint">
                  Not ready to choose?{' '}
                  <Link className="zb-shopSel__inlineLink" to="/">
                    Back to home
                  </Link>
                </p>
              </div>
            </div>
            {canManageShops ? (
              <aside className="zb-shopSel__emptyAside" aria-label="Welcome">
                <h3 className="zb-shopSel__asideTitle">Almost set</h3>
                <p className="zb-shopSel__asideText">
                  One shop unlocks billing, inventory, and your team workspace — same look and feel as your sign-in experience.
                </p>
                <ul className="zb-shopSel__asideList">
                  <li>
                    <span className="zb-shopSel__asideFa" aria-hidden="true">
                      <FontAwesomeIcon icon={faShieldHalved} />
                    </span>
                    <span>Secure, email-based account</span>
                  </li>
                  <li>
                    <span className="zb-shopSel__asideFa" aria-hidden="true">
                      <FontAwesomeIcon icon={faIndianRupeeSign} />
                    </span>
                    <span>PKR-ready ledgers</span>
                  </li>
                  <li>
                    <span className="zb-shopSel__asideFa" aria-hidden="true">
                      <FontAwesomeIcon icon={faArrowTrendUp} />
                    </span>
                    <span>Scale with plans when you need more shops</span>
                  </li>
                </ul>
              </aside>
            ) : null}

            <section className="zb-shopSel__tips zb-shopSel__tips--empty" aria-label="What you get">
              <h2 className="zb-shopSel__tipsTitle">Why create a shop?</h2>
              <ul className="zb-shopSel__tipsList">
                <li>
                  <span className="zb-shopSel__tipsFa" aria-hidden="true">
                    <FontAwesomeIcon icon={faBolt} />
                  </span>
                  <div>
                    <strong>One place for sales</strong>
                    <p>POS billing, stock checks, and invoices tied to your business name.</p>
                  </div>
                </li>
                <li>
                  <span className="zb-shopSel__tipsFa" aria-hidden="true">
                    <FontAwesomeIcon icon={faShieldHalved} />
                  </span>
                  <div>
                    <strong>Your data, your workspace</strong>
                    <p>Each shop keeps its own products, customers, and staff access.</p>
                  </div>
                </li>
                <li>
                  <span className="zb-shopSel__tipsFa" aria-hidden="true">
                    <FontAwesomeIcon icon={faIndianRupeeSign} />
                  </span>
                  <div>
                    <strong>PKR-first</strong>
                    <p>Pricing and ledger amounts in Pakistani Rupees — no mixed currencies.</p>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        ) : (
          <>
            <div className="zb-shopSel__shopsSection">
            <div className="zb-shopSel__grid">
              {shops.map((s) => (
                <button key={s.id} type="button" className="zb-shopSel__card" onClick={() => selectShop(s.id)}>
                  <div className="zb-shopSel__cardName">{s.name}</div>
                  <div className="zb-shopSel__cardMeta">
                    {s.business_type ? <span>{s.business_type}</span> : null}
                    {s.city ? <span>• {s.city}</span> : null}
                    {s.currency ? <span>• {s.currency}</span> : null}
                  </div>
                  <div className="zb-shopSel__cardRole">
                    {s.memberRole === 'owner' || s.memberRole === 'admin' ? 'Owner/Admin' : 'Cashier'}
                  </div>
                </button>
              ))}

              {canManageShops && canCreateMore ? (
                <button
                  type="button"
                  className="zb-shopSel__card zb-shopSel__card--create"
                  onClick={openCreateModal}
                >
                  <div className="zb-shopSel__plus">＋</div>
                  <div className="zb-shopSel__createText">Add another shop</div>
                </button>
              ) : canManageShops ? (
                <a className="zb-shopSel__card zb-shopSel__card--upgrade" href="/#pricing">
                  <div className="zb-shopSel__plus zb-shopSel__plus--muted">↑</div>
                  <div className="zb-shopSel__createText">Upgrade for more shops</div>
                  <span className="zb-shopSel__upgradeHint">View plans & pricing</span>
                </a>
              ) : null}
            </div>
            </div>

            {canManageShops ? (
              <section className="zb-shopSel__tips" aria-label="What you can do next">
                <h2 className="zb-shopSel__tipsTitle">After you open a shop</h2>
                <ul className="zb-shopSel__tipsList">
                  <li>
                    <span className="zb-shopSel__tipsFa" aria-hidden="true">
                      <FontAwesomeIcon icon={faReceipt} />
                    </span>
                    <div>
                      <strong>Billing & POS</strong>
                      <p>Fast checkout, discounts, and printed or shared invoices.</p>
                    </div>
                  </li>
                  <li>
                    <span className="zb-shopSel__tipsFa" aria-hidden="true">
                      <FontAwesomeIcon icon={faBoxesStacked} />
                    </span>
                    <div>
                      <strong>Stock &amp; products</strong>
                      <p>Track quantities and get low-stock alerts before you run out.</p>
                    </div>
                  </li>
                  <li>
                    <span className="zb-shopSel__tipsFa" aria-hidden="true">
                      <FontAwesomeIcon icon={faUserGroup} />
                    </span>
                    <div>
                      <strong>Customers &amp; ledger</strong>
                      <p>Udhar / credit sales and payment history in one place.</p>
                    </div>
                  </li>
                </ul>
              </section>
            ) : null}

            {canManageShops ? (
              <section
                style={{
                  marginTop: '18px',
                  borderRadius: '14px',
                  border: '1px solid #dde5ff',
                  background: '#fff',
                  padding: '16px',
                }}
                aria-label="Shop performance comparison"
              >
                <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#1e293b' }}>
                  Shops Performance Comparison
                </h2>
                <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '14px' }}>
                  Compare revenue and estimated profit across all your shops.
                </p>
                {shopComparisonLoading ? (
                  <div style={{ color: '#475569', fontSize: '14px' }}>Loading graph...</div>
                ) : shopComparison.length === 0 ? (
                  <div style={{ color: '#475569', fontSize: '14px' }}>
                    No comparison data yet. Start billing in your shops to see graph insights.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {shopComparison.map((row) => {
                      const denom = Math.max(
                        ...shopComparison.map((s) => Math.max(s.revenue, Math.abs(s.profit), 1))
                      );
                      const revenuePct = Math.max(6, Math.round((row.revenue / denom) * 100));
                      const profitPct = Math.max(6, Math.round((Math.abs(row.profit) / denom) * 100));
                      const costBase = Math.max(Number(row.revenue || 0), 1);
                      const purchasesRatio = Math.max(0, Math.min(100, Math.round((Number(row.purchases || 0) / costBase) * 100)));
                      const expensesRatio = Math.max(0, Math.min(100, Math.round((Number(row.expenses || 0) / costBase) * 100)));
                      const profitRatio = Math.max(
                        0,
                        Math.min(100, 100 - Math.min(100, purchasesRatio + expensesRatio))
                      );
                      const donutGradient = `conic-gradient(
                        #2563eb 0% ${purchasesRatio}%,
                        #f97316 ${purchasesRatio}% ${Math.min(100, purchasesRatio + expensesRatio)}%,
                        ${row.profit >= 0 ? '#16a34a' : '#dc2626'} ${Math.min(100, purchasesRatio + expensesRatio)}% 100%
                      )`;
                      return (
                        <div key={row.shopId} style={{ border: '1px solid #edf2ff', borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{row.shopName}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
                            <div>
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                                  Revenue: PKR {Number(row.revenue || 0).toFixed(0)}
                                </div>
                                <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999 }}>
                                  <div
                                    style={{
                                      width: `${revenuePct}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg,#2563eb,#60a5fa)',
                                      borderRadius: 999,
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                                  Profit: PKR {Number(row.profit || 0).toFixed(0)}
                                </div>
                                <div style={{ height: 10, background: '#e2e8f0', borderRadius: 999 }}>
                                  <div
                                    style={{
                                      width: `${profitPct}%`,
                                      height: '100%',
                                      background:
                                        row.profit >= 0
                                          ? 'linear-gradient(90deg,#16a34a,#4ade80)'
                                          : 'linear-gradient(90deg,#dc2626,#fb7185)',
                                      borderRadius: 999,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', placeItems: 'center' }}>
                              <div
                                style={{
                                  width: 106,
                                  height: 106,
                                  borderRadius: '50%',
                                  background: donutGradient,
                                  display: 'grid',
                                  placeItems: 'center',
                                }}
                                title="Blue: Purchases, Orange: Expenses, Green/Red: Profit"
                              >
                                <div
                                  style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    display: 'grid',
                                    placeItems: 'center',
                                    textAlign: 'center',
                                    fontSize: 10,
                                    color: '#334155',
                                    border: '1px solid #e2e8f0',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  Mix
                                </div>
                              </div>
                              <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                                <div><span style={{ color: '#2563eb' }}>●</span> Purchases</div>
                                <div><span style={{ color: '#f97316' }}>●</span> Expenses</div>
                                <div>
                                  <span style={{ color: row.profit >= 0 ? '#16a34a' : '#dc2626' }}>●</span>{' '}
                                  {row.profit >= 0 ? 'Profit' : 'Loss'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : null}
          </>
        )}
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
                    <div className="zb-shopSel__inputWithIcon">
                      <span className="zb-shopSel__fieldIcon" aria-hidden="true">
                        <FontAwesomeIcon icon={faStore} />
                      </span>
                      <input
                        id="zb-shop-name"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        required
                        placeholder="e.g. Ali Electronics"
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                  <div className="zb-shopSel__field">
                    <label htmlFor="zb-shop-phone">Mobile number</label>
                    <div className="zb-shopSel__inputWithIcon">
                      <span className="zb-shopSel__fieldIcon" aria-hidden="true">
                        <FontAwesomeIcon icon={faPhone} />
                      </span>
                      <input
                        id="zb-shop-phone"
                        type="tel"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        required
                        placeholder="e.g. 0300 1234567"
                        autoComplete="tel"
                      />
                    </div>
                    <span className="zb-shopSel__fieldHint">Used on invoices and shop settings.</span>
                  </div>
                </div>
                <div className="zb-shopSel__field">
                  <label htmlFor="zb-shop-address">Shop address</label>
                  <div className="zb-shopSel__inputWithIcon zb-shopSel__inputWithIcon--top">
                    <span className="zb-shopSel__fieldIcon" aria-hidden="true">
                      <FontAwesomeIcon icon={faMapLocationDot} />
                    </span>
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
                </div>
                <div className="zb-shopSel__field">
                  <label htmlFor="zb-shop-type">Business type</label>
                  <div className="zb-shopSel__inputWithIcon zb-shopSel__selectWrap">
                    <span className="zb-shopSel__fieldIcon" aria-hidden="true">
                      <FontAwesomeIcon icon={faTags} />
                    </span>
                    <select
                      id="zb-shop-type"
                      className="zb-shopSel__select"
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

      <footer className="zb-shopSel__footer">
        <div className="zb-shopSel__footerInner">
          <div>
            <h5 className="zb-shopSel__footerBrand">Zentrya Biz</h5>
            <p className="zb-shopSel__footerTagline">Premium retail software for modern shops.</p>
          </div>
          <div className="zb-shopSel__footerLinks">
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
            <a href="/#faq">FAQ</a>
            <Link to="/login">Log in</Link>
          </div>
          <div className="zb-shopSel__footerMeta">
            <p className="zb-shopSel__footerEmail">support@zentryasolutions.com</p>
            <p>© {year} Zentrya Biz</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
