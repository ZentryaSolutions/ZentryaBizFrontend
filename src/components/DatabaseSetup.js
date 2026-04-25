import React, { useState, useEffect } from 'react';
import { setupAPI } from '../services/api';
import './DatabaseSetup.css';

function DatabaseSetup({ onSetupComplete }) {
  const [status, setStatus] = useState('checking'); // 'checking', 'needs-setup', 'migrating', 'success', 'error'
  const [error, setError] = useState('');
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only check once
    if (!hasChecked) {
      checkDatabaseSetup();
      setHasChecked(true);
    }
  }, [hasChecked]);

  const checkDatabaseSetup = async () => {
    try {
      setStatus('checking');
      const response = await setupAPI.check();
      
      if (response.data.tablesExist) {
        // Tables exist, setup is complete
        if (onSetupComplete) {
          onSetupComplete();
        }
      } else {
        // Tables don't exist, show setup screen
        setStatus('needs-setup');
      }
    } catch (err) {
      console.error('Error checking database setup:', err);
      setStatus('needs-setup');
    }
  };

  const handleAutoSetup = async () => {
    try {
      setStatus('migrating');
      setError('');
      
      const response = await setupAPI.migrate();
      
      if (response.data.success) {
        setStatus('success');
        // Wait a moment to show success, then proceed
        setTimeout(() => {
          if (onSetupComplete) {
            onSetupComplete();
          }
        }, 2000);
      } else {
        setStatus('error');
        setError(response.data.error || 'Setup failed. Please try manual setup.');
      }
    } catch (err) {
      setStatus('error');
      const errorMsg = err.response?.data?.error || err.message || 'Setup failed. Please check your database connection.';
      setError(errorMsg);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return '⏳';
      case 'migrating':
        return '⚙️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📋';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking database setup...';
      case 'migrating':
        return 'Setting up database...';
      case 'success':
        return 'Setup completed successfully!';
      case 'error':
        return 'Setup failed';
      default:
        return '';
    }
  };

  if (status === 'checking') {
    return (
      <div className="database-setup-container">
        <div className="database-setup-box">
          <div className="setup-loading">
            <div className="loading-spinner-large">
              <div className="spinner-large"></div>
            </div>
            <p>Checking database setup...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="database-setup-container">
        <div className="database-setup-box">
          <div className="setup-success">
            <div className="success-icon-large">✅</div>
            <h2>Setup Complete!</h2>
            <p>Database is ready. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="database-setup-container">
      <div className="database-setup-box">
        <div className="setup-header">
          <h1>🔧 Initial Setup Required</h1>
          <p>Your database needs to be set up for license management</p>
        </div>

        {status === 'migrating' && (
          <div className="setup-status">
            <div className="status-icon">{getStatusIcon()}</div>
            <p>{getStatusMessage()}</p>
            <p className="status-note">Please wait, this will only take a few seconds...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="setup-error">
            <div className="error-icon">⚠️</div>
            <h3>Setup Failed</h3>
            <p className="error-message">
              {error || 'An error occurred during setup. Please try the manual setup method below.'}
            </p>
            <div className="error-actions">
              <button onClick={handleAutoSetup} className="retry-button">
                🔄 Try Automatic Setup Again
              </button>
            </div>
            <div className="error-help">
              <p><strong>Common Issues:</strong></p>
              <ul>
                <li>Make sure PostgreSQL database is running</li>
                <li>Check your database connection settings in <code>backend/.env</code></li>
                <li>Ensure you have proper database permissions</li>
              </ul>
            </div>
          </div>
        )}

        {status === 'needs-setup' && (
          <>
            <div className="setup-steps">
              <div className="step-header">
                <h2>📝 Setup Steps</h2>
                <p>Follow these simple steps to complete the setup:</p>
              </div>

              <div className="step-item">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Automatic Setup (Recommended)</h3>
                  <p>Click the button below to automatically set up the license system. This is the easiest way.</p>
                  <button onClick={handleAutoSetup} className="setup-button-primary">
                    🚀 Run Automatic Setup
                  </button>
                </div>
              </div>

              <div className="step-divider">OR</div>

              <div className="step-item">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Manual Setup (If automatic fails)</h3>
                  <p>If automatic setup doesn't work, follow these steps:</p>
                  <ol className="manual-steps">
                    <li>
                      <strong>Step 1:</strong> Press <code>Windows Key + R</code>, type <code>cmd</code> and press Enter
                      <br />
                      <span className="step-note">(Or search for "Command Prompt" in Windows Start Menu)</span>
                    </li>
                    <li>
                      <strong>Step 2:</strong> In the Command Prompt window, type this command and press Enter:
                      <code className="code-block">cd /d E:\POS\HisaabKitab</code>
                      <br />
                      <span className="step-note">(This opens the application folder)</span>
                    </li>
                    <li>
                      <strong>Step 3:</strong> Type this command and press Enter:
                      <code className="code-block">node backend\scripts\run-license-migration.js</code>
                      <br />
                      <span className="step-note">(This will set up the license system)</span>
                    </li>
                    <li>
                      <strong>Step 4:</strong> Wait for the message: <strong>"✅ License system migration completed successfully!"</strong>
                    </li>
                    <li>
                      <strong>Step 5:</strong> Close the Command Prompt window and restart this application
                    </li>
                  </ol>
                  <div className="manual-note">
                    <p><strong>Note:</strong> Make sure PostgreSQL database is running before running the setup command.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="setup-footer">
              <div className="help-section">
                <h4>💡 Need Help?</h4>
                <p>If you're having trouble, please contact support with:</p>
                <ul>
                  <li>Error message (if any)</li>
                  <li>Your database connection details</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DatabaseSetup;

