import axios from 'axios';
import { getServerUrl } from '../utils/connectionStatus';

// Use dynamic server URL for LAN support
const API_BASE_URL = getServerUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add device ID to all requests
api.interceptors.request.use((config) => {
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  const isUrlParams = typeof URLSearchParams !== 'undefined' && config.data instanceof URLSearchParams;
  if (config.data != null && !isFormData && !isUrlParams && typeof config.data !== 'string') {
    config.headers['Content-Type'] = 'application/json';
  }

  const deviceId = localStorage.getItem('deviceId') || 'unknown';
  config.headers['x-device-id'] = deviceId;

  // Express/HisaabKitab session (LAN desktop). Zentrya Supabase login does not set this.
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  config._zbHadBackendSession = !!sessionId;

  const shopId = sessionStorage.getItem('zb_active_shop_id');
  if (shopId) {
    config.headers['x-shop-id'] = shopId;
  }

  return config;
});

// Add response interceptor to handle read-only errors
// CRITICAL: Prevent infinite redirect loops
let isRedirecting = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect when a backend session was sent but rejected (expired/invalid).
      // Supabase-only users have no sessionId — API 401 must not force /login or we get an infinite loop
      // (React still sees zb_simple_* session → /shops → /app → 401 → /login → …).
      const hadBackendSession = error.config?._zbHadBackendSession === true;
      if (
        hadBackendSession &&
        !isRedirecting &&
        window.location.pathname !== '/login'
      ) {
        isRedirecting = true;
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    if (error.response?.data?.readOnly) {
      console.warn('Read-only mode: Operation blocked');
    }
    return Promise.reject(error);
  }
);

