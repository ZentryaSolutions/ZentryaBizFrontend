/**
 * Offline write queue: JSON mutations are stored in IndexedDB with a fixed x-shop-id
 * snapshot so replays never attach to the wrong shop. Flush runs when the browser goes online.
 */
import axios from 'axios';
import { queryClient } from './queryClient';

const DB_NAME = 'zb_offline_mutations_v1';
const STORE = 'mutations';
const CHANGED = 'zb-offline-queue-changed';
const FLUSH_DONE = 'zb-offline-flush-done';

/** Do not queue these URL prefixes (relative to API base, e.g. "/auth/..."). */
const BLOCK_PREFIXES = [
  '/auth',
  '/otp',
  '/billing',
  '/health',
  '/setup',
  '/setup-auth',
  '/stripe',
  '/shop-picker',
];

let dbPromise = null;
let flushPromise = null;

function notifyChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGED));
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
  return dbPromise;
}

function withStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let out;
        try {
          out = fn(store, tx);
        } catch (e) {
          reject(e);
          return;
        }
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export async function getOfflineQueueCount() {
  try {
    return await withStore('readonly', (store) => {
      return new Promise((res, rej) => {
        const r = store.count();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    });
  } catch {
    return 0;
  }
}

export async function clearOfflineMutationQueue() {
  try {
    await withStore('readwrite', (store) => store.clear());
    notifyChanged();
  } catch {
    /* ignore */
  }
}

function isMutatingMethod(method) {
  const m = String(method || 'get').toUpperCase();
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m);
}

export function isOfflineQueueableUrl(url) {
  const p = String(url || '').split('?')[0];
  if (!p.startsWith('/')) return false;
  const lower = p.toLowerCase();
  for (const b of BLOCK_PREFIXES) {
    if (lower.startsWith(b)) return false;
  }
  return true;
}

function hasJsonLikeBody(config) {
  const d = config.data;
  if (d == null) return true;
  if (typeof FormData !== 'undefined' && d instanceof FormData) return false;
  if (typeof URLSearchParams !== 'undefined' && d instanceof URLSearchParams) return false;
  if (typeof Blob !== 'undefined' && d instanceof Blob) return false;
  if (typeof d === 'string') return true;
  return typeof d === 'object';
}

function serializeBody(config) {
  const d = config.data;
  if (d == null) return null;
  if (typeof d === 'string') return d;
  try {
    return JSON.stringify(d);
  } catch {
    return null;
  }
}

function deserializeBody(raw, contentType) {
  if (raw == null || raw === '') return undefined;
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('application/json') || (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('[')))) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function headerGet(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) ?? headers.get(name.toLowerCase());
  return headers[name] ?? headers[name.toLowerCase()];
}

function pickHeaders(config) {
  const h = config.headers || {};
  const out = {};
  const copy = (key) => {
    const v = headerGet(h, key);
    if (v != null && v !== '') out[key] = v;
  };
  copy('x-shop-id');
  copy('x-session-id');
  copy('x-device-id');
  copy('Authorization');
  copy('Content-Type');
  return out;
}

function fullUrl(baseURL, urlPath) {
  const b = String(baseURL || '').replace(/\/$/, '');
  const u = String(urlPath || '');
  const path = u.startsWith('/') ? u : `/${u}`;
  return b + path;
}

/**
 * Build a persisted mutation. Requires x-shop-id so we never replay into the wrong shop.
 */
export function buildOfflineMutationSnapshot(config) {
  if (!config || headerGet(config.headers, 'x-offline-replay')) return null;
  if (!isMutatingMethod(config.method)) return null;
  if (!isOfflineQueueableUrl(config.url)) return null;
  if (!hasJsonLikeBody(config)) return null;

  const shopId =
    headerGet(config.headers, 'x-shop-id') ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('zb_active_shop_id')) ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('zb_active_shop_id'));
  if (!shopId) return null;

  const body = serializeBody(config);
  if (body === null && config.data != null && typeof config.data === 'object') return null;

  const baseURL = String(config.baseURL || '').replace(/\/$/, '') || '';
  if (!baseURL) return null;

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    shopId: String(shopId),
    method: String(config.method || 'POST').toUpperCase(),
    url: String(config.url || ''),
    baseURL,
    body,
    contentType: headerGet(config.headers, 'Content-Type') || 'application/json',
    headers: pickHeaders(config),
    createdAt: Date.now(),
  };
}

