/** Production app origin — legacy Vercel hosts redirect here (path + query preserved). */
export const CANONICAL_APP_ORIGIN = 'https://biz.zentryasolutions.com';

const LEGACY_HOSTS = new Set([
  'zentrya-biz.vercel.app',
  'www.zentrya-biz.vercel.app',
  'zentrya-biz-frontend.vercel.app',
  'www.zentrya-biz-frontend.vercel.app',
]);

export function redirectLegacyHostToCanonical() {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname.toLowerCase();
  if (!LEGACY_HOSTS.has(host)) return;
  const target = `${CANONICAL_APP_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
}
