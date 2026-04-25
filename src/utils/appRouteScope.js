import { shopsPath, userIdFromPublicUrlParam } from './workspacePaths';

export const APP_PAGE_PATHS = [
  '/app',
  '/inventory',
  '/inventory/product',
  '/billing',
  '/suppliers',
  '/supplier-payments',
  '/customers',
  '/categories',
  '/purchases',
  '/expenses',
  '/rate-list',
  '/invoices',
  '/sales',
  '/reports',
  '/users',
  '/settings',
];

export function appBasePath(userId, shopId) {
  if (!userId || !shopId) return '';
  const m = String(shopsPath(userId)).match(/^\/([^/]+)\/shops$/);
  const userSeg = m?.[1] || String(userId);
  return `/${userSeg}/${shopId}`;
}

export function extractAppScope(pathname) {
  const m = String(pathname || '').match(/^\/([^/]+)\/([^/]+)(?=\/|$)/);
  if (!m) return null;
  return {
    userRaw: m[1],
    userId: userIdFromPublicUrlParam(m[1]),
    shopId: m[2],
    base: `/${m[1]}/${m[2]}`,
  };
}

export function withCurrentScope(pathname, targetPath) {
  const target = String(targetPath || '').trim();
  if (!target.startsWith('/')) return target;
  const scope = extractAppScope(pathname);
  if (!scope?.base) return target;
  return `${scope.base}${target}`;
}

export function isLegacyAppPath(pathname) {
  const p = String(pathname || '');
  return APP_PAGE_PATHS.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