async function addToStore(entry) {
  await withStore('readwrite', (store) => {
    store.put(entry);
  });
  notifyChanged();
}

function makeQueuedAxiosResponse(config) {
  return {
    data: { ok: true, offlineQueued: true, queueId: config?.metadata?.offlineQueueId },
    status: 202,
    statusText: 'Accepted (offline queue)',
    headers: {},
    config,
  };
}

/**
 * Request interceptor: if browser reports offline, queue before the network adapter runs.
 */
export async function offlineRequestInterceptor(config) {
  if (headerGet(config.headers, 'x-offline-replay')) return config;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const snap = buildOfflineMutationSnapshot(config);
    if (snap) {
      await addToStore(snap);
      config.metadata = { ...(config.metadata || {}), offlineQueueId: snap.id };
      config.adapter = () => Promise.resolve(makeQueuedAxiosResponse(config));
    }
  }
  return config;
}

/**
 * @returns {Promise<object|null>} Axios-like response if queued, else null.
 */
export async function offlineResponseErrorInterceptor(error) {
  const cfg = error?.config;
  if (!cfg || headerGet(cfg.headers, 'x-offline-replay')) return null;

  const noResponse = !error.response;
  const code = error.code;
  const netLike =
    noResponse &&
    (code === 'ERR_NETWORK' || String(error.message || '').toLowerCase().includes('network'));

  if (!netLike || !isMutatingMethod(cfg.method)) return null;

  const snap = buildOfflineMutationSnapshot(cfg);
  if (!snap) return null;
  await addToStore(snap);
  cfg.metadata = { ...(cfg.metadata || {}), offlineQueueId: snap.id };
  return makeQueuedAxiosResponse(cfg);
}

async function getAllSorted() {
  return withStore('readonly', (store) => {
    return new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => {
        const arr = r.result || [];
        arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        res(arr);
      };
      r.onerror = () => rej(r.error);
    });
  });
}

async function removeId(id) {
  await withStore('readwrite', (store) => store.delete(id));
}

/**
 * Replay queued mutations in order. Each request uses the stored x-shop-id (never the current UI shop).
 */
export async function flushOfflineMutationQueue() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { flushed: 0, skipped: 0 };

  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    let flushed = 0;
    let skipped = 0;
    try {
      const items = await getAllSorted();
      for (const item of items) {
        const headers = {
          ...item.headers,
          'x-offline-replay': '1',
          'x-shop-id': item.shopId,
        };
        if (!headers['Content-Type'] && item.contentType) {
          headers['Content-Type'] = item.contentType;
        }

        const res = await axios({
          method: item.method,
          url: fullUrl(item.baseURL, item.url),
          data: deserializeBody(item.body, item.contentType),
          headers,
          timeout: 120000,
          validateStatus: () => true,
        });

        if (res.status === 401) {
          skipped += 1;
          break;
        }
        if (res.status >= 400) {
          skipped += 1;
          console.warn('[OfflineQueue] Replay failed', item.method, item.url, res.status, res.data);
          break;
        }
        await removeId(item.id);
        flushed += 1;
      }
    } catch (e) {
      console.warn('[OfflineQueue] flush error', e);
    } finally {
      flushPromise = null;
      notifyChanged();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(FLUSH_DONE));
      }
      try {
        queryClient.invalidateQueries({
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'zb',
        });
      } catch {
        /* ignore */
      }
    }
    return { flushed, skipped };
  })();

  return flushPromise;
}

export function subscribeOfflineQueueChanged(fn) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED, fn);
  return () => window.removeEventListener(CHANGED, fn);
}

export function subscribeOfflineFlushDone(fn) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(FLUSH_DONE, fn);
  return () => window.removeEventListener(FLUSH_DONE, fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineMutationQueue();
  });
}
