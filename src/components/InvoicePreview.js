import React, { useEffect, useState } from 'react';
import { settingsAPI } from '../services/api';
import './InvoicePreview.css';

const InvoicePreview = ({ invoiceNumber, customerName, items, totalAmount, totalProfit, onClose, onPrint }) => {
  const [shopName, setShopName] = useState('HisaabKitab');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');

  useEffect(() => {
    // Fetch shop settings for invoice header
    settingsAPI.get().then(response => {
      const data = response.data;
      if (data.other_app_settings) {
        const settings = typeof data.other_app_settings === 'string' 
          ? JSON.parse(data.other_app_settings) 
          : data.other_app_settings;
        setShopName(settings.shop_name || 'HisaabKitab');
        setShopAddress(settings.shop_address || '');
        setShopPhone(settings.shop_phone || '');
      }
    }).catch(err => {
      console.error('Error fetching settings:', err);
    });
  }, []);

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toFixed(2)}`;
  };

  const formatDate = (date) => {
    return new Date(date || new Date()).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal invoice-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-preview-header">
          <h2>Invoice Preview</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="invoice-preview-content">
          {/* Invoice Content */}
          <div className="invoice-paper">
            {/* Header */}
            <div className="invoice-header">
              <div className="invoice-logo">
                <h1>{shopName}</h1>
                <p className="invoice-subtitle">POS & Inventory</p>
              </div>
              {shopAddress && <p className="invoice-address">{shopAddress}</p>}
              {shopPhone && <p className="invoice-phone">Phone: {shopPhone}</p>}
            </div>

            <div className="invoice-divider"></div>

            {/* Invoice Info */}
            <div className="invoice-info">
              <div className="invoice-info-row">
                <span className="invoice-label">Invoice #:</span>
                <span className="invoice-value">{invoiceNumber || 'AUTO'}</span>
              </div>
              <div className="invoice-info-row">
                <span className="invoice-label">Date:</span>
                <span className="invoice-value">{formatDate()}</span>
              </div>
              {customerName && (
                <div className="invoice-info-row">
                  <span className="invoice-label">Customer:</span>
                  <span className="invoice-value">{customerName}</span>
                </div>
              )}
            </div>

            <div className="invoice-divider"></div>

            {/* Items */}
            <div className="invoice-items-section">
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="item-name">{item.product_name || item.name}</div>
                        {item.sku && <div className="item-sku">SKU: {item.sku}</div>}
                      </td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.selling_price)}</td>
                      <td className="text-right">{formatCurrency(item.quantity * item.selling_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="invoice-divider"></div>

            {/* Totals */}
            <div className="invoice-totals">
              <div className="invoice-total-row">
                <span className="total-label">Subtotal:</span>
                <span className="total-value">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="invoice-total-row grand-total">
                <span className="total-label">Total:</span>
                <span className="total-value">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="invoice-total-row profit-row">
                <span className="total-label">Profit:</span>
                <span className="total-value profit-value">{formatCurrency(totalProfit)}</span>
              </div>
            </div>

            <div className="invoice-divider"></div>

            {/* Footer */}
            <div className="invoice-footer">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="invoice-preview-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onPrint}>
            🖨️ Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;









