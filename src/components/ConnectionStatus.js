import React, { useState, useEffect } from 'react';
import { getServerUrl, isClientMode, testConnection, setServerUrl } from '../utils/connectionStatus';
import { isZbWebOnlyMode } from '../lib/appMode';
import api from '../services/api';
import './ConnectionStatus.css';

const ConnectionStatus = ({ onRefresh, readOnlyMode, setConnectionReadOnly }) => {
  const [connected, setConnected] = useState(true);
  const [checking, setChecking] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');

  useEffect(() => {
    const currentUrl = getServerUrl();
    setServerUrlState(currentUrl);
    
    // Set connected to true by default to avoid showing errors immediately
    setConnected(true);
    
    // Initial connection check with delay to allow app to initialize
    const timeoutId = setTimeout(() => {
      checkConnection();
    }, 2000); // Increased delay to allow React proxy to initialize
    
    // Listen for refresh events
    const handleRefreshEvent = () => {
      checkConnection();
    };
    window.addEventListener('data-refresh', handleRefreshEvent);
    
    // Check connection every 60 seconds (less frequent to avoid noise)
    const interval = setInterval(checkConnection, 60000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
      window.removeEventListener('data-refresh', handleRefreshEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setConnectionReadOnly]);

  const checkConnection = async () => {
    setChecking(true);
    try {
      // Try using axios which respects proxy settings
      const healthResponse = await api.get('/health');
      if (healthResponse.data && healthResponse.data.status === 'ok') {
        setConnected(true);
        // Only server-reported read-only (e.g. READ_ONLY_MODE=true). Do NOT use isClientMode() —
        // LAN clients with a custom URL are still full-access unless the API says otherwise.
        setConnectionReadOnly(healthResponse.data.mode === 'read-only');
      } else {
        setConnected(false);
      }
    } catch (error) {
      // If health check fails, assume connected anyway to avoid false errors
      // The actual API calls will show errors if there's a real problem
      console.warn('Health check failed, but API may still work:', error.message);
      setConnected(true); // Assume connected to avoid showing false errors
      // Fail open: do not block CRUD when health is unreachable (license still governs writes)
      setConnectionReadOnly(false);
    } finally {
      setChecking(false);
    }
  };

  const handleRefresh = async () => {
    await checkConnection();
    if (onRefresh) {
      onRefresh();
    }
    // Show feedback
    const statusEl = document.querySelector('.connection-status');
    if (statusEl) {
      statusEl.classList.add('refreshing');
      setTimeout(() => statusEl.classList.remove('refreshing'), 500);
    }
  };

  const handleConfigureServer = () => {
    const currentUrl = getServerUrl().replace('/api', '');
    setConfigUrl(currentUrl === '/api' ? '' : currentUrl);
    setShowConfig(true);
  };

  const handleSaveServerConfig = async () => {
    setServerUrl(configUrl || '/api');
    setServerUrl(configUrl);
    
    // Test new connection
    const result = await testConnection(configUrl ? `${configUrl}/api` : null);
    setConnected(result.connected);
    setShowConfig(false);
    
    if (result.connected) {
      // Reload page to use new server URL
      window.location.reload();
    } else {
      alert('Failed to connect to server. Please check the URL and try again.');
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect from remote server and use local database?')) {
      localStorage.removeItem('hisaabkitab_server_url');
      window.location.reload();
    }
  };

  const isClient = isClientMode();

  if (isZbWebOnlyMode()) {
    return null;
  }

  return (
    <>
      <div className={`connection-status ${connected ? 'connected' : 'offline'} ${checking ? 'checking' : ''} ${isClient ? 'has-client' : ''}`}>
        <div className="connection-indicator">
          <span className="status-dot"></span>
          <span className="status-text">
            {checking ? 'Checking...' : (connected ? (isClient ? 'Connected (Client PC)' : 'Connected') : 'Offline')}
          </span>
        </div>
        
        {isClient && (
          <div className="connection-actions">
            <button 
              className="btn-refresh" 
              onClick={handleRefresh}
              title="Refresh data from server"
            >
              🔄 Refresh
            </button>
            {readOnlyMode && (
              <span className="read-only-badge" title="Read-only mode: Editing disabled">
                Read-Only
              </span>
            )}
          </div>
        )}
        
        {showConfig ? (
          <div className="server-config">
            <input
              type="text"
              className="server-url-input"
              placeholder="http://192.168.1.100:5000"
              value={configUrl}
              onChange={(e) => setConfigUrl(e.target.value)}
            />
            <button className="btn-small" onClick={handleSaveServerConfig}>
              Save
            </button>
            <button className="btn-small btn-secondary" onClick={() => setShowConfig(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="connection-menu">
            {isClient ? (
              <>
                <span className="server-url" title={serverUrl}>{serverUrl.replace('/api', '')}</span>
                <button className="btn-link" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </>
            ) : (
              <button className="btn-link" onClick={handleConfigureServer}>
                Configure LAN Access
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Only show warning if not in initial loading state and actually disconnected */}
      {!connected && !checking && (
        <div className="connection-warning" style={{ display: isClient ? 'flex' : 'none' }}>
          <span>⚠️</span> Cannot connect to server. Please ensure backend is running on port 5000.
        </div>
      )}
    </>
  );
};

export default ConnectionStatus;

