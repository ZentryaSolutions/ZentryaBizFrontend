import React, { useState, useEffect } from 'react';
import { salesAPI } from '../services/api';
import Pagination from './Pagination';
import './Invoices.css';

const Invoices = ({ readOnly = false }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll();
      setInvoices(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.response?.data?.error || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(query) ||
      inv.customer_name?.toLowerCase().includes(query) ||
      inv.date?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch invoice details
  const handleViewInvoice = async (invoiceId) => {
    try {
      const response = await salesAPI.getById(invoiceId);
      setSelectedInvoice(response.data);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      alert('Failed to load invoice details');
    }
  };

  // Print invoice
  const handlePrintInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print invoice');
      return;
    }

    const invoiceData = selectedInvoice || invoice;
    const items = invoiceData.items || [];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.invoice_number}</title>
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
            <div class="shop-name">${invoiceData.shop_name || 'My Shop'}</div>
          </div>
          
          <div class="invoice-info">
            <div><strong>Invoice:</strong> ${invoiceData.invoice_number}</div>
            <div><strong>Date:</strong> ${formatDate(invoiceData.date)}</div>
            <div><strong>Customer:</strong> ${invoiceData.customer_name || 'Cash Customer'}</div>
            ${invoiceData.payment_mode ? `<div><strong>Payment Mode:</strong> ${invoiceData.payment_mode}</div>` : ''}
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
            ${invoiceData.discount > 0 ? `<div class="total-row"><span>Subtotal:</span><span>${formatCurrency((invoiceData.total_amount || 0) + (invoiceData.discount || 0))}</span></div>` : ''}
            ${invoiceData.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-${formatCurrency(invoiceData.discount)}</span></div>` : ''}
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>${formatCurrency(invoiceData.total_amount)}</span>
            </div>
            <div class="total-row">
              <span>Paid Amount:</span>
              <span>${formatCurrency(invoiceData.paid_amount)}</span>
            </div>
            ${(invoiceData.total_amount - invoiceData.paid_amount) > 0 ? `<div class="total-row due-amount"><span>Remaining Due:</span><span>${formatCurrency(invoiceData.total_amount - invoiceData.paid_amount)}</span></div>` : ''}
          </div>
          
          <div class="footer">
            <div>Thank you for your business!</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (loading) {
    return (
      <div className="content-container">
        <div className="loading">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <p className="page-subtitle">View and manage all invoices</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Search Invoices</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by invoice number, customer name, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '14px', width: '100%' }}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="card-header">
          <h2>All Invoices ({filteredInvoices.length})</h2>
        </div>
        <div className="table-container">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Paid Amount</th>
                <th>Due</th>
                <th>Payment Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    {searchQuery ? 'No invoices found matching your search' : 'No invoices found'}
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map(invoice => {
                  const due = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
                  return (
                    <tr key={invoice.sale_id}>
                      <td><strong>{invoice.invoice_number}</strong></td>
                      <td>{formatDate(invoice.date)}</td>
                      <td>{invoice.customer_name || 'Cash Customer'}</td>
                      <td>{formatCurrency(invoice.total_amount)}</td>
                      <td>{formatCurrency(invoice.paid_amount)}</td>
                      <td>
                        {due > 0 ? (
                          <span className="due-badge">{formatCurrency(due)}</span>
                        ) : (
                          <span className="paid-badge">Paid</span>
                        )}
                      </td>
                      <td>{invoice.payment_mode || 'cash'}</td>
                      <td>
                        <div className="invoice-actions">
                          <button
                            className="btn-view"
                            onClick={() => handleViewInvoice(invoice.sale_id)}
                          >
                            View
                          </button>
                          <button
                            className="btn-print"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredInvoices.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal invoice-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details - {selectedInvoice.invoice_number}</h2>
              <button className="modal-close" onClick={() => setSelectedInvoice(null)}>×</button>
            </div>
            <div className="modal-content">
              <div className="invoice-detail-info">
                <div><strong>Date:</strong> {formatDate(selectedInvoice.date)}</div>
                <div><strong>Customer:</strong> {selectedInvoice.customer_name || 'Cash Customer'}</div>
                <div><strong>Payment Mode:</strong> {selectedInvoice.payment_mode || 'cash'}</div>
              </div>
              
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name || item.name || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.selling_price)}</td>
                      <td>{formatCurrency(item.quantity * item.selling_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-totals">
                {selectedInvoice.discount > 0 && (
                  <div className="invoice-total-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency((selectedInvoice.total_amount || 0) + (selectedInvoice.discount || 0))}</span>
                  </div>
                )}
                {selectedInvoice.discount > 0 && (
                  <div className="invoice-total-row">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                )}
                <div className="invoice-total-row invoice-grand-total">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className="invoice-total-row">
                  <span>Paid Amount:</span>
                  <span>{formatCurrency(selectedInvoice.paid_amount)}</span>
                </div>
                {(selectedInvoice.total_amount - selectedInvoice.paid_amount) > 0 && (
                  <div className="invoice-total-row invoice-due">
                    <span>Remaining Due:</span>
                    <span>{formatCurrency(selectedInvoice.total_amount - selectedInvoice.paid_amount)}</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => handlePrintInvoice(selectedInvoice)}>Print Invoice</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;


