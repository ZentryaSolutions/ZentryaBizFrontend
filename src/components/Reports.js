import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { reportsAPI, customersAPI, productsAPI, suppliersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canUseProFeatures } from '../utils/planFeatures';
import './Reports.css';

/** Calendar YYYY-MM-DD in the user's local timezone (avoid UTC shift from toISOString) */
function formatLocalYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Reports = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const proOk = canUseProFeatures(profile?.plan);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterType, setFilterType] = useState('monthly');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState('');
  
  // Sub-tabs for combined tabs
  const [salesSubTab, setSalesSubTab] = useState('summary'); // 'summary' or 'by-product'
  const [customerSubTab, setCustomerSubTab] = useState('due-list'); // 'due-list' or 'history'
  const [supplierSubTab, setSupplierSubTab] = useState('payables'); // 'payables' or 'history'
  const [expenseSubTab, setExpenseSubTab] = useState('summary'); // 'summary' or 'list'
  const [startDate, setStartDate] = useState(() => formatLocalYmd());
  const [endDate, setEndDate] = useState(() => formatLocalYmd());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search states
  const [customerDueSearch, setCustomerDueSearch] = useState('');
  const [supplierPayablesSearch, setSupplierPayablesSearch] = useState('');
  const [customerHistorySearch, setCustomerHistorySearch] = useState('');
  const [supplierHistorySearch, setSupplierHistorySearch] = useState('');
  const [showCustomerHistoryDropdown, setShowCustomerHistoryDropdown] = useState(false);
  const [showSupplierHistoryDropdown, setShowSupplierHistoryDropdown] = useState(false);
  
  const customerHistoryDropdownRef = useRef(null);
  const supplierHistoryDropdownRef = useRef(null);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Report data
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesByProduct, setSalesByProduct] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [customerDueList, setCustomerDueList] = useState(null);
  const [customerStatement, setCustomerStatement] = useState(null);
  const [supplierPayables, setSupplierPayables] = useState(null);
  const [supplierHistory, setSupplierHistory] = useState(null);
  const [expensesSummary, setExpensesSummary] = useState(null);
  const [expensesList, setExpensesList] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerHistoryDropdownRef.current && !customerHistoryDropdownRef.current.contains(event.target)) {
        setShowCustomerHistoryDropdown(false);
      }
      if (supplierHistoryDropdownRef.current && !supplierHistoryDropdownRef.current.contains(event.target)) {
        setShowSupplierHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      if (tabParam === 'profit' && !proOk) {
        setActiveTab('dashboard');
        return;
      }
      if (tabParam === 'customers') {
        setActiveTab('customers');
        setCustomerSubTab('due-list');
      } else if (tabParam === 'suppliers') {
        setActiveTab('suppliers');
        setSupplierSubTab('payables');
      } else if (tabParam === 'stock-low') {
        setActiveTab('stock-low');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [searchParams, proOk]);

  useEffect(() => {
    if (proOk) return;
    if (activeTab === 'profit') setActiveTab('dashboard');
    if (salesSubTab === 'by-product') setSalesSubTab('summary');
    if (customerSubTab === 'history') setCustomerSubTab('due-list');
    if (supplierSubTab === 'history') setSupplierSubTab('payables');
    if (expenseSubTab === 'list') setExpenseSubTab('summary');
  }, [proOk, activeTab, salesSubTab, customerSubTab, supplierSubTab, expenseSubTab]);

  useEffect(() => {
    updateDateRange();
  }, [filterType]);

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardSummary();
    } else if (activeTab === 'sales') {
      if (salesSubTab === 'summary') {
        fetchSalesSummary();
      } else if (salesSubTab === 'by-product') {
        fetchSalesByProduct();
      }
    } else if (activeTab === 'profit') {
      fetchProfit();
    } else if (activeTab === 'customers') {
      if (customerSubTab === 'due-list') {
        fetchCustomerDueList();
      } else if (customerSubTab === 'history') {
        if (selectedCustomer) {
          fetchCustomerStatement();
        } else {
          setCustomerStatement(null);
        }
      }
    } else if (activeTab === 'suppliers') {
      if (supplierSubTab === 'payables') {
        fetchSupplierPayables();
      } else if (supplierSubTab === 'history') {
        if (selectedSupplierForHistory) {
          fetchSupplierHistory();
        } else {
          setSupplierHistory(null);
        }
      }
    } else if (activeTab === 'expenses') {
      if (expenseSubTab === 'summary') {
        fetchExpensesSummary();
      } else if (expenseSubTab === 'list') {
        fetchExpensesList();
      }
    } else if (activeTab === 'stock-low') {
      fetchLowStock();
    }
  }, [activeTab, salesSubTab, customerSubTab, supplierSubTab, expenseSubTab, filterType, startDate, endDate, selectedProduct, selectedCustomer, selectedSupplierForHistory]);

  const updateDateRange = () => {
    const today = new Date();
    let start, end;
    
    switch (filterType) {
      case 'daily':
        start = end = formatLocalYmd(today);
        break;
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = formatLocalYmd(weekStart);
        end = formatLocalYmd(today);
        break;
      case 'monthly':
        start = formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1));
        end = formatLocalYmd(today);
        break;
      case 'last3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        start = formatLocalYmd(threeMonthsAgo);
        end = formatLocalYmd(today);
        break;
      case 'last6months':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        start = formatLocalYmd(sixMonthsAgo);
        end = formatLocalYmd(today);
        break;
      case 'thisyear':
        start = formatLocalYmd(new Date(today.getFullYear(), 0, 1));
        end = formatLocalYmd(today);
        break;
      case 'lastyear':
        const lastYear = today.getFullYear() - 1;
        start = formatLocalYmd(new Date(lastYear, 0, 1));
        end = formatLocalYmd(new Date(lastYear, 11, 31));
        break;
      case 'custom':
        start = customStartDate || formatLocalYmd(today);
        end = customEndDate || formatLocalYmd(today);
        break;
      default:
        start = end = formatLocalYmd(today);
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]);
    }
  };

  const getFilterParams = () => {
    const params = { period: filterType };
    if (filterType === 'custom' && customStartDate && customEndDate) {
      params.start_date = customStartDate;
      params.end_date = customEndDate;
    } else if (startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }
    return params;
  };

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getDashboardSummary(getFilterParams());
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: 'dashboard' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...getFilterParams() };
      if (selectedProduct) params.product_id = selectedProduct;
      const response = await reportsAPI.getSalesSummary(params);
      setSalesSummary(response.data);
    } catch (err) {
      console.error('Error fetching sales summary:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.sales') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesByProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { ...getFilterParams() };
      if (selectedProduct) params.product_id = selectedProduct;
      const response = await reportsAPI.getSalesByProduct(params);
      setSalesByProduct(response.data);
    } catch (err) {
      console.error('Error fetching sales by product:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.byProduct') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchProfit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getProfit(getFilterParams());
      setProfitData(response.data);
    } catch (err) {
      console.error('Error fetching profit report:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.profit') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDueList = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters - show all customers with due amounts
      const params = { balance_greater_than_zero: 'true' };
      const response = await reportsAPI.getCustomersDue(params);
      setCustomerDueList(response.data);
    } catch (err) {
      console.error('Error fetching customer due list:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.dueList') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters to history - show all transactions to match current_balance
      const response = await reportsAPI.getCustomerStatement(selectedCustomer, {});
      setCustomerStatement(response.data);
    } catch (err) {
      console.error('Error fetching customer statement:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.history') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierPayables = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters - show all suppliers with payable amounts (like customer due list)
      const params = { balance_only: 'true' };
      const response = await reportsAPI.getSuppliersPayable(params);
      setSupplierPayables(response.data);
    } catch (err) {
      console.error('Error fetching supplier payables:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.payables') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      // Don't apply date filters to history - show all transactions to match current_payable_balance
      const response = await reportsAPI.getSupplierHistory(selectedSupplierForHistory, {});
      setSupplierHistory(response.data);
    } catch (err) {
      console.error('Error fetching supplier history:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.history') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getExpensesSummary(getFilterParams());
      setExpensesSummary(response.data);
    } catch (err) {
      console.error('Error fetching expenses summary:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.expenses') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchExpensesList = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getExpensesList(getFilterParams());
      setExpensesList(response.data);
    } catch (err) {
      console.error('Error fetching expenses list:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.list') }));
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getStockLow({ min_quantity: 5 });
      setLowStock(response.data);
    } catch (err) {
      console.error('Error fetching low stock:', err);
      setError(err.response?.data?.error || t('reports.failedToLoad', { report: t('reports.lowStock') }));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClearFilters = () => {
    setSelectedProduct('');
    setSelectedSupplier('');
    setSelectedCustomer('');
    setSelectedSupplierForHistory('');
    setFilterType('monthly');
    setCustomStartDate('');
    setCustomEndDate('');
    // Clear search states
    setCustomerDueSearch('');
    setSupplierPayablesSearch('');
    setCustomerHistorySearch('');
    setSupplierHistorySearch('');
    setShowCustomerHistoryDropdown(false);
    setShowSupplierHistoryDropdown(false);
    // Clear report data states
    setCustomerStatement(null);
    setSupplierHistory(null);
    // Reset sub-tabs
    setSalesSubTab('summary');
    setCustomerSubTab('due-list');
    setSupplierSubTab('payables');
    setExpenseSubTab('summary');
    // Force date range update
    const today = new Date();
    setStartDate(formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1)));
    setEndDate(formatLocalYmd(today));
  };

  const handleCardClick = (reportType) => {
    if (reportType === 'profit' && !proOk) {
      setError('Profit and advanced reports require Pro or Premium.');
      return;
    }
    setActiveTab(reportType);
  };

  // Render Dashboard
  const renderDashboard = () => {
    if (loading && !dashboardData) {
      return <div className="loading">{t('common.loading')} {t('reports.dashboard').toLowerCase()}...</div>;
    }

    if (!dashboardData) return null;

    return (
      <div className="reports-dashboard">
        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => { setActiveTab('sales'); setSalesSubTab('summary'); }}>
            <div className="card-icon">💰</div>
            <div className="card-label">{t('reports.totalSales')}</div>
            <div className="card-value">{formatCurrency(dashboardData.totalSales)}</div>
          </div>
          
          <div className="dashboard-card" onClick={() => handleCardClick('profit')}>
            <div className="card-icon">📊</div>
            <div className="card-label">{t('reports.totalPurchases')}</div>
            <div className="card-value">{formatCurrency(dashboardData.totalPurchases)}</div>
          </div>
          
          <div className="dashboard-card" onClick={() => { setActiveTab('expenses'); setExpenseSubTab('summary'); }}>
            <div className="card-icon">💸</div>
            <div className="card-label">{t('reports.totalExpenses')}</div>
            <div className="card-value">{formatCurrency(dashboardData.totalExpenses)}</div>
          </div>
          
          <div className="dashboard-card highlight" onClick={() => handleCardClick('profit')}>
            <div className="card-icon">✅</div>
            <div className="card-label">{t('reports.netProfit')}</div>
            <div className={`card-value ${dashboardData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(dashboardData.netProfit)}
            </div>
          </div>
          
          <div className="dashboard-card" onClick={() => { setActiveTab('sales'); setSalesSubTab('summary'); }}>
            <div className="card-icon">💵</div>
            <div className="card-label">{t('reports.cashReceived')}</div>
            <div className="card-value">{formatCurrency(dashboardData.cashReceived)}</div>
          </div>
          
          <div className="dashboard-card" onClick={() => { setActiveTab('customers'); setCustomerSubTab('due-list'); }}>
            <div className="card-icon">📝</div>
            <div className="card-label">{t('reports.creditGiven')}</div>
            <div className="card-value">{formatCurrency(dashboardData.creditGiven)}</div>
          </div>
        </div>
      </div>
    );
  };

  // Render Sales (Combined Summary and By Product)
  const renderSales = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Sales */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${salesSubTab === 'summary' ? 'active' : ''}`}
            onClick={() => setSalesSubTab('summary')}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.salesSummary')}
          </button>
          <button
            type="button"
            className={`tab ${salesSubTab === 'by-product' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setSalesSubTab('by-product')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Sales by product' : undefined}
          >
            {t('reports.salesByProduct')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Product Filter - Only show in Sales tab */}
        <div style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">{t('reports.filterByProduct')}</label>
            <select
              className="form-input"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">{t('reports.allProducts')}</option>
              {products.map(product => (
                <option key={product.product_id} value={product.product_id}>
                  {product.name || product.item_name_english}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Render based on sub-tab */}
        {salesSubTab === 'summary' && renderSalesSummary()}
        {salesSubTab === 'by-product' && renderSalesByProduct()}
      </div>
    );
  };

  // Render Sales Summary
  const renderSalesSummary = () => {
    if (loading && !salesSummary) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!salesSummary) return null;

    return (
      <div>
        <div className="report-totals">
          <div className="total-card">
            <div className="total-label">{t('reports.totalSalesAmount')}</div>
            <div className="total-value">{formatCurrency(salesSummary.totalSales)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.numberOfInvoices')}</div>
            <div className="total-value">{salesSummary.invoiceCount}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.cashSales')}</div>
            <div className="total-value profit-positive">{formatCurrency(salesSummary.cashSales)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.creditSales')}</div>
            <div className="total-value">{formatCurrency(salesSummary.creditSales)}</div>
          </div>
        </div>
      </div>
    );
  };

  // Render Sales by Product
  const renderSalesByProduct = () => {
    if (loading && !salesByProduct) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!salesByProduct || !salesByProduct.products) return null;

    return (
      <div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>{t('reports.productName')}</th>
                <th>{t('reports.quantitySold')}</th>
                <th>{t('reports.totalSaleAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {salesByProduct.products.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">{t('reports.noSalesFound')}</td>
                </tr>
              ) : (
                salesByProduct.products.map((product) => (
                  <tr key={product.product_id}>
                    <td>{product.product_name}</td>
                    <td>{product.quantity_sold}</td>
                    <td>{formatCurrency(product.total_sale_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Profit Report
  const renderProfit = () => {
    if (loading && !profitData) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!profitData) return null;

    return (
      <div className="report-content">
        <div className="report-totals">
          <div className="total-card">
            <div className="total-label">{t('reports.totalSales')}</div>
            <div className="total-value">{formatCurrency(profitData.totalSales)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.totalPurchases')}</div>
            <div className="total-value profit-negative">{formatCurrency(profitData.totalPurchases)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.totalExpenses')}</div>
            <div className="total-value profit-negative">{formatCurrency(profitData.totalExpenses)}</div>
          </div>
          <div className="total-card highlight">
            <div className="total-label">{t('reports.netProfit')}</div>
            <div className={`total-value ${profitData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {formatCurrency(profitData.netProfit)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Customers (Combined Due List and History)
  const renderCustomers = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Customers */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${customerSubTab === 'due-list' ? 'active' : ''}`}
            onClick={() => { setCustomerSubTab('due-list'); setSelectedCustomer(''); setCustomerStatement(null); }}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.dueList')}
          </button>
          <button
            type="button"
            className={`tab ${customerSubTab === 'history' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setCustomerSubTab('history')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Customer statement / history' : undefined}
          >
            {t('reports.history')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Render based on sub-tab */}
        {customerSubTab === 'due-list' && renderCustomerDueList()}
        {customerSubTab === 'history' && renderCustomerStatement()}
      </div>
    );
  };

  // Render Customer Due List
  const renderCustomerDueList = () => {
    if (loading && !customerDueList) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!customerDueList || !customerDueList.customers) return null;

    // Filter customers based on search
    const filteredCustomers = customerDueList.customers.filter(customer => {
      if (!customerDueSearch.trim()) return true;
      const search = customerDueSearch.toLowerCase();
      const name = (customer.customer_name || '').toLowerCase();
      const phone = (customer.mobile_number || '').toLowerCase();
      return name.includes(search) || phone.includes(search);
    });

    return (
      <div className="report-content">
        <div className="report-totals">
          <div className="total-card highlight">
            <div className="total-label">{t('reports.totalCustomersWithDue')}</div>
            <div className="total-value">{filteredCustomers.length}</div>
          </div>
          <div className="total-card highlight">
            <div className="total-label">{t('reports.totalRemainingDue')}</div>
            <div className="total-value profit-negative">{formatCurrency(customerDueList.total_due)}</div>
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">{t('reports.searchCustomer')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('reports.typeToSearch')}
              value={customerDueSearch}
              onChange={(e) => setCustomerDueSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>{t('reports.customerName')}</th>
                <th>{t('reports.mobileNumber')}</th>
                <th>{t('reports.remainingDue')}</th>
                <th>{t('reports.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    {customerDueSearch ? t('reports.noCustomersFound') : t('reports.noCustomersDue')}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td>{customer.customer_name}</td>
                    <td>{customer.mobile_number || '-'}</td>
                    <td className="profit-negative">{formatCurrency(customer.total_due)}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedCustomer(customer.customer_id);
                          setCustomerSubTab('history');
                        }}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Customer Statement
  const renderCustomerStatement = () => {
    if (loading && !customerStatement) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!customerStatement) {
      // Filter customers based on search
      const filteredCustomers = customers.filter(customer => {
        if (!customerHistorySearch.trim()) return true;
        const search = customerHistorySearch.toLowerCase();
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        return name.includes(search) || phone.includes(search);
      });

      // Get selected customer name for display
      const selectedCustomerData = customers.find(c => c.customer_id === parseInt(selectedCustomer));
      const displayValue = selectedCustomerData 
        ? `${selectedCustomerData.name} ${selectedCustomerData.current_due > 0 ? `- ${formatCurrency(selectedCustomerData.current_due)}` : ''}`
        : customerHistorySearch;

      return (
        <div className="report-content">
          <div className="form-group" style={{ position: 'relative' }} ref={customerHistoryDropdownRef}>
            <label className="form-label">{t('reports.selectCustomer')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('reports.typeToSearch')}
              value={selectedCustomer ? displayValue : customerHistorySearch}
              onChange={(e) => {
                setCustomerHistorySearch(e.target.value);
                setSelectedCustomer('');
                setShowCustomerHistoryDropdown(true);
              }}
              onFocus={() => setShowCustomerHistoryDropdown(true)}
            />
            {showCustomerHistoryDropdown && filteredCustomers.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.customer_id}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    onClick={() => {
                      setSelectedCustomer(customer.customer_id);
                      setCustomerHistorySearch('');
                      setShowCustomerHistoryDropdown(false);
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{customer.name}</div>
                    {customer.phone && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.phone}</div>
                    )}
                    {customer.current_due > 0 && (
                      <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    {t('reports.due')} {formatCurrency(customer.current_due)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {showCustomerHistoryDropdown && filteredCustomers.length === 0 && customerHistorySearch && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '12px',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                No customers found
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="report-content">
        <div className="report-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{customerStatement.customer.name}</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedCustomer('');
                  setCustomerHistorySearch('');
                  setCustomerStatement(null);
                  setShowCustomerHistoryDropdown(false);
                }}
              >
                {t('reports.changeCustomer')}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setCustomerSubTab('due-list');
                  setSelectedCustomer('');
                  setCustomerStatement(null);
                }}
              >
                {t('reports.backToList')}
              </button>
            </div>
          </div>
          <div className="report-totals">
            <div className="total-card">
              <div className="total-label">{t('reports.totalSales')}</div>
              <div className="total-value">{formatCurrency(customerStatement.total_sales)}</div>
            </div>
            <div className="total-card">
              <div className="total-label">{t('reports.totalPayments')}</div>
              <div className="total-value profit-positive">{formatCurrency(customerStatement.total_payments)}</div>
            </div>
            <div className="total-card highlight">
              <div className="total-label">{t('reports.remainingBalance')}</div>
              <div className="total-value profit-negative">{formatCurrency(customerStatement.remaining_balance)}</div>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {customerStatement.statement.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No transactions found.</td>
                </tr>
              ) : (
                customerStatement.statement.map((item, index) => (
                  <tr key={index}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.description}</td>
                    <td className={item.amount >= 0 ? 'profit-negative' : 'profit-positive'}>
                      {formatCurrency(Math.abs(item.amount))}
                    </td>
                    <td>{formatCurrency(item.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Suppliers (Combined Payables and History)
  const renderSuppliers = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Suppliers */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${supplierSubTab === 'payables' ? 'active' : ''}`}
            onClick={() => { setSupplierSubTab('payables'); setSelectedSupplierForHistory(''); setSupplierHistory(null); }}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.payables')}
          </button>
          <button
            type="button"
            className={`tab ${supplierSubTab === 'history' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setSupplierSubTab('history')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Supplier history' : undefined}
          >
            {t('reports.history')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Render based on sub-tab */}
        {supplierSubTab === 'payables' && renderSupplierPayables()}
        {supplierSubTab === 'history' && renderSupplierHistory()}
      </div>
    );
  };

  // Render Supplier Payables
  const renderSupplierPayables = () => {
    if (loading && !supplierPayables) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!supplierPayables || !Array.isArray(supplierPayables)) return null;

    // Filter suppliers based on search
    const filteredSuppliers = supplierPayables.filter(supplier => {
      if (!supplierPayablesSearch.trim()) return true;
      const search = supplierPayablesSearch.toLowerCase();
      const name = (supplier.name || '').toLowerCase();
      const contact = (supplier.contact_number || '').toLowerCase();
      return name.includes(search) || contact.includes(search);
    });

    // Only sum positive balances (amounts we actually owe)
    const totalPayable = filteredSuppliers.reduce((sum, s) => {
      const balance = parseFloat(s.current_payable_balance || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);

    return (
      <div className="report-content">
        <div className="report-totals">
          <div className="total-card highlight">
            <div className="total-label">{t('reports.totalAmountToPay')}</div>
            <div className="total-value profit-negative">{formatCurrency(totalPayable)}</div>
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">{t('reports.searchSupplier')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('reports.typeToSearch')}
              value={supplierPayablesSearch}
              onChange={(e) => setSupplierPayablesSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>{t('reports.supplierName')}</th>
                <th>{t('reports.amountToPay')}</th>
                <th>{t('reports.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">
                    {supplierPayablesSearch ? t('reports.noSuppliersFound') : t('reports.noSuppliersPayable')}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.supplier_id}>
                    <td>{supplier.name}</td>
                    <td className="profit-negative">{formatCurrency(Math.abs(parseFloat(supplier.current_payable_balance || 0)))}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedSupplierForHistory(supplier.supplier_id);
                          setSupplierSubTab('history');
                        }}
                      >
                        {t('reports.viewHistory')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Supplier History
  const renderSupplierHistory = () => {
    if (loading && !supplierHistory) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!supplierHistory) {
      // Filter suppliers based on search
      const filteredSuppliers = (supplierPayables || []).filter(supplier => {
        if (!supplierHistorySearch.trim()) return true;
        const search = supplierHistorySearch.toLowerCase();
        const name = (supplier.name || '').toLowerCase();
        const contact = (supplier.contact_number || '').toLowerCase();
        return name.includes(search) || contact.includes(search);
      });

      // Get selected supplier name for display
      const selectedSupplierData = supplierPayables?.find(s => s.supplier_id === parseInt(selectedSupplierForHistory));
      const displayValue = selectedSupplierData 
        ? `${selectedSupplierData.name} - ${formatCurrency(Math.abs(parseFloat(selectedSupplierData.current_payable_balance || 0)))}`
        : supplierHistorySearch;

      return (
        <div className="report-content">
          <div className="form-group" style={{ position: 'relative' }} ref={supplierHistoryDropdownRef}>
            <label className="form-label">Select Supplier</label>
            <input
              type="text"
              className="form-input"
              placeholder="Type to search suppliers..."
              value={selectedSupplierForHistory ? displayValue : supplierHistorySearch}
              onChange={(e) => {
                setSupplierHistorySearch(e.target.value);
                setSelectedSupplierForHistory('');
                setShowSupplierHistoryDropdown(true);
              }}
              onFocus={() => setShowSupplierHistoryDropdown(true)}
            />
            {showSupplierHistoryDropdown && filteredSuppliers.length > 0 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                {filteredSuppliers.map(supplier => (
                  <div
                    key={supplier.supplier_id}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    onClick={() => {
                      setSelectedSupplierForHistory(supplier.supplier_id);
                      setSupplierHistorySearch('');
                      setShowSupplierHistoryDropdown(false);
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{supplier.name}</div>
                    {supplier.contact_number && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{supplier.contact_number}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      Payable: {formatCurrency(Math.abs(parseFloat(supplier.current_payable_balance || 0)))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showSupplierHistoryDropdown && filteredSuppliers.length === 0 && supplierHistorySearch && (
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '12px',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  marginTop: '4px'
                }}
              >
                No suppliers found
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="report-content">
        <div className="report-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{supplierHistory.supplier.name}</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedSupplierForHistory('');
                  setSupplierHistorySearch('');
                  setSupplierHistory(null);
                  setShowSupplierHistoryDropdown(false);
                }}
              >
                Change Supplier
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSupplierSubTab('payables');
                  setSelectedSupplierForHistory('');
                  setSupplierHistory(null);
                }}
              >
                {t('reports.backToList')}
              </button>
            </div>
          </div>
          <div className="report-totals">
            <div className="total-card">
              <div className="total-label">{t('reports.totalPurchases')}</div>
              <div className="total-value">{formatCurrency(supplierHistory.total_purchases)}</div>
            </div>
            <div className="total-card">
              <div className="total-label">{t('reports.totalPaid')}</div>
              <div className="total-value profit-positive">{formatCurrency(supplierHistory.total_paid)}</div>
            </div>
            <div className="total-card highlight">
              <div className="total-label">{t('reports.remainingBalance')}</div>
              <div className="total-value profit-negative">{formatCurrency(Math.abs(parseFloat(supplierHistory.remaining_balance || 0)))}</div>
            </div>
          </div>
        </div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {supplierHistory.history.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No transactions found.</td>
                </tr>
              ) : (
                supplierHistory.history.map((item, index) => (
                  <tr key={index}>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.description}</td>
                    <td className={item.amount >= 0 ? 'profit-negative' : 'profit-positive'}>
                      {formatCurrency(Math.abs(item.amount))}
                    </td>
                    <td>{formatCurrency(item.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Expenses (Combined Summary and List)
  const renderExpenses = () => {
    return (
      <div className="report-content">
        {/* Sub-tabs for Expenses */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            className={`tab ${expenseSubTab === 'summary' ? 'active' : ''}`}
            onClick={() => setExpenseSubTab('summary')}
            style={{ borderBottom: 'none', borderRadius: '6px 6px 0 0' }}
          >
            {t('reports.summary')}
          </button>
          <button
            type="button"
            className={`tab ${expenseSubTab === 'list' ? 'active' : ''}`}
            disabled={!proOk}
            onClick={() => proOk && setExpenseSubTab('list')}
            style={{
              borderBottom: 'none',
              borderRadius: '6px 6px 0 0',
              ...(!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : {}),
            }}
            title={!proOk ? 'Pro or Premium: Detailed expense list' : undefined}
          >
            {t('reports.list')}
            {!proOk ? ' (Pro)' : ''}
          </button>
        </div>

        {/* Render based on sub-tab */}
        {expenseSubTab === 'summary' && renderExpensesSummary()}
        {expenseSubTab === 'list' && renderExpensesList()}
      </div>
    );
  };

  // Render Expenses Summary
  const renderExpensesSummary = () => {
    if (loading && !expensesSummary) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!expensesSummary) return null;

    return (
      <div>
        <div className="report-totals">
          <div className="total-card highlight">
            <div className="total-label">Total Expenses</div>
            <div className="total-value profit-negative">{formatCurrency(expensesSummary.totalExpenses)}</div>
          </div>
          <div className="total-card">
            <div className="total-label">{t('reports.numberOfExpenses')}</div>
            <div className="total-value">{expensesSummary.expenseCount}</div>
          </div>
        </div>
        {expensesSummary.categoryBreakdown && expensesSummary.categoryBreakdown.length > 0 && (
          <div className="table-container">
            <h3>{t('reports.categoryBreakdown')}</h3>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>{t('reports.category')}</th>
                  <th>{t('reports.totalAmount')}</th>
                  <th>{t('reports.count')}</th>
                </tr>
              </thead>
              <tbody>
                {expensesSummary.categoryBreakdown.map((cat, index) => (
                  <tr key={index}>
                    <td>{cat.category}</td>
                    <td>{formatCurrency(cat.total)}</td>
                    <td>{cat.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Render Expenses List
  const renderExpensesList = () => {
    if (loading && !expensesList) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!expensesList || !expensesList.expenses) return null;

    return (
      <div>
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense Name</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expensesList.expenses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No expenses found for this period.</td>
                </tr>
              ) : (
                expensesList.expenses.map((expense) => (
                  <tr key={expense.expense_id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.expense_name}</td>
                    <td>{expense.category}</td>
                    <td className="profit-negative">{formatCurrency(expense.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render Low Stock
  const renderLowStock = () => {
    if (loading && !lowStock) {
      return <div className="loading">{t('reports.loading')}</div>;
    }

    if (!lowStock || !lowStock.products) return null;

    return (
      <div className="report-content">
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>{t('reports.productName')}</th>
                <th>{t('reports.currentQty')}</th>
                <th>{t('reports.minimumQty')}</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.products.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">{t('reports.noLowStockItems')}</td>
                </tr>
              ) : (
                lowStock.products.map((product) => (
                  <tr key={product.product_id} className={product.current_qty <= 0 ? 'row-warning' : ''}>
                    <td>{product.product_name}</td>
                    <td className={product.current_qty <= 0 ? 'profit-negative' : ''}>{product.current_qty}</td>
                    <td>{product.minimum_qty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
        <p className="page-subtitle">{t('reports.subtitle')}</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Date Filter Section - KEEP EXACTLY AS IS */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2>{t('reports.filterReports')}</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <button 
              className={`btn ${filterType === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('daily')}
            >
              {t('reports.daily')}
            </button>
            <button 
              className={`btn ${filterType === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('weekly')}
            >
              {t('reports.weekly')}
            </button>
            <button 
              className={`btn ${filterType === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('monthly')}
            >
              {t('reports.monthly')}
            </button>
            <button 
              className={`btn ${filterType === 'last3months' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('last3months')}
            >
              {t('reports.last3Months')}
            </button>
            <button 
              className={`btn ${filterType === 'last6months' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('last6months')}
            >
              {t('reports.last6Months')}
            </button>
            <button 
              className={`btn ${filterType === 'thisyear' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('thisyear')}
            >
              {t('reports.thisYear')}
            </button>
            <button 
              className={`btn ${filterType === 'lastyear' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('lastyear')}
            >
              {t('reports.lastYear')}
            </button>
            <button 
              className={`btn ${filterType === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType('custom')}
            >
              {t('reports.customRange')}
            </button>
          </div>
          {filterType === 'custom' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">{t('reports.startDate')}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={customStartDate} 
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    if (e.target.value && customEndDate) {
                      setStartDate(e.target.value);
                      setEndDate(customEndDate);
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.endDate')}</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={customEndDate} 
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    if (customStartDate && e.target.value) {
                      setStartDate(customStartDate);
                      setEndDate(e.target.value);
                    }
                  }}
                />
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    if (new Date(customStartDate) > new Date(customEndDate)) {
                      alert(t('reports.startDateCannotBeAfter'));
                      return;
                    }
                    setStartDate(customStartDate);
                    setEndDate(customEndDate);
                  } else {
                    alert(t('reports.selectBothDates'));
                  }
                }}
              >
                {t('reports.apply')}
              </button>
            </div>
          )}
          {filterType !== 'custom' && (
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '14px', marginBottom: '16px' }}>
              <strong>{t('reports.dateRange')}</strong> {new Date(startDate).toLocaleDateString()} {t('common.to')} {new Date(endDate).toLocaleDateString()}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              {t('reports.clearFilters')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          data-navigation="true"
        >
          {t('reports.dashboard')}
        </button>
        <button 
          className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => { setActiveTab('sales'); setSalesSubTab('summary'); }}
          data-navigation="true"
        >
          {t('reports.sales')}
        </button>
        <button 
          type="button"
          className={`tab ${activeTab === 'profit' ? 'active' : ''}`}
          disabled={!proOk}
          onClick={() => proOk && setActiveTab('profit')}
          data-navigation="true"
          style={!proOk ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
          title={!proOk ? 'Pro or Premium: Profit report' : undefined}
        >
          {t('reports.profit')}
          {!proOk ? ' (Pro)' : ''}
        </button>
        <button 
          className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('customers'); setCustomerSubTab('due-list'); }}
          data-navigation="true"
        >
          {t('reports.customers')}
        </button>
        <button 
          className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('suppliers'); setSupplierSubTab('payables'); }}
          data-navigation="true"
        >
          {t('reports.suppliers')}
        </button>
        <button 
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => { setActiveTab('expenses'); setExpenseSubTab('summary'); }}
          data-navigation="true"
        >
          {t('reports.expenses')}
        </button>
        <button 
          className={`tab ${activeTab === 'stock-low' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock-low')}
          data-navigation="true"
        >
          {t('reports.lowStock')}
        </button>
      </div>

      {/* Report Content */}
      <div className="card">
        <div className="card-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'profit' && renderProfit()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'suppliers' && renderSuppliers()}
          {activeTab === 'expenses' && renderExpenses()}
          {activeTab === 'stock-low' && renderLowStock()}
        </div>
      </div>
    </div>
  );
};

export default Reports;
