import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { isUnlimitedShops } from '../utils/planFeatures';
import { marketingHomeQuery } from '../utils/workspacePaths';
import { authAPI, billingAPI, shopPickerAPI } from '../services/api';
import { hasPosBackendSession } from '../lib/appMode';
import './shopPickerV2.css';

const shopPickerMobileOverrides = `
@media (max-width: 900px) {
  .zbms-shell {
    display: block !important;
  }
  .zbms-sidebar {
    display: none !important;
  }
  .zbms-main {
    width: 100% !important;
    margin-left: 0 !important;
  }
  .zbms-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .zbms-hero-inner {
    display: block !important;
  }
  .zbms-hero-right {
    margin-top: 12px;
  }
  .zbms-shops-grid {
    grid-template-columns: 1fr !important;
  }
  .zbms-panel--pricing .zbms-panel-grid {
    grid-template-columns: 1fr !important;
  }
}
`;

/** Frontend Stripe Price IDs — same values as backend `STRIPE_PRICE_*`. */
function stripePriceIdForTier(tierId) {
  const starter = process.env.REACT_APP_STRIPE_PRICE_STARTER;
  const pro = process.env.REACT_APP_STRIPE_PRICE_PRO;
  const premium = process.env.REACT_APP_STRIPE_PRICE_PREMIUM;
  switch (tierId) {
    case 'starter':
      return String(starter || '').trim();
    case 'growth':
      return String(pro || '').trim();
    case 'business':
      return String(premium || '').trim();
    default:
      return '';
  }
}

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

/** Rows in Organizations view (compact meter) */
const PLAN_TIERS = [
  { id: 'trial', name: 'Trial', price: 'Free', shops: 1 },
  { id: 'starter', name: 'Starter', price: '$9/mo', shops: 1 },
  { id: 'growth', name: 'Growth', price: '$25/mo', shops: 3 },
  { id: 'business', name: 'Business', price: '$49/mo', shops: 10 },
];

const TIER_RANK = { trial: 0, starter: 1, growth: 2, business: 3 };

/** Full pricing cards (+ bullets), aligned with marketing copy */
const PLAN_PURCHASE_DETAIL = [
  {
    tierId: 'trial',
    title: '14-Day Trial',
    priceLine: 'Free',
    subtitle: 'No card required · Starter features · 1 shop',
    bullets: [
      'Unlimited salesmen',
      'Billing, inventory & stock',
      'Customer ledger (Udhar) & vendors',
      'One trial per email',
    ],
  },
  {
    tierId: 'starter',
    title: 'Starter',
    priceLine: '$9',
    subtitle: '/ month · 1 shop',
    bullets: ['Everything in trial', 'Basic reports', 'Email sign-in workspace'],
    popular: false,
  },
  {
    tierId: 'growth',
    title: 'Growth',
    priceLine: '$25',
    subtitle: '/ month · up to 3 shops',
    bullets: ['All Starter features', 'Advanced reports', 'CSV export', 'Priority support'],
    popular: true,
  },
  {
    tierId: 'business',
    title: 'Business',
    priceLine: '$49',
    subtitle: '/ month · high shop allowance',
    bullets: ['All Growth features', 'Multi-location scale', 'Admin & audit tooling', 'Dedicated support'],
    popular: false,
  },
];

function normalizePlanTier(planRaw) {
  const p = String(planRaw || 'trial')
    .toLowerCase()
    .replace(/[_\s]+/g, '');
  if (/business|premium|enterprise/.test(p)) return 'business';
  if (/growth|pro/.test(p)) return 'growth';
  if (/starter|standard/.test(p)) return 'starter';
  return 'trial';
}

const SHOP_EMOJI = {
  General: '🏪',
  Hardware: '🔧',
  Plumbing: '🔩',
  Electrical: '⚡',
  Grocery: '🛒',
  Pharmacy: '💊',
  Electronics: '💻',
};
const SHOP_BG = {
  General: '#f4f3ef',
  Hardware: '#fff7ed',
  Plumbing: '#f0f9ff',
  Electrical: '#fefce8',
  Electronics: '#eff6ff',
  Grocery: '#f0fdf4',
  Pharmacy: '#fdf4ff',
};

function shopEmoji(bt) {
  return SHOP_EMOJI[(bt || '').split('&')[0].trim()] || SHOP_EMOJI.General;
}
function shopBg(bt) {
  const key = (bt || 'General').split('&')[0].trim();
  return SHOP_BG[key] || SHOP_BG.General;
}

