import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { settingsAPI, usersAPI, authAPI, categoriesAPI, unitsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canUsePremiumFeatures } from '../utils/planFeatures';
import { supabase, isSupabaseBrowserConfigured } from '../lib/supabaseClient';
import PageLoadingCenter from './PageLoadingCenter';
import { settingsExtraStyles } from './SettingsExtraStyles';
import { zbKeys } from '../lib/queryKeys';
import './Settings.css';

const Settings = ({ readOnly = false }) => {
  const { i18n, t } = useTranslation();
  const { user, isAdmin, activeShopId, profile } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopCurrency, setShopCurrency] = useState('PKR');
  const [shopEmail, setShopEmail] = useState('');
  const [shopNtn, setShopNtn] = useState('');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  // `revalidating` was used by the old Settings UI; keep state removed in new UI.

  // Security section state
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // New Settings navigation (matches reference images/template)
  const [activeSection, setActiveSection] = useState('shop-profile');

  // Printer + invoice display (stored in other_app_settings)
  const [paperSize, setPaperSize] = useState('A4');
  const [copies, setCopies] = useState('1');
  const [footerMsg, setFooterMsg] = useState('Thank you for your business!');
  const [autoPrint, setAutoPrint] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showAddr, setShowAddr] = useState(true);
  const [showOutstanding, setShowOutstanding] = useState(true);

  // Customer policy (stored in other_app_settings)
  const [allowCreditSales, setAllowCreditSales] = useState(true);
  const [defaultCreditLimit, setDefaultCreditLimit] = useState('50000');
  const [showCreditBalance, setShowCreditBalance] = useState(true);
  const [requireCustomerForCredit, setRequireCustomerForCredit] = useState(true);

  // Billing switches (stored in other_app_settings)
  const [payCash, setPayCash] = useState(true);
  const [payTransfer, setPayTransfer] = useState(true);
  const [payCard, setPayCard] = useState(false);
  const [saleFull, setSaleFull] = useState(true);
  const [salePartial, setSalePartial] = useState(true);
  const [saleCredit, setSaleCredit] = useState(true);
  const [enableDiscounts, setEnableDiscounts] = useState(true);
  const [maxDiscountPct, setMaxDiscountPct] = useState('20');
  const [cashierCanDiscount, setCashierCanDiscount] = useState(false);
  const [requireDiscountReason, setRequireDiscountReason] = useState(true);

  // Security prefs (stored in other_app_settings)
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');
  const [loginNotif, setLoginNotif] = useState(true);

  // Categories (real CRUD)
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [catFormMode, setCatFormMode] = useState(''); // '' | 'add' | 'edit'
  const [catName, setCatName] = useState('');
  const [catStatus, setCatStatus] = useState('active');
  const [catEditingId, setCatEditingId] = useState('');

  // Units (real CRUD)
  const [unitsList, setUnitsList] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitFormMode, setUnitFormMode] = useState(''); // '' | 'add' | 'edit'
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitStatus, setUnitStatus] = useState('active');
  const [unitEditingId, setUnitEditingId] = useState('');

  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', message: string }

  const showToast = useCallback((type, message, ms = 2800) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  const refreshCategories = useCallback(async () => {
    if (!activeShopId) return;
    setCategoriesLoading(true);
    try {
      const r = await categoriesAPI.getAll();
      setCategories(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load categories';
      showToast('error', msg);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [activeShopId, showToast]);

  const refreshUnits = useCallback(async () => {
    if (!activeShopId) return;
    setUnitsLoading(true);
    try {
      const r = await unitsAPI.getAll();
      setUnitsList(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load units';
      showToast('error', msg);
      setUnitsList([]);
    } finally {
      setUnitsLoading(false);
    }
  }, [activeShopId, showToast]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  /** Load shop name / address / phone from Supabase `shops` (onboarding) — overrides defaults from settings row. */
  const applyShopRowFromSupabase = useCallback(async () => {
    if (!isSupabaseBrowserConfigured() || !supabase || !activeShopId) return;
    try {
      const { data: shopRow, error } = await supabase
        .from('shops')
        .select('name, address, phone, city, currency')
        .eq('id', activeShopId)
        .maybeSingle();
      if (error || !shopRow) return;
      if (shopRow.name) setShopName(shopRow.name);
      setShopAddress(shopRow.address || '');
      setShopPhone(shopRow.phone || '');
      setShopCity(shopRow.city || '');
      setShopCurrency(shopRow.currency || 'PKR');
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
        setShopCity(otherSettings.shop_city || '');
        setShopCurrency(otherSettings.shop_currency || 'PKR');
        setShopEmail(otherSettings.shop_email || '');
        setShopNtn(otherSettings.shop_ntn || '');
        setPaperSize(otherSettings.print_paper_size || 'A4');
        setCopies(String(otherSettings.print_copies || '1'));
        setFooterMsg(otherSettings.print_footer_msg || 'Thank you for your business!');
        setAutoPrint(Boolean(otherSettings.print_auto || false));
        setShowLogo(otherSettings.print_show_logo !== false);
        setShowAddr(otherSettings.print_show_address !== false);
        setShowOutstanding(otherSettings.print_show_outstanding !== false);
        setAllowCreditSales(otherSettings.cust_allow_credit !== false);
        setDefaultCreditLimit(String(otherSettings.cust_default_credit_limit || '50000'));
        setShowCreditBalance(otherSettings.cust_show_credit_balance !== false);
        setRequireCustomerForCredit(otherSettings.cust_require_customer_credit !== false);
        setPayCash(otherSettings.pay_cash !== false);
        setPayTransfer(otherSettings.pay_transfer !== false);
        setPayCard(Boolean(otherSettings.pay_card || false));
        setSaleFull(otherSettings.sale_full !== false);
        setSalePartial(otherSettings.sale_partial !== false);
        setSaleCredit(otherSettings.sale_credit !== false);
        setEnableDiscounts(otherSettings.disc_enable !== false);
        setMaxDiscountPct(String(otherSettings.disc_max_pct ?? '20'));
        setCashierCanDiscount(Boolean(otherSettings.disc_cashier_ok || false));
        setRequireDiscountReason(otherSettings.disc_reason_required !== false);
        setTwoFactor(Boolean(otherSettings.sec_2fa || false));
        setSessionTimeout(otherSettings.sec_session_timeout || '30 minutes');
        setLoginNotif(otherSettings.sec_login_notif !== false);
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

      try {
        const mfa = await authAPI.zbEmailMfaGet();
        if (mfa.data?.success && typeof mfa.data.enabled === 'boolean') {
          setTwoFactor(Boolean(mfa.data.enabled));
        }
      } catch {
        /* No API session yet or route unavailable — keep sec_2fa from shop JSON */
      }

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
        shop_city: shopCity,
        shop_currency: shopCurrency,
        shop_email: shopEmail,
        shop_ntn: shopNtn,
        theme: theme,
        print_paper_size: paperSize,
        print_copies: copies,
        print_footer_msg: footerMsg,
        print_auto: autoPrint,
        print_show_logo: showLogo,
        print_show_address: showAddr,
        print_show_outstanding: showOutstanding,
        cust_allow_credit: allowCreditSales,
        cust_default_credit_limit: defaultCreditLimit,
        cust_show_credit_balance: showCreditBalance,
        cust_require_customer_credit: requireCustomerForCredit,
        pay_cash: payCash,
        pay_transfer: payTransfer,
        pay_card: payCard,
        sale_full: saleFull,
        sale_partial: salePartial,
        sale_credit: saleCredit,
        disc_enable: enableDiscounts,
        disc_max_pct: maxDiscountPct,
        disc_cashier_ok: cashierCanDiscount,
        disc_reason_required: requireDiscountReason,
        sec_2fa: twoFactor,
        sec_session_timeout: sessionTimeout,
        sec_login_notif: loginNotif,
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
            city: shopCity.trim() || null,
            currency: shopCurrency || null,
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
      showToast('success', 'Saved changes.');
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
      showToast('error', errorMessage || 'Save failed.');
    } finally {
      setSaving(false);
      console.log('[Settings] Save operation completed, saving state set to false');
    }
  };

  const handleTestPrint = async () => {
    try {
      if (!selectedPrinter) {
        showToast('error', 'Please select a printer first');
        return;
      }

      // Generate test print content
      const ESC = '\x1B';
      const GS = '\x1D';
      let commands = '';

      commands += `${ESC}@`; // Initialize
      commands += `${ESC}a\x01`; // Center align
      commands += `${ESC}!\x18`; // Double height and width
      commands += 'HISAABKITAB\n';
      commands += `${ESC}!\x00`; // Normal size
      commands += 'POS & Inventory\n';
      commands += '----------------\n\n';
      commands += `${ESC}a\x00`; // Left align
      commands += 'TEST PRINT\n';
      commands += `Date: ${new Date().toLocaleString()}\n`;
      commands += `Shop: ${shopName || 'My Shop'}\n\n`;
      commands += 'This is a test print.\n';
      commands += 'If you can read this, your printer is configured correctly!\n\n';
      commands += `${ESC}a\x01`; // Center align
      commands += 'Thank you!\n\n\n';
      commands += `${GS}V\x41\x03`; // Cut paper

      if (window.electronAPI && window.electronAPI.printRaw) {
        const result = await window.electronAPI.printRaw(selectedPrinter, commands);
        if (result.success) {
          showToast('success', 'Test print sent.');
        } else {
          showToast('error', `Print failed: ${result.error || 'Unknown error'}`);
        }
      } else {
        showToast('info', 'Printer API not available. Opening print dialog...');
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
      showToast('error', `Test print failed: ${err.message}`);
    }
  };

  const displayName = user?.full_name || user?.name || user?.username || 'User';
  const displayEmail = user?.email || profile?.email || '';
  const initials = useMemo(() => {
    const s = String(displayName || '').trim();
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0] || 'U').slice(0, 2).toUpperCase();
  }, [displayName]);

  const isShopAdmin = isAdmin();

  const HomeIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  const PrinterIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    );
  const TagIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  const UnitsIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <line x1="12" y1="20" x2="12" y2="4" />
        <path d="M5 9l7-7 7 7" />
        <line x1="5" y1="20" x2="19" y2="20" />
      </svg>
    );
  const UsersIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  const CustomerIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  const CardIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    );
  const SaleIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  const DiscountIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <circle cx="9" cy="9" r="2" />
        <circle cx="15" cy="15" r="2" />
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    );
  const LockIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  const ShieldIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  const StarIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  const FileIcon = (p) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  const PlusIcon = (p) => (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 5 }} {...p}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  const EditIcon = (p) => (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  const TrashIcon = (p) => (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    );

  if (loading) {
    return (
      <div className="billing-container">
        <PageLoadingCenter message="Loading settings…" />
      </div>
    );
  }

  const canEdit = !readOnly && isShopAdmin;
  const openUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.users || []);
      setShowUsers(true);
    } catch (err) {
      const msg = err.response?.data?.message || t('settings.failedToLoadUsers');
      setError(msg);
      showToast('error', msg);
    }
  };

  const openAuditLogs = async () => {
    try {
      const response = await usersAPI.getAuditLogs({ limit: 50 });
      setAuditLogs(response.data.logs || []);
      setShowAuditLogs(true);
    } catch (err) {
      const msg = err.response?.data?.message || t('settings.failedToLoadLogs');
      setError(msg);
      showToast('error', msg);
    }
  };

  const saveNow = async () => {
    await handleSave();
  };

  return (
    <div className="content-container zb-set">
      <style>{settingsExtraStyles}</style>

      <div className="content">
        <div className="settings-nav">
          <div className="sn-sect">Shop</div>
          <button type="button" className={`sn-item ${activeSection === 'shop-profile' ? 'on' : ''}`} onClick={() => setActiveSection('shop-profile')}>
            <HomeIcon /> Shop Profile
          </button>
          <button type="button" className={`sn-item ${activeSection === 'invoice-print' ? 'on' : ''}`} onClick={() => setActiveSection('invoice-print')}>
            <PrinterIcon /> Invoice &amp; Printing
          </button>

          <div className="sn-sect">Catalogue</div>
          <button
            type="button"
            className={`sn-item ${activeSection === 'categories' ? 'on' : ''}`}
            onClick={() => {
              setActiveSection('categories');
              if (!categoriesLoading && categories.length === 0) refreshCategories();
            }}
          >
            <TagIcon /> Product Categories
          </button>
          <button
            type="button"
            className={`sn-item ${activeSection === 'units' ? 'on' : ''}`}
            onClick={() => {
              setActiveSection('units');
              if (!unitsLoading && unitsList.length === 0) refreshUnits();
            }}
          >
            <UnitsIcon /> Units of Measure
          </button>

          <div className="sn-sect">People</div>
          <button type="button" className={`sn-item ${activeSection === 'users' ? 'on' : ''}`} onClick={() => { setActiveSection('users'); if (!showUsers) openUsers(); }}>
            <UsersIcon /> Users &amp; Roles
          </button>
          <button type="button" className={`sn-item ${activeSection === 'customers-cfg' ? 'on' : ''}`} onClick={() => setActiveSection('customers-cfg')}>
            <CustomerIcon /> Customers
          </button>

          <div className="sn-sect">Billing</div>
          <button type="button" className={`sn-item ${activeSection === 'payment-methods' ? 'on' : ''}`} onClick={() => setActiveSection('payment-methods')}>
            <CardIcon /> Payment Methods
          </button>
          <button type="button" className={`sn-item ${activeSection === 'sale-types' ? 'on' : ''}`} onClick={() => setActiveSection('sale-types')}>
            <SaleIcon /> Sale Types
          </button>
          <button type="button" className={`sn-item ${activeSection === 'discounts' ? 'on' : ''}`} onClick={() => setActiveSection('discounts')}>
            <DiscountIcon /> Discount Settings
          </button>

          <div className="sn-sect">Security</div>
          <button type="button" className={`sn-item ${activeSection === 'password' ? 'on' : ''}`} onClick={() => setActiveSection('password')}>
            <LockIcon /> Change Password
          </button>
          <button type="button" className={`sn-item ${activeSection === 'security' ? 'on' : ''}`} onClick={() => { setActiveSection('security'); if (!showAuditLogs && isShopAdmin && canUsePremiumFeatures(profile?.plan)) openAuditLogs(); }}>
            <ShieldIcon /> Security
          </button>

          <div className="sn-sect">Subscription</div>
          <button type="button" className={`sn-item ${activeSection === 'plan' ? 'on' : ''}`} onClick={() => setActiveSection('plan')}>
            <StarIcon /> Current Plan
          </button>
          <button type="button" className={`sn-item ${activeSection === 'billing-history' ? 'on' : ''}`} onClick={() => setActiveSection('billing-history')}>
            <FileIcon /> Billing History
          </button>
        </div>

        <div className="settings-body">
          {/* SHOP PROFILE */}
          <div className={`section ${activeSection === 'shop-profile' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Shop Profile</div>
              <div className="section-sub">Manage your shop&apos;s public information and contact details</div>
            </div>

            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Basic Information</div>
                <div className="scard-sub">Your shop name and contact details shown on invoices and receipts</div>
              </div>

              <div className="srow">
                <div>
                  <div className="srow-label">Shop Name</div>
                  <div className="srow-desc">Displayed on invoices, receipts and reports</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={shopName} onChange={(e) => setShopName(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Shop Address</div>
                  <div className="srow-desc">Physical address shown on invoices</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">City</div>
                  <div className="srow-desc">City where the shop is located</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={shopCity} onChange={(e) => setShopCity(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Phone Number</div>
                  <div className="srow-desc">Contact number for customers</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} disabled={!canEdit} />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Email Address</div>
                  <div className="srow-desc">Business email for correspondence</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={shopEmail} onChange={(e) => setShopEmail(e.target.value)} placeholder="shop@example.com" disabled={!canEdit} />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">
                    NTN / Tax Number <span style={{ color: '#b0aca4', fontWeight: 500 }}>(optional)</span>
                  </div>
                  <div className="srow-desc">National Tax Number shown on formal invoices</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={shopNtn} onChange={(e) => setShopNtn(e.target.value)} placeholder="e.g. 1234567-8" disabled={!canEdit} />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Currency</div>
                  <div className="srow-desc">Primary currency used for all transactions</div>
                </div>
                <div className="srow-ctrl">
                  <select className="inp inp-sm" value={shopCurrency} onChange={(e) => setShopCurrency(e.target.value)} disabled={!canEdit}>
                    <option value="PKR">PKR — Pakistani Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="INR">INR — Indian Rupee</option>
                  </select>
                </div>
              </div>

              <div className="scard-ft">
                <button type="button" className="btn-cancel" onClick={() => fetchSettings()} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Shop Logo</div>
                <div className="scard-sub">Upload your logo to appear on invoices and receipts</div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Logo Image</div>
                  <div className="srow-desc">PNG or JPG, recommended 200×200px</div>
                </div>
                <div className="srow-ctrl" style={{ gap: 12, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: '#eef2ff', border: '1.5px dashed #a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <button type="button" className="btn-outline" onClick={() => showToast('info', 'Logo upload coming soon.')}>
                    Upload Logo
                  </button>
                </div>
              </div>
              <div className="scard-ft">
                <button type="button" className="btn-save" onClick={() => showToast('success', 'Logo settings saved.')} disabled={!canEdit}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* INVOICE & PRINTING */}
          <div className={`section ${activeSection === 'invoice-print' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Invoice &amp; Printing</div>
              <div className="section-sub">Configure how your invoices and receipts are generated and printed</div>
            </div>

            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Paper &amp; Format</div>
                <div className="scard-sub">Choose the paper size and printer type</div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Paper Size</div>
                  <div className="srow-desc">Size of paper used for printing receipts</div>
                </div>
                <div className="srow-ctrl">
                  <select className="inp inp-sm" value={paperSize} onChange={(e) => setPaperSize(e.target.value)} disabled={!canEdit}>
                    <option value="Thermal (80mm)">Thermal (80mm)</option>
                    <option value="Thermal (58mm)">Thermal (58mm)</option>
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                  </select>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Number of Copies</div>
                  <div className="srow-desc">How many copies to print per invoice</div>
                </div>
                <div className="srow-ctrl">
                  <select className="inp inp-xs" value={copies} onChange={(e) => setCopies(e.target.value)} disabled={!canEdit}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Invoice Footer Message</div>
                  <div className="srow-desc">Custom text at the bottom of each invoice</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" value={footerMsg} onChange={(e) => setFooterMsg(e.target.value)} disabled={!canEdit} />
                </div>
              </div>

              {!readOnly ? (
                <div className="srow">
                  <div>
                    <div className="srow-label">Printer</div>
                    <div className="srow-desc">Select your thermal printer for one-click printing</div>
                  </div>
                  <div className="srow-ctrl">
                    <select className="inp inp-sm" value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)} disabled={!canEdit}>
                      <option value="">Select printer…</option>
                      {printers.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="scard-ft">
                <button type="button" className="btn-outline" onClick={handleTestPrint} disabled={!selectedPrinter}>
                  Test Print
                </button>
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Invoice Display Options</div>
                <div className="scard-sub">Control what information appears on printed invoices</div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Auto-Print on Sale</div>
                  <div className="srow-desc">Automatically print receipt when a sale is completed</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Show Shop Logo</div>
                  <div className="srow-desc">Display your logo at the top of the invoice</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Show Shop Address</div>
                  <div className="srow-desc">Include the shop address on the invoice</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={showAddr} onChange={(e) => setShowAddr(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Show Outstanding Balance</div>
                  <div className="srow-desc">Display remaining balance due on partial payment invoices</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={showOutstanding} onChange={(e) => setShowOutstanding(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="scard-ft">
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORIES */}
          <div className={`section ${activeSection === 'categories' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Product Categories</div>
              <div className="section-sub">Organise your products into categories for better management</div>
            </div>
            <div className="scard">
              <div className="scard-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="scard-title">Categories</div>
                  <div className="scard-sub">
                    {categoriesLoading ? 'Loading…' : `${categories.length} categories configured`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="btn-outline" onClick={refreshCategories} disabled={categoriesLoading}>
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="btn-indigo"
                    onClick={() => {
                      if (!canEdit) return;
                      setCatFormMode('add');
                      setCatEditingId('');
                      setCatName('');
                      setCatStatus('active');
                    }}
                    disabled={!canEdit}
                  >
                    <PlusIcon /> Add Category
                  </button>
                </div>
              </div>

              {catFormMode ? (
                <div className="srow">
                  <div>
                    <div className="srow-label">{catFormMode === 'add' ? 'Add Category' : 'Edit Category'}</div>
                    <div className="srow-desc">Changes will reflect in product forms immediately.</div>
                  </div>
                  <div className="srow-ctrl" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <input
                      className="inp inp-sm"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Electrical Fittings"
                      disabled={!canEdit}
                    />
                    <select className="inp inp-xs" value={catStatus} onChange={(e) => setCatStatus(e.target.value)} disabled={!canEdit}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button
                      type="button"
                      className="btn-save"
                      disabled={!canEdit || !catName.trim()}
                      onClick={async () => {
                        try {
                          if (catFormMode === 'add') {
                            await categoriesAPI.create({ category_name: catName.trim(), status: catStatus });
                            showToast('success', 'Category added.');
                          } else {
                            await categoriesAPI.update(catEditingId, { category_name: catName.trim(), status: catStatus });
                            showToast('success', 'Category updated.');
                          }
                          setCatFormMode('');
                          setCatEditingId('');
                          setCatName('');
                          setCatStatus('active');
                          await refreshCategories();
                          try {
                            queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
                          } catch {
                            /* ignore */
                          }
                        } catch (err) {
                          const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Save failed';
                          showToast('error', msg);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setCatFormMode('');
                        setCatEditingId('');
                        setCatName('');
                        setCatStatus('active');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {(categories || []).map((c) => {
                const isGeneral = String(c.category_name || '').toLowerCase() === 'general';
                const isActive = String(c.status || 'active').toLowerCase() !== 'inactive';
                return (
                  <div className="list-item" key={c.category_id}>
                    <div className="list-item-left">
                      <div className="list-item-icon">
                        <TagIcon style={{ width: 14, height: 14, color: '#4f46e5' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="list-item-name">{c.category_name}</div>
                        <div className="list-item-sub">{Number(c.sub_category_count || 0)} sub-categories</div>
                      </div>
                    </div>
                    <div className="list-item-acts">
                      <span className={`badge ${isActive ? 'bg-green' : 'bg-amber'}`}>{isActive ? 'Active' : 'Inactive'}</span>
                      <button
                        type="button"
                        className="la"
                        onClick={() => {
                          if (!canEdit) return;
                          setCatFormMode('edit');
                          setCatEditingId(String(c.category_id));
                          setCatName(String(c.category_name || ''));
                          setCatStatus(String(c.status || 'active'));
                        }}
                        disabled={!canEdit || isGeneral}
                        title={isGeneral ? 'General cannot be edited' : 'Edit'}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="la del"
                        onClick={async () => {
                          if (!canEdit) return;
                          if (isGeneral) return;
                          if (!window.confirm(`Delete category "${c.category_name}"? Products will be moved to General.`)) return;
                          try {
                            await categoriesAPI.delete(c.category_id);
                            showToast('success', 'Category deleted.');
                            await refreshCategories();
                            try {
                              queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
                            } catch {
                              /* ignore */
                            }
                          } catch (err) {
                            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Delete failed';
                            showToast('error', msg);
                          }
                        }}
                        disabled={!canEdit || isGeneral}
                        title={isGeneral ? 'General cannot be deleted' : 'Delete'}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UNITS */}
          <div className={`section ${activeSection === 'units' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Units of Measure</div>
              <div className="section-sub">Define the units used when listing and selling products</div>
            </div>
            <div className="scard">
              <div className="scard-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="scard-title">Available Units</div>
                  <div className="scard-sub">{unitsLoading ? 'Loading…' : `${unitsList.length} units configured`}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="btn-outline" onClick={refreshUnits} disabled={unitsLoading}>
                    Refresh
                  </button>
                  <button
                    type="button"
                    className="btn-indigo"
                    onClick={() => {
                      if (!canEdit) return;
                      setUnitFormMode('add');
                      setUnitEditingId('');
                      setUnitCode('');
                      setUnitName('');
                      setUnitStatus('active');
                    }}
                    disabled={!canEdit}
                  >
                    <PlusIcon /> Add Unit
                  </button>
                </div>
              </div>

              {unitFormMode ? (
                <div className="srow">
                  <div>
                    <div className="srow-label">{unitFormMode === 'add' ? 'Add Unit' : 'Edit Unit'}</div>
                    <div className="srow-desc">Units appear in product add/edit dropdown.</div>
                  </div>
                  <div className="srow-ctrl" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <input
                      className="inp inp-xs"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      placeholder="code (e.g. pcs)"
                      disabled={!canEdit}
                    />
                    <input
                      className="inp inp-sm"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      placeholder="name (e.g. Pieces)"
                      disabled={!canEdit}
                    />
                    <select className="inp inp-xs" value={unitStatus} onChange={(e) => setUnitStatus(e.target.value)} disabled={!canEdit}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button
                      type="button"
                      className="btn-save"
                      disabled={!canEdit || !unitCode.trim() || !unitName.trim()}
                      onClick={async () => {
                        try {
                          if (unitFormMode === 'add') {
                            await unitsAPI.create({ unit_code: unitCode.trim(), unit_name: unitName.trim(), status: unitStatus });
                            showToast('success', 'Unit added.');
                          } else {
                            await unitsAPI.update(unitEditingId, {
                              unit_code: unitCode.trim(),
                              unit_name: unitName.trim(),
                              status: unitStatus,
                            });
                            showToast('success', 'Unit updated.');
                          }
                          setUnitFormMode('');
                          setUnitEditingId('');
                          setUnitCode('');
                          setUnitName('');
                          setUnitStatus('active');
                          await refreshUnits();
                        } catch (err) {
                          const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Save failed';
                          showToast('error', msg);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setUnitFormMode('');
                        setUnitEditingId('');
                        setUnitCode('');
                        setUnitName('');
                        setUnitStatus('active');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {(unitsList || []).map((u) => {
                const active = String(u.status || 'active').toLowerCase() !== 'inactive';
                return (
                  <div className="list-item" key={u.unit_id}>
                    <div className="list-item-left">
                      <div className="list-item-icon">
                        <UnitsIcon style={{ width: 14, height: 14, color: '#4f46e5' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="list-item-name">
                          {u.unit_name} <span style={{ color: '#9c9890', fontWeight: 700 }}>({u.unit_code})</span>
                        </div>
                        <div className="list-item-sub">{active ? 'Active' : 'Inactive'}</div>
                      </div>
                    </div>
                    <div className="list-item-acts">
                      <span className={`badge ${active ? 'bg-green' : 'bg-amber'}`}>{active ? 'Active' : 'Inactive'}</span>
                      <button
                        type="button"
                        className="la"
                        onClick={() => {
                          if (!canEdit) return;
                          setUnitFormMode('edit');
                          setUnitEditingId(String(u.unit_id));
                          setUnitCode(String(u.unit_code || ''));
                          setUnitName(String(u.unit_name || ''));
                          setUnitStatus(String(u.status || 'active'));
                        }}
                        disabled={!canEdit}
                        title="Edit"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="la del"
                        onClick={async () => {
                          if (!canEdit) return;
                          if (!window.confirm(`Delete unit "${u.unit_name} (${u.unit_code})"?`)) return;
                          try {
                            await unitsAPI.delete(u.unit_id);
                            showToast('success', 'Unit deleted.');
                            await refreshUnits();
                          } catch (err) {
                            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Delete failed';
                            showToast('error', msg);
                          }
                        }}
                        disabled={!canEdit}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* USERS */}
          <div className={`section ${activeSection === 'users' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Users &amp; Roles</div>
              <div className="section-sub">Manage who has access to your shop and their permissions</div>
            </div>
            <div className="scard">
              <div className="scard-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="scard-title">Team Members</div>
                  <div className="scard-sub">{users?.length || 0} active users</div>
                </div>
                <button type="button" className="btn-indigo" onClick={() => showToast('info', 'Invite user coming soon.')} disabled={!canEdit}>
                  <PlusIcon /> Invite User
                </button>
              </div>

              <div className="user-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="user-av">{initials}</div>
                  <div>
                    <div className="user-name">{displayName}</div>
                    <div className="user-email">{displayEmail}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge bg-indigo">{isShopAdmin ? 'Owner / Admin' : 'Staff'}</span>
                  <span style={{ fontSize: 12, color: '#9c9890' }}>You</span>
                </div>
              </div>

              {(users || []).map((u) => (
                <div className="user-row" key={u.user_id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="user-av" style={{ background: '#059669' }}>
                      {(String(u.name || u.username || 'U').trim().slice(0, 2) || 'U').toUpperCase()}
                    </div>
                    <div>
                      <div className="user-name">{u.name || u.username}</div>
                      <div className="user-email">{u.username}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <select className="inp" style={{ padding: '5px 10px', fontSize: 12.5, borderRadius: 7, width: 'auto' }} disabled>
                      <option>{String(u.role || 'Cashier')}</option>
                    </select>
                    <button type="button" className="la del" onClick={() => showToast('info', 'Role management coming soon.')} disabled>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}

              <div className="scard-ft">
                <button type="button" className="btn-outline" onClick={openUsers}>
                  Refresh
                </button>
                <button type="button" className="btn-save" onClick={() => showToast('success', 'Role changes saved.')} disabled>
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* CUSTOMER SETTINGS */}
          <div className={`section ${activeSection === 'customers-cfg' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Customer Settings</div>
              <div className="section-sub">Configure default customer behaviour and credit policies</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Credit Policy</div>
                <div className="scard-sub">Control how credit sales work for your customers</div>
              </div>
              {[
                {
                  label: 'Allow Credit Sales',
                  desc: 'Enable selling on credit to customers',
                  val: allowCreditSales,
                  set: setAllowCreditSales,
                },
              ].map((row) => (
                <div className="srow" key={row.label}>
                  <div>
                    <div className="srow-label">{row.label}</div>
                    <div className="srow-desc">{row.desc}</div>
                  </div>
                  <div className="srow-ctrl">
                    <label className="toggle">
                      <input type="checkbox" checked={row.val} onChange={(e) => row.set(e.target.checked)} disabled={!canEdit} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
                </div>
              ))}
              <div className="srow">
                <div>
                  <div className="srow-label">Default Credit Limit</div>
                  <div className="srow-desc">Maximum credit allowed per customer by default</div>
                </div>
                <div className="srow-ctrl">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#6b6760' }}>PKR</span>
                    <input className="inp inp-xs" type="number" value={defaultCreditLimit} onChange={(e) => setDefaultCreditLimit(e.target.value)} disabled={!canEdit} />
                  </div>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Show Credit Balance on Invoice</div>
                  <div className="srow-desc">Display outstanding balance on customer&apos;s invoice</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={showCreditBalance} onChange={(e) => setShowCreditBalance(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Require Customer for Credit Sales</div>
                  <div className="srow-desc">Force selection of a registered customer for credit transactions</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={requireCustomerForCredit} onChange={(e) => setRequireCustomerForCredit(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="scard-ft">
                <button type="button" className="btn-cancel" onClick={() => fetchSettings()} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* PAYMENT METHODS */}
          <div className={`section ${activeSection === 'payment-methods' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Payment Methods</div>
              <div className="section-sub">Enable or disable the payment methods available at checkout</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Accepted Payments</div>
                <div className="scard-sub">Toggle which payment methods are active in your POS</div>
              </div>
              {[
                { label: 'Cash', desc: 'Accept physical cash payments at the counter', val: payCash, set: setPayCash },
                { label: 'Transfer', desc: 'Bank transfer, JazzCash, EasyPaisa — all digital payments', val: payTransfer, set: setPayTransfer },
                { label: 'Card Payment', desc: 'Accept debit or credit card payments', val: payCard, set: setPayCard },
              ].map((row) => (
                <div className="srow" key={row.label}>
                  <div>
                    <div className="srow-label">{row.label}</div>
                    <div className="srow-desc">{row.desc}</div>
                  </div>
                  <div className="srow-ctrl">
                    <label className="toggle">
                      <input type="checkbox" checked={row.val} onChange={(e) => row.set(e.target.checked)} disabled={!canEdit} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
                </div>
              ))}
              <div className="scard-ft">
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* SALE TYPES */}
          <div className={`section ${activeSection === 'sale-types' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Sale Types</div>
              <div className="section-sub">Control which types of sales are permitted in your shop</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Permitted Sale Types</div>
                <div className="scard-sub">Enable or disable sale transaction types at checkout</div>
              </div>
              {[
                { label: 'Full Payment', desc: 'Customer pays the full amount at time of sale', val: saleFull, set: setSaleFull },
                { label: 'Partial Payment', desc: 'Customer pays a portion now, rest is recorded as balance', val: salePartial, set: setSalePartial },
                { label: 'Full Credit', desc: 'Entire sale amount is recorded as outstanding balance', val: saleCredit, set: setSaleCredit },
              ].map((row) => (
                <div className="srow" key={row.label}>
                  <div>
                    <div className="srow-label">{row.label}</div>
                    <div className="srow-desc">{row.desc}</div>
                  </div>
                  <div className="srow-ctrl">
                    <label className="toggle">
                      <input type="checkbox" checked={row.val} onChange={(e) => row.set(e.target.checked)} disabled={!canEdit} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
                </div>
              ))}
              <div className="scard-ft">
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* DISCOUNTS */}
          <div className={`section ${activeSection === 'discounts' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Discount Settings</div>
              <div className="section-sub">Configure discount rules and permissions for your team</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Discount Rules</div>
                <div className="scard-sub">Set limits on how discounts can be applied at checkout</div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Enable Discounts</div>
                  <div className="srow-desc">Allow discounts to be applied during sales</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={enableDiscounts} onChange={(e) => setEnableDiscounts(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Maximum Discount (%)</div>
                  <div className="srow-desc">Highest discount percentage any user can apply</div>
                </div>
                <div className="srow-ctrl">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input className="inp inp-xs" type="number" value={maxDiscountPct} onChange={(e) => setMaxDiscountPct(e.target.value)} disabled={!canEdit} />
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#6b6760' }}>%</span>
                  </div>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Cashier Can Give Discount</div>
                  <div className="srow-desc">Allow cashiers to apply discounts without manager approval</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={cashierCanDiscount} onChange={(e) => setCashierCanDiscount(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Require Reason for Discount</div>
                  <div className="srow-desc">Make users enter a reason when applying any discount</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={requireDiscountReason} onChange={(e) => setRequireDiscountReason(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="scard-ft">
                <button type="button" className="btn-cancel" onClick={() => fetchSettings()} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* PASSWORD */}
          <div className={`section ${activeSection === 'password' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Change Password</div>
              <div className="section-sub">Update your account password to keep your account secure</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Update Password</div>
                <div className="scard-sub">Choose a strong password with at least 8 characters</div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Current Password</div>
                  <div className="srow-desc">Enter your existing password to verify identity</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">New Password</div>
                  <div className="srow-desc">Choose a strong new password</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Confirm New Password</div>
                  <div className="srow-desc">Re-enter your new password to confirm</div>
                </div>
                <div className="srow-ctrl">
                  <input className="inp inp-sm" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <div className="scard-ft">
                <button
                  type="button"
                  className="btn-save"
                  onClick={async () => {
                    if (!currentPassword || !newPassword) {
                      const msg = t('settings.passwordRequired');
                      setError(msg);
                      showToast('error', msg);
                      return;
                    }
                    if (newPassword !== confirmNewPassword) {
                      const msg = t('settings.passwordsDoNotMatch');
                      setError(msg);
                      showToast('error', msg);
                      return;
                    }
                    try {
                      setChangingPassword(true);
                      setError(null);
                      await authAPI.changePassword({ currentPassword, newPassword });
                      setSuccess(t('settings.passwordChanged'));
                      showToast('success', 'Password updated.');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    } catch (err) {
                      const msg = err.response?.data?.message || t('settings.passwordChangeFailed');
                      setError(msg);
                      showToast('error', msg);
                    } finally {
                      setChangingPassword(false);
                    }
                  }}
                  disabled={changingPassword}
                >
                  {changingPassword ? t('settings.changing') : 'Update Password'}
                </button>
              </div>
            </div>
          </div>

          {/* SECURITY */}
          <div className={`section ${activeSection === 'security' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Security</div>
              <div className="section-sub">Manage authentication and session security settings</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Authentication</div>
                <div className="scard-sub">Control how users access your account</div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Two-Factor Authentication</div>
                  <div className="srow-desc">Add an extra layer of security with OTP verification on login</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={async (evt) => {
                        if (!canEdit) return;
                        const next = evt.target.checked;
                        setTwoFactor(next);
                        try {
                          await authAPI.zbEmailMfaPut({ enabled: next });
                          setSuccess(next ? 'Two-factor email enabled for your account.' : 'Two-factor email disabled.');
                          setTimeout(() => setSuccess(null), 3000);
                        } catch (err) {
                          setTwoFactor(!next);
                          const msg =
                            err.response?.data?.error ||
                            err.response?.data?.message ||
                            err.message ||
                            'Could not update two-factor setting';
                          setError(msg);
                        }
                      }}
                      disabled={!canEdit}
                    />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Session Timeout</div>
                  <div className="srow-desc">Automatically log out after a period of inactivity</div>
                </div>
                <div className="srow-ctrl">
                  <select className="inp inp-sm" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} disabled={!canEdit}>
                    <option>Never</option>
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                  </select>
                </div>
              </div>
              <div className="srow">
                <div>
                  <div className="srow-label">Login Notification</div>
                  <div className="srow-desc">Get notified by email when someone logs in to your account</div>
                </div>
                <div className="srow-ctrl">
                  <label className="toggle">
                    <input type="checkbox" checked={loginNotif} onChange={(e) => setLoginNotif(e.target.checked)} disabled={!canEdit} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              </div>
              <div className="scard-ft">
                <button type="button" className="btn-save" onClick={saveNow} disabled={!canEdit || saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="danger-card">
              <div className="danger-hd">
                <div className="danger-title">Danger Zone</div>
                <div className="danger-sub">These actions are irreversible. Proceed with caution.</div>
              </div>
              <div className="danger-row">
                <div>
                  <div className="danger-row-label">Log Out All Sessions</div>
                  <div className="danger-row-desc">Terminate all active sessions across all devices immediately</div>
                </div>
                <button type="button" className="btn-danger" onClick={() => showToast('info', 'Coming soon.')} disabled>
                  Log Out All
                </button>
              </div>
            </div>

            {isShopAdmin && canUsePremiumFeatures(profile?.plan) && showAuditLogs && (
              <div className="scard" style={{ marginTop: 16 }}>
                <div className="scard-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="scard-title">Audit Logs</div>
                    <div className="scard-sub">Last 50 actions</div>
                  </div>
                  <button type="button" className="btn-outline" onClick={openAuditLogs}>
                    Refresh
                  </button>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  <table className="bill-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Table</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(auditLogs || []).map((log) => (
                        <tr key={log.log_id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td>{log.username || 'System'}</td>
                          <td>{log.action}</td>
                          <td>{log.table_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* PLAN */}
          <div className={`section ${activeSection === 'plan' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Current Plan</div>
              <div className="section-sub">Your active subscription and usage details</div>
            </div>
            <div className="scard">
              <div className="scard-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="scard-title">{String(profile?.plan || 'Trial').replace(/[_-]+/g, ' ') || 'Trial'} Plan</div>
                  <div className="scard-sub">Subscription details</div>
                </div>
                <span className="badge bg-green" style={{ fontSize: 12.5, padding: '5px 14px' }}>
                  Active
                </span>
              </div>
              <div style={{ padding: '18px 24px', color: '#6b6760', fontSize: 13 }}>
                Plan UI is ready — billing/upgrade flow will be wired to Stripe screens.
              </div>
              <div className="scard-ft" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, color: '#9c9890' }}>Need more shops or users?</span>
                <button type="button" className="btn-indigo" onClick={() => showToast('info', 'Upgrade flow coming soon.')}>
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>

          {/* BILLING HISTORY */}
          <div className={`section ${activeSection === 'billing-history' ? 'on' : ''}`}>
            <div className="section-hd">
              <div className="section-title">Billing History</div>
              <div className="section-sub">View and download past invoices and payment records</div>
            </div>
            <div className="scard">
              <div className="scard-hd">
                <div className="scard-title">Payment Records</div>
                <div className="scard-sub">All subscription payments for your account</div>
              </div>
              <table className="bill-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Plan</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 900, color: '#4f46e5' }}>INV-2026-05</td>
                    <td>Starter Plan</td>
                    <td style={{ color: '#6b6760' }}>May 1, 2026</td>
                    <td style={{ fontWeight: 900 }}>$9.00</td>
                    <td>
                      <span className="badge bg-green">Paid</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn-outline" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => showToast('info', 'Download coming soon.')}>
                        Download
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* toast + existing error/success (optional) */}
          {toast ? (
            <div className="tw">
              <div className={`toast show`}>
                <div className="t-dot" style={{ background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#4f46e5' }} />
                {toast.message}
              </div>
            </div>
          ) : null}

          {error ? <div style={{ marginTop: 14, color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
          {success ? <div style={{ marginTop: 8, color: '#15803d', fontSize: 13, fontWeight: 700 }}>{success}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default Settings;
