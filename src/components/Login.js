import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { getDeviceId } from '../utils/deviceFingerprint';
import './Login.css';

function Login({ embedded = false, onBackToSetup }) {
  const { t } = useTranslation();
  const { login, openRegisterShop } = useAuth();
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'pin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // CRITICAL: Re-enable all inputs when Login component mounts
  // This fixes the issue where inputs get stuck after logout
  useEffect(() => {
    const reenableInputs = () => {
      const allInputs = document.querySelectorAll('input, textarea, select');
      allInputs.forEach(input => {
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('data-license-disabled');
      });
      
      // Remove any disabling classes
      const appElement = document.querySelector('.app');
      if (appElement) {
        appElement.classList.remove('operations-disabled');
      }
    };
    
    // Run immediately and after a short delay to catch any async updates
    reenableInputs();
    const timeoutId = setTimeout(reenableInputs, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('request'); // 'request' or 'reset'
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError(t('auth.usernamePasswordRequired'));
      setLoading(false);
      return;
    }

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error || t('auth.loginFailed'));
      setLoading(false);
    }
    // On success, AuthContext will handle redirect
  };

  const handlePINLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!pin || pin.length !== 4) {
      setError(t('auth.pinMustBe4Digits'));
      setLoading(false);
      return;
    }

    const result = await login(null, null, pin);
    
    if (!result.success) {
      setError(result.error || t('auth.loginFailed'));
      setLoading(false);
    }
    // On success, AuthContext will handle redirect
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');
    setRecoveryLoading(true);

    if (!recoveryUsername) {
      setError(t('auth.usernameRequired'));
      setRecoveryLoading(false);
      return;
    }

    try {
      const deviceId = getDeviceId();
      const response = await authAPI.forgotPassword({
        username: recoveryUsername,
        deviceId,
        securityAnswer: securityAnswer || undefined
      });

      if (response.data.success) {
        setRecoveryKey(response.data.recoveryKey);
        setResetToken(response.data.resetToken);
        setRecoveryMessage(t('auth.recoveryKeyGenerated', { key: response.data.recoveryKey }));
        setRecoveryStep('reset');
      }
    } catch (error) {
      if (error.response?.data?.securityQuestion) {
        setSecurityQuestion(error.response.data.securityQuestion);
        setError(t('auth.securityAnswerRequired'));
      } else {
        setError(error.response?.data?.message || t('auth.recoveryFailed'));
      }
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setRecoveryLoading(true);

    if (!newPassword || !confirmNewPassword) {
      setError(t('auth.passwordRequired'));
      setRecoveryLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      setRecoveryLoading(false);
      return;
    }

    if (newPassword.length < 4) {
      setError(t('auth.passwordMinLength'));
      setRecoveryLoading(false);
      return;
    }

    try {
      const response = await authAPI.resetPassword({
        username: recoveryUsername,
        recoveryKey,
        resetToken,
        newPassword
      });

      if (response.data.success) {
        setRecoveryMessage(t('auth.passwordResetSuccess'));
        setTimeout(() => {
          setShowForgotPassword(false);
          setRecoveryStep('request');
          setRecoveryUsername('');
          setRecoveryKey('');
          setResetToken('');
          setNewPassword('');
          setConfirmNewPassword('');
          setSecurityAnswer('');
          setSecurityQuestion('');
          setRecoveryMessage('');
        }, 2000);
      }
    } catch (error) {
      setError(error.response?.data?.message || t('auth.passwordResetFailed'));
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className={`login-container${embedded ? ' login-container--embedded' : ''}`}>
        <div className="login-box">
          {onBackToSetup && (
            <button type="button" className="login-back-setup" onClick={onBackToSetup}>
              ← Back to setup
            </button>
          )}
          <h2>{t('auth.forgotPassword')}</h2>
          
          {recoveryStep === 'request' ? (
            <form onSubmit={handleForgotPasswordRequest}>
              <div className="form-group">
                <label>{t('auth.username')}</label>
                <input
                  type="text"
                  value={recoveryUsername}
                  onChange={(e) => setRecoveryUsername(e.target.value)}
                  placeholder={t('auth.enterUsername')}
                  required
                  autoFocus
                />
              </div>
              
              {securityQuestion && (
                <div className="form-group">
                  <label>{t('auth.securityQuestion')}</label>
                  <p className="security-question-text">{securityQuestion}</p>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder={t('auth.enterSecurityAnswer')}
                    required
                  />
                </div>
              )}
              
              {error && <div className="error-message">{error}</div>}
              {recoveryMessage && (
                <div className="recovery-message">
                  <p>{recoveryMessage}</p>
                </div>
              )}
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={recoveryLoading}>
                  {recoveryLoading ? t('auth.processing') : t('auth.generateRecoveryKey')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setRecoveryStep('request');
                    setError('');
                    setRecoveryMessage('');
                    setRecoveryKey('');
                    setResetToken('');
                    setSecurityAnswer('');
                    setSecurityQuestion('');
                  }}
                >
                  {t('common.back')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="recovery-key-display">
                <div className="recovery-key-box">
                  <strong>{t('auth.recoveryKey')}:</strong>
                  <code>{recoveryKey}</code>
                  <small>{t('auth.saveRecoveryKey')}</small>
                </div>
              </div>
              
              <div className="form-group">
                <label>{t('auth.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('auth.enterNewPassword')}
                  required
                  autoFocus
                />
                <small>{t('auth.passwordMinLength')}</small>
              </div>
              
              <div className="form-group">
                <label>{t('auth.confirmNewPassword')}</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={t('auth.confirmNewPassword')}
                  required
                />
              </div>
              
              {error && <div className="error-message">{error}</div>}
              {recoveryMessage && (
                <div className="success-message">
                  {recoveryMessage}
                </div>
              )}
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={recoveryLoading}>
                  {recoveryLoading ? t('auth.resetting') : t('auth.resetPassword')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setRecoveryStep('request');
                    setError('');
                    setRecoveryMessage('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                >
                  {t('common.back')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`login-container${embedded ? ' login-container--embedded' : ''}`}>
      <div className="login-box">
        {onBackToSetup && (
          <button type="button" className="login-back-setup" onClick={onBackToSetup}>
            ← Back to setup
          </button>
        )}
        <div className="login-header">
          <div className="login-brand-badge" aria-hidden="true">
            HK
          </div>
          <h1>HisaabKitab</h1>
          <p>{t('auth.welcomeBack')}</p>
        </div>

        <div className="login-tabs">
          <button
            className={loginMode === 'password' ? 'active' : ''}
            onClick={() => {
              setLoginMode('password');
              setError('');
            }}
          >
            {t('auth.passwordLogin')}
          </button>
          <button
            className={loginMode === 'pin' ? 'active' : ''}
            onClick={() => {
              setLoginMode('pin');
              setError('');
            }}
          >
            {t('auth.pinLogin')}
          </button>
        </div>

        {loginMode === 'password' ? (
          <form onSubmit={handlePasswordLogin}>
            <div className="form-group">
              <label>{t('auth.username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.enterUsername')}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label>{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.enterPassword')}
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
            <button
              type="button"
              className="btn btn-link"
              onClick={() => setShowForgotPassword(true)}
            >
              {t('auth.forgotPassword')}?
            </button>
            {!embedded && (
              <div className="login-register-block">
                <button
                  type="button"
                  className="btn btn-register-shop"
                  onClick={() => openRegisterShop()}
                >
                  {t('auth.registerShop')}
                </button>
                <p className="login-register-hint">{t('auth.registerShopHint')}</p>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handlePINLogin}>
            <div className="form-group">
              <label>{t('auth.pin')}</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(value);
                }}
                placeholder="0000"
                maxLength="4"
                autoFocus
                required
              />
              <small>{t('auth.enter4DigitPin')}</small>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
            {!embedded && (
              <div className="login-register-block">
                <button
                  type="button"
                  className="btn btn-register-shop"
                  onClick={() => openRegisterShop()}
                >
                  {t('auth.registerShop')}
                </button>
                <p className="login-register-hint">{t('auth.registerShopHint')}</p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;

