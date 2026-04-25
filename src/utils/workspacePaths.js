/**
 * Shop picker: /{compact}/shops — UUID (128-bit) encoded as base64url (~22 chars).
 * Poori UUID ab bhi kaam karti hai; app short URL par redirect kar deti hai.
 * Session Supabase / sessionStorage par hi rehti hai.
 */

const UUID_DASHED = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidToBytes(uuid) {
  const hex = String(uuid)
    .trim()
    .replace(/-/g, '')
    .toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToUuid(bytes) {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toCompactUserId(uuid) {
  const bytes = uuidToBytes(uuid);
  if (!bytes) return '';
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromCompactUserId(segment) {
  if (!segment || typeof segment !== 'string') return null;
  const s = segment.trim();
  if (!s) return null;
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const bin = atob(b64);
    if (bin.length !== 16) return null;
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = bin.charCodeAt(i);
    const out = bytesToUuid(bytes);
    return UUID_DASHED.test(out) ? out.toLowerCase() : null;
  } catch {
    return null;
  }
}

function resolveShopPathSegment(segment) {
  if (!segment || typeof segment !== 'string') return null;
  const s = segment.trim();
  if (!s) return null;
  if (UUID_DASHED.test(s)) return s.toLowerCase();
  return fromCompactUserId(s);
}

export function isDashSeparatedUuid(segment) {
  return Boolean(segment && UUID_DASHED.test(String(segment)));
}

export function shopsPath(userId) {
  if (!userId) return '/shops';
  const id = String(userId).trim();
  if (!id) return '/shops';
  const compact = toCompactUserId(id);
  if (!compact) return `/${id}/shops`;
  return `/${compact}/shops`;
}

export function parseShopsPathDetail(pathname) {
  if (!pathname || typeof pathname !== 'string') return { userId: null, raw: null };
  const p = pathname.replace(/\/$/, '');
  const m = p.match(/^\/([^/]+)\/shops$/);
  if (!m) return { userId: null, raw: null };
  const raw = m[1];
  return { userId: resolveShopPathSegment(raw), raw };
}

/** Same as parseShopsPathDetail — alias for older call sites */
export const parseShopsPath = parseShopsPathDetail;

/** ?uid=… ya ?u=… (full UUID ya compact) → canonical user id */
export function userIdFromPublicUrlParam(param) {
  return resolveShopPathSegment(param || '');
}

/** Logged-in marketing home: ?u=short (preferred) */
export function marketingHomeQuery(userId) {
  if (!userId) return '';
  const compact = toCompactUserId(String(userId).trim());
  return compact ? `?u=${encodeURIComponent(compact)}` : '';
}
