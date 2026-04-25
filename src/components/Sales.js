import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { salesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';
import './Sales.css';

const Sales = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [editFormData, setEditFormData] = useState({
    payment_type: 'cash',
    paid_amount: 0,
    discount: 0,
    tax: 0
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getAll();
      setSales(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err.response?.data?.error || 'Failed to load sales');
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

  // Filter sales
  const filteredSales = sales.filter(sale => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      sale.invoice_number?.toLowerCase().includes(query) ||
      sale.customer_name?.toLowerCase().includes(query) ||
      sale.date?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch sale details
  const handleViewSale = async (saleId) => {
    try {
      const response = await salesAPI.getById(saleId);
      setSelectedSale(response.data);
    } catch (err) {
      console.error('Error fetching sale details:', err);
      alert('Failed to load sale details');
    }
  };

  // Handle edit
  const handleEdit = async (saleId) => {
    try {
      const response = await salesAPI.getById(saleId);
      const sale = response.data;
      setEditingSale(sale);
      setEditFormData({
        payment_type: sale.payment_mode || sale.payment_type || 'cash',
        paid_amount: sale.paid_amount || 0,
        discount: sale.discount || 0,
        tax: sale.tax || 0
      });
    } catch (err) {
      console.error('Error fetching sale for edit:', err);
      alert('Failed to load sale for editing');
    }
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingSale) return;
    
    try {
      setSaving(true);
      const updateData = {
        payment_type: editFormData.payment_type,
        paid_amount: parseFloat(editFormData.paid_amount) || 0,
        discount: parseFloat(editFormData.discount) || 0,
        tax: parseFloat(editFormData.tax) || 0
      };
      
      await salesAPI.update(editingSale.sale_id, updateData);
      await fetchSales();
      setEditingSale(null);
      alert(t('sales.updateSuccess'));
    } catch (err) {
      console.error('Error updating sale:', err);
      alert(err.response?.data?.error || t('sales.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (saleId) => {
    try {
      await salesAPI.delete(saleId);
      await fetchSales();
      setDeleteConfirm(null);
      alert(t('sales.deleteSuccess'));
    } catch (err) {
      alert(err.response?.data?.error || t('sales.deleteFailed'));
    }
  };

  // Print invoice
  const handlePrintInvoice = (sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print invoice');
      return;
    }

    const saleData = selectedSale || sale;
    const items = saleData.items || [];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${saleData.invoice_number}</title>
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
            <div class="shop-name">My Shop</div>
          </div>
          
          <div class="invoice-info">
            <div><strong>Invoice:</strong> ${saleData.invoice_number}</div>
            <div><strong>Date:</strong> ${formatDate(saleData.date)}</div>
            <div><strong>Customer:</strong> ${saleData.customer_name || 'Cash Customer'}</div>
            ${saleData.payment_mode ? `<div><strong>Payment Mode:</strong> ${saleData.payment_mode}</div>` : ''}
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
            ${saleData.discount > 0 ? `<div class="total-row"><span>Subtotal:</span><span>${formatCurrency((saleData.total_amount || 0) + (saleData.discount || 0))}</span></div>` : ''}
            ${saleData.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-${formatCurrency(saleData.discount)}</span></div>` : ''}
            <div class="total-row grand-total">
              <span>Grand Total:</span>
              <span>${formatCurrency(saleData.total_amount)}</span>
            </div>
            <div class="total-row">
              <span>Paid Amount:</span>
              <span>${formatCurrency(saleData.paid_amount)}</span>
            </div>
            ${(saleData.total_amount - saleData.paid_amount) > 0 ? `<div class="total-row due-amount"><span>Remaining Due:</span><span>${formatCurrency(saleData.total_amount - saleData.paid_amount)}</span></div>` : ''}
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
        <div className="loading">{t('common.loading')}...</div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('sales.title')}</h1>
        <p className="page-subtitle">{t('sales.subtitle')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>{t('sales.search')}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t('sales.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '14px', width: '100%' }}
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="card-header">
          <h2>{t('sales.salesList')} ({filteredSales.length})</h2>
        </div>
        <div className="table-container">
          <table className="sales-table">
            <thead>
              <tr>
                <th>{t('sales.invoiceNumber')}</th>
                <th>{t('sales.date')}</th>
                <th>{t('sales.customer')}</th>
                <th>{t('sales.totalAmount')}</th>
                <th>{t('sales.paidAmount')}</th>
                <th>{t('sales.due')}</th>
                <th>{t('sales.paymentMode')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    {searchQuery ? t('sales.noSalesFound') : t('sales.noSales')}
                  </td>
                </tr>
              ) : (
                paginatedSales.map(sale => {
                  const due = (sale.total_amount || 0) - (sale.paid_amount || 0);
                  return (
                    <tr key={sale.sale_id}>
                      <td><strong>{sale.invoice_number}</strong></td>
                      <td>{formatDate(sale.date)}</td>
                      <td>{sale.customer_name || t('sales.cashCustomer')}</td>
                      <td>{formatCurrency(sale.total_amount)}</td>
                      <td>{formatCurrency(sale.paid_amount)}</td>
                      <td>
                        {due > 0 ? (
                          <span className="due-badge">{formatCurrency(due)}</span>
                        ) : (
                          <span className="paid-badge">{t('sales.paid')}</span>
                        )}
                      </td>
                      <td>{sale.payment_mode || 'cash'}</td>
                      <td>
                        <div className="sales-actions">
                          <button
                            className="btn-view"
                            onClick={() => handleViewSale(sale.sale_id)}
                          >
                            {t('common.viewDetails')}
                          </button>
                          {isAdmin() && (
                            <>
                              <button
                                className="btn-edit"
                                onClick={() => handleEdit(sale.sale_id)}
                                disabled={sale.is_finalized}
                              >
                                {t('common.edit')}
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => setDeleteConfirm(sale.sale_id)}
                                disabled={sale.is_finalized}
                              >
                                {t('common.delete')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredSales.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredSales.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal sales-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('sales.saleDetails')} - {selectedSale.invoice_number}</h2>
              <button className="modal-close" onClick={() => setSelectedSale(null)}>×</button>
            </div>
            <div className="modal-content">
              <div className="sales-detail-info">
                <div><strong>{t('sales.date')}:</strong> {formatDate(selectedSale.date)}</div>
                <div><strong>{t('sales.customer')}:</strong> {selectedSale.customer_name || t('sales.cashCustomer')}</div>
                <div><strong>{t('sales.paymentMode')}:</strong> {selectedSale.payment_mode || 'cash'}</div>
              </div>
              
              <table className="sales-items-table">
                <thead>
                  <tr>
                    <th>{t('sales.productName')}</th>
                    <th>{t('sales.quantity')}</th>
                    <th>{t('sales.price')}</th>
                    <th>{t('sales.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSale.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.product_name || item.name || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.selling_price)}</td>
                      <td>{formatCurrency(item.quantity * item.selling_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sales-totals">
                {selectedSale.discount > 0 && (
                  <div className="sales-total-row">
                    <span>{t('sales.subtotal')}:</span>
                    <span>{formatCurrency((selectedSale.total_amount || 0) + (selectedSale.discount || 0))}</span>
                  </div>
                )}
                {selectedSale.discount > 0 && (
                  <div className="sales-total-row">
                    <span>{t('sales.discount')}:</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="sales-total-row sales-grand-total">
                  <span>{t('sales.grandTotal')}:</span>
                  <span>{formatCurrency(selectedSale.total_amount)}</span>
                </div>
                <div className="sales-total-row">
                  <span>{t('sales.paidAmount')}:</span>
                  <span>{formatCurrency(selectedSale.paid_amount)}</span>
                </div>
                {(selectedSale.total_amount - selectedSale.paid_amount) > 0 && (
                  <div className="sales-total-row sales-due">
                    <span>{t('sales.remainingDue')}:</span>
                    <span>{formatCurrency(selectedSale.total_amount - selectedSale.paid_amount)}</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button className="btn btn-primary" onClick={() => handlePrintInvoice(selectedSale)}>
                  {t('sales.printInvoice')}
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="modal-overlay" onClick={() => setEditingSale(null)}>
          <div className="modal sales-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('sales.editSale')} - {editingSale.invoice_number}</h2>
              <button className="modal-close" onClick={() => setEditingSale(null)}>×</button>
            </div>
            <div className="modal-content">
              {editingSale.is_finalized ? (
                <div className="error-message">
                  {t('sales.cannotEditFinalized')}
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">{t('sales.paymentMode')}</label>
                    <select
                      className="form-input"
                      value={editFormData.payment_type}
                      onChange={(e) => {
                        const newPaymentType = e.target.value;
                        setEditFormData({
                          ...editFormData,
                          payment_type: newPaymentType,
                          paid_amount: newPaymentType === 'cash' ? editingSale.total_amount : 
                                      newPaymentType === 'credit' ? 0 : editFormData.paid_amount
                        });
                      }}
                    >
                      <option value="cash">{t('sales.cash')}</option>
                      <option value="credit">{t('sales.credit')}</option>
                      <option value="split">{t('sales.split')}</option>
                    </select>
                  </div>

                  {editFormData.payment_type === 'split' && (
                    <div className="form-group">
                      <label className="form-label">{t('sales.paidAmount')}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editFormData.paid_amount}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          paid_amount: parseFloat(e.target.value) || 0
                        })}
                        min="0"
                        max={editingSale.total_amount}
                        step="0.01"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">{t('sales.discount')}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editFormData.discount}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        discount: parseFloat(e.target.value) || 0
                      })}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('sales.tax')}</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editFormData.tax}
                      onChange={(e) => setEditFormData({
                        ...editFormData,
                        tax: parseFloat(e.target.value) || 0
                      })}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="sales-totals" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                    <div className="sales-total-row">
                      <span>{t('sales.subtotal')}:</span>
                      <span>{formatCurrency((editingSale.subtotal || editingSale.total_amount) + (editFormData.discount || 0))}</span>
                    </div>
                    {editFormData.discount > 0 && (
                      <div className="sales-total-row">
                        <span>{t('sales.discount')}:</span>
                        <span>-{formatCurrency(editFormData.discount)}</span>
                      </div>
                    )}
                    {editFormData.tax > 0 && (
                      <div className="sales-total-row">
                        <span>{t('sales.tax')}:</span>
                        <span>+{formatCurrency(editFormData.tax)}</span>
                      </div>
                    )}
                    <div className="sales-total-row sales-grand-total">
                      <span>{t('sales.grandTotal')}:</span>
                      <span>{formatCurrency((editingSale.subtotal || editingSale.total_amount) - editFormData.discount + editFormData.tax)}</span>
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleSaveEdit}
                      disabled={saving}
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setEditingSale(null)}
                      disabled={saving}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('sales.confirmDelete')}</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-content">
              <p>{t('sales.deleteWarning')}</p>
              <div className="modal-actions">
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                  {t('common.delete')}
                </button>
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