// Products API
export const productsAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  getActivity: (id) => api.get(`/products/${id}/activity`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Suppliers API
export const suppliersAPI = {
  getAll: () => api.get('/suppliers'),
  getById: (id) => api.get(`/suppliers/${id}`),
  getLedger: (id) => api.get(`/suppliers/${id}/ledger`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Supplier Payments API
export const supplierPaymentsAPI = {
  getAll: (params) => api.get('/supplier-payments', { params }),
  getById: (id) => api.get(`/supplier-payments/${id}`),
  create: (data) => api.post('/supplier-payments', data),
  update: (id, data) => api.put(`/supplier-payments/${id}`, data),
  delete: (id) => api.delete(`/supplier-payments/${id}`),
};

// Sales API
export const salesAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
  print: (id) => api.get(`/sales/${id}/print`),
};

// Reports API
export const reportsAPI = {
  getComprehensive: (period, productId, supplierId, startDate = null, endDate = null) => {
    let url = `/reports/comprehensive?period=${period}`;
    if (productId) url += `&productId=${productId}`;
    if (supplierId) url += `&supplierId=${supplierId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    return api.get(url);
  },
  getProducts: () => api.get('/reports/products'),
  getSuppliers: () => api.get('/reports/suppliers'),
  getStock: () => api.get('/reports/stock'),
  getCustomersOutstanding: () => api.get('/reports/customers-outstanding'),
  getSuppliersPayable: () => api.get('/reports/suppliers-payable'),
  getCustomersDue: (params) => api.get('/reports/customers-due', { params }),
  // New endpoints
  getDashboardSummary: (params) => api.get('/reports/dashboard-summary', { params }),
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getSalesInvoices: (params) => api.get('/reports/sales-invoices', { params }),
  getCustomersAnalytics: (params) => api.get('/reports/customers-analytics', { params }),
  getSuppliersAnalytics: (params) => api.get('/reports/suppliers-analytics', { params }),
  getSalesByProduct: (params) => api.get('/reports/sales-by-product', { params }),
  getProfit: (params) => api.get('/reports/profit', { params }),
  getExpensesSummary: (params) => api.get('/reports/expenses-summary', { params }),
  getExpensesList: (params) => api.get('/reports/expenses-list', { params }),
  getStockCurrent: () => api.get('/reports/stock-current'),
  getStockLow: (params) => api.get('/reports/stock-low', { params }),
  getCustomerStatement: (id, params) => api.get(`/reports/customer-statement/${id}`, { params }),
  getSupplierHistory: (id, params) => api.get(`/reports/supplier-history/${id}`, { params }),
  getDashboard: () => api.get('/reports/dashboard'),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Customers API
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  getHistory: (id) => api.get(`/customers/${id}/history`),
  getLedger: (id) => api.get(`/customers/${id}/ledger`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  // Sub-categories
  getSubCategoriesAll: () => api.get('/categories/sub-categories/all'),
  createSubCategory: (data) => api.post('/categories/sub-categories', data),
  updateSubCategory: (id, data) => api.put(`/categories/sub-categories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/categories/sub-categories/${id}`),
};

// Units of Measure API
export const unitsAPI = {
  getAll: () => api.get('/units'),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// Purchases API
export const purchasesAPI = {
  getAll: () => api.get('/purchases'),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  update: (id, data) => api.put(`/purchases/${id}`, data),
  delete: (id) => api.delete(`/purchases/${id}`),
};

// Expenses API
export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
  getMonthly: () => api.get('/expenses/monthly'),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Customer Payments API
export const customerPaymentsAPI = {
  getAll: (params) => api.get('/customer-payments', { params }),
  getById: (id) => api.get(`/customer-payments/${id}`),
  create: (data) => api.post('/customer-payments', data),
  update: (id, data) => api.put(`/customer-payments/${id}`, data),
  delete: (id) => api.delete(`/customer-payments/${id}`),
};

// Backup API
export const backupAPI = {
  create: () => api.post('/backup/create'),
  list: () => api.get('/backup/list'),
  status: () => api.get('/backup/status'),
  restore: (filename = null) => api.post('/backup/restore', { filename }),
  updateSettings: (settings) => api.put('/backup/settings', settings),
};

// Setup API
export const setupAPI = {
  check: () => api.get('/setup-auth/check-first-time'),
  migrate: () => api.post('/setup/migrate'),
  createAdmin: (data) => api.post('/setup-auth/create-admin', data),
};

// Authentication API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  /** Email OTP signup (backend + Microsoft Graph or SMTP) */
  zbSignupWithOtp: (data) => api.post('/auth/zb-signup-with-otp', data),
  /** Forgot password: OTP + new password (zb_simple_users + users) */
  zbResetPasswordAfterOtp: (data) => api.post('/auth/zb-reset-password-after-otp', data),
  /** Logged-in Zentrya user: current + new password (zb_simple_users + users) — requires API `DATABASE_URL` */
  zbChangePassword: (data) => api.post('/auth/zb-change-password', data),
  /** Completes MFA login — no session cookie required */
  zbSimpleSessionVerifyOtp: (data) => api.post('/auth/zb-simple-session/verify-otp', data),
  /** Email OTP MFA flag on zb_simple_users (requires POS API session + x-shop-id irrelevant) */
  zbEmailMfaGet: () => api.get('/auth/zb-email-mfa'),
  zbEmailMfaPut: (body) => api.put('/auth/zb-email-mfa', body),
  getStaffInvite: (token) => api.get(`/auth/staff-invite/${encodeURIComponent(token)}`),
  rejectStaffInvite: (token) => api.post(`/auth/staff-invite/${encodeURIComponent(token)}/reject`),
  acceptStaffInvite: (token, data) => api.post(`/auth/staff-invite/${encodeURIComponent(token)}/accept`, data),
  acceptStaffInviteExisting: (token) => api.post(`/auth/staff-invite/${encodeURIComponent(token)}/accept-existing`),
};

export const otpAPI = {
  request: (body) => api.post('/otp/request', body),
  verify: (body) => api.post('/otp/verify', body),
};

/** Stripe subscription checkout + customer portal (`backend/routes/billing.js`) */
export const billingAPI = {
  createCheckoutSession: (body) => api.post('/billing/create-checkout-session', body),
  createPortalSession: (body) => api.post('/billing/create-portal-session', body),
};

/** Shop picker (multi-shop stats) */
export const shopPickerAPI = {
  quickStats: (shopIds) => api.post('/shop-picker/quick-stats', { shopIds }),
};

// Users API (Admin only)
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  sendInvitation: (data) => api.post('/users/invitations', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getAuditLogs: (params) => api.get('/users/audit-logs', { params }),
  generatePassword: (id) => api.post(`/users/${id}/generate-password`),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export default api;
