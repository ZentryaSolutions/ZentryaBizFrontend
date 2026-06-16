/**
 * Client-side plan tiers (must stay aligned with backend planMiddleware + Stripe).
 */

export const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function planRank(plan) {
  const p = String(plan || '').toLowerCase();
  if (p === 'expired') return 0;
  if (p === 'trial' || p === 'starter') return 1;
  if (p === 'pro') return 2;
  if (p === 'premium') return 3;
  return 1;
}

export function canUseProFeatures() {
  return true;
}

export function canUsePremiumFeatures() {
  return true;
}

/** User-facing plan name (DB may store premium/pro — UI always shows Business/Growth). */
export function getPlanDisplayName(plan) {
  const p = String(plan || 'trial').trim().toLowerCase();
  if (p === 'premium' || p === 'enterprise' || p === 'business') return 'Business';
  if (p === 'pro' || p === 'growth') return 'Growth';
  if (p === 'starter') return 'Starter';
  if (p === 'expired') return 'Expired';
  if (p === 'trial') return 'Trial';
  return String(plan || 'Trial')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isExpiredPlan(plan) {
  return planRank(plan) === 0;
}

/** Treat very large limits as unlimited (Business tier). */
export function isUnlimitedShops(shopLimit) {
  const n = Number(shopLimit);
  return Number.isFinite(n) && n >= 9999;
}

/** Max shops owner may create (align with backend planShopLimits + Stripe webhook). */
export function getShopLimitForPlan(plan) {
  const p = String(plan || 'trial').toLowerCase();
  if (p === 'expired') return 0;
  if (p === 'premium') return 99999;
  return 1;
}

export function resolveShopLimitFromProfile(profile) {
  if (profile?.shop_limit != null && profile.shop_limit !== '') {
    const n = Number(profile.shop_limit);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return getShopLimitForPlan(profile?.plan);
}

/** True when trial_ends_at has passed (plan row may still say trial until backend sync). */
export function isTrialExpiredByDate(profile) {
  if (!profile?.trial_ends_at) return false;
  const end = new Date(profile.trial_ends_at).getTime();
  return Number.isFinite(end) && end <= Date.now();
}

/** Local calendar day (browser TZ) — matches how users see "today". */
function localCalendarDayIndex(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** Trial day counter — prefer API fields from GET /shop-picker/plan-status when present. */
export function getTrialProgress(profile) {
  const plan = String(profile?.plan || '').toLowerCase();
  if (plan !== 'trial') return null;

  if (profile?.trial_day != null && profile?.trial_total != null) {
    const day = Math.min(
      Number(profile.trial_total) || TRIAL_DAYS,
      Math.max(1, Number(profile.trial_day) || 1)
    );
    const total = Number(profile.trial_total) || TRIAL_DAYS;
    const expired =
      profile.trial_expired === true ||
      profile.trial_expired === 'true' ||
      isTrialExpiredByDate(profile) ||
      isExpiredPlan(profile?.plan);
    const daysLeft =
      profile.trial_days_left != null
        ? Math.max(0, Number(profile.trial_days_left) || 0)
        : Math.max(0, total - day);
    return { day, total, expired, daysLeft };
  }

  const total = TRIAL_DAYS;
  const endsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  let startedAt = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;

  if ((!startedAt || Number.isNaN(startedAt.getTime())) && endsAt && !Number.isNaN(endsAt.getTime())) {
    startedAt = new Date(endsAt.getTime() - TRIAL_DAYS * DAY_MS);
  }

  let day = 1;
  if (startedAt && !Number.isNaN(startedAt.getTime())) {
    const startIdx = localCalendarDayIndex(startedAt);
    const todayIdx = localCalendarDayIndex(new Date());
    if (startIdx != null && todayIdx != null) {
      day = todayIdx - startIdx + 1;
    }
  }

  day = Math.min(total, Math.max(1, day));
  const expired = isTrialExpiredByDate(profile) || isExpiredPlan(profile?.plan);
  let daysLeft = Math.max(0, total - day);
  if (endsAt && !Number.isNaN(endsAt.getTime())) {
    const endIdx = localCalendarDayIndex(endsAt);
    const todayIdx = localCalendarDayIndex(new Date());
    if (endIdx != null && todayIdx != null) {
      daysLeft = Math.max(0, endIdx - todayIdx);
    }
  }

  return { day, total, expired, daysLeft };
}

/** Block opening workspace / creating shops — data stays in DB. */
export function isWorkspaceAccessBlocked(profile) {
  if (isExpiredPlan(profile?.plan)) return true;
  if (Number(resolveShopLimitFromProfile(profile)) <= 0) return true;
  if (String(profile?.plan || '').toLowerCase() === 'trial' && isTrialExpiredByDate(profile)) {
    return true;
  }
  return false;
}
