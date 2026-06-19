import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  isUnlimitedShops,
  isExpiredPlan,
  resolveShopLimitFromProfile,
  getTrialProgress,
  isWorkspaceAccessBlocked,
  getPlanDisplayName,
  isShopOwnerAccountRole,
} from '../utils/planFeatures';
import { isOfflineQueuedResponse } from '../lib/offlineUserMessages';
import { marketingHomeQuery } from '../utils/workspacePaths';
import { authAPI, billingAPI, shopPickerAPI } from '../services/api';
import { hasPosBackendSession } from '../lib/appMode';
import './shopPickerV2.css';

function isShopMemberOwnerRole(memberRole) {
  const r = String(memberRole || '').toLowerCase();
  return r === 'owner' || r === 'admin' || r === 'administrator';
}

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
.zbms-plan-chip-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.zbms-trial-days {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
}
.zbms-trial-days--warn {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fed7aa;
}
.zbms-trial-days--expired {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}
.zbms-shop-card--locked {
  opacity: 0.72;
  cursor: not-allowed;
}
.zbms-shop-card--locked .zbms-shop-card-top,
.zbms-shop-card--locked .zbms-shop-name,
.zbms-shop-card--locked .zbms-shop-meta,
.zbms-shop-card--locked .zbms-shop-stats {
  pointer-events: none;
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
  { id: 'growth', name: 'Growth', price: 'Rs 1,500/mo', shops: 1 },
  { id: 'business', name: 'Business', price: 'Rs 2,500/mo', shops: 1, unlimited: true },
];

const TIER_RANK = { trial: 0, starter: 1, growth: 2, business: 3 };

/** Full pricing cards (+ bullets), aligned with marketing copy */
const PLAN_PURCHASE_DETAIL = [
  {
    tierId: 'trial',
    title: '14-Day Trial',
    priceLine: 'Free',
    subtitle: 'No card required · Full app access · 1 shop',
    bullets: [
      'Unlimited salesmen',
      'Billing, inventory & stock',
      'Customer ledger & vendors',
      'One trial per email',
    ],
  },
  {
    tierId: 'growth',
    title: 'Growth',
    priceLine: 'Rs 1,500',
    subtitle: '/ month · 1 shop',
    bullets: ['Everything in trial', 'Advanced reports', 'CSV export', 'Priority support'],
    popular: true,
  },
  {
    tierId: 'business',
    title: 'Business',
    priceLine: 'Rs 2,500',
    subtitle: '/ month · unlimited shops',
    bullets: ['All Growth features', 'Unlimited shops', 'Multi-location scale', 'Dedicated support'],
    popular: false,
  },
];

