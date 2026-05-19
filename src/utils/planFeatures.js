/**
 * Client-side plan tiers (must stay aligned with backend planMiddleware + Stripe).
 */

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
