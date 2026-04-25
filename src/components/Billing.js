import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { productsAPI, salesAPI, settingsAPI, customersAPI } from '../services/api';
import './Billing.css';

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
  // Core state
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [loading, setLoading] = useState(true);
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
    fetchData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchCustomers(),
        fetchSettings()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      // Don't filter by stock - allow all products
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers((response.data || []).filter(c => c.status === 'active'));
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get();
      const data = response.data;
      if (data.other_app_settings) {
        const otherSettings = typeof data.other_app_settings === 'string' 
          ? JSON.parse(data.other_app_settings) 
          : data.other_app_settings;
        setShopName(otherSettings.shop_name || 'My Shop');
        setShopPhone(otherSettings.shop_phone || '');
        setShopAddress(otherSettings.shop_address || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

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
      return;
    }
    const p = parseFloat(paidAmount) || 0;
    if (p > grandTotal) setPaidAmount(grandTotal);
  }, [invoiceItems, discount, selectedCustomer]);

  // Handle save invoice
  const handleSaveInvoice = async (shouldPrint = false) => {
    if (invoiceItems.length === 0) {
      alert(t('billing.addAtLeastOneItem'));
      return;
    }

    let freshProducts = products;
    try {
      const pr = await productsAPI.getAll();
      freshProducts = pr.data || [];
      setProducts(freshProducts);
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
        payment_mode: 'cash',
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

      // Refresh products to update stock
      await fetchProducts();
      await fetchCustomers();

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
      setCustomers((prev) => [...prev, row].sort((a, b) => (parseFloat(b.current_due) || 0) - (parseFloat(a.current_due) || 0)));
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

  const { subtotal, discountAmount, grandTotal, remainingDue, change, paid } = calculateTotals();

  if (loading) {
    return (
      <div className="billing-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="billing-container">
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

      {/* Header with Time and Invoice Info */}
      <div className="billing-header-bar">
        <div className="billing-time-display">
          <div className="billing-date">{currentTime.toLocaleDateString('en-PK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
          <div className="billing-time">{currentTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        </div>
        <div className="billing-invoice-display">
          <span>{t('billing.invoiceNumber')}: {invoiceNumber || t('billing.newBill')}</span>
        </div>
      </div>

      {selectedCustomer && (
        <div
          className={`billing-outstanding-box ${
            parseFloat(selectedCustomer.current_due ?? selectedCustomer.current_balance ?? 0) > 0
              ? 'billing-outstanding-box--due'
              : 'billing-outstanding-box--clear'
          }`}
        >
          <div className="billing-outstanding-box__label">{t('billing.outstandingBalance')}</div>
          <div className="billing-outstanding-box__name">{selectedCustomer.name}</div>
          <div className="billing-outstanding-box__amount">
            {formatCurrency(selectedCustomer.current_due ?? selectedCustomer.current_balance ?? 0)}
          </div>
        </div>
      )}

      {/* Top Search Bar */}
      <div className="billing-search-section">
        <div className="billing-search-box">
          <span className="billing-search-icon">⚡</span>
          <input
            ref={searchInputRef}
            type="text"
            className="billing-search-input"
            placeholder={t('billing.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            autoFocus
          />
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

      {/* Main Layout: Left (Items) + Right (Summary) */}
      <div className="billing-main-layout">
        {/* LEFT SIDE - Bill Items Table */}
        <div className="billing-items-section">
          <div className="billing-section-header">
            <h3>{t('billing.invoiceItems')}</h3>
            <div className="billing-customer-selector-wrapper">
              <div className="billing-customer-dropdown-container">
                <div 
                  className="billing-customer-select-trigger"
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                >
                  {selectedCustomer ? selectedCustomer.name : t('billing.cashCustomer')}
                  <span className="billing-dropdown-arrow">▼</span>
                </div>
                {showCustomerDropdown && (
                  <>
                    <div 
                      className="billing-customer-dropdown-overlay"
                      onClick={() => setShowCustomerDropdown(false)}
                    />
                    <div className="billing-customer-dropdown">
                      <input
                        type="text"
                        className="billing-customer-search-input"
                        placeholder={t('billing.searchCustomer')}
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      <div className="billing-customer-options">
                        <button
                          type="button"
                          className="billing-new-customer-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNewCustomerModal(true);
                          }}
                        >
                          + {t('billing.addNewCustomer')}
                        </button>
                        <div
                          className={`billing-customer-option ${!selectedCustomer ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedCustomer(null);
                            setCustomerName('');
                            setCustomerSearchQuery('');
                            setShowCustomerDropdown(false);
                          }}
                        >
                          {t('billing.cashCustomer')}
                        </div>
                        {!customerSearchQuery.trim() && (
                          <div className="billing-customer-hint">{t('billing.typeToSearchCustomers')}</div>
                        )}
                        {filteredCustomerRows.map((c) => (
                          <div
                            key={c.customer_id}
                            className={`billing-customer-option ${selectedCustomer?.customer_id === c.customer_id ? 'selected' : ''}`}
                            onClick={async () => {
                              setCustomerName('');
                              setCustomerSearchQuery('');
                              setShowCustomerDropdown(false);
                              const fresh = await refreshCustomerRow(c);
                              setSelectedCustomer(fresh);

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
                              setInvoiceItems(updatedItems);
                              {
                                let subtotal = 0;
                                updatedItems.forEach((item) => {
                                  const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
                                  const price = parseFloat(item.selling_price) || 0;
                                  subtotal += qty * price;
                                });
                                const gt = Math.max(0, subtotal - (parseFloat(discount) || 0));
                                setPaidAmount(gt);
                              }
                            }}
                          >
                            {c.name} {c.customer_type ? `(${c.customer_type})` : ''}{' '}
                            <span className="billing-customer-phone">{c.phone || ''}</span>
                            {parseFloat(c.current_due || c.current_balance || 0) > 0 && (
                              <span className="billing-customer-due">
                                {t('billing.due')}: {formatCurrency(c.current_due || c.current_balance || 0)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {!selectedCustomer && (
                <input
                  type="text"
                  className="billing-customer-name-input"
                  placeholder={t('billing.enterCustomerName')}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              )}
            </div>
          </div>

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

        {/* RIGHT SIDE - Bill Summary */}
        <div className="billing-summary-section">
          <div className="billing-summary-header">
            <h3>{t('billing.billSummary')}</h3>
          </div>

          <div className="billing-summary-content">
            <div className="billing-summary-row">
              <span className="billing-summary-label">{t('billing.subtotal')}:</span>
              <span className="billing-summary-value">{formatCurrency(subtotal)}</span>
            </div>

            <div className="billing-summary-row">
              <label className="billing-summary-label">{t('billing.discount')}:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="billing-discount-input"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.00"
              />
            </div>

            <div className="billing-summary-row billing-grand-total">
              <span className="billing-summary-label">{t('billing.grandTotal')}:</span>
              <span className="billing-summary-value">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="billing-summary-row">
              <label className="billing-summary-label">{t('billing.paidAmount')}:</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="billing-paid-input"
                value={paidAmount}
                onChange={(e) => {
                  const paid = Math.max(0, parseFloat(e.target.value) || 0);
                  setPaidAmount(paid);
                }}
                placeholder="0.00"
              />
            </div>

            <div className="billing-summary-row billing-notes-row">
              <label className="billing-summary-label">{t('billing.invoiceNote')}:</label>
              <textarea
                className="billing-sale-notes"
                rows={2}
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder={t('billing.invoiceNotePlaceholder')}
              />
            </div>

            {paid > 0 && (
              <div className="billing-summary-row billing-paid-display">
                <span className="billing-summary-label">{t('billing.amountPaid')}:</span>
                <span className="billing-summary-value">{formatCurrency(paid)}</span>
              </div>
            )}

            {change > 0 && (
              <div className="billing-summary-row billing-change-display">
                <span className="billing-summary-label">{t('billing.changeToReturn')}:</span>
                <span className="billing-summary-value">{formatCurrency(change)}</span>
              </div>
            )}

            {remainingDue > 0 && (
              <div className="billing-summary-row billing-remaining-due">
                <span className="billing-summary-label">{t('billing.remainingDue')}:</span>
                <span className="billing-summary-value">{formatCurrency(remainingDue)}</span>
              </div>
            )}

            {remainingDue === 0 && grandTotal > 0 && (
              <div className="billing-summary-row billing-paid-full">
                <span className="billing-summary-label">✅ {t('billing.fullyPaid')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="billing-action-buttons">
            <button
              className="billing-btn billing-btn-save"
              onClick={() => handleSaveInvoice(false)}
              disabled={invoiceItems.length === 0 || saving || readOnly || !stockCheck.ok}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button
              className="billing-btn billing-btn-save-print"
              onClick={() => handleSaveInvoice(true)}
              disabled={invoiceItems.length === 0 || saving || readOnly || !stockCheck.ok}
            >
              {saving ? t('common.loading') : t('billing.saveAndPrint')}
            </button>
            <button
              className="billing-btn billing-btn-cancel"
              onClick={handleCancelBill}
              disabled={invoiceItems.length === 0}
            >
              {t('common.cancel')}
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
