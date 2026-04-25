import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsAPI, usersAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canUsePremiumFeatures } from '../utils/planFeatures';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import './Settings.css';

const Settings = ({ readOnly = false }) => {
  const { i18n, t } = useTranslation();
  const { user, isAdmin, activeShopId, profile } = useAuth();
  const [settings, setSettings] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [revalidating, setRevalidating] = useState(false);

  // Security section state
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('shop');

  /** Load shop name / address / phone from Supabase `shops` (onboarding) — overrides defaults from settings row. */
  const applyShopRowFromSupabase = useCallback(async () => {
    if (!isSupabaseBrowserConfigured() || !supabase || !activeShopId) return;
    try {
      const { data: shopRow, error } = await supabase
        .from('shops')
        .select('name, address, phone')
        .eq('id', activeShopId)
        .maybeSingle();
      if (error || !shopRow) return;
      if (shopRow.name) setShopName(shopRow.name);
      setShopAddress(shopRow.address || '');
      setShopPhone(shopRow.phone || '');
    } catch {
      /* optional */
    }
  }, [activeShopId]);

  useEffect(() => {
    fetchSettings();
    fetchPrinters();
  }, [activeShopId]);

  const fetchSettings = async () => {
    try {
      console.log('[Settings] ===== FETCH SETTINGS START =====');
      setLoading(true);
      const response = await settingsAPI.get();
      console.log('[Settings] Fetch response:', response);
      console.log('[Settings] Fetch response data:', response.data);
      
      const data = response.data;
      setSettings(data);
      
      // Parse settings
      if (data.other_app_settings) {
        const otherSettings = typeof data.other_app_settings === 'string' 
          ? JSON.parse(data.other_app_settings) 
          : data.other_app_settings;
        console.log('[Settings] Parsed other_app_settings:', otherSettings);
        setShopName(otherSettings.shop_name || 'My Shop');
        setShopAddress(otherSettings.shop_address || '');
        setShopPhone(otherSettings.shop_phone || '');
        if (otherSettings.theme === 'light' || otherSettings.theme === 'dark') {
          setTheme(otherSettings.theme);
        } else {
          setTheme('light');
        }
      }
      
      if (data.printer_config) {
        const printerConfig = typeof data.printer_config === 'string' 
          ? JSON.parse(data.printer_config) 
          : data.printer_config;
        console.log('[Settings] Parsed printer_config:', printerConfig);
        setSelectedPrinter(printerConfig.printerName || '');
      }
      
      // Set language - this is critical for persistence
      console.log('[Settings] Current language in DB:', data.language);
      console.log('[Settings] Current state language:', language);
      console.log('[Settings] Current i18n language:', i18n.language);
      
      // CRITICAL: Always update from database - it's the source of truth
      // But log what's happening for debugging
      if (data.language) {
        const dbLanguage = data.language === 'ur' ? 'en' : data.language;

        if (dbLanguage !== language) {
          console.log('[Settings] Updating state language from', language, 'to', dbLanguage);
          setLanguage(dbLanguage);
        } else {
          console.log('[Settings] State language already matches DB:', language);
        }

        if (dbLanguage !== i18n.language) {
          console.log('[Settings] Changing i18n language from', i18n.language, 'to', dbLanguage);
          i18n.changeLanguage(dbLanguage);
        } else {
          console.log('[Settings] i18n language already matches DB:', dbLanguage);
        }
      } else {
        // Default to English if not set
        console.log('[Settings] No language in DB, defaulting to English');
        if (language !== 'en') {
          setLanguage('en');
        }
        if (i18n.language !== 'en') {
          i18n.changeLanguage('en');
        }
      }
      console.log('[Settings] Final language state:', {
        stateLanguage: language,
        i18nLanguage: i18n.language,
        dbLanguage: data.language
      });

      await applyShopRowFromSupabase();

      console.log('[Settings] ===== FETCH SETTINGS SUCCESS =====');
    } catch (err) {
      console.error('[Settings] ===== FETCH SETTINGS ERROR =====');
      console.error('[Settings] Error:', err);
      console.error('[Settings] Error response:', err.response);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getPrinters) {
        const result = await window.electronAPI.getPrinters();
        setPrinters(result.printers || []);
        if (result.defaultPrinter && !selectedPrinter) {
          setSelectedPrinter(result.defaultPrinter);
        }
      } else {
        // Fallback: mock printers list
        setPrinters([
          { name: 'Default Printer', description: 'System default printer' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching printers:', err);
      setPrinters([{ name: 'Default Printer', description: 'System default printer' }]);
    }
  };

  // License checks removed — billing/subscription will be handled later (Stripe).

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      console.log('[Settings] ===== SAVE SETTINGS START =====');
      console.log('[Settings] Current state:', {
        shopName,
        shopAddress,
        shopPhone,
        language,
        theme,
        selectedPrinter
      });

      const printerConfig = selectedPrinter ? {
        printerName: selectedPrinter,
      } : null;

      // Get existing settings to preserve backup_config
      const existingSettings = settings?.other_app_settings || {};
      console.log('[Settings] Existing settings:', existingSettings);
      
      // Parse if it's a string
      let parsedExistingSettings = existingSettings;
      if (typeof existingSettings === 'string') {
        try {
          parsedExistingSettings = JSON.parse(existingSettings);
          console.log('[Settings] Parsed existing settings from string');
        } catch (e) {
          console.error('[Settings] Error parsing existing settings:', e);
          parsedExistingSettings = {};
        }
      }
      const existingBackupConfig = parsedExistingSettings.backup_config || {};
      console.log('[Settings] Existing backup config:', existingBackupConfig);

      const otherAppSettings = {
        shop_name: shopName,
        shop_address: shopAddress,
        shop_phone: shopPhone,
        theme: theme,
        // Preserve backup_config
        backup_config: existingBackupConfig,
      };

      const languageToSave = language === 'ur' ? 'en' : language;
      if (languageToSave !== language) {
        setLanguage('en');
      }

      const payload = {
        printer_config: printerConfig ? JSON.stringify(printerConfig) : null,
        language: languageToSave,
        other_app_settings: otherAppSettings,
      };

      console.log('[Settings] Payload to send:', {
        printer_config: payload.printer_config,
        language: payload.language,
        other_app_settings: payload.other_app_settings
      });

      console.log('[Settings] Calling settingsAPI.update...');
      const response = await settingsAPI.update(payload);

      if (isSupabaseBrowserConfigured() && supabase && activeShopId) {
        const { error: shopUpdErr } = await supabase
          .from('shops')
          .update({
            name: shopName.trim(),
            address: shopAddress.trim() || null,
            phone: shopPhone.trim() || null,
          })
          .eq('id', activeShopId);
        if (shopUpdErr) {
          console.warn('[Settings] Supabase shops sync:', shopUpdErr.message);
        }
      }
      
      console.log('[Settings] Save response received:', response);
      console.log('[Settings] Response data:', response.data);
      console.log('[Settings] Response status:', response.status);
      console.log('[Settings] Response language:', response.data?.language);

      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      // CRITICAL: Check if language was actually saved
      const savedLanguage = response.data.language;
      console.log('[Settings] Language in response:', savedLanguage);
      console.log('[Settings] Expected language:', languageToSave);
      console.log('[Settings] Language match:', savedLanguage === languageToSave);

      if (savedLanguage !== languageToSave) {
        console.error('[Settings] ⚠️ LANGUAGE MISMATCH! Expected:', languageToSave, 'Got:', savedLanguage);
        setError(`Language update failed. Expected: ${languageToSave}, Got: ${savedLanguage}. Please try again.`);
        return;
      }

      // CRITICAL: Update language IMMEDIATELY from response, before refreshing
      // This ensures the UI reflects the saved value
      if (savedLanguage && savedLanguage !== i18n.language) {
        console.log('[Settings] Language changed from', i18n.language, 'to', savedLanguage);
        i18n.changeLanguage(savedLanguage);
        console.log('[Settings] i18n language updated to:', i18n.language);
        // Also update state to match saved value
        setLanguage(savedLanguage);
      } else {
        console.log('[Settings] Language unchanged:', savedLanguage);
      }

      // Refresh settings to get updated data - but wait a bit to ensure DB is updated
      console.log('[Settings] Waiting 200ms before refreshing settings to ensure DB is updated...');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('[Settings] Refreshing settings...');
      await fetchSettings();
      console.log('[Settings] Settings refreshed');
      
      // CRITICAL: After refresh, verify language is still correct
      // Use a fresh fetch to get the latest settings (don't rely on state which might be stale)
      const verifyResponse = await settingsAPI.get();
      const verifiedLanguage = verifyResponse.data?.language;
      console.log('[Settings] Language after refresh verification:', verifiedLanguage);
      console.log('[Settings] Expected language (saved):', savedLanguage);
      if (verifiedLanguage && verifiedLanguage !== savedLanguage) {
        console.warn('[Settings] ⚠️ Language changed after refresh! Expected:', savedLanguage, 'Got:', verifiedLanguage);
        // Force update to saved language
        setLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);
        console.log('[Settings] Forced language back to saved value:', savedLanguage);
      } else {
        console.log('[Settings] ✅ Language verified correctly:', verifiedLanguage);
      }

      setSuccess(t('settings.settingsSaved'));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zb-shop-display-updated'));
      }
      console.log('[Settings] Success message set');
      
      // Also save to Electron store for quick access
      if (window.electronAPI && window.electronAPI.setStoreValue) {
        console.log('[Settings] Saving to Electron store...');
        await window.electronAPI.setStoreValue('printerName', selectedPrinter);
        await window.electronAPI.setStoreValue('shopName', shopName);
        await window.electronAPI.setStoreValue('language', language);
        console.log('[Settings] Electron store updated');
      }

      console.log('[Settings] ===== SAVE SETTINGS SUCCESS =====');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('[Settings] ===== SAVE SETTINGS ERROR =====');
      console.error('[Settings] Error object:', err);
      console.error('[Settings] Error message:', err.message);
      console.error('[Settings] Error stack:', err.stack);
      console.error('[Settings] Error response:', err.response);
      console.error('[Settings] Error response data:', err.response?.data);
      console.error('[Settings] Error response status:', err.response?.status);
      console.error('[Settings] ===== END ERROR =====');
      
      const d = err.response?.data;
      const errorMessage =
        d?.message ||
        d?.detail ||
        d?.error ||
        err.message ||
        t('settings.settingsFailed');
      setError(errorMessage);
    } finally {
      setSaving(false);
      console.log('[Settings] Save operation completed, saving state set to false');
    }
  };

  const handleTestPrint = async () => {
    try {
      if (!selectedPrinter) {
        alert('Please select a printer first');
        return;
      }

      // Generate test print content
      const ESC = '\x1B';
      const GS = '\x1D';
      let commands = '';

      commands += ESC + '@'; // Initialize
      commands += ESC + 'a' + '\x01'; // Center align
      commands += ESC + '!' + '\x18'; // Double height and width
      commands += 'HISAABKITAB\n';
      commands += ESC + '!' + '\x00'; // Normal size
      commands += 'POS & Inventory\n';
      commands += '----------------\n\n';
      commands += ESC + 'a' + '\x00'; // Left align
      commands += 'TEST PRINT\n';
      commands += `Date: ${new Date().toLocaleString()}\n`;
      commands += `Shop: ${shopName || 'My Shop'}\n\n`;
      commands += 'This is a test print.\n';
      commands += 'If you can read this, your printer is configured correctly!\n\n';
      commands += ESC + 'a' + '\x01'; // Center align
      commands += 'Thank you!\n\n\n';
      commands += GS + 'V' + '\x41' + '\x03'; // Cut paper

      if (window.electronAPI && window.electronAPI.printRaw) {
        const result = await window.electronAPI.printRaw(selectedPrinter, commands);
        if (result.success) {
          alert('Test print sent successfully!');
        } else {
          alert('Print failed: ' + (result.error || 'Unknown error'));
        }
      } else {
        alert('Printer API not available. Opening print dialog...');
        // Fallback to browser print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Test Print</title></head>
              <body style="font-family: monospace; padding: 20px;">
                <h2>HISAABKITAB</h2>
                <p>POS & Inventory</p>
                <hr>
                <p><strong>TEST PRINT</strong></p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <p>Shop: ${shopName || 'My Shop'}</p>
                <p>This is a test print.</p>
                <p>If you can read this, your printer is configured correctly!</p>
                <hr>
                <p>Thank you!</p>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (err) {
      console.error('Error in test print:', err);
      alert('Test print failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="content-container">
        <div className="loading">{t('common.loading')} {t('settings.title').toLowerCase()}...</div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-subtitle">{t('settings.subtitle')}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🏪 {t('settings.shopInformation')}
        </button>
        {!readOnly && (
          <>
            <button
              className={`settings-tab ${activeTab === 'printer' ? 'active' : ''}`}
              onClick={() => setActiveTab('printer')}
            >
              🖨️ {t('settings.printerConfiguration')}
            </button>
          </>
        )}
        <button
          className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔐 {t('settings.security')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="settings-tab-content">
        {/* Shop Information Tab */}
        {activeTab === 'shop' && (
          <div className="card">
            <div className="card-header">
              <h2>{t('settings.shopInformation')}</h2>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">{t('settings.shopName')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder={t('settings.enterShopName')}
                  disabled={readOnly || !isAdmin()}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('settings.shopAddress')}</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder={t('settings.enterShopAddress')}
                  disabled={readOnly || !isAdmin()}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('settings.shopPhone')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder={t('settings.enterShopPhone')}
                  disabled={readOnly || !isAdmin()}
                />
              </div>
            </div>
          </div>
        )}

        {/* Printer Configuration Tab */}
        {activeTab === 'printer' && !readOnly && (
          <div className="card">
            <div className="card-header">
              <h2>{t('settings.printerConfiguration')}</h2>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">{t('settings.selectPrinter')}</label>
                <select
                  className="form-input"
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">-- {t('settings.selectPrinter')} --</option>
                  {printers.map((printer, index) => (
                    <option key={index} value={printer.name}>
                      {printer.name} {printer.description ? `- ${printer.description}` : ''}
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  {t('settings.selectThermalPrinter')}
                </small>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleTestPrint}
                  disabled={!selectedPrinter}
                >
                  {t('settings.testPrint')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="card">
            <div className="card-header">
              <h2>🔐 {t('settings.security')}</h2>
            </div>
            <div className="settings-form">
              {/* Change Password */}
              <div className="form-group">
                <label className="form-label">{t('settings.changePassword')}</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('settings.currentPassword')}
                  style={{ marginBottom: '10px' }}
                />
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.newPassword')}
                  style={{ marginBottom: '10px' }}
                />
                <input
                  type="password"
                  className="form-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={t('settings.confirmNewPassword')}
                  style={{ marginBottom: '10px' }}
                />
                <button
                  className="btn btn-primary settings-security-btn"
                  onClick={async () => {
                    if (!currentPassword || !newPassword) {
                      setError(t('settings.passwordRequired'));
                      return;
                    }
                    if (newPassword !== confirmNewPassword) {
                      setError(t('settings.passwordsDoNotMatch'));
                      return;
                    }
                    try {
                      setChangingPassword(true);
                      setError(null);
                      await authAPI.changePassword({ currentPassword, newPassword });
                      setSuccess(t('settings.passwordChanged'));
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setTimeout(() => setSuccess(null), 5000);
                    } catch (err) {
                      setError(err.response?.data?.message || t('settings.passwordChangeFailed'));
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                  disabled={changingPassword}
                >
                  {changingPassword ? t('settings.changing') : t('settings.changePassword')}
                </button>
              </div>

              {/* Users Management */}
              <div className="form-group">
                <button
                  className="btn btn-secondary settings-security-btn settings-security-btn--users"
                  onClick={async () => {
                    try {
                      const response = await usersAPI.getAll();
                      setUsers(response.data.users);
                      setShowUsers(!showUsers);
                    } catch (err) {
                      setError(err.response?.data?.message || t('settings.failedToLoadUsers'));
                    }
                  }}
                >
                  {showUsers ? '👥 ' + t('settings.hideUsers') : '👥 ' + t('settings.viewUsers')}
                </button>
                {showUsers && users.length > 0 && (
                  <div style={{ marginTop: '15px', border: '1px solid #ddd', borderRadius: '6px', padding: '15px' }}>
                    <table style={{ width: '100%', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>{t('settings.username')}</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>{t('settings.name')}</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>{t('settings.role')}</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>{t('settings.status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.user_id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{u.username}</td>
                            <td style={{ padding: '8px' }}>{u.name}</td>
                            <td style={{ padding: '8px', textTransform: 'capitalize' }}>{u.role}</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ color: u.is_active ? '#10b981' : '#ef4444' }}>
                                {u.is_active ? t('common.active') : t('common.inactive')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Audit Logs — Premium (API-enforced) */}
              {isAdmin() && canUsePremiumFeatures(profile?.plan) && (
              <div className="form-group">
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    try {
                      const response = await usersAPI.getAuditLogs({ limit: 50 });
                      setAuditLogs(response.data.logs);
                      setShowAuditLogs(!showAuditLogs);
                    } catch (err) {
                      setError(err.response?.data?.message || t('settings.failedToLoadLogs'));
                    }
                  }}
                >
                  {showAuditLogs ? '📋 ' + t('settings.hideAuditLogs') : '📋 ' + t('settings.viewAuditLogs')}
                </button>
                {showAuditLogs && auditLogs.length > 0 && (
                  <div style={{ marginTop: '15px', border: '1px solid #ddd', borderRadius: '6px', padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                          <th style={{ textAlign: 'left', padding: '6px' }}>{t('settings.timestamp')}</th>
                          <th style={{ textAlign: 'left', padding: '6px' }}>{t('settings.user')}</th>
                          <th style={{ textAlign: 'left', padding: '6px' }}>{t('settings.action')}</th>
                          <th style={{ textAlign: 'left', padding: '6px' }}>{t('settings.table')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.log_id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '6px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '6px' }}>{log.username || 'System'}</td>
                            <td style={{ padding: '6px' }}>{log.action}</td>
                            <td style={{ padding: '6px' }}>{log.table_name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {!readOnly && isAdmin() && (
        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('settings.saving') : t('settings.saveSettings')}
          </button>
        </div>
      )}
      {!isAdmin() && (
        <div className="settings-actions">
          <div className="read-only-notice" style={{ padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px', color: '#666' }}>
            {t('settings.viewOnlyNotice')}
          </div>
        </div>
      )}
      {readOnly && (
        <div className="settings-actions">
          <div className="read-only-notice">{t('settings.readOnlyNotice')}</div>
        </div>
      )}
    </div>
  );
};

export default Settings;
