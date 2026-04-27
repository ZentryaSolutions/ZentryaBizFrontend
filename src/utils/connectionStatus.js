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

// Get server URL from localStorage or use default
export const getServerUrl = () => {
  const stored = localStorage.getItem('hisaabkitab_server_url');
  if (stored) {
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

