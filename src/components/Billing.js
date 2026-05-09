import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faUser, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { salesAPI, customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import {
  fetchInventoryBundle,
  fetchCustomersList,
  fetchSettingsDoc,
} from '../lib/workspaceQueries';
import PageLoadingCenter from './PageLoadingCenter';
import './Billing.css';
import { billingExtraStyles } from './BillingExtraStyles';
import { posApiQueriesEnabled } from '../lib/appMode';

const billingMobileOverrides = `
@media (max-width: 768px) {
  /* One-column layout on mobile; switch panels via toggle */
  .billing-area { display: block !important; }
  .billing-area .left-col,
  .billing-area .right-panel { width: 100% !important; max-width: 100% !important; }

  .billing-container.zb-bill-mobile--items .right-panel { display: none !important; }
  .billing-container.zb-bill-mobile--summary .left-col { display: none !important; }

  /* Tabs bar: allow horizontal scroll instead of wrap/overlap */
  .billing-tabs-bar {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .billing-tabs-left {
    min-width: max-content;
  }

  .billing-header-bar {
    flex-wrap: wrap;
    gap: 6px;
  }

  .zb-bill-mobileToggle {
    display: flex;
    width: 100%;
    gap: 8px;
    margin-top: 8px;
  }
  .zb-bill-mobileToggle button {
    flex: 1 1 0;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    background: #fff;
    padding: 8px 10px;
    font-weight: 700;
    font-size: 12px;
  }
  .zb-bill-mobileToggle button.is-active {
    background: #eef2ff;
    border-color: rgba(79, 70, 229, 0.45);
    color: #1e1b4b;
  }
}
`;

const STOCK_ERR = (avail) =>
  `Insufficient stock. Available: ${Number(avail || 0)} units. Please add stock first.`;

function createDraftBill(idx = 1) {
  return {
    id: `bill_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    label: `Bill #${idx}`,
    meta: 'Empty',
    invoiceItems: [],
    searchQuery: '',
    filteredProducts: [],
    selectedCustomer: null,
    customerName: '',
    discount: 0,
    paidAmount: 0,
    saleNotes: '',
    itemPriceTypes: {},
    invoiceNumber: '',
    paymentMode: 'cash',
    saleType: 'full',
  };
}

function validateCartAgainstStock(invoiceItems, productsList) {
  const qtyByProduct = new Map();
  for (const it of invoiceItems) {
    const pid = it.product_id;
    const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(it.quantity) || 0;
    if (q <= 0) continue;
    qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + q);
  }
  for (const [pid, need] of qtyByProduct) {
    const p = productsList.find((x) => x.product_id === pid);
    const avail = p != null ? parseFloat(p.quantity_in_stock) || 0 : 0;
    if (need > avail) {
      return { ok: false, available: avail, productName: p ? p.item_name_english || p.name : `#${pid}` };
    }
  }
  return { ok: true };
}