function formatRelativeFromIso(iso) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** YYYY-MM-DD for "today", aligned with backend `BUSINESS_TIMEZONE` defaults. */
function getBusinessTodayDateString() {
  try {
    const tz = process.env.REACT_APP_BUSINESS_TIMEZONE || 'Asia/Karachi';
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date()
    );
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function formatShopMoney(amount, currencyRaw) {
  const c = String(currencyRaw || 'PKR').toUpperCase();
  const n = typeof amount === 'number' ? amount : parseFloat(amount);
  const val = Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  const sep = val.toLocaleString('en-US', {
    minimumFractionDigits: Number.isFinite(n) && n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  if (c === 'PKR') return `Rs. ${sep}`;
  const prefixes = { INR: '₹ ', USD: '$', AED: 'AED ', SAR: 'SAR ' };
  const p = prefixes[c];
  return p ? `${p}${sep}` : `${sep} ${c}`;
}

/** Map shop id string → { todaySales: number|null, productCount: number|null } — null means query failed */
async function fetchShopPickerQuickStats(supabaseClient, mappedShops) {
  const ids = (mappedShops || []).map((s) => s.id).filter((x) => x != null);
  if (!ids.length) return {};
  const uniqueKey = [...new Set(ids.map((id) => String(id)))];
  const out = {};
  uniqueKey.forEach((k) => {
    out[k] = { todaySales: null, productCount: null };
  });

  const todayStr = getBusinessTodayDateString();

  // Prefer backend API when we have Express session headers; otherwise skip to avoid 401 noise.
  // Fallback to Supabase direct select if API is unavailable or session not ready.
  try {
    if (hasPosBackendSession()) {
      const r = await shopPickerAPI.quickStats(ids);
      const stats = r?.data?.stats || {};
      uniqueKey.forEach((k) => {
        const s = stats[String(k)];
        out[k] = {
          todaySales: typeof s?.todaySales === 'number' ? s.todaySales : 0,
          productCount: typeof s?.productCount === 'number' ? s.productCount : 0,
        };
      });
      return out;
    }
    throw new Error('no-backend-session');
  } catch {
    const [saleRes, prodRes] = await Promise.all([
      supabaseClient.from('sales').select('shop_id,total_amount').in('shop_id', ids).eq('date', todayStr),
      supabaseClient.from('products').select('shop_id').in('shop_id', ids),
    ]);

    const salesSumByShop = {};
    if (!saleRes.error && saleRes.data) {
      saleRes.data.forEach((row) => {
        const sid = String(row.shop_id);
        const amt = Number(row.total_amount) || 0;
        salesSumByShop[sid] = (salesSumByShop[sid] || 0) + amt;
      });
    }

    const prodCountByShop = {};
    if (!prodRes.error && prodRes.data) {
      prodRes.data.forEach((row) => {
        const sid = String(row.shop_id);
        prodCountByShop[sid] = (prodCountByShop[sid] || 0) + 1;
      });
    }

    uniqueKey.forEach((k) => {
      out[k] = {
        todaySales: saleRes.error ? null : salesSumByShop[k] ?? 0,
        productCount: prodRes.error ? null : prodCountByShop[k] ?? 0,
      };
    });
  }

  return out;
}

function Svg({ children, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...rest}>
      {children}
    </svg>
  );
}

export default function ShopPickerPage() {
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
    city: '',
    currency: 'PKR',
  });

  /** Sidebar: default shop picker; other panels stay in-page. */
  const [mainPanel, setMainPanel] = useState('organizations');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState('');
  const [checkoutErr, setCheckoutErr] = useState('');
  const [checkoutOkMsg, setCheckoutOkMsg] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [shopQuickStats, setShopQuickStats] = useState({});

  const shopLimitNum =
    profile?.shop_limit != null && profile.shop_limit !== '' ? Number(profile.shop_limit) : 1;
  const unlimitedShops = isUnlimitedShops(shopLimitNum);

  const canCreateMore = useMemo(() => {
    if (unlimitedShops) return true;
    return shops.length < shopLimitNum;
  }, [shopLimitNum, shops.length, unlimitedShops]);

  const isEmpty = !loading && shops.length === 0;
  const shopsUsed = shops.length;
  const effectiveLimitNum = unlimitedShops ? shopsUsed || 1 : shopLimitNum;
  const heroBarPct = unlimitedShops
    ? Math.min(100, 25 + shopsUsed * 5)
    : Math.min(100, Math.round((shopsUsed / effectiveLimitNum) * 100));
  const heroBarColor =
    !unlimitedShops && shopsUsed >= shopLimitNum ? '#ef4444' : !unlimitedShops && heroBarPct >= 80 ? '#f59e0b' : '#22c55e';

  const planTier = normalizePlanTier(profile?.plan);
  const tierMeta = PLAN_TIERS.find((t) => t.id === planTier) || PLAN_TIERS[0];
  const planDisplayName =
    String(profile?.plan || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) || tierMeta.name;

  const atLimit = canCreateMore === false;

  let lastShopRef = '';
  try {
    lastShopRef = user?.id ? localStorage.getItem(`zb_last_shop_${String(user.id)}`) || '' : '';
  } catch {
    lastShopRef = '';
  }

  const fetchShops = async () => {
    if (!supabase || !user?.id) return;
    setPageError('');
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('shop_users')
        .select(
          'role, shop:shops(id, name, phone, address, business_type, city, currency, created_at)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false, referencedTable: 'shops' });
      if (e) throw e;
      const mapped = (data || []).map((row) => ({ ...row.shop, memberRole: row.role })).filter(Boolean);
      const dbRoles = mapped.map((row) => String(row.memberRole || '').toLowerCase());
      const hasManageRole = dbRoles.some((role) => ['owner', 'admin', 'administrator'].includes(role));
      const hasStaffRole = dbRoles.some((role) =>
        ['cashier', 'seller', 'salesman', 'staff'].includes(role)
      );
      setResolvedRole(hasManageRole ? 'admin' : hasStaffRole ? 'cashier' : '');
      setShops(mapped);
      setShopQuickStats({});
      fetchShopPickerQuickStats(supabase, mapped).then(setShopQuickStats).catch(() => {});
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
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('checkout') !== 'success') return;
      u.searchParams.delete('checkout');
      window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);
      refreshProfile?.();
      setCheckoutOkMsg('Payment completed. Your plan will update shortly.');
      setMainPanel('organizations');
      const t = setTimeout(() => setCheckoutOkMsg(''), 10000);
      return () => clearTimeout(t);
    } catch {
      /* ignore malformed URL */
    }
  }, [refreshProfile]);

  // Do not auto-redirect when activeShopId is set — user may open "My Shops" while already
  // inside a workspace; selectShop() already navigates to the dashboard after picking a shop.

  useEffect(() => {
    if (!showCreate) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !creating) {
        setFormError('');
        setShowCreate(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCreate, creating]);

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
    if (window.confirm('Logout?')) await logout?.();
  };

  const openCreateModal = () => {
    if (!canCreateMore && canManageShops) return;
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
            city: form.city.trim() || null,
            currency: form.currency || 'PKR',
          },
        ])
        .select('id')
        .single();
      if (insErr) throw insErr;
      await refreshProfile?.();
      setFormError('');
      setShowCreate(false);
      setForm({
        name: '',
        phone: '',
        address: '',
        business_type: 'General',
        city: '',
        currency: 'PKR',
      });
      selectShop(shop.id);
    } catch (err) {
      setFormError(err.message || 'Failed to create shop');
    } finally {
      setCreating(false);
    }
  };

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

  const planChipTone = tierMeta.id;

  if (!isSupabaseBrowserConfigured()) {
    return (
      <div className="zb-shopSel zb-shopSel--v2 zbms-supabase-error">
        <div className="zbms-inner">
          <p style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, marginBottom: 8 }}>
            Supabase not configured
          </p>
          <div style={{ fontSize: 14, color: '#6b6760' }}>
            Add <code>REACT_APP_SUPABASE_URL</code> plus <code>REACT_APP_SUPABASE_PUBLISHABLE_KEY</code> or{' '}
            <code>REACT_APP_SUPABASE_ANON_KEY</code> in <code>frontend/.env</code> (local) or Vercel env, then
            restart / redeploy.
          </div>
        </div>
      </div>
    );
  }

  const upgradeLink = '/#pricing';

  const topTitle =
    mainPanel === 'organizations'
      ? 'My Shops'
      : mainPanel === 'pricing'
        ? 'Plans & pricing'
        : mainPanel === 'profile'
          ? 'Profile'
          : 'Settings';

  const shopLimitLabel = unlimitedShops
    ? `${shopsUsed} (unlimited)`
    : `${shopsUsed} / ${shopLimitNum}${shopLimitNum === 1 ? ' shop' : ' shops'}`;

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    const email = String(accountEmail || '').trim().toLowerCase();
    if (!email) {
      setPwError('No email on file for this session.');
      return;
    }
    if (!pwCurrent.trim()) {
      setPwError('Enter your current password.');
      return;
    }
    if (!pwNew.trim()) {
      setPwError('Enter a new password.');
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError('New password and confirmation must match.');
      return;
    }
    setPwSaving(true);
    try {
      await authAPI.zbChangePassword({
        email,
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setPwSuccess('Password saved. Sign in next time with your new password.');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Could not update password.';
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  };

  const stripeCustomerId = profile?.stripe_customer_id;

  const openBillingPortal = async () => {
    if (!user?.id || !stripeCustomerId) return;
    setCheckoutErr('');
    setPortalBusy(true);
    try {
      const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
      const { data } = await billingAPI.createPortalSession({
        returnUrl,
        userId: user.id,
      });
      if (data?.url) window.location.href = data.url;
      else setCheckoutErr('Could not open billing.');
    } catch (err) {
      setCheckoutErr(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Billing portal is unavailable right now.'
      );
    } finally {
      setPortalBusy(false);
    }
  };

  const startCheckoutForTier = async (tierId) => {
    if (tierId === 'trial') return;
    const priceId = stripePriceIdForTier(tierId);
    if (!priceId) {
      setCheckoutErr(
        'Subscriptions are being set up. Please try again later or use the billing link from your administrator.'
      );
      return;
    }
    if (!user?.id || !accountEmail) {
      setCheckoutErr('Something is wrong with your session. Sign out and sign in again.');
      return;
    }
    setCheckoutErr('');
    setCheckoutLoadingTier(tierId);
    try {
      const u = new URL(window.location.href);
      const cancelUrl = u.toString();
      const success = new URL(window.location.href);
      success.searchParams.set('checkout', 'success');
      const successUrl = success.toString();
      const { data } = await billingAPI.createCheckoutSession({
        priceId,
        successUrl,
        cancelUrl,
        customerEmail: String(accountEmail).trim().toLowerCase(),
        userId: user.id,
      });
      if (data?.url) window.location.href = data.url;
      else setCheckoutErr('Could not start checkout.');
    } catch (err) {
      setCheckoutErr(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Could not start checkout.'
      );
    } finally {
      setCheckoutLoadingTier('');
    }
  };

  /** Plan tier buttons — same row for org view and Pricing panel */
  const planTierButtons = (
    <div className="zbms-plan-info-row zbms-anim">
      {PLAN_TIERS.map((t) => {
        const active = planTier === t.id;
        const fill = active
          ? Math.min(100, Math.round((shopsUsed / Math.max(1, t.shops)) * 100))
          : 0;
        return (
          <button
            key={t.id}
            type="button"
            className={`zbms-plan-tier${active ? ' zbms-plan-tier--current' : ''}`}
            onClick={() => setMainPanel('pricing')}
          >
            <div className="zbms-pt-header">
              <span className="zbms-pt-name">{t.name}</span>
              {active ? (
                <span className="zbms-pt-current-badge">Current</span>
              ) : (
                <span className="zbms-pt-price">{t.price}</span>
              )}
            </div>
            <div className="zbms-pt-shops">{t.shops}</div>
            <div className="zbms-pt-shops-lbl">{t.shops === 1 ? 'shop included' : 'shops included'}</div>
            <div className="zbms-pt-bar">
              <div className="zbms-pt-bar-fill" style={{ width: `${fill}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <style>{shopPickerMobileOverrides}</style>
      <div className="zb-shopSel zb-shopSel--v2 zbms-shell">
      <aside className="zbms-sidebar" aria-label="Workspace navigation">
        <div className="zbms-sb-top">
          <Link to={marketingLink()} className="zbms-sb-brand">
            <div className="zbms-sb-logo-wrap">
              <img src={logoSrc} alt="" className="zbms-sb-logo-img" width={34} height={34} />
            </div>
            <span className="zbms-sb-brand-name">Zentrya Biz</span>
          </Link>
        </div>
        <nav className="zbms-sb-nav" aria-label="Workspace">
          <div className="zbms-sb-section-lbl">Workspace</div>
          <button
            type="button"
            className={`zbms-sb-item${mainPanel === 'organizations' ? ' zbms-sb-item--active' : ''}`}
            aria-current={mainPanel === 'organizations' ? 'page' : undefined}
            onClick={() => setMainPanel('organizations')}
          >
            <Svg aria-hidden width={15} height={15}>
              <rect x="2" y="3" width="7" height="7" rx="1" />
              <rect x="15" y="3" width="7" height="7" rx="1" />
              <rect x="2" y="14" width="7" height="7" rx="1" />
              <rect x="15" y="14" width="7" height="7" rx="1" />
            </Svg>
            Organizations
          </button>
          <Link className="zbms-sb-item" to={marketingLink()}>
            <Svg width={15} height={15} aria-hidden>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </Svg>
            Home
          </Link>
          <button
            type="button"
            className={`zbms-sb-item${mainPanel === 'pricing' ? ' zbms-sb-item--active' : ''}`}
            aria-current={mainPanel === 'pricing' ? 'page' : undefined}
            onClick={() => setMainPanel('pricing')}
          >
            <Svg width={15} height={15} aria-hidden>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </Svg>
            Plans &amp; pricing
          </button>

          <div className="zbms-sb-section-lbl">Account</div>
          <button
            type="button"
            className={`zbms-sb-item${mainPanel === 'profile' ? ' zbms-sb-item--active' : ''}`}
            aria-current={mainPanel === 'profile' ? 'page' : undefined}
            onClick={() => setMainPanel('profile')}
          >
            <Svg width={15} height={15} aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </Svg>
            Profile
          </button>
          <button
            type="button"
            className={`zbms-sb-item${mainPanel === 'settings' ? ' zbms-sb-item--active' : ''}`}
            aria-current={mainPanel === 'settings' ? 'page' : undefined}
            onClick={() => setMainPanel('settings')}
          >
            <Svg width={15} height={15} aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93A10 10 0 0 1 21 12" />
              <path d="M3 12a9 9 0 0 1 9-9" />
            </Svg>
            Settings
          </button>
        </nav>
        <div className="zbms-sb-bottom">
          <div className="zbms-sb-user">
            <span className="zbms-sb-avatar">{getInitials(displayName)}</span>
            <div className="zbms-sb-user-info">
              <div className="zbms-sb-user-name" title={displayName}>
                {displayName}
              </div>
              {accountEmail ? (
                <div className="zbms-sb-user-email" title={accountEmail}>
                  {accountEmail}
                </div>
              ) : null}
            </div>
            <button type="button" className="zbms-sb-logout" title="Log out" onClick={handleLogout}>
              <Svg width={14} height={14}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </Svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="zbms-main">
        <header className="zbms-topbar">
          <span className="zbms-tb-title">{topTitle}</span>
          <span className="zbms-sp" />
          <button
            type="button"
            className={`zbms-plan-chip zbms-plan-chip--${planChipTone}`}
            onClick={() => setMainPanel('pricing')}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {planDisplayName === tierMeta.name ? `${tierMeta.name} Plan` : `${planDisplayName} Plan`}
          </button>
          <button type="button" className="zbms-notif-btn" aria-label="Notifications">
            <Svg width={14} height={14}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </Svg>
            <span className="zbms-notif-dot" aria-hidden />
          </button>
        </header>

        <div className="zbms-page">
          {checkoutOkMsg ? (
            <div className="zbms-banner-msg zbms-banner-msg--ok zbms-banner-msg--top" role="status">
              {checkoutOkMsg}
            </div>
          ) : null}
          {pageError ? (
            <div className="zbms-page-error" role="alert">
              {pageError}
            </div>
          ) : null}

          {mainPanel === 'organizations' && loading ? (
            <div className="zbms-loading zbms-anim">
              <div className="zbms-loading-ring" />
              <p>Loading shops…</p>
            </div>
          ) : null}

          {mainPanel === 'organizations' && !loading ? (
            <>
              <section className="zbms-hero zbms-anim">
                <div className="zbms-hero-bg">
                  <div className="zbms-hero-dots" />
                </div>
                <div className="zbms-hero-inner">
                  <div className="zbms-hero-left">
                    <h1>Your Shops</h1>
                    <p>
                      Switch between shops, manage inventory,
                      <br />
                      billing and suppliers — all in one place.
                    </p>
                  </div>
                  <div className="zbms-hero-right">
                    <div className="zbms-hero-usage-lbl">Shops used</div>
                    <div className="zbms-hero-usage-num">
                      {shopsUsed}{' '}
                      <span className="zbms-hero-num-dim">/ {unlimitedShops ? '∞' : shopLimitNum}</span>
                    </div>
                    <div className="zbms-hero-usage-sub">
                      {planDisplayName} plan ·{' '}
                      {unlimitedShops ? 'Unlimited shops on your tier' : `${shopLimitNum} shop allowance`}
                    </div>
                    <div className="zbms-hero-bar-bg">
                      <div
                        className="zbms-hero-bar"
                        style={{ width: `${heroBarPct}%`, background: heroBarColor }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {canManageShops && atLimit ? (
                <div className="zbms-upgrade-banner zbms-anim">
                  <div className="zbms-ub-icon">
                    <Svg width={18} height={18}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </Svg>
                  </div>
                  <div className="zbms-ub-text">
                    <div className="zbms-ub-title">
                      You&apos;ve reached your shop limit ({shopsUsed}/{shopLimitNum})
                    </div>
                    <div className="zbms-ub-sub">Upgrade your plan on the marketing site to add more shops.</div>
                  </div>
                  <a className="zbms-ub-btn" href={upgradeLink}>
                    Upgrade Plan →
                  </a>
                </div>
              ) : null}

              {canManageShops ? planTierButtons : null}

              <header className="zbms-section-hd zbms-anim">
                <div>
                  <h2>Active Shops</h2>
                  <p className="zbms-section-hd-desc">
                    {unlimitedShops
                      ? `${shopsUsed} shops on your ${planDisplayName} plan`
                      : `${shopsUsed} of ${shopLimitNum} shop${shopLimitNum !== 1 ? 's' : ''} used on ${planDisplayName} plan`}
                  </p>
                </div>
                {canManageShops ? (
                  <button
                    type="button"
                    className="zbms-new-shop-btn"
                    onClick={openCreateModal}
                    disabled={atLimit}
                  >
                    <span style={{ fontSize: '1.05em', lineHeight: 1 }}>+</span> New Shop
                  </button>
                ) : null}
              </header>

              <div className="zbms-shops-grid zbms-anim">
                {isEmpty && canManageShops ? (
                  <div className="zbms-empty-wide">
                    <h3>No shops yet</h3>
                    <p>Create your first shop to open Zentrya Biz.</p>
                    <button
                      type="button"
                      className="zbms-new-shop-btn"
                      style={{ marginTop: 16 }}
                      onClick={openCreateModal}
                      disabled={atLimit}
                    >
                      + Create shop
                    </button>
                  </div>
                ) : null}
                {isEmpty && !canManageShops ? (
                  <div className="zbms-empty-wide">
                    <h3>No assigned shops</h3>
                    <p>Ask your administrator to invite you to a shop.</p>
                  </div>
                ) : null}

                {!isEmpty &&
                  shops.map((s) => {
                    const adminish = s.memberRole === 'owner' || s.memberRole === 'admin';
                    const roleLabel = adminish ? 'Owner / Admin' : 'Cashier';
                    const activeHl = lastShopRef && String(s.id) === String(lastShopRef);
                    const iso = s.created_at;
                    const qs = shopQuickStats[String(s.id)];
                    const salesShown = qs?.todaySales == null ? '—' : formatShopMoney(qs.todaySales, s.currency);
                    const prodShown = qs?.productCount == null ? '—' : String(qs.productCount);
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={0}
                        className={`zbms-shop-card${activeHl ? ' zbms-shop-card--active' : ''}`}
                        onClick={() => selectShop(s.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            selectShop(s.id);
                          }
                        }}
                      >
                        <div className="zbms-shop-card-top">
                          <span
                            className="zbms-shop-icon"
                            style={{ background: shopBg(s.business_type) }}
                            aria-hidden
                          >
                            {shopEmoji(s.business_type)}
                          </span>
                          <button
                            type="button"
                            className="zbms-shop-menu"
                            aria-label="Options"
                            onClick={(ev) => {
                              ev.stopPropagation();
                            }}
                          >
                            <Svg width={14} height={14}>
                              <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
                              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
                              <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
                            </Svg>
                          </button>
                        </div>
                        <div className="zbms-shop-name">{s.name}</div>
                        <div className="zbms-shop-meta">
                          <span className="zbms-shop-tag zbms-shop-tag--role">{roleLabel}</span>
                          {s.business_type ? (
                            <span className="zbms-shop-tag zbms-shop-tag--type" title={s.business_type}>
                              {s.business_type}
                            </span>
                          ) : null}
                          {s.currency ? (
                            <span className="zbms-shop-tag zbms-shop-tag--currency">{s.currency}</span>
                          ) : null}
                        </div>
                        <div className="zbms-shop-stats">
                          <div>
                            <div className="zbms-stat-mini-val">{salesShown}</div>
                            <div className="zbms-stat-mini-lbl">Today&apos;s sales</div>
                          </div>
                          <div>
                            <div className="zbms-stat-mini-val">{prodShown}</div>
                            <div className="zbms-stat-mini-lbl">Products</div>
                          </div>
                        </div>
                        <div className="zbms-shop-last">
                          <span className="zbms-last-dot" />
                          Updated {formatRelativeFromIso(iso)}
                          {activeHl ? (
                            <>
                              {' '}
                              · <span style={{ color: '#4f46e5', fontWeight: 600 }}>Last opened</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                {canManageShops && !isEmpty ? (
                  atLimit ? (
                    <div className="zbms-add-card zbms-add-card--locked">
                      <span className="zbms-add-card-icon" style={{ background: '#fef3f2' }}>
                        <Svg width={20} height={20} stroke="#ef4444">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </Svg>
                      </span>
                      <div className="zbms-add-card-title">Shop limit reached</div>
                      <div className="zbms-add-card-sub">
                        You&apos;re using {shopsUsed} of {shopLimitNum} shops on the {tierMeta.name} allowance.
                      </div>
                      <a className="zbms-add-card-upgrade" href={upgradeLink}>
                        Upgrade to unlock more
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="zbms-add-card zbms-add-card--click"
                      onClick={openCreateModal}
                      style={{
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        margin: 0,
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <span className="zbms-add-card-icon" style={{ background: '#eef2ff' }}>
                        <Svg width={20} height={20} stroke="#4f46e5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </Svg>
                      </span>
                      <div className="zbms-add-card-title">Create a new shop</div>
                      <div className="zbms-add-card-sub">
                        {shopLimitNum - shopsUsed} slot{shopLimitNum - shopsUsed !== 1 ? 's' : ''} remaining
                      </div>
                    </button>
                  )
                ) : null}
              </div>
            </>
          ) : null}

          {mainPanel === 'pricing' ? (
            <div className="zbms-panel zbms-panel--pricing zbms-anim">
              <header className="zbms-panel-hd zbms-panel-hd--pricing">
                <div>
                  <h2 className="zbms-panel-title">Plans &amp; pricing</h2>
                  <p className="zbms-panel-lead">
                    Pick a subscription that fits your shops. Your workspace:{' '}
                    <strong>{planDisplayName}</strong> ({shopLimitLabel}).
                  </p>
                </div>
                <div className="zbms-panel-hd-actions">
                  {stripeCustomerId ? (
                    <button
                      type="button"
                      className="zbms-btn-secondary"
                      disabled={portalBusy}
                      onClick={openBillingPortal}
                    >
                      {portalBusy ? 'Opening…' : 'Billing & invoices'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="zbms-panel-cta-link"
                    onClick={() => nav(marketingLink('pricing'))}
                  >
                    Compare on website →
                  </button>
                </div>
              </header>

              {checkoutErr ? (
                <div className="zbms-banner-msg zbms-banner-msg--err zbms-banner-msg--top" role="alert">
                  {checkoutErr}
                </div>
              ) : null}

              <div className="zbms-pricing-deck">
                {PLAN_PURCHASE_DETAIL.map((plan) => {
                  const tierId = plan.tierId;
                  const rank = TIER_RANK[tierId] ?? 0;
                  const active = tierId === planTier;
                  const curRank = TIER_RANK[planTier] ?? 0;
                  const loadingThis = checkoutLoadingTier === tierId;
                  const configured = stripePriceIdForTier(tierId).length > 0;

                  let ctaKind = 'upgrade';
                  if (tierId === 'trial') {
                    ctaKind = active ? 'current' : 'trial_past';
                  } else if (active) {
                    ctaKind = 'current';
                  } else if (rank < curRank) {
                    ctaKind = stripeCustomerId ? 'portal' : 'portal_pending';
                  }

                  return (
                    <article
                      key={tierId}
                      className={`zbms-purchase-card${plan.popular ? ' zbms-purchase-card--popular' : ''}${
                        active ? ' zbms-purchase-card--current' : ''
                      }`}
                    >
                      {plan.popular ? <span className="zbms-purchase-badge">Most popular</span> : null}
                      {active ? <span className="zbms-purchase-badge zbms-purchase-badge--muted">Your plan</span> : null}
                      <header className="zbms-purchase-head">
                        <h3>{plan.title}</h3>
                        <div className="zbms-purchase-price-row">
                          <span className="zbms-purchase-price">{plan.priceLine}</span>
                          {plan.priceLine !== 'Free' ? (
                            <span className="zbms-purchase-per">{plan.subtitle}</span>
                          ) : (
                            <span className="zbms-purchase-per zbms-purchase-per--muted">{plan.subtitle}</span>
                          )}
                        </div>
                      </header>
                      <ul className="zbms-purchase-features">
                        {plan.bullets.map((li) => (
                          <li key={li}>{li}</li>
                        ))}
                      </ul>
                      <div className="zbms-purchase-foot">
                        {ctaKind === 'current' ? (
                          <button type="button" className="zbms-purchase-btn zbms-purchase-btn--ghost" disabled>
                            Current plan
                          </button>
                        ) : null}
                        {ctaKind === 'trial_past' ? (
                          <button type="button" className="zbms-purchase-btn zbms-purchase-btn--ghost" disabled>
                            Already used • one trial per account
                          </button>
                        ) : null}
                        {ctaKind === 'portal_pending' ? (
                          <button type="button" className="zbms-purchase-btn zbms-purchase-btn--ghost" disabled>
                            Open billing once you have subscribed
                          </button>
                        ) : null}
                        {ctaKind === 'upgrade' ? (
                          <button
                            type="button"
                            className="zbms-purchase-btn zbms-purchase-btn--primary"
                            disabled={loadingThis || !configured}
                            onClick={() => startCheckoutForTier(tierId)}
                          >
                            {!configured
                              ? 'Coming soon'
                              : loadingThis
                                ? 'Redirecting…'
                                : rank > curRank
                                  ? 'Upgrade & pay'
                                  : 'Choose plan'}
                          </button>
                        ) : null}
                        {ctaKind === 'portal' ? (
                          <button
                            type="button"
                            className="zbms-purchase-btn zbms-purchase-btn--secondary"
                            disabled={portalBusy || !stripeCustomerId}
                            onClick={openBillingPortal}
                          >
                            {portalBusy ? 'Opening…' : 'Change plan in billing'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              <p className="zbms-pricing-foot">
                Payments are processed securely by Stripe. Tax and renewal terms appear on the checkout page.
              </p>
            </div>
          ) : null}

          {mainPanel === 'profile' ? (
            <div className="zbms-account-card zbms-anim">
              <div className="zbms-account-hero">
                <div className="zbms-account-avatar-lg">{getInitials(displayName)}</div>
                <div className="zbms-account-hero-text">
                  <h2 className="zbms-account-name">{displayName}</h2>
                  <p className="zbms-account-email">{accountEmail || '—'}</p>
                </div>
              </div>
              <div className="zbms-account-grid">
                <div className="zbms-account-cell">
                  <span className="zbms-account-k">Current plan</span>
                  <span className="zbms-account-v">{planDisplayName}</span>
                </div>
                <div className="zbms-account-cell">
                  <span className="zbms-account-k">Shops</span>
                  <span className="zbms-account-v">{shopLimitLabel}</span>
                  <span className="zbms-account-hint">
                    Shops you have access to in this workspace
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {mainPanel === 'settings' ? (
            <form className="zbms-account-card zbms-anim zbms-password-form" onSubmit={savePassword}>
              <h2 className="zbms-password-title">Security</h2>
              <p className="zbms-password-lead">Change your sign-in password. Your current password is required.</p>
              {pwError ? (
                <div className="zbms-banner-msg zbms-banner-msg--err" role="alert">
                  {pwError}
                </div>
              ) : null}
              {pwSuccess ? (
                <div className="zbms-banner-msg zbms-banner-msg--ok" role="status">
                  {pwSuccess}
                </div>
              ) : null}
              <div className="zbms-fi zbms-fi-full">
                <label htmlFor="zb-pw-old">Current password</label>
                <input
                  id="zb-pw-old"
                  type="password"
                  autoComplete="current-password"
                  value={pwCurrent}
                  onChange={(ev) => setPwCurrent(ev.target.value)}
                  disabled={pwSaving}
                />
              </div>
              <div className="zbms-fi zbms-fi-full">
                <label htmlFor="zb-pw-new">New password</label>
                <input
                  id="zb-pw-new"
                  type="password"
                  autoComplete="new-password"
                  value={pwNew}
                  onChange={(ev) => setPwNew(ev.target.value)}
                  disabled={pwSaving}
                />
              </div>
              <div className="zbms-fi zbms-fi-full">
                <label htmlFor="zb-pw-confirm">Confirm new password</label>
                <input
                  id="zb-pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={pwConfirm}
                  onChange={(ev) => setPwConfirm(ev.target.value)}
                  disabled={pwSaving}
                />
              </div>
              <button type="submit" className="zbms-password-save" disabled={pwSaving}>
                {pwSaving ? 'Saving…' : 'Save password'}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {showCreate && canManageShops ? (
        <div
          className="zbms-modal-ov"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !creating) closeCreateModal();
          }}
        >
          <div
            className="zbms-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="zbms-m-hd">
              <div>
                <div className="zbms-m-t">Create New Shop</div>
                <div className="zbms-m-s">Set up your shop in seconds</div>
              </div>
              <button type="button" className="zbms-m-x" onClick={closeCreateModal} disabled={creating} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={createShop}>
              <div className="zbms-m-body">
                {formError ? (
                  <div className="zbms-modal-error" role="alert">
                    {formError}
                  </div>
                ) : null}
                <div className="zbms-fi zbms-fi-full">
                  <label htmlFor="zbnp-name">Shop name *</label>
                  <input
                    id="zbnp-name"
                    value={form.name}
                    onChange={(ev) => setForm((prev) => ({ ...prev, name: ev.target.value }))}
                    placeholder="e.g. Ali Hardware Store"
                    autoComplete="organization"
                  />
                </div>
                <div className="zbms-fi zbms-fi-full">
                  <label htmlFor="zbnp-phone">Mobile number *</label>
                  <input
                    id="zbnp-phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(ev) => setForm((prev) => ({ ...prev, phone: ev.target.value }))}
                    placeholder="e.g. 0300 1234567"
                    autoComplete="tel"
                  />
                  <span className="zbms-fi-hint">Used on invoices and shop settings.</span>
                </div>
                <div className="zbms-fg">
                  <div className="zbms-fi">
                    <label htmlFor="zbnp-type">Business type</label>
                    <select
                      id="zbnp-type"
                      value={form.business_type}
                      onChange={(ev) =>
                        setForm((prev) => ({ ...prev, business_type: ev.target.value }))
                      }
                    >
                      {BUSINESS_TYPES.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="zbms-fi">
                    <label htmlFor="zbnp-currency">Currency</label>
                    <select
                      id="zbnp-currency"
                      value={form.currency}
                      onChange={(ev) =>
                        setForm((prev) => ({ ...prev, currency: ev.target.value }))
                      }
                    >
                      <option value="PKR">PKR — Pakistani Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="AED">AED — UAE Dirham</option>
                      <option value="SAR">SAR — Saudi Riyal</option>
                    </select>
                  </div>
                </div>
                <div className="zbms-fi zbms-fi-full">
                  <label htmlFor="zbnp-city">City / Location</label>
                  <input
                    id="zbnp-city"
                    value={form.city}
                    onChange={(ev) => setForm((prev) => ({ ...prev, city: ev.target.value }))}
                    placeholder="e.g. Rawalpindi, Punjab"
                  />
                </div>
                <div className="zbms-fi zbms-fi-full">
                  <label htmlFor="zbnp-address">Shop address</label>
                  <textarea
                    id="zbnp-address"
                    value={form.address}
                    rows={3}
                    onChange={(ev) =>
                      setForm((prev) => ({ ...prev, address: ev.target.value }))
                    }
                    placeholder="Street, area (optional)"
                    autoComplete="street-address"
                  />
                </div>
              </div>
              <div className="zbms-m-ft">
                <button type="button" className="zbms-btn-c" onClick={closeCreateModal} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="zbms-btn-s" disabled={creating || !canCreateMore}>
                  {creating ? (
                    <>
                      <span className="zbms-btn-s-spinner" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    'Create Shop'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}