function normalizePlanTier(planRaw) {
  const p = String(planRaw || 'trial')
    .toLowerCase()
    .replace(/[_\s]+/g, '');
  if (/expired/.test(p)) return 'trial';
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
  } catch (apiErr) {
    if (apiErr?.response?.status !== 500) {
      console.warn('[ShopPicker] quick-stats:', apiErr?.response?.data || apiErr.message);
    }
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
  /** Authoritative plan/trial fields from GET /shop-picker/plan-status (Postgres). */
  const [planFromApi, setPlanFromApi] = useState(null);

  const effectiveProfile = useMemo(
    () => (profile || planFromApi ? { ...profile, ...planFromApi } : null),
    [profile, planFromApi]
  );

  const shopLimitNum = resolveShopLimitFromProfile(effectiveProfile);
  const unlimitedShops = isUnlimitedShops(shopLimitNum);
  const trialProgress = useMemo(() => getTrialProgress(effectiveProfile), [effectiveProfile]);
  const subscriptionExpired = isWorkspaceAccessBlocked(effectiveProfile);

  const canCreateMore = useMemo(() => {
    if (subscriptionExpired) return false;
    if (unlimitedShops) return true;
    return shops.length < shopLimitNum;
  }, [shopLimitNum, shops.length, unlimitedShops, subscriptionExpired]);

  const isEmpty = !loading && shops.length === 0;
  const shopsUsed = shops.length;
  const effectiveLimitNum = unlimitedShops ? shopsUsed || 1 : shopLimitNum;
  const heroBarPct = unlimitedShops
    ? Math.min(100, 25 + shopsUsed * 5)
    : Math.min(100, Math.round((shopsUsed / effectiveLimitNum) * 100));
  const heroBarColor =
    !unlimitedShops && shopsUsed >= shopLimitNum ? '#ef4444' : !unlimitedShops && heroBarPct >= 80 ? '#f59e0b' : '#22c55e';

  const planTier = normalizePlanTier(effectiveProfile?.plan);
  const tierMeta = PLAN_TIERS.find((t) => t.id === planTier) || PLAN_TIERS[0];
  const planDisplayName = getPlanDisplayName(effectiveProfile?.plan) || tierMeta.name;

  const atLimit = canCreateMore === false;

  let lastShopRef = '';
  try {
    lastShopRef = user?.id ? localStorage.getItem(`zb_last_shop_${String(user.id)}`) || '' : '';
  } catch {
    lastShopRef = '';
  }

  const applyShopList = (mapped) => {
    const dbRoles = mapped.map((row) => String(row.memberRole || '').toLowerCase());
    const hasManageRole = dbRoles.some((role) => ['owner', 'admin', 'administrator'].includes(role));
    const hasStaffRole = dbRoles.some((role) =>
      ['cashier', 'seller', 'salesman', 'staff'].includes(role)
    );
    setResolvedRole(hasManageRole ? 'admin' : hasStaffRole ? 'cashier' : '');
    setShops(mapped);
    setShopQuickStats({});
    fetchShopPickerQuickStats(supabase, mapped).then(setShopQuickStats).catch(() => {});
  };

  const mapSupabaseShopRows = (data) =>
    (data || []).map((row) => ({ ...row.shop, memberRole: row.role })).filter(Boolean);

  const mapApiShopRows = (rows) =>
    (rows || []).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      business_type: s.business_type,
      city: s.city,
      currency: s.currency,
      created_at: s.created_at,
      owner_id: s.owner_id,
      memberRole: s.role || s.memberRole || 'owner',
      planAccess: s.planAccess || { ok: true },
    }));

  const syncShopPlanAccess = async (shopList) => {
    if (!hasPosBackendSession() || !shopList?.length) return shopList;
    try {
      const { data } = await shopPickerAPI.shopPlanAccess({
        shopIds: shopList.map((s) => s.id),
      });
      const access = data?.access || {};
      return shopList.map((s) => ({
        ...s,
        planAccess: access[String(s.id)] || s.planAccess || { ok: true },
      }));
    } catch (err) {
      console.warn('[ShopPicker] shop-plan-access:', err?.response?.data || err.message);
      return shopList;
    }
  };

  const mergeShopLists = (...lists) => {
    const byId = new Map();
    lists.flat().forEach((s) => {
      if (!s?.id) return;
      const key = String(s.id);
      byId.set(key, { ...(byId.get(key) || {}), ...s, id: key });
    });
    return [...byId.values()].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  };

  const fetchShopsFromSupabase = async () => {
    if (!supabase) return [];
    const [memberRes, ownedRes] = await Promise.all([
      supabase
        .from('shop_users')
        .select(
          'role, shop:shops(id, name, phone, address, business_type, city, currency, created_at)'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false, referencedTable: 'shops' }),
      supabase
        .from('shops')
        .select('id, name, phone, address, business_type, city, currency, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (memberRes.error && ownedRes.error) throw memberRes.error;
    const fromMembers = mapSupabaseShopRows(memberRes.data);
    const fromOwned = (ownedRes.data || []).map((s) => ({
      ...s,
      memberRole: 'owner',
    }));
    return mergeShopLists(fromMembers, fromOwned);
  };

  const fetchShops = async () => {
    if (!user?.id) return;
    setPageError('');
    setLoading(true);
    try {
      let mapped = [];
      let fetchedOk = false;

      if (hasPosBackendSession()) {
        try {
          const { data } = await shopPickerAPI.listShops();
          mapped = mapApiShopRows(Array.isArray(data?.shops) ? data.shops : []);
          fetchedOk = true;
        } catch (apiErr) {
          if (apiErr?.response?.status === 401) {
            setPageError('Sign in again to load your shops.');
            return;
          }
          console.warn('[ShopPicker] listShops:', apiErr?.response?.data || apiErr.message);
        }
      }

      if (supabase) {
        try {
          const supaRows = await fetchShopsFromSupabase();
          mapped = mergeShopLists(mapped, supaRows);
          fetchedOk = true;
        } catch (supaErr) {
          if (!fetchedOk) throw supaErr;
          console.warn('[ShopPicker] supabase shops:', supaErr.message);
        }
      }

      if (!fetchedOk) {
        setPageError('Sign in again to load your shops.');
        return;
      }

      mapped = await syncShopPlanAccess(mapped);
      applyShopList(mapped);
    } catch (e) {
      setPageError(e.response?.data?.error || e.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  const syncPlanStatus = async () => {
    if (!user?.id) return null;
    let apiPlan = null;
    try {
      if (hasPosBackendSession()) {
        const res = await shopPickerAPI.planStatus();
        const d = res?.data;
        if (d?.ok !== false) {
          apiPlan = {
            plan: d.plan,
            shop_limit: d.shop_limit,
            trial_started_at: d.trial_started_at,
            trial_ends_at: d.trial_ends_at,
            trial_day: d.trial_day,
            trial_total: d.trial_total,
            trial_days_left: d.trial_days_left,
            trial_expired: d.trial_expired,
          };
          setPlanFromApi(apiPlan);
        }
      }
    } catch (err) {
      console.warn('[ShopPicker] plan-status:', err?.response?.data || err.message);
    }
    try {
      await refreshProfile?.(user.id);
    } catch {
      /* ignore */
    }
    return apiPlan;
  };

  useEffect(() => {
    if (user?.id) {
      void syncPlanStatus();
      fetchShops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('checkout') !== 'success') return;
      u.searchParams.delete('checkout');
      window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);
      setMainPanel('organizations');
      setCheckoutOkMsg('Payment completed. Activating your plan…');

      let cancelled = false;
      const uid = user?.id;

      const runSync = async () => {
        if (!uid) return;
        try {
          await billingAPI.syncSubscription({ userId: uid, sendEmail: true });
        } catch (err) {
          console.warn('[ShopPicker] sync-subscription:', err?.response?.data || err.message);
        }
        if (!cancelled) await refreshProfile?.(uid);
      };

      runSync();
      const poll = setInterval(async () => {
        if (cancelled || !uid) return;
        const p = await refreshProfile?.(uid);
        const plan = String(p?.plan || profile?.plan || '').toLowerCase();
        if (plan && plan !== 'trial' && plan !== 'expired') {
          setCheckoutOkMsg(`Your ${getPlanDisplayName(plan)} plan is now active.`);
          clearInterval(poll);
        }
      }, 2500);

      const stopPoll = setTimeout(() => clearInterval(poll), 30000);
      const hideMsg = setTimeout(() => setCheckoutOkMsg(''), 12000);

      return () => {
        cancelled = true;
        clearInterval(poll);
        clearTimeout(stopPoll);
        clearTimeout(hideMsg);
      };
    } catch {
      /* ignore malformed URL */
    }
  }, [refreshProfile, user?.id, profile?.plan]);

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

  const displayName = user?.full_name || user?.name || user?.username || 'User';
  const accountRole = String(profile?.role || '').toLowerCase();
  const effectiveRole = accountRole || resolvedRole;
  const canManageShops = isShopOwnerAccountRole(effectiveRole);

  const isShopLocked = (shop) => {
    if (!shop) return true;
    if (isShopMemberOwnerRole(shop.memberRole) && canManageShops) {
      return subscriptionExpired;
    }
    return shop.planAccess?.ok === false;
  };

  const openableShopCount = useMemo(
    () => shops.filter((shop) => !isShopLocked(shop)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shops, subscriptionExpired, canManageShops]
  );

  const selectShop = async (id) => {
    const shop = shops.find((s) => String(s.id) === String(id));

    if (isShopLocked(shop)) {
      if (shop?.planAccess?.contactAdmin) {
        setPageError(
          shop.planAccess.message ||
            'This shop\'s subscription has expired. Please contact your shop administrator to renew the plan.'
        );
        return;
      }
      if (isShopMemberOwnerRole(shop?.memberRole) && subscriptionExpired) {
        setPageError(
          trialProgress?.expired || isExpiredPlan(effectiveProfile?.plan)
            ? 'Your 14-day free trial has ended. Upgrade to open your shop — all existing data stays safe.'
            : 'Your subscription has expired. Upgrade your plan to open this shop.'
        );
        setMainPanel('pricing');
        return;
      }
      setPageError(shop?.planAccess?.message || 'Cannot open this shop right now.');
      return;
    }

    if (hasPosBackendSession()) {
      try {
        await shopPickerAPI.checkShopAccess(id);
      } catch (err) {
        const d = err.response?.data || {};
        const status = err.response?.status;
        const raw = String(d.message || d.error || '');
        const isServerPlanError =
          status >= 500 || /profiles_shop_limit_check/i.test(raw);
        const msg = isServerPlanError
          ? shop?.planAccess?.contactAdmin || !isShopMemberOwnerRole(shop?.memberRole)
            ? 'This shop\'s subscription has expired. Please contact your shop administrator to renew the plan.'
            : 'This shop\'s subscription has expired. Upgrade the shop owner\'s plan to open it.'
          : d.message ||
            d.error ||
            'Cannot open this shop right now. Upgrade your plan to continue.';
        setPageError(msg);
        if (!d.contactAdmin && !isServerPlanError && isShopMemberOwnerRole(shop?.memberRole)) {
          await syncPlanStatus();
          setMainPanel('pricing');
        }
        return;
      }
    }

    setPageError('');
    setActiveShopId(id);
    nav('/app', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(parts[0]).slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    if (window.confirm('Logout?')) await logout?.();
  };

  const openCreateModal = () => {
    if (!canManageShops) return;
    if (!canCreateMore) {
      setFormError(
        subscriptionExpired
          ? 'Your subscription has expired. Renew your plan to create shops.'
          : 'Shop limit reached for your plan. Upgrade to add more shops.'
      );
      return;
    }
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
    if (!user?.id) return;
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
      setFormError(
        subscriptionExpired
          ? 'Your subscription has expired. Renew your plan to create shops.'
          : 'Shop limit reached for your plan.'
      );
      return;
    }
    if (!hasPosBackendSession()) {
      setFormError('Session not ready. Sign out and sign in again, then create a shop.');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        business_type: form.business_type,
        city: form.city.trim() || null,
        currency: form.currency || 'PKR',
      };

      let data = null;

      if (supabase && user?.id) {
        const { data: rpcRaw, error: rpcErr } = await supabase.rpc('zb_create_shop', {
          p_profile_id: user.id,
          p_name: payload.name,
          p_phone: payload.phone,
          p_address: payload.address,
          p_business_type: payload.business_type,
          p_city: payload.city,
          p_currency: payload.currency,
        });
        const rpcData = typeof rpcRaw === 'string' ? JSON.parse(rpcRaw) : rpcRaw;
        if (!rpcErr && rpcData?.ok && (rpcData.shopId || rpcData.id)) {
          data = { ...rpcData, persisted: true, via: 'supabase' };
        } else if (
          rpcErr?.message?.includes('zb_create_shop') ||
          String(rpcData?.error || '').includes('zb_create_shop')
        ) {
          console.warn('[ShopPicker] zb_create_shop RPC missing — run migration 010 in Supabase SQL');
        } else if (rpcData?.error) {
          throw new Error(rpcData.error);
        }
      }

      if (!data && hasPosBackendSession()) {
        const res = await shopPickerAPI.createShop(payload);
        if (isOfflineQueuedResponse(res)) {
          throw new Error(
            'You appear offline — shop was not saved to the server. Connect and try again.'
          );
        }
        data = res?.data;
      }

      if (!data) {
        throw new Error(
          'Could not save shop. Run database/migrations/010_shops_phone_and_create_rpc.sql in Supabase, then try again.'
        );
      }

      const shopId = data?.shopId || data?.id;
      if (!shopId) throw new Error('Shop created but no id returned');
      const created = data?.shop;
      if (created?.id) {
        setShops((prev) => {
          if (prev.some((s) => String(s.id) === String(created.id))) return prev;
          return [
            {
              id: created.id,
              name: created.name || payload.name,
              phone: created.phone ?? payload.phone,
              address: created.address ?? payload.address,
              business_type: created.business_type || payload.business_type,
              city: created.city ?? payload.city,
              currency: created.currency || payload.currency,
              created_at: created.created_at,
              memberRole: created.memberRole || created.role || 'owner',
            },
            ...prev,
          ];
        });
      }
      await fetchShops();

      if (supabase) {
        const { data: row, error: verifyErr } = await supabase
          .from('shops')
          .select('id, name')
          .eq('id', shopId)
          .maybeSingle();
        if (verifyErr || !row) {
          throw new Error(
            'Shop was not found in the database after save. Run migration 010 in Supabase SQL Editor, then try again.'
          );
        }
      }

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
      setCheckoutOkMsg(`"${payload.name}" created. It appears in your shops list — open it when you are ready.`);
      setTimeout(() => setCheckoutOkMsg(''), 8000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create shop';
      setFormError(msg);
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
        const tierCap = t.unlimited ? null : t.shops;
        const fill =
          active && tierCap
            ? Math.min(100, Math.round((shopsUsed / Math.max(1, tierCap)) * 100))
            : active && t.unlimited
              ? unlimitedShops
                ? 100
                : Math.min(100, shopsUsed > 0 ? 100 : 0)
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
            <div className="zbms-pt-shops">{t.unlimited ? '∞' : t.shops}</div>
            <div className="zbms-pt-shops-lbl">
              {t.unlimited ? 'unlimited shops' : t.shops === 1 ? 'shop included' : 'shops included'}
            </div>
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
              <img src={logoSrc} alt="Zentrya Biz" className="zbms-sb-logo-img" width={34} height={34} />
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
          <div className="zbms-plan-chip-wrap">
            {canManageShops && planTier === 'trial' && trialProgress ? (
              <span
                className={`zbms-trial-days${
                  trialProgress.expired
                    ? ' zbms-trial-days--expired'
                    : trialProgress.day >= trialProgress.total - 2
                      ? ' zbms-trial-days--warn'
                      : ''
                }`}
                title={
                  trialProgress.expired
                    ? 'Free trial ended — upgrade to open your shop'
                    : `Day ${trialProgress.day} of ${trialProgress.total} free trial`
                }
              >
                {trialProgress.expired ? 'Ended' : `${trialProgress.day}/${trialProgress.total}`}
              </span>
            ) : null}
            {canManageShops ? (
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
            ) : (
              <span className="zbms-plan-chip zbms-plan-chip--staff" title="Staff account — shop access depends on each shop owner&apos;s plan">
                Staff account
              </span>
            )}
          </div>
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
                    {canManageShops ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <div className="zbms-hero-usage-lbl">Assigned shops</div>
                        <div className="zbms-hero-usage-num">{shopsUsed}</div>
                        <div className="zbms-hero-usage-sub">
                          {openableShopCount > 0
                            ? `${openableShopCount} shop${openableShopCount !== 1 ? 's' : ''} ready to open`
                            : shopsUsed > 0
                              ? 'Ask your administrator to renew the plan for locked shops.'
                              : 'Your administrator can assign shops to this account.'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {canManageShops && (atLimit || subscriptionExpired) ? (
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
                      {trialProgress?.expired || isExpiredPlan(effectiveProfile?.plan)
                        ? 'Your 14-day free trial has ended'
                        : subscriptionExpired
                          ? 'Your subscription has expired'
                          : `You've reached your shop limit (${shopsUsed}/${unlimitedShops ? '∞' : shopLimitNum})`}
                    </div>
                    <div className="zbms-ub-sub">
                      {trialProgress?.expired || isExpiredPlan(effectiveProfile?.plan)
                        ? 'Upgrade to open your shop again. All sales, products, and customer data remain saved.'
                        : subscriptionExpired
                          ? 'Renew Growth or Business to create shops and restore full access.'
                          : 'Upgrade to Business for unlimited shops.'}
                    </div>
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
                    {canManageShops
                      ? unlimitedShops
                        ? `${shopsUsed} shops on your ${planDisplayName} plan`
                        : `${shopsUsed} of ${shopLimitNum} shop${shopLimitNum !== 1 ? 's' : ''} used on ${planDisplayName} plan`
                      : `${shopsUsed} shop${shopsUsed !== 1 ? 's' : ''} assigned to your account`}
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
                    const adminish = isShopMemberOwnerRole(s.memberRole);
                    const roleLabel = adminish ? 'Owner / Admin' : 'Cashier';
                    const activeHl = lastShopRef && String(s.id) === String(lastShopRef);
                    const shopLocked = isShopLocked(s);
                    const iso = s.created_at;
                    const qs = shopQuickStats[String(s.id)];
                    const salesShown = qs?.todaySales == null ? '—' : formatShopMoney(qs.todaySales, s.currency);
                    const prodShown = qs?.productCount == null ? '—' : String(qs.productCount);
                    return (
                      <div
                        key={s.id}
                        role="button"
                        tabIndex={shopLocked ? -1 : 0}
                        className={`zbms-shop-card${activeHl ? ' zbms-shop-card--active' : ''}${
                          shopLocked ? ' zbms-shop-card--locked' : ''
                        }`}
                        onClick={() => {
                          if (shopLocked) {
                            if (s.planAccess?.contactAdmin) {
                              setPageError(
                                s.planAccess.message ||
                                  'This shop\'s subscription has expired. Please contact your shop administrator to renew the plan.'
                              );
                              return;
                            }
                            setPageError(
                              trialProgress?.expired || isExpiredPlan(effectiveProfile?.plan)
                                ? 'Trial ended — upgrade your plan to open this shop. Your data is safe and waiting.'
                                : 'Upgrade your plan to open this shop.'
                            );
                            setMainPanel('pricing');
                            return;
                          }
                          void selectShop(s.id);
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault();
                            if (shopLocked) {
                              if (s.planAccess?.contactAdmin) {
                                setPageError(
                                  s.planAccess.message ||
                                    'This shop\'s subscription has expired. Please contact your shop administrator to renew the plan.'
                                );
                                return;
                              }
                              setMainPanel('pricing');
                              return;
                            }
                            void selectShop(s.id);
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
