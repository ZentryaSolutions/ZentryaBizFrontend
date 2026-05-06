// Connection status utility for LAN sync

// Same-origin API (Express serves build, or CRA proxy in dev)
function getDefaultServerUrl() {
  const envBackend = process.env.REACT_APP_BACKEND_URL;
  if (envBackend && String(envBackend).trim()) {
    const clean = String(envBackend).trim().replace(/\/$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  if (typeof window === 'undefined') return '/api';
  return '/api';
}

const DEFAULT_SERVER_URL = getDefaultServerUrl();

function isHttpsProductionSite() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname || '';
  if (window.location.protocol !== 'https:') return false;
  return h !== 'localhost' && h !== '127.0.0.1';
}

/** LAN/localhost overrides break hosted frontends — API calls stay on localhost or disappear to wrong origin (/api). */
function storedBackendIsUnsafeFromHostedProd(stored) {
  const s = String(stored || '').trim().toLowerCase();
  if (!s) return false;
  if (s === '/api' || s.startsWith('/api/')) return true;
  if (s.includes('localhost') || s.includes('127.0.0.1')) return true;
  if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(s)) return true;
  if (typeof window !== 'undefined') {
    try {
      const full = /^https?:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, '')}`;
      const parsed = new URL(full);
      if (parsed.origin === window.location.origin) return true;
    } catch (_) {
      /* ignore */
    }
  }
  return false;
}

// Get server URL from localStorage or use default
export const getServerUrl = () => {
  const stored = localStorage.getItem('hisaabkitab_server_url');
  if (stored && !(isHttpsProductionSite() && storedBackendIsUnsafeFromHostedProd(stored))) {
    return stored.endsWith('/api') ? stored : `${stored}/api`;
  }
  return DEFAULT_SERVER_URL;
};

// Set server URL for LAN connection
export const setServerUrl = (url) => {
  if (url && url.trim()) {
    const cleanUrl = url.trim().replace(/\/$/, '').replace(/\/api$/, '');
    localStorage.setItem('hisaabkitab_server_url', `${cleanUrl}/api`);
  } else {
    localStorage.removeItem('hisaabkitab_server_url');
  }
};

// Check if running in client mode (connected to remote server)
export const isClientMode = () => {
  const serverUrl = getServerUrl();
  return serverUrl !== DEFAULT_SERVER_URL;
};

// Test connection to server
export const testConnection = async (serverUrl = null) => {
  const url = serverUrl || getServerUrl();
  // Handle both /api and full URLs
  let healthUrl;
  
  if (url.includes('http://') || url.includes('https://')) {
    // Full URL provided
    healthUrl = url.endsWith('/api') ? `${url.replace('/api', '')}/api/health` : `${url}/health`;
  } else {
    // Relative URL - use proxy in dev mode
    healthUrl = '/api/health';
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      connected: true,
      mode: data.mode || 'full-access',
      message: data.message || 'Connected'
    };
  } catch (error) {
    // Don't log connection errors in console to avoid noise
    // Only return failure status
    return {
      connected: false,
      mode: 'offline',
      message: error.name === 'AbortError' ? 'Connection timeout' : 'Connection failed'
    };
  }
};

// Get local IP addresses (helper for finding server IP)
export const getLocalIPs = async () => {
  // This is a placeholder - in a real implementation, you might use
  // Electron's network API or a library like 'network-interfaces'
  return [];
};

