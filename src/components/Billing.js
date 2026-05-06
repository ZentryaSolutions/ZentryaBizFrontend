import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { salesAPI, customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import {
  fetchInventoryBundle,
  fetchCustomersList,
  fetchSettingsDoc,
} from '../lib/workspaceQueries';
import PageLoadingCenter from './PageLoadingCenter';
import { billingWorkspaceStyles } from '../styles/billingWorkspaceStyles';

const STOCK_ERR = (avail) =>
  `Insufficient stock. Available: ${Number(avail || 0)} units. Please add stock first.`;

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

  const { data: bundle, isLoading: invLoading } = useQuery({
    queryKey: zbKeys(activeShopId).inventoryBundle(),
    queryFn: fetchInventoryBundle,
    enabled: Boolean(activeShopId),
  });
  const products = useMemo(() => bundle?.products ?? [], [bundle?.products]);

  const { data: customersRaw = [], isLoading: custLoading } = useQuery({
    queryKey: zbKeys(activeShopId).customersList(),
    queryFn: fetchCustomersList,
    enabled: Boolean(activeShopId),
  });
  const customers = useMemo(
    () => (customersRaw || []).filter((c) => c.status === 'active'),
    [customersRaw]
  );

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: zbKeys(activeShopId).settingsDoc(),
    queryFn: fetchSettingsDoc,
    enabled: Boolean(activeShopId),
  });

  // Core state
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [shopName, setShopName] = useState('My Shop');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [saleNotes, setSaleNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // cash | card | transfer
  const [creditMode, setCreditMode] = useState('full'); // full | partial | credit
  
  // Price type per item
  const [itemPriceTypes, setItemPriceTypes] = useState({});
  
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
      setFilteredProducts([]);
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

    setFilteredProducts(filtered.slice(0, 10)); // Limit to 10 results
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
      setInvoiceItems(updatedItems);
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
      setInvoiceItems([...invoiceItems, newItem]);
      setItemPriceTypes({ ...itemPriceTypes, [product.product_id]: priceType });
    }

    setSearchQuery('');
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
      setInvoiceItems(updatedItems);
    } else if (value === '' || value === null || value === undefined) {
      updatedItems[index].quantity = '';
      setInvoiceItems(updatedItems);
    }
  };

  // Update item price
  const handlePriceChange = (index, value) => {
    const updatedItems = [...invoiceItems];
    const price = parseFloat(value) || 0;
    if (price > 0) {
      updatedItems[index].selling_price = price;
      setInvoiceItems(updatedItems);
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
    setInvoiceItems(updatedItems);
    setItemPriceTypes({ ...itemPriceTypes, [item.product_id]: priceType });
  };

  // Remove item
  const handleRemoveItem = (index) => {
    const updatedItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(updatedItems);
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
      setPaidAmount(grandTotal);
      setCreditMode('full');
      return;
    }
    const p = parseFloat(paidAmount) || 0;
    if (p > grandTotal) setPaidAmount(grandTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync paid cap when totals change; full deps would thrash paid edits
  }, [invoiceItems, discount, selectedCustomer]);

  useEffect(() => {
    const { grandTotal } = calculateTotals();
    if (!selectedCustomer) {
      setCreditMode('full');
      return;
    }
    const paid = parseFloat(paidAmount) || 0;
    if (grandTotal <= 0) {
      setCreditMode('full');
      return;
    }
    if (paid <= 0.00001) setCreditMode('credit');
    else if (paid + 0.00001 < grandTotal) setCreditMode('partial');
    else setCreditMode('full');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived credit mode from paid/grandTotal; keep stable
  }, [paidAmount, invoiceItems, discount, selectedCustomer]);

  // Handle save invoice
  const handleSaveInvoice = async (shouldPrint = false) => {
    if (invoiceItems.length === 0) {
      alert(t('billing.addAtLeastOneItem'));
      return;
    }

    let freshProducts = products;
    try {
      const row = await queryClient.fetchQuery({
        queryKey: zbKeys(activeShopId).inventoryBundle(),
        queryFn: fetchInventoryBundle,
      });
      freshProducts = row?.products || [];
    } catch (e) {
      console.error(e);
    }
    const finalStock = validateCartAgainstStock(invoiceItems, freshProducts);
    if (!finalStock.ok) {
      const msg = STOCK_ERR(finalStock.available);
      setError(msg);
      alert(msg);
      return;
    }
    setError(null);

    const { grandTotal } = calculateTotals();
    const paid = parseFloat(paidAmount) || 0;

    if (!selectedCustomer && grandTotal > 0 && paid + 0.00001 < grandTotal) {
      alert(t('billing.selectCustomerForCredit'));
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
      setInvoiceNumber(savedInvoice.invoice_number);

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

      alert(t('billing.invoiceSaved', { invoiceNumber: savedInvoice.invoice_number }));
    } catch (err) {
      console.error('Error saving invoice:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || 'Failed to save invoice';
      setError(errorMsg);
      alert(errorMsg);
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
    setInvoiceItems([]);
    setSelectedCustomer(null);
    setCustomerName('');
    setDiscount(0);
    setPaidAmount(0);
    setSearchQuery('');
    setSaleNotes('');
    setItemPriceTypes({});
    setError(null);
    setPaymentMode('cash');
    setCreditMode('full');
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
      setSelectedCustomer(fresh);
      {
        let subtotal = 0;
        invoiceItems.forEach((item) => {
          const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
          const price = parseFloat(item.selling_price) || 0;
          subtotal += qty * price;
        });
        const gt = Math.max(0, subtotal - (parseFloat(discount) || 0));
        setPaidAmount(gt);
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

  const { subtotal, grandTotal, change, paid } = calculateTotals();

  if (loading) {
    return (
      <div className="billing-container">
        <PageLoadingCenter message={t('common.loading')} />
      </div>
    );
  }

  const portal = (node) => createPortal(node, document.body);

  const due = grandTotal - paid;
  const isFullCredit = selectedCustomer && creditMode === 'credit';
  const showPaidSection = !isFullCredit;
  const invStatus = invoiceNumber ? 'saved' : selectedCustomer && creditMode !== 'full' ? 'credit' : 'draft';

  const fmt = (n) =>
    `PKR ${Math.round(Number(n || 0)).toLocaleString('en-PK')}`;

  const quickPays = (() => {
    if (paymentMode !== 'cash' || !showPaidSection || grandTotal <= 0) return [];
    const rounds = [grandTotal, Math.ceil(grandTotal / 100) * 100, Math.ceil(grandTotal / 500) * 500, Math.ceil(grandTotal / 1000) * 1000];
    return [...new Set(rounds)].slice(0, 4);
  })();

  return (
    <div className="content-container bil2">
      <style>{billingWorkspaceStyles}</style>

      {error ? <div className="bil2-err">{error}</div> : null}

      <div className="bil2-tabbar" role="tablist">
        <div className="bil2-tab active" role="tab" aria-selected="true">
          <span className="bil2-tabdot" />
          <div className="bil2-tabinfo">
            <div className="bil2-tablabel">{`Bill #1 · ${selectedCustomer?.name || t('billing.cashCustomer')}`}</div>
            <div className="bil2-tabsub">
              {invoiceItems.length === 0 ? 'Empty' : fmt(subtotal)}
              {selectedCustomer && creditMode !== 'full' && invoiceItems.length ? (
                <span className="bil2-creditbadge">{creditMode === 'credit' ? 'Credit' : 'Partial'}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="bil2-tabsep" />
        <button
          type="button"
          className="bil2-newtab"
          onClick={() => {
            if (invoiceItems.length && !window.confirm('Start a new bill? Current bill will be cleared.')) return;
            resetForm();
          }}
        >
          + New Bill
        </button>
        <div className="bil2-clock" aria-label="Live clock">
          <div className="bil2-ctime">{currentTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</div>
          <div className="bil2-cdate">{currentTime.toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="bil2-area">
        <div className="bil2-left">
          <div className="bil2-searchcard">
            <div className="bil2-srchrow">
              <span className="bil2-srchico">🔎</span>
              <input
                ref={searchInputRef}
                className="bil2-srchin"
                placeholder={`${t('billing.searchProducts')}  ·  Press Enter to add first result`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => handleSearchKeyPress(e)}
                autoComplete="off"
              />
            </div>
            {filteredProducts.length > 0 ? (
              <div className="bil2-drop">
                {filteredProducts.map((p, idx) => {
                  const outOfStock = parseFloat(p.quantity_in_stock) <= 0;
                  const displayPrice =
                    selectedCustomer?.customer_type === 'wholesale' && p.wholesale_price
                      ? p.wholesale_price
                      : selectedCustomer?.customer_type === 'special' && p.special_price
                        ? p.special_price
                        : p.retail_price || p.selling_price || 0;
                  return (
                    <div
                      key={p.product_id}
                      className={`bil2-droprow ${idx === 0 ? 'hi' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (outOfStock) {
                          alert(STOCK_ERR(p.quantity_in_stock));
                          return;
                        }
                        handleProductSelect(p);
                      }}
                    >
                      <div className="bil2-drthumb">📦</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bil2-drname">{p.item_name_english || p.name}</div>
                        <div className="bil2-drsku">
                          {t('inventory.stock')}: {p.quantity_in_stock || 0} {p.unit_type || 'pcs'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="bil2-drprice">{fmt(displayPrice)}</div>
                        <div className="bil2-drstock">per {p.unit_type || 'pcs'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="bil2-items">
            <div className="bil2-custbar">
              <div className="bil2-crow">
                <span className="bil2-cico">👤</span>
                <span className="bil2-clbl">Customer</span>
                <div className="bil2-combowrap">
                  <input
                    className="bil2-comboinp"
                    placeholder={t('billing.cashCustomer')}
                    value={selectedCustomer ? selectedCustomer.name : customerSearchQuery}
                    onChange={(e) => {
                      setSelectedCustomer(null);
                      setCustomerName('');
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    autoComplete="off"
                  />
                  <span className="bil2-comboarrow">▾</span>
                  {showCustomerDropdown ? (
                    <div className="bil2-cdrop" onMouseDown={(e) => e.preventDefault()}>
                      {(filteredCustomerRows || []).slice(0, 8).map((c) => {
                        const dueAmt = parseFloat(c.current_due ?? c.current_balance ?? 0) || 0;
                        return (
                          <div
                            key={c.customer_id}
                            className="bil2-cdrow"
                            onMouseDown={async (e) => {
                              e.preventDefault();
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                              const fresh = await refreshCustomerRow(c);
                              setSelectedCustomer(fresh);
                              const updatedItems = invoiceItems.map((item) => {
                                const prod = products.find((p) => p.product_id === item.product_id);
                                if (!prod) return item;
                                const customerType = fresh.customer_type || 'walk-in';
                                let newPrice = item.selling_price;
                                if (customerType === 'wholesale' && prod.wholesale_price) newPrice = prod.wholesale_price;
                                else if (customerType === 'special' && prod.special_price) newPrice = prod.special_price || prod.retail_price || prod.selling_price;
                                else newPrice = prod.retail_price || prod.selling_price;
                                return { ...item, selling_price: newPrice };
                              });
                              setInvoiceItems(updatedItems);
                              setPaidAmount(Math.max(0, updatedItems.reduce((s, it) => s + (parseFloat(it.selling_price) || 0) * (parseFloat(it.quantity) || 0), 0) - (parseFloat(discount) || 0)));
                            }}
                          >
                            <div className="bil2-cdav">{(c.name || 'C').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="bil2-cdname">{c.name}</div>
                              <div className="bil2-cdphone">{c.phone || ''}</div>
                            </div>
                            <div className={`bil2-cddue ${dueAmt > 0 ? 'has' : 'none'}`}>{dueAmt > 0 ? fmt(dueAmt) : 'Clear'}</div>
                          </div>
                        );
                      })}
                      <div
                        className="bil2-cdcreate"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowCustomerDropdown(false);
                          setShowNewCustomerModal(true);
                        }}
                      >
                        <div className="bil2-cdcreateico">+</div>
                        <span className="bil2-cdcreatelbl">Create new customer</span>
                      </div>
                      <div
                        className="bil2-cdrow"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCustomer(null);
                          setCustomerName('');
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <div className="bil2-cdav">CC</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="bil2-cdname">{t('billing.cashCustomer')}</div>
                          <div className="bil2-cdphone">Walk-in</div>
                        </div>
                        <div className="bil2-cddue none">Clear</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <span className="bil2-itemcount">{invoiceItems.length} items</span>
              </div>
            </div>

            <div className="bil2-thead" style={{ display: invoiceItems.length ? 'grid' : 'none' }}>
              <div className="bil2-th">Product</div>
              <div className="bil2-th" style={{ textAlign: 'center' }}>
                Qty
              </div>
              <div className="bil2-th" style={{ textAlign: 'center' }}>
                Unit Price
              </div>
              <div className="bil2-th" style={{ textAlign: 'right', paddingRight: 4 }}>
                Total
              </div>
              <div />
            </div>

            <div className="bil2-scroll">
              {invoiceItems.length === 0 ? (
                <div className="bil2-empty">
                  <div className="bil2-emptyt">No items yet</div>
                  <div className="bil2-emptys">Search products above or press Enter to add first result</div>
                  <div className="bil2-emptys">
                    <span className="bil2-kbd">Enter</span> first result · <span className="bil2-kbd">Ctrl+T</span> new bill
                  </div>
                </div>
              ) : (
                invoiceItems.map((item, index) => {
                  const prod = products.find((p) => p.product_id === item.product_id);
                  const rowAvail = prod != null ? parseFloat(prod.quantity_in_stock) || 0 : parseFloat(item.stock_available) || 0;
                  const priceType = itemPriceTypes[item.product_id] || 'retail';
                  const qtyNum = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
                  return (
                    <div className="bil2-row" key={item.product_id}>
                      <div style={{ minWidth: 0, paddingRight: 8 }}>
                        <div className="bil2-itname">{item.product_name}</div>
                        <div className="bil2-itsku">
                          {rowAvail} {item.unit_type || 'pcs'} in stock
                        </div>
                      </div>
                      <div className="bil2-qtywrap">
                        <button type="button" className="bil2-qtybtn" onClick={() => handleQuantityChange(index, Math.max(0.01, qtyNum - 1))}>
                          −
                        </button>
                        <input
                          className="bil2-qtynum"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={rowAvail}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                        />
                        <button type="button" className="bil2-qtybtn" onClick={() => handleQuantityChange(index, qtyNum + 1)}>
                          +
                        </button>
                      </div>
                      <div className="bil2-pricewrap">
                        <select className="bil2-ptype" value={priceType} onChange={(e) => handlePriceTypeChange(index, e.target.value)}>
                          <option value="retail">{t('billing.retail')}</option>
                          <option value="wholesale">{t('billing.wholesale')}</option>
                          {prod?.special_price ? <option value="special">{t('billing.special')}</option> : null}
                        </select>
                        <input className="bil2-price" type="number" step="0.01" min="0" value={item.selling_price} onChange={(e) => handlePriceChange(index, e.target.value)} />
                      </div>
                      <div className="bil2-total">{fmt(qtyNum * (parseFloat(item.selling_price) || 0))}</div>
                      <button type="button" className="bil2-del" onClick={() => handleRemoveItem(index)} title="Remove">
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bil2-foot" style={{ display: invoiceItems.length ? 'flex' : 'none' }}>
              <span className="bil2-footlbl">Subtotal</span>
              <span className="bil2-footval">{fmt(subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="bil2-right">
          <div className="bil2-invhd">
            <span className="bil2-invnum">{invoiceNumber || 'INV-—'}</span>
            <span className={`bil2-ist ${invStatus}`}>{invStatus === 'saved' ? 'Saved' : invStatus === 'credit' ? 'Credit' : 'Draft'}</span>
          </div>

          <div className="bil2-rp">
            <div>
              <div className="bil2-seclbl" style={{ marginBottom: 8 }}>
                Payment Method
              </div>
              <div className="bil2-payrow">
                <button type="button" className={`bil2-pt ${paymentMode === 'cash' ? 'on' : ''}`} onClick={() => setPaymentMode('cash')}>
                  Cash
                </button>
                <button type="button" className={`bil2-pt ${paymentMode === 'card' ? 'on' : ''}`} onClick={() => setPaymentMode('card')}>
                  Card
                </button>
                <button type="button" className={`bil2-pt ${paymentMode === 'transfer' ? 'on' : ''}`} onClick={() => setPaymentMode('transfer')}>
                  Transfer
                </button>
              </div>
            </div>

            <div className="bil2-sep" />

            <div>
              <div className="bil2-seclbl" style={{ marginBottom: 8 }}>
                Sale Type
              </div>
              <div className="bil2-cmrow">
                <button
                  type="button"
                  className={`bil2-cm ${creditMode === 'full' ? 'on' : ''}`}
                  onClick={() => {
                    setCreditMode('full');
                    if (!selectedCustomer) return;
                    setPaidAmount(grandTotal);
                  }}
                >
                  Full Payment
                </button>
                <button
                  type="button"
                  className={`bil2-cm ${creditMode === 'partial' ? 'on' : ''}`}
                  onClick={() => {
                    if (!selectedCustomer) {
                      alert(t('billing.selectCustomerForCredit'));
                      return;
                    }
                    setCreditMode('partial');
                    setPaidAmount(Math.min(parseFloat(paidAmount) || 0, grandTotal));
                  }}
                >
                  Partial
                </button>
                <button
                  type="button"
                  className={`bil2-cm ${creditMode === 'credit' ? 'on' : ''}`}
                  onClick={() => {
                    if (!selectedCustomer) {
                      alert(t('billing.selectCustomerForCredit'));
                      return;
                    }
                    setCreditMode('credit');
                    setPaidAmount(0);
                  }}
                >
                  Full Credit
                </button>
              </div>
            </div>

            {selectedCustomer && creditMode !== 'full' ? (
              <div className="bil2-banner">
                <div>
                  <strong>{creditMode === 'credit' ? 'Credit Sale' : 'Partial Payment'}</strong>
                  <span>
                    {creditMode === 'credit'
                      ? 'Full amount will be added to customer outstanding balance'
                      : 'Remaining balance will be added to customer account'}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="bil2-sep" />

            <div className="bil2-seclbl">Bill Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="bil2-sumrow">
                <span className="bil2-sl">Subtotal</span>
                <span className="bil2-sv">{fmt(subtotal)}</span>
              </div>
              <div className="bil2-sumrow">
                <span className="bil2-sl">Discount</span>
                <div className="bil2-discctrl">
                  <button type="button" className="bil2-disctog">
                    PKR
                  </button>
                  <input className="bil2-discinp" type="number" value={discount} min={0} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>
            </div>

            <div className="bil2-grand">
              <span>Grand Total</span>
              <span>{fmt(grandTotal)}</span>
            </div>

            <div className="bil2-sep" />

            {showPaidSection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div className="bil2-paidrow">
                  <span className="bil2-sl">Paid Now</span>
                  <input
                    className="bil2-paidinp"
                    type="number"
                    value={paidAmount}
                    min={0}
                    max={grandTotal}
                    onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    disabled={!selectedCustomer && grandTotal > 0}
                  />
                </div>
                {quickPays.length ? (
                  <div className="bil2-qp">
                    {quickPays.map((v) => (
                      <button key={v} type="button" className="bil2-qpbtn" onClick={() => setPaidAmount(v)}>
                        {v === grandTotal ? 'Exact' : fmt(v)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className={`bil2-bal ${
                isFullCredit ? 'credit' : due > 0.00001 ? (creditMode === 'partial' ? 'credit' : 'due') : change > 0.00001 ? 'change' : 'zero'
              }`}
            >
              <span className="lbl">{isFullCredit ? 'ON CREDIT' : due > 0.00001 ? creditMode === 'partial' ? 'CREDIT OUTSTANDING' : 'BALANCE DUE' : change > 0.00001 ? 'CHANGE RETURN' : 'SETTLED ✓'}</span>
              <span className="val">{fmt(isFullCredit ? grandTotal : due > 0.00001 ? due : change > 0.00001 ? change : 0)}</span>
            </div>

            <div className="bil2-sep" />

            <div>
              <div className="bil2-seclbl" style={{ marginBottom: 7 }}>
                Note
              </div>
              <textarea className="bil2-note" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder={t('billing.invoiceNotePlaceholder')} />
            </div>
          </div>

          <div className="bil2-actions">
            <button type="button" className="bil2-act bil2-save" onClick={() => handleSaveInvoice(false)} disabled={invoiceItems.length === 0 || saving || readOnly || !stockCheck.ok}>
              {saving ? t('common.loading') : 'Save Invoice'}
            </button>
            <button type="button" className="bil2-act bil2-print" onClick={() => handleSaveInvoice(true)} disabled={invoiceItems.length === 0 || saving || readOnly || !stockCheck.ok}>
              {saving ? t('common.loading') : 'Save & Print'}
            </button>
            <button type="button" className="bil2-act bil2-cancel" onClick={handleCancelBill} disabled={invoiceItems.length === 0}>
              Cancel Bill
            </button>
          </div>
        </div>
      </div>

      {showNewCustomerModal
        ? portal(
            <div className="bil2-ov" onMouseDown={() => !creatingCustomer && setShowNewCustomerModal(false)}>
              <div className="bil2-modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="bil2-mhd">
                  <div>
                    <div className="bil2-mt">{t('billing.addNewCustomer')}</div>
                    <div className="bil2-ms">They'll be added to your customer list</div>
                  </div>
                  <button type="button" className="bil2-mx" onClick={() => setShowNewCustomerModal(false)} disabled={creatingCustomer}>
                    ×
                  </button>
                </div>
                <div className="bil2-mbody">
                  <div className="bil2-fi">
                    <label>{t('billing.customerName')} *</label>
                    <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} autoFocus />
                  </div>
                  <div className="bil2-fi">
                    <label>{t('billing.phoneRequired')} *</label>
                    <input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                  </div>
                </div>
                <div className="bil2-mft">
                  <button type="button" className="bil2-btnc" onClick={() => setShowNewCustomerModal(false)} disabled={creatingCustomer}>
                    {t('common.cancel')}
                  </button>
                  <button type="button" className="bil2-btns" onClick={handleCreateCustomerQuick} disabled={creatingCustomer}>
                    {creatingCustomer ? t('common.loading') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )
        : null}
    </div>
  );
};

export default Billing;
