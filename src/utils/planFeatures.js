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

export function canUseProFeatures(plan) {
  return planRank(plan) >= 2;
}

export function canUsePremiumFeatures(plan) {
  return planRank(plan) >= 3;
}

export function isExpiredPlan(plan) {
  return planRank(plan) === 0;
}

/** Treat very large limits as unlimited (Premium / Business). */
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

/** Trial day counter for UI — e.g. day 5 of 14. */
export function getTrialProgress(profile) {
  const plan = String(profile?.plan || '').toLowerCase();
  if (plan !== 'trial') return null;

  const total = TRIAL_DAYS;
  const endsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const startedAt = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;
  let day = 1;

  if (startedAt && !Number.isNaN(startedAt.getTime())) {
    day = Math.floor((Date.now() - startedAt.getTime()) / DAY_MS) + 1;
  } else if (endsAt && !Number.isNaN(endsAt.getTime())) {
    const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / DAY_MS));
    day = total - daysLeft + 1;
  }

  day = Math.min(total, Math.max(1, day));
  const expired = isTrialExpiredByDate(profile) || isExpiredPlan(profile?.plan);

  return { day, total, expired, daysLeft: Math.max(0, total - day) };
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