const Billing = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const billingPrefillRef = useRef(null);
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();
  const [mobilePanel, setMobilePanel] = useState('items'); // 'items' | 'summary' (mobile only via CSS)

  const { data: bundle, isLoading: invLoading } = useQuery({
    queryKey: zbKeys(activeShopId).inventoryBundle(),
    queryFn: fetchInventoryBundle,
    enabled: posApiQueriesEnabled(activeShopId),
  });
  const products = useMemo(() => bundle?.products ?? [], [bundle?.products]);

  const { data: customersRaw = [], isLoading: custLoading } = useQuery({
    queryKey: zbKeys(activeShopId).customersList(),
    queryFn: fetchCustomersList,
    enabled: posApiQueriesEnabled(activeShopId),
  });
  const customers = useMemo(
    () => (customersRaw || []).filter((c) => c.status === 'active'),
    [customersRaw]
  );

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: zbKeys(activeShopId).settingsDoc(),
    queryFn: fetchSettingsDoc,
    enabled: posApiQueriesEnabled(activeShopId),
  });

  // Core state
  const [bills, setBills] = useState(() => [createDraftBill(1)]);
  const [activeBillId, setActiveBillId] = useState(() => bills?.[0]?.id);
  const activeBill = useMemo(
    () => bills.find((b) => b.id === activeBillId) || bills[0],
    [bills, activeBillId]
  );
  const updateActiveBill = (patch) => {
    setBills((prev) =>
      prev.map((b) => (b.id === activeBillId ? { ...b, ...patch } : b))
    );
  };

  const invoiceItems = activeBill?.invoiceItems || [];
  const searchQuery = activeBill?.searchQuery || '';
  const filteredProducts = activeBill?.filteredProducts || [];
  const selectedCustomer = activeBill?.selectedCustomer || null;
  const customerName = activeBill?.customerName || '';
  const discount = activeBill?.discount ?? 0;
  const paidAmount = activeBill?.paidAmount ?? 0;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [shopName, setShopName] = useState('My Shop');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const invoiceNumber = activeBill?.invoiceNumber || '';
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customerSearchQuery, setCustomerSearchQuery] = useState(''); // UI-only
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false); // UI-only
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const saleNotes = activeBill?.saleNotes || '';
  const paymentMode = activeBill?.paymentMode || 'cash';
  const saleType = activeBill?.saleType || 'full';
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', message: string }
  const toastTimerRef = useRef(null);
  
  // Price type per item
  const itemPriceTypes = activeBill?.itemPriceTypes || {};
  
  const searchInputRef = useRef(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    filterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterProducts closes over latest products/searchQuery via deps below
  }, [searchQuery, products]);

  useEffect(() => {
    if (!settingsData) return;
    const data = settingsData;
    try {
      if (data.other_app_settings) {
        const otherSettings =
          typeof data.other_app_settings === 'string'
            ? JSON.parse(data.other_app_settings)
            : data.other_app_settings;
        setShopName(otherSettings.shop_name || 'My Shop');
        setShopPhone(otherSettings.shop_phone || '');
        setShopAddress(otherSettings.shop_address || '');
      } else if (data.shop_name) {
        setShopName(String(data.shop_name));
      }
    } catch (e) {
      console.error(e);
    }
  }, [settingsData]);

  const loading = invLoading || custLoading || settingsLoading;

  const stockCheck = useMemo(
    () => validateCartAgainstStock(invoiceItems, products),
    [invoiceItems, products]
  );

  const filteredCustomerRows = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    const list = q
      ? customers.filter((c) => {
          const name = (c.name || '').toLowerCase();
          const phone = (c.phone || '').toLowerCase();
          return name.includes(q) || phone.includes(q);
        })
      : customers;
    return list.slice(0, 50);
  }, [customers, customerSearchQuery]);

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      updateActiveBill({ filteredProducts: [] });
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(p => {
      const name = (p.item_name_english || p.name || '').toLowerCase();
      return name.includes(query);
    });

    // Sort: frequently sold first, then by name
    filtered.sort((a, b) => {
      const aFrequent = a.is_frequently_sold === true || a.is_frequently_sold === 1;
      const bFrequent = b.is_frequently_sold === true || b.is_frequently_sold === 1;
      if (aFrequent && !bFrequent) return -1;
      if (!aFrequent && bFrequent) return 1;
      const nameA = (a.item_name_english || a.name || '').toLowerCase();
      const nameB = (b.item_name_english || b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    updateActiveBill({ filteredProducts: filtered.slice(0, 10) }); // Limit to 10 results
  };

  const refreshCustomerRow = async (customerRow) => {
    if (!customerRow?.customer_id) return customerRow;
    try {
      const res = await customersAPI.getById(customerRow.customer_id);
      return res.data;
    } catch (e) {
      console.error(e);
      return customerRow;
    }
  };

  // Handle product selection from search - directly add to bill
  const handleProductSelect = (product) => {
    if (!product) return;

    const avail = parseFloat(product.quantity_in_stock) || 0;
    const existingIndex = invoiceItems.findIndex(
      (item) => item.product_id === product.product_id
    );
    let nextQty = 1;
    if (existingIndex >= 0) {
      const cur = invoiceItems[existingIndex].quantity;
      const curQ = typeof cur === 'number' ? cur : parseFloat(cur) || 0;
      nextQty = curQ + 1;
    }
    if (nextQty > avail) {
      const msg = STOCK_ERR(avail);
      setError(msg);
      alert(msg);
      return;
    }
    setError(null);

    // Determine default price based on customer
    let defaultPrice = product.retail_price || product.selling_price || 0;
    let priceType = 'retail';

    if (selectedCustomer) {
      const customerType = selectedCustomer.customer_type || 'walk-in';
      if (customerType === 'wholesale' && product.wholesale_price) {
        defaultPrice = product.wholesale_price;
        priceType = 'wholesale';
      } else if (customerType === 'special' && product.special_price) {
        defaultPrice = product.special_price || defaultPrice;
        priceType = 'special';
      }
    }

    if (existingIndex >= 0) {
      const updatedItems = [...invoiceItems];
      updatedItems[existingIndex].quantity = nextQty;
      updatedItems[existingIndex].stock_available = avail;
      updateActiveBill({ invoiceItems: updatedItems });
    } else {
      const newItem = {
        product_id: product.product_id,
        product_name: product.item_name_english || product.name,
        quantity: 1,
        selling_price: defaultPrice,
        purchase_price: product.purchase_price || 0,
        stock_available: avail,
        unit_type: product.unit_type || 'piece',
      };
      updateActiveBill({
        invoiceItems: [...invoiceItems, newItem],
        itemPriceTypes: { ...itemPriceTypes, [product.product_id]: priceType },
      });
    }

    updateActiveBill({ searchQuery: '', filteredProducts: [] });
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  // Product detail → "Add sale": open Billing with this product on the invoice
  useEffect(() => {
    const raw = location.state?.billingAddProductId;
    if (raw == null || products.length === 0) return;
    const pid = Number(raw);
    const marker = `${location.key}:${pid}`;
    if (billingPrefillRef.current === marker) return;
    const product = products.find((x) => Number(x.product_id) === pid);
    if (!product) return;
    billingPrefillRef.current = marker;
    handleProductSelect(product);
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: {} }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit handleProductSelect/navigate to avoid re-entry loops; ref marker guards idempotency
  }, [location.state, location.key, location.pathname, location.search, location.hash, products]);

  // Handle Enter key in search
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      handleProductSelect(filteredProducts[0]);
    }
  };

  // Update item quantity
  const handleQuantityChange = (index, value) => {
    const updatedItems = [...invoiceItems];
    const qty = parseFloat(value);
    const item = updatedItems[index];
    const p = products.find((x) => x.product_id === item.product_id);
    const avail = p != null ? parseFloat(p.quantity_in_stock) || 0 : parseFloat(item.stock_available) || 0;

    if (!isNaN(qty) && qty > 0) {
      if (qty > avail) {
        const msg = STOCK_ERR(avail);
        setError(msg);
        alert(msg);
        updatedItems[index].quantity = avail;
      } else {
        setError(null);
        updatedItems[index].quantity = qty;
      }
      updatedItems[index].stock_available = avail;
      updateActiveBill({ invoiceItems: updatedItems });
    } else if (value === '' || value === null || value === undefined) {
      updatedItems[index].quantity = '';
      updateActiveBill({ invoiceItems: updatedItems });
    }
  };

  // Update item price
  const handlePriceChange = (index, value) => {
    const updatedItems = [...invoiceItems];
    const price = parseFloat(value) || 0;
    if (price > 0) {
      updatedItems[index].selling_price = price;
      updateActiveBill({ invoiceItems: updatedItems });
    }
  };

  // Switch price type for an item
  const handlePriceTypeChange = (index, priceType) => {
    const item = invoiceItems[index];
    const product = products.find(p => p.product_id === item.product_id);
    if (!product) return;

    let newPrice = item.selling_price;
    if (priceType === 'retail') {
      newPrice = product.retail_price || product.selling_price || 0;
    } else if (priceType === 'wholesale') {
      newPrice = product.wholesale_price || product.retail_price || product.selling_price || 0;
    } else if (priceType === 'special') {
      newPrice = product.special_price || product.retail_price || product.selling_price || 0;
    }

    const updatedItems = [...invoiceItems];
    updatedItems[index].selling_price = newPrice;
    updateActiveBill({
      invoiceItems: updatedItems,
      itemPriceTypes: { ...itemPriceTypes, [item.product_id]: priceType },
    });
  };

  // Remove item
  const handleRemoveItem = (index) => {
    const updatedItems = invoiceItems.filter((_, i) => i !== index);
    updateActiveBill({ invoiceItems: updatedItems });
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    invoiceItems.forEach(item => {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
      const price = parseFloat(item.selling_price) || 0;
      subtotal += qty * price;
    });

    const discountAmount = parseFloat(discount) || 0;
    const grandTotal = Math.max(0, subtotal - discountAmount);
    const paid = parseFloat(paidAmount) || 0;
    const remainingDue = Math.max(0, grandTotal - paid);
    const change = Math.max(0, paid - grandTotal); // Change to return if overpaid

    return { subtotal, discountAmount, grandTotal, remainingDue, change, paid };
  };

  useEffect(() => {
    const { grandTotal } = calculateTotals();
    if (!selectedCustomer) {
      updateActiveBill({ saleType: 'full', paidAmount: grandTotal });
      return;
    }
    const p = parseFloat(paidAmount) || 0;
    if (p > grandTotal) updateActiveBill({ paidAmount: grandTotal });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync paid cap when totals change; full deps would thrash paid edits
  }, [invoiceItems, discount, selectedCustomer]);

  // Sync sale type ↔ paid amount for selected customers (credit/partial/full)
  useEffect(() => {
    const { grandTotal } = calculateTotals();
    if (!selectedCustomer) return;
    if (saleType === 'full') {
      updateActiveBill({ paidAmount: grandTotal });
      return;
    }
    if (saleType === 'credit') {
      updateActiveBill({ paidAmount: 0 });
      return;
    }
    // partial: keep user's paidAmount
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paidAmount is intentionally not a dependency here
  }, [saleType, selectedCustomer, invoiceItems, discount]);

  // When user edits paidAmount manually, infer sale type (only when customer selected)
  useEffect(() => {
    if (!selectedCustomer) return;
    const { grandTotal } = calculateTotals();
    const p = Math.max(0, parseFloat(paidAmount) || 0);
    if (grandTotal <= 0) return;
    if (p <= 0.00001) {
      if (saleType !== 'credit') updateActiveBill({ saleType: 'credit' });
      return;
    }
    if (p + 0.00001 >= grandTotal) {
      if (saleType !== 'full') updateActiveBill({ saleType: 'full' });
      return;
    }
    if (saleType !== 'partial') updateActiveBill({ saleType: 'partial' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid thrash when calculateTotals changes identity
  }, [paidAmount, selectedCustomer]);

  // Handle save invoice
  const handleSaveInvoice = async (shouldPrint = false) => {
    if (invoiceItems.length === 0) {
      showToast('error', t('billing.addAtLeastOneItem', { defaultValue: 'Add at least one item first.' }));
      return;
    }

    // Speed: avoid network refetch before save; rely on cached inventory bundle.
    const cached = queryClient.getQueryData(zbKeys(activeShopId).inventoryBundle());
    const stockProducts = cached?.products || products;
    const finalStock = validateCartAgainstStock(invoiceItems, stockProducts);
    if (!finalStock.ok) {
      const msg = STOCK_ERR(finalStock.available);
      setError(msg);
      showToast('error', msg, 4200);
      return;
    }
    setError(null);

    const { grandTotal } = calculateTotals();
    const paid = parseFloat(paidAmount) || 0;

    if (!selectedCustomer && grandTotal > 0 && paid + 0.00001 < grandTotal) {
      showToast(
        'error',
        t('billing.selectCustomerForCredit', { defaultValue: 'Select a customer for credit/partial sales.' })
      );
      return;
    }

    // Determine payment type
    let paymentType = 'cash';
    if (selectedCustomer) {
      if (paid === 0) {
        paymentType = 'credit';
      } else if (paid < grandTotal) {
        paymentType = 'split';
      } else {
        paymentType = 'cash';
      }
    } else {
      // Cash customer - always full payment
      paymentType = 'cash';
    }

    try {
      setSaving(true);
      setError(null);
      showToast('info', shouldPrint ? 'Saving & printing…' : 'Saving invoice…', 1600);

      const saleData = {
        customer_id: selectedCustomer?.customer_id || null,
        customer_name: selectedCustomer ? null : (customerName.trim() || null),
        payment_type: paymentType,
        payment_mode: paymentMode,
        paid_amount: paid,
        discount: parseFloat(discount) || 0,
        tax: 0, // No tax for now
        sale_notes: saleNotes.trim() || undefined,
        items: invoiceItems.map(item => ({
          product_id: item.product_id,
          quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0,
          selling_price: item.selling_price,
        })),
      };

      const response = await salesAPI.create(saleData);
      const savedInvoice = response.data;
      
      // Update invoice number for display
      updateActiveBill({ invoiceNumber: savedInvoice.invoice_number });

      // Print if requested
      if (shouldPrint) {
        await printInvoice(savedInvoice);
      }

      // Reset form
      resetForm();

      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).customersList() });
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).salesList() });

      window.dispatchEvent(new Event('data-refresh'));

      showToast(
        'success',
        t('billing.invoiceSaved', {
          invoiceNumber: savedInvoice.invoice_number,
          defaultValue: `Invoice saved (${savedInvoice.invoice_number}).`,
        }),
        3600
      );
    } catch (err) {
      console.error('Error saving invoice:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || 'Failed to save invoice';
      setError(errorMsg);
      showToast('error', errorMsg, 5200);
    } finally {
      setSaving(false);
    }
  };


  // Cancel bill
  const handleCancelBill = () => {
    if (invoiceItems.length === 0) {
      return;
    }

    if (window.confirm('Are you sure you want to cancel this bill?')) {
      resetForm();
    }
  };

  // Reset form
  const resetForm = () => {
    updateActiveBill({
      invoiceItems: [],
      selectedCustomer: null,
      customerName: '',
      discount: 0,
      paidAmount: 0,
      searchQuery: '',
      filteredProducts: [],
      saleNotes: '',
      itemPriceTypes: {},
      invoiceNumber: '',
      paymentMode: 'cash',
      saleType: 'full',
    });
    setError(null);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleCreateCustomerQuick = async () => {
    const name = newCustomerName.trim();
    const phone = newCustomerPhone.trim();
    if (!name || !phone) {
      alert(t('billing.newCustomerRequired'));
      return;
    }
    setCreatingCustomer(true);
    try {
      const res = await customersAPI.create({
        name,
        phone,
        customer_type: 'retail',
        opening_balance: 0,
        status: 'active',
      });
      const row = res.data;
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).customersList() });
      const fresh = await refreshCustomerRow(row);
      updateActiveBill({ selectedCustomer: fresh });
      {
        let subtotal = 0;
        invoiceItems.forEach((item) => {
          const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
          const price = parseFloat(item.selling_price) || 0;
          subtotal += qty * price;
        });
        const gt = Math.max(0, subtotal - (parseFloat(discount) || 0));
        updateActiveBill({ paidAmount: gt });
      }
      setShowNewCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setShowCustomerDropdown(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create customer');
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Print invoice
  const printInvoice = async (invoiceData = null) => {
    const { grandTotal, remainingDue } = calculateTotals();
    const invNumber = invoiceData?.invoice_number || invoiceNumber || 'DRAFT';
    const customer = invoiceData?.customer_name || (selectedCustomer?.name || customerName || 'Cash Customer');
    const items = invoiceData?.items || invoiceItems;
    const paid = invoiceData?.paid_amount || parseFloat(paidAmount) || 0;
    const disc = invoiceData?.discount || parseFloat(discount) || 0;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print invoice');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invNumber}</title>
          <style>
            @media print {
              @page { margin: 10mm; size: 80mm auto; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              max-width: 80mm;
              margin: 0 auto;
              padding: 10px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .shop-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .shop-info {
              font-size: 11px;
              color: #333;
            }
            .invoice-info {
              margin: 10px 0;
              font-size: 11px;
            }
            .invoice-info div {
              margin: 3px 0;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 11px;
            }
            .items-table th {
              text-align: left;
              border-bottom: 1px solid #000;
              padding: 5px 0;
              font-weight: bold;
            }
            .items-table td {
              padding: 4px 0;
              border-bottom: 1px dotted #ccc;
            }
            .items-table .qty { text-align: center; width: 15%; }
            .items-table .rate { text-align: right; width: 25%; }
            .items-table .total { text-align: right; width: 25%; }
            .totals {
              margin-top: 10px;
              border-top: 2px dashed #000;
              padding-top: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .grand-total {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .due-amount {
              color: #d32f2f;
              font-weight: bold;
              font-size: 13px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${shopName}</div>
            ${shopPhone ? `<div class="shop-info">Phone: ${shopPhone}</div>` : ''}
            ${shopAddress ? `<div class="shop-info">${shopAddress}</div>` : ''}
          </div>
          
          <div class="invoice-info">
            <div><strong>Invoice:</strong> ${invNumber}</div>
            <div><strong>Date:</strong> ${new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</div>
            <div><strong>Customer:</strong> ${customer}</div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="rate">Rate</th>
                <th class="total">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => {
                const itemName = item.product_name || item.name || `Item ${idx + 1}`;
                const qty = item.quantity || 0;
                const rate = item.selling_price || 0;
                const total = qty * rate;
                return `
                  <tr>
                    <td>${itemName}</td>
                    <td class="qty">${qty}</td>
                    <td class="rate">${formatCurrency(rate)}</td>
                    <td class="total">${formatCurrency(total)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            ${disc > 0 ? `<div class="total-row"><span>Subtotal:</span><span>${formatCurrency(grandTotal + disc)}</span></div>` : ''}
            ${disc > 0 ? `<div class="total-row"><span>Discount:</span><span>-${formatCurrency(disc)}</span></div>` : ''}
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>${formatCurrency(grandTotal)}</span>
            </div>
            <div class="total-row">
              <span>Paid Amount:</span>
              <span>${formatCurrency(paid)}</span>
            </div>
            ${remainingDue > 0 ? `<div class="total-row due-amount"><span>Remaining Due:</span><span>${formatCurrency(remainingDue)}</span></div>` : ''}
          </div>
          
          <div class="footer">
            <div>Thank you for your business!</div>
            <div style="margin-top: 5px; font-size: 10px;">Thank you</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount || 0).toFixed(2)}`;
  };

  const showToast = (type, message, ms = 2800) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const invoiceLabel = useMemo(() => {
    if (invoiceNumber) return invoiceNumber;
    const n = bills.findIndex((b) => b.id === activeBillId);
    const idx = n >= 0 ? n + 1 : 1;
    const year = new Date().getFullYear();
    return `INV-${year}-${String(idx).padStart(4, '0')}`;
  }, [invoiceNumber, bills, activeBillId]);

  const { subtotal, grandTotal, remainingDue, change, paid } = calculateTotals();

  if (loading) {
    return (
      <div className="billing-container">
        <PageLoadingCenter message={t('common.loading')} />
      </div>
    );
  }

  return (
    <div
      className={`billing-container ${
        mobilePanel === 'summary' ? 'zb-bill-mobile--summary' : 'zb-bill-mobile--items'
      }`}
    >
      <style>{billingExtraStyles}</style>
      <style>{billingMobileOverrides}</style>
      {toast ? (
        <div className={`zb-toast ${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!stockCheck.ok && invoiceItems.length > 0 && (
        <div className="billing-stock-banner" role="alert">
          {STOCK_ERR(stockCheck.available)}
        </div>
      )}

      {/* Bill tabs (drafts) */}
      <div className="billing-tabs-bar">
        <div className="billing-tabs-left">
          {bills.map((b, idx) => (
            <div
              key={b.id}
              className={`billing-tab ${b.id === activeBillId ? 'active' : ''}`}
              onClick={() => setActiveBillId(b.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveBillId(b.id);
                }
              }}
              title={b.label}
              role="button"
              tabIndex={0}
            >
              <span
                className="billing-tab-dot"
                style={{
                  background: b.invoiceItems?.length ? '#f59e0b' : '#d4cfc8',
                  opacity: b.id === activeBillId ? 1 : b.invoiceItems?.length ? 0.9 : 0.7,
                }}
              />
              <span className="billing-tab-info">
                <span className="billing-tab-title">
                  {b.label} · {b.selectedCustomer?.name || 'Cash'}
                </span>
                <span className="billing-tab-sub">
                  {b.invoiceItems?.length ? formatCurrency((b.invoiceItems || []).reduce((a, it) => a + (Number(it.quantity) || 0) * (Number(it.selling_price) || 0), 0)) : 'Empty'}
                  {b.saleType !== 'full' && b.invoiceItems?.length ? (
                    <span className="billing-credit-badge">{b.saleType === 'credit' ? 'Credit' : 'Partial'}</span>
                  ) : null}
                </span>
              </span>
              <button
                type="button"
                className="billing-tab-x"
                onClick={(e) => {
                  e.stopPropagation();
                  const hasItems = (b.invoiceItems || []).length > 0;
                  if (hasItems && !window.confirm(`${b.label} has unsaved items. Close anyway?`)) return;
                  setBills((prev) => {
                    const next = prev.filter((x) => x.id !== b.id);
                    if (!next.length) return [createDraftBill(1)];
                    return next;
                  });
                  setActiveBillId((cur) => {
                    if (cur !== b.id) return cur;
                    const remaining = bills.filter((x) => x.id !== b.id);
                    return (remaining[remaining.length - 1] || remaining[0] || createDraftBill(1)).id;
                  });
                }}
                aria-label="Close bill"
              >
                ×
              </button>
            </div>
          ))}
          <span className="billing-tab-sep" aria-hidden />
          <button
            type="button"
            className="billing-tab-new"
            onClick={() => {
              const next = createDraftBill(bills.length + 1);
              setBills((prev) => [...prev, next]);
              setActiveBillId(next.id);
              setError(null);
              setCustomerSearchQuery('');
              setShowCustomerDropdown(false);
              setShowNewCustomerModal(false);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
          >
            + {t('billing.newBill')}
          </button>
        </div>
      </div>

      {/* Header with Time and Invoice Info */}
      <div className="billing-header-bar">
        <div className="billing-time-display">
          <div className="billing-date">{currentTime.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
          <div className="billing-time">{currentTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        </div>
        <div className="billing-invoice-display">
          <span>{t('billing.invoiceNumber')}: {invoiceNumber || t('billing.newBill')}</span>
        </div>
        <div className="zb-bill-mobileToggle" role="tablist" aria-label="Billing view">
          <button
            type="button"
            className={mobilePanel === 'items' ? 'is-active' : ''}
            onClick={() => setMobilePanel('items')}
          >
            Items
          </button>
          <button
            type="button"
            className={mobilePanel === 'summary' ? 'is-active' : ''}
            onClick={() => setMobilePanel('summary')}
          >
            Summary
          </button>
        </div>
      </div>

      {/* (moved) customer due alert is shown inside items card like the reference UI */}

      {/* Layout: Left (search + items) + Right panel */}
      <div className="billing-area">
        <div className="left-col">
          {/* Search */}
          <div className="billing-search-section">
            <div className="billing-search-box">
              <span className="billing-search-icon" aria-hidden>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="billing-search-input"
                placeholder={t('billing.searchProducts', {
                  defaultValue: 'Search products by name or SKU…   Press Enter to add first result',
                })}
                value={searchQuery}
                onChange={(e) => updateActiveBill({ searchQuery: e.target.value })}
                onKeyPress={handleSearchKeyPress}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') updateActiveBill({ searchQuery: '', filteredProducts: [] });
                }}
                autoFocus
              />
              {searchQuery?.trim() ? (
                <button
                  type="button"
                  className="billing-search-clear"
                  onClick={() => updateActiveBill({ searchQuery: '', filteredProducts: [] })}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>
            {filteredProducts.length > 0 && (
              <div className="billing-search-results">
                {filteredProducts.map(product => {
                  const displayPrice = selectedCustomer?.customer_type === 'wholesale' && product.wholesale_price
                    ? product.wholesale_price
                    : (selectedCustomer?.customer_type === 'special' && product.special_price
                      ? product.special_price
                      : (product.retail_price || product.selling_price));
                  const outOfStock = parseFloat(product.quantity_in_stock) <= 0;
                  return (
                    <div
                      key={product.product_id}
                      className={`billing-search-result-item ${outOfStock ? 'billing-search-result-item--disabled' : ''}`}
                      onClick={() => {
                        if (outOfStock) {
                          alert(STOCK_ERR(product.quantity_in_stock));
                          return;
                        }
                        handleProductSelect(product);
                      }}
                    >
                      <div className="billing-result-info">
                        <div className="billing-result-name">{product.item_name_english || product.name}</div>
                        <div className="billing-result-meta">
                          <span className="billing-result-stock">{t('inventory.stock')}: {product.quantity_in_stock || 0} {product.unit_type || 'pcs'}</span>
                          <span className="billing-result-price">{formatCurrency(displayPrice)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items card */}
          <div className="billing-items-section">
          <div className="billing-section-header">
            <h3>{t('billing.invoiceItems')}</h3>
            <div className="billing-customer-selector-wrapper">
              <span className="billing-cust-ico" aria-hidden>
                <FontAwesomeIcon icon={faUser} />
              </span>
              <span className="billing-cust-label">{t('billing.customer', { defaultValue: 'Customer' })}</span>
              <div className="billing-customer-dropdown-container">
                <input
                  className="billing-customer-combo"
                  value={
                    showCustomerDropdown
                      ? customerSearchQuery
                      : selectedCustomer?.name || t('billing.cashCustomer', { defaultValue: 'Cash Customer (walk-in)' })
                  }
                  placeholder={t('billing.cashCustomer', { defaultValue: 'Cash Customer (walk-in)' })}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    if (!showCustomerDropdown) setShowCustomerDropdown(true);
                    if (!e.target.value.trim()) updateActiveBill({ selectedCustomer: null });
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  readOnly={false}
                />
                <span className="billing-dropdown-arrow" aria-hidden>
                  ▾
                </span>
                {showCustomerDropdown && (
                  <>
                    <div 
                      className="billing-customer-dropdown-overlay"
                      onClick={() => setShowCustomerDropdown(false)}
                    />
                    <div className="billing-customer-dropdown">
                      <div className="billing-customer-options">
                        <button
                          type="button"
                          className="billing-new-customer-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNewCustomerModal(true);
                          }}
                        >
                          + {t('billing.addNewCustomer', { defaultValue: 'Create new customer' })}
                        </button>
                        <div
                          className={`billing-customer-option ${!selectedCustomer ? 'selected' : ''}`}
                          onClick={() => {
                    updateActiveBill({ selectedCustomer: null, customerName: '' });
                            setCustomerSearchQuery('');
                            setShowCustomerDropdown(false);
                          }}
                        >
                          {t('billing.cashCustomer', { defaultValue: 'Cash Customer (walk-in)' })}
                        </div>
                        {!customerSearchQuery.trim() && (
                          <div className="billing-customer-hint">{t('billing.typeToSearchCustomers')}</div>
                        )}
                        {filteredCustomerRows.map((c) => (
                          <div
                            key={c.customer_id}
                            className={`billing-customer-option ${selectedCustomer?.customer_id === c.customer_id ? 'selected' : ''}`}
                            onClick={async () => {
                              updateActiveBill({ customerName: '' });
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                              const fresh = await refreshCustomerRow(c);
                              updateActiveBill({ selectedCustomer: fresh });

                              const updatedItems = invoiceItems.map((item) => {
                                const product = products.find((p) => p.product_id === item.product_id);
                                if (!product) return item;

                                const customerType = fresh.customer_type || 'walk-in';
                                let newPrice = item.selling_price;

                                if (customerType === 'wholesale' && product.wholesale_price) {
                                  newPrice = product.wholesale_price;
                                } else if (customerType === 'special' && product.special_price) {
                                  newPrice = product.special_price || product.retail_price || product.selling_price;
                                } else {
                                  newPrice = product.retail_price || product.selling_price;
                                }

                                return { ...item, selling_price: newPrice };
                              });
                              updateActiveBill({ invoiceItems: updatedItems });
                              {
                                let subtotal = 0;
                                updatedItems.forEach((item) => {
                                  const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
                                  const price = parseFloat(item.selling_price) || 0;
                                  subtotal += qty * price;
                                });
                                const gt = Math.max(0, subtotal - (parseFloat(discount) || 0));
                                updateActiveBill({ paidAmount: gt });
                              }
                            }}
                          >
                            <span className="billing-customer-avatar" aria-hidden>
                              {(String(c.name || '?')
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((w) => w[0])
                                .join('')
                                .toUpperCase() || 'CU')}
                            </span>
                            <span className="billing-customer-main">
                              <span className="billing-customer-name">{c.name}</span>
                              <span className="billing-customer-meta">
                                {(c.phone || '').trim()}
                                {(c.city || '').trim() ? ` · ${String(c.city).trim()}` : ''}
                              </span>
                            </span>
                            <span
                              className={`billing-customer-duechip ${
                                parseFloat(c.current_due || c.current_balance || 0) > 0 ? 'has-due' : 'no-due'
                              }`}
                            >
                              {parseFloat(c.current_due || c.current_balance || 0) > 0
                                ? formatCurrency(c.current_due || c.current_balance || 0)
                                : t('billing.clear', { defaultValue: 'Clear' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <span className="billing-item-count">
                {invoiceItems.length} {t('billing.items', { defaultValue: 'items' })}
              </span>
              {!selectedCustomer && (
                <input
                  type="text"
                  className="billing-customer-name-input"
                  placeholder={t('billing.enterCustomerName')}
                  value={customerName}
                  onChange={(e) => updateActiveBill({ customerName: e.target.value })}
                />
              )}
            </div>
          </div>

          {selectedCustomer &&
          parseFloat(selectedCustomer.current_due ?? selectedCustomer.current_balance ?? 0) > 0 ? (
            <div className="cust-due-alert" role="status">
              <span className="cda-icon" aria-hidden>
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </span>
              <div className="cda-text">
                <div className="cda-name">{selectedCustomer.name}</div>
                <div className="cda-due">
                  has {formatCurrency(selectedCustomer.current_due ?? selectedCustomer.current_balance ?? 0)} outstanding balance from previous bills
                </div>
              </div>
              <button
                type="button"
                className="cda-clear"
                onClick={() => {
                  updateActiveBill({ selectedCustomer: null, customerName: '' });
                  setCustomerSearchQuery('');
                  setShowCustomerDropdown(false);
                }}
                aria-label="Clear customer"
              >
                ×
              </button>
            </div>
          ) : null}

          <div className="billing-items-table-container">
            <table className="billing-items-table">
              <thead>
                <tr>
                  <th>{t('billing.productName')}</th>
                  <th>{t('billing.qty')}</th>
                  <th>{t('billing.price')}</th>
                  <th>{t('common.total')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="billing-empty-items">
                      <div>{t('billing.noItemsInBill')}</div>
                    </td>
                  </tr>
                ) : (
                  invoiceItems.map((item, index) => {
                    const product = products.find(p => p.product_id === item.product_id);
                    const priceType = itemPriceTypes[item.product_id] || 'retail';
                    const rowAvail = product != null ? parseFloat(product.quantity_in_stock) || 0 : parseFloat(item.stock_available) || 0;
                    const qtyNum = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
                    const stockWarning = qtyNum > rowAvail;
                    
                    return (
                      <tr key={index} className={stockWarning ? 'billing-item-low-stock' : ''}>
                        <td>
                          <div className="billing-item-name">{item.product_name}</div>
                          {stockWarning && (
                            <div className="billing-stock-warning">
                              {STOCK_ERR(rowAvail)}
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={rowAvail}
                            className="billing-qty-input"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            onBlur={(e) => {
                              // Ensure minimum quantity on blur
                              const qty = parseFloat(e.target.value);
                              if (!qty || qty < 0.01) {
                                handleQuantityChange(index, 1);
                              }
                            }}
                          />
                        </td>
                        <td>
                          <div className="billing-price-controls">
                            <select
                              className="billing-price-type-select"
                              value={priceType}
                              onChange={(e) => handlePriceTypeChange(index, e.target.value)}
                            >
                              <option value="retail">{t('billing.retail')}</option>
                              <option value="wholesale">{t('billing.wholesale')}</option>
                              {product?.special_price && <option value="special">{t('billing.special')}</option>}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="billing-price-input"
                              value={item.selling_price}
                              onChange={(e) => handlePriceChange(index, e.target.value)}
                            />
                          </div>
                        </td>
                        <td className="billing-item-total">
                          {formatCurrency(item.quantity * item.selling_price)}
                        </td>
                        <td>
                          <button
                            className="billing-remove-btn-text"
                            onClick={() => handleRemoveItem(index)}
                          >
                            {t('billing.remove')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        </div>

        {/* RIGHT SIDE - Bill Summary */}
        <div className="right-panel">
          <div className="inv-hd">
            <span className="inv-num">{invoiceLabel}</span>
            <span className={`inv-status ${saleType !== 'full' ? 'credit' : 'draft'}`}>
              {saleType !== 'full' ? 'Credit' : 'Draft'}
            </span>
          </div>

          <div className="rp-body">
            <div>
              <div className="sec-lbl">{t('billing.paymentMethod', { defaultValue: 'Payment Method' })}</div>
              <div className="pay-type-row">
                <button
                  type="button"
                  className={`pt-btn ${paymentMode === 'cash' ? 'on' : ''}`}
                  onClick={() => updateActiveBill({ paymentMode: 'cash' })}
                >
                  {t('billing.cash', { defaultValue: 'Cash' })}
                </button>
                <button
                  type="button"
                  className={`pt-btn ${paymentMode === 'card' ? 'on' : ''}`}
                  onClick={() => updateActiveBill({ paymentMode: 'card' })}
                >
                  {t('billing.card', { defaultValue: 'Card' })}
                </button>
                <button
                  type="button"
                  className={`pt-btn ${paymentMode === 'transfer' ? 'on' : ''}`}
                  onClick={() => updateActiveBill({ paymentMode: 'transfer' })}
                >
                  {t('billing.transfer', { defaultValue: 'Transfer' })}
                </button>
              </div>
            </div>

            <div className="rp-sep" />

            <div>
              <div className="sec-lbl">{t('billing.saleType', { defaultValue: 'Sale Type' })}</div>
              <div className="credit-mode-row">
                <button
                  type="button"
                  className={`cm-btn ${saleType === 'full' ? 'on' : ''}`}
                  onClick={() => updateActiveBill({ saleType: 'full' })}
                >
                  {t('billing.fullPayment', { defaultValue: 'Full Payment' })}
                </button>
                <button
                  type="button"
                  className={`cm-btn ${saleType === 'partial' ? 'on' : ''}`}
                  onClick={() => updateActiveBill({ saleType: 'partial' })}
                  disabled={!selectedCustomer}
                  title={!selectedCustomer ? t('billing.selectCustomerForCredit', { defaultValue: 'Select a customer for credit/partial sales.' }) : undefined}
                >
                  {t('billing.partial', { defaultValue: 'Partial' })}
                </button>
                <button
                  type="button"
                  className={`cm-btn ${saleType === 'credit' ? 'on' : ''}`}
                  onClick={() => updateActiveBill({ saleType: 'credit' })}
                  disabled={!selectedCustomer}
                  title={!selectedCustomer ? t('billing.selectCustomerForCredit', { defaultValue: 'Select a customer for credit/partial sales.' }) : undefined}
                >
                  {t('billing.fullCredit', { defaultValue: 'Full Credit' })}
                </button>
              </div>
            </div>

            {saleType !== 'full' ? (
              <div className="credit-banner">
                <div className="cb-t">{saleType === 'credit' ? 'Full Credit Sale' : 'Partial Payment'}</div>
                <div className="cb-s">
                  {saleType === 'credit'
                    ? `${formatCurrency(grandTotal)} will be added to customer's outstanding balance`
                    : 'Remaining balance will be added to customer account'}
                </div>
              </div>
            ) : null}

            <div className="rp-sep" />

            <div className="sec-lbl">{t('billing.billSummary', { defaultValue: 'Bill Summary' })}</div>
            <div className="sum-stack">
              <div className="sum-row">
                <span className="sl">{t('billing.subtotal', { defaultValue: 'Subtotal' })}</span>
                <span className="sv">{formatCurrency(subtotal)}</span>
              </div>
              <div className="sum-row">
                <span className="sl">{t('billing.discount', { defaultValue: 'Discount' })}</span>
                <div className="disc-ctrl">
                  <button type="button" className="disc-tog" disabled>
                    PKR
                  </button>
                  <input
                    className="disc-inp"
                    type="number"
                    value={discount}
                    onChange={(e) => updateActiveBill({ discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>
            </div>

            <div className="grand-block">
              <span className="gb-lbl">{t('billing.grandTotal', { defaultValue: 'Grand Total' })}</span>
              <span className="gb-val">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="rp-sep" />

            <div className="paidSection" style={{ display: saleType === 'credit' ? 'none' : 'block' }}>
              <div className="paid-row">
                <span className="sl">{t('billing.paidNow', { defaultValue: 'Paid Now' })}</span>
                <input
                  className="paid-inp"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => updateActiveBill({ paidAmount: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
              </div>
            </div>

            <div
              className={`bal-chip ${
                saleType === 'credit' ? 'credit' : remainingDue > 0 ? 'due' : change > 0 ? 'change' : 'zero'
              }`}
            >
              <span className="bc-lbl">
                {saleType === 'credit'
                  ? 'ON CREDIT'
                  : remainingDue > 0
                    ? 'BALANCE DUE'
                    : change > 0
                      ? 'CHANGE RETURN'
                      : 'SETTLED ✓'}
              </span>
              <span className="bc-val">
                {saleType === 'credit'
                  ? formatCurrency(grandTotal)
                  : remainingDue > 0
                    ? formatCurrency(remainingDue)
                    : change > 0
                      ? formatCurrency(change)
                      : formatCurrency(0)}
              </span>
            </div>

            <div className="rp-sep" />

            <div>
              <div className="sec-lbl">{t('billing.note', { defaultValue: 'Note' })}</div>
              <textarea
                className="note-ta"
                value={saleNotes}
                onChange={(e) => updateActiveBill({ saleNotes: e.target.value })}
                placeholder={t('billing.invoiceNotePlaceholder', { defaultValue: 'Optional note on this invoice…' })}
              />
            </div>
          </div>

          <div className="rp-actions">
            <button
              className="act-btn btn-save"
              onClick={() => handleSaveInvoice(false)}
              disabled={invoiceItems.length === 0 || saving || readOnly || !stockCheck.ok}
              type="button"
            >
              {t('billing.saveInvoice', { defaultValue: 'Save Invoice' })}
            </button>
            <button
              className="act-btn btn-print"
              onClick={() => handleSaveInvoice(true)}
              disabled={invoiceItems.length === 0 || saving || readOnly || !stockCheck.ok}
              type="button"
            >
              {t('billing.saveAndPrint', { defaultValue: 'Save & Print' })}
            </button>
            <button className="act-btn btn-cancel" onClick={handleCancelBill} disabled={invoiceItems.length === 0} type="button">
              {t('billing.cancelBill', { defaultValue: 'Cancel Bill' })}
            </button>
          </div>
        </div>
      </div>

      {showNewCustomerModal && (
        <div className="modal-overlay" onClick={() => !creatingCustomer && setShowNewCustomerModal(false)}>
          <div className="modal billing-new-customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('billing.addNewCustomer')}</h2>
              <button type="button" className="modal-close" onClick={() => setShowNewCustomerModal(false)} disabled={creatingCustomer}>
                ×
              </button>
            </div>
            <div className="billing-new-customer-form">
              <label className="form-label">{t('billing.customerName')} *</label>
              <input
                type="text"
                className="form-input"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                autoFocus
              />
              <label className="form-label">{t('billing.phoneRequired')} *</label>
              <input
                type="text"
                className="form-input"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewCustomerModal(false)} disabled={creatingCustomer}>
                  {t('common.cancel')}
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCreateCustomerQuick} disabled={creatingCustomer}>
                  {creatingCustomer ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
