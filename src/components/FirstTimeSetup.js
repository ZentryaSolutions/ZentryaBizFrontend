import React, { useState } from 'react';
import { setupAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import './FirstTimeSetup.css';

function FirstTimeSetup({ onCancelRegister }) {
  const { checkAuth } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Screen 2: Business Information
    shopName: '',
    ownerName: '',
    mobileNumber: '',
    city: '',
    businessType: 'mixed',
    // Screen 3: Admin Account
    username: '',
    password: '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer: '',
    // Screen 4: POS Settings
    currency: 'PKR',
    enableGST: false,
    receiptSize: '80mm',
    stockTracking: true,
    lowStockAlert: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validateStep2 = () => {
    if (!formData.shopName.trim()) {
      setError('Shop name is required');
      return false;
    }
    if (!formData.ownerName.trim()) {
      setError('Owner name is required');
      return false;
    }
    if (!formData.mobileNumber.trim()) {
      setError('Mobile number is required');
      return false;
    }
    if (!/^[0-9+\-\s()]+$/.test(formData.mobileNumber)) {
      setError('Please enter a valid mobile number');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.securityQuestion && !formData.securityAnswer) {
      setError('Please provide an answer to your security question');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        // Business Information
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        mobileNumber: formData.mobileNumber,
        city: formData.city,
        businessType: formData.businessType,
        // Admin Account
        username: formData.username,
        password: formData.password,
        securityQuestion: formData.securityQuestion || null,
        securityAnswer: formData.securityAnswer || null,
        // POS Settings
        currency: formData.currency,
        enableGST: formData.enableGST,
        receiptSize: formData.receiptSize,
        stockTracking: formData.stockTracking,
        lowStockAlert: formData.lowStockAlert,
      };

      const response = await setupAPI.createAdmin(data);

      if (response.data.message) {
        setSuccess(true);
        // Store session and user info
        if (response.data.sessionId) {
          localStorage.setItem('sessionId', response.data.sessionId);
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        // Wait a moment then check auth and redirect
        setTimeout(async () => {
          await checkAuth();
          window.location.href = '/';
        }, 2000);
      } else {
        setError(response.data.message || 'Setup failed');
        setLoading(false);
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Setup failed');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="setup-container">
        <div className="setup-box">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h2>Setup Completed Successfully! 🎉</h2>
            <p>Your shop is now configured and ready to use.</p>
            <p className="redirect-message">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="setup-container setup-with-login">
        <Login onBackToSetup={() => setShowLogin(false)} embedded />
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-box">
        {/* Screen 1: Welcome */}
        {step === 1 && (
          <div className="setup-step welcome-step">
            <div className="setup-header">
              <h1>Welcome to HisaabKitab POS</h1>
              <h2>Let's set up your shop in 3 minutes</h2>
              <p>We'll guide you through a quick setup process to get you started.</p>
            </div>
            <div className="setup-features">
              <div className="feature-item">
                <span className="feature-icon">🏪</span>
                <span>Business Information</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👤</span>
                <span>Admin Account</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚙️</span>
                <span>POS Settings</span>
              </div>
            </div>
            <div className="setup-actions setup-actions--welcome">
              <button
                type="button"
                className="btn btn-primary btn-large"
                onClick={() => setStep(2)}
              >
                Start Setup
              </button>
              {onCancelRegister && (
                <button
                  type="button"
                  className="btn btn-secondary btn-large setup-back-login"
                  onClick={onCancelRegister}
                >
                  Back to login
                </button>
              )}
            </div>
          </div>
        )}

        {/* Screen 2: Business Information */}
        {step === 2 && (
          <div className="setup-step">
            <div className="setup-header">
              <h2>Business Information</h2>
              <p>Tell us about your shop</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="form-group">
                <label>Shop Name *</label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  placeholder="Enter your shop name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner Name *</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="Enter owner name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  placeholder="e.g., +92 300 1234567"
                  required
                />
                <small>Important for password recovery</small>
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>
              <div className="form-group">
                <label>Business Type *</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  required
                >
                  <option value="hardware">Hardware</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrician">Electrician</option>
                  <option value="mixed">Mixed</option>
                </select>
                <small>This helps customize reports and invoice format</small>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="setup-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Screen 3: Admin Account Creation */}
        {step === 3 && (
          <div className="setup-step">
            <div className="setup-header">
              <h2>Admin Account Creation</h2>
              <p className="warning-text">⚠️ Remember this password. This account controls everything.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="form-group">
                <label>Admin Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  required
                />
                <small>This is your local admin account (not a website signup)</small>
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                />
                <small>Minimum 4 characters</small>
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Security Question (Optional)</label>
                <input
                  type="text"
                  name="securityQuestion"
                  value={formData.securityQuestion}
                  onChange={handleChange}
                  placeholder="e.g., What city were you born in?"
                />
              </div>
              {formData.securityQuestion && (
                <div className="form-group">
                  <label>Answer</label>
                  <input
                    type="text"
                    name="securityAnswer"
                    value={formData.securityAnswer}
                    onChange={handleChange}
                    placeholder="Enter answer"
                  />
                </div>
              )}
              {error && <div className="error-message">{error}</div>}
              <div className="setup-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Screen 4: POS Settings */}
        {step === 4 && (
          <div className="setup-step">
            <div className="setup-header">
              <h2>POS Settings</h2>
              <p>Configure your point of sale preferences</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="form-group">
                <label>Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                >
                  <option value="PKR">PKR (Pakistani Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="enableGST"
                    checked={formData.enableGST}
                    onChange={handleChange}
                  />
                  Enable GST
                </label>
              </div>
              <div className="form-group">
                <label>Receipt Size</label>
                <select
                  name="receiptSize"
                  value={formData.receiptSize}
                  onChange={handleChange}
                >
                  <option value="80mm">80mm (Thermal)</option>
                  <option value="A4">A4 (Paper)</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="stockTracking"
                    checked={formData.stockTracking}
                    onChange={handleChange}
                  />
                  Enable Stock Tracking
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="lowStockAlert"
                    checked={formData.lowStockAlert}
                    onChange={handleChange}
                  />
                  Enable Low Stock Alert
                </label>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="setup-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-primary">
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Screen 5: Finish Setup */}
        {step === 5 && (
          <div className="setup-step">
            <div className="setup-header">
              <h2>Review & Complete</h2>
              <p>Review your settings and complete the setup</p>
            </div>
            <div className="review-section">
              <div className="review-item">
                <strong>Shop Name:</strong> {formData.shopName}
              </div>
              <div className="review-item">
                <strong>Owner:</strong> {formData.ownerName}
              </div>
              <div className="review-item">
                <strong>Mobile:</strong> {formData.mobileNumber}
              </div>
              <div className="review-item">
                <strong>Business Type:</strong> {formData.businessType}
              </div>
              <div className="review-item">
                <strong>Username:</strong> {formData.username}
              </div>
              <div className="review-item">
                <strong>Currency:</strong> {formData.currency}
              </div>
              <div className="review-item">
                <strong>Receipt Size:</strong> {formData.receiptSize}
              </div>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="setup-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Completing Setup...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      <div className="setup-footer-signin">
        <button
          type="button"
          className="setup-signin-link"
          onClick={() => setShowLogin(true)}
        >
          Already registered? Sign in
        </button>
      </div>
    </div>
  );
}

export default FirstTimeSetup;
