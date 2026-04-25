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

/** Treat very large limits as unlimited (Premium). */
export function isUnlimitedShops(shopLimit) {
  const n = Number(shopLimit);
  return Number.isFinite(n) && n >= 9999;
}
