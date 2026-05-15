import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { purchasesAPI } from '../services/api';
import { getConnectivityErrorMessage, isOfflineQueuedResponse } from '../lib/offlineUserMessages';
import './Purchases.css';

const purchasePortalOverlayCss = `
.zb-purchase-overlay{position:fixed!important;inset:0!important;z-index:10050!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;background:rgba(15,23,42,.42)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;overflow:auto!important}
.zb-purchase-compact.modal.purchase-modal{width:min(460px,96vw)!important;max-width:460px!important;max-height:min(85vh,620px)!important;margin:auto!important;display:flex!important;flex-direction:column!important}
.zb-purchase-compact.modal.purchase-modal .modal-header{padding:10px 14px!important;flex-shrink:0!important}
.zb-purchase-compact.modal.purchase-modal .modal-header h2{font-size:16px!important;font-weight:600!important;margin:0!important}
.zb-purchase-compact.modal.purchase-modal .modal-content{padding:10px 14px 12px!important;overflow-y:auto!important;flex:1!important;min-height:0!important}
.zb-purchase-compact.modal.purchase-modal .zb-form-grid{gap:8px 12px!important}
.zb-purchase-compact.modal.purchase-modal .form-group{margin-bottom:0!important}
.zb-purchase-compact.modal.purchase-modal .form-label{font-size:10px!important;letter-spacing:.04em!important;margin-bottom:4px!important}
.zb-purchase-compact.modal.purchase-modal .form-input,.zb-purchase-compact.modal.purchase-modal .purchase-input{padding:7px 10px!important;min-height:36px!important;font-size:13px!important;border-radius:8px!important}
.zb-purchase-compact.modal.purchase-modal .purchase-items-section{margin-top:10px!important}
.zb-purchase-compact.modal.purchase-modal .purchase-items-section h3{font-size:12px!important;font-weight:600!important;margin:0 0 8px!important;text-transform:uppercase!important;letter-spacing:.05em!important;color:#64748b!important}
.zb-purchase-compact.modal.purchase-modal .modal-actions{padding:10px 14px!important;margin-top:4px!important;gap:8px!important;flex-shrink:0!important;border-top:1px solid #eef1f6!important}
.zb-purchase-compact.modal.purchase-modal .items-table{font-size:12px!important}
.zb-purchase-compact.modal.purchase-modal .items-table th,.zb-purchase-compact.modal.purchase-modal .items-table td{padding:6px 8px!important}
`;

/**
 * Shared purchase create/edit modal. Optionally pass initialProductId (no edit purchase)
 * to pre-fill product picker when opened from product detail (Issue #21).
 */
const PurchaseModal = ({ suppliers, products, purchase, onSave, onClose, initialProductId }) => {
  const [formData, setFormData] = useState({
    supplier_id: purchase?.supplier_id?.toString() || '',
    payment_type: purchase?.payment_type || 'cash',
    date: purchase?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    items: purchase?.items?.map(item => ({
      item_id: item.item_id,
      quantity: item.quantity,
      cost_price: item.cost_price,
    })) || [],
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (purchase || initialProductId == null || Number.isNaN(Number(initialProductId))) return;
    const pid = Number(initialProductId);
    const p = products.find((x) => Number(x.product_id) === pid);
    if (!p) return;
    setSelectedProduct(p);
    const pp = p.purchase_price;
    setItemPrice(pp != null && pp !== '' ? String(pp) : '');
    setProductSearch(
      `${p.item_name_english || p.name || 'Product'} (Stock: ${p.quantity_in_stock || 0})`
    );
  }, [purchase, initialProductId, products]);

  const handleAddItem = () => {
    if (!selectedProduct || !itemQty || !itemPrice) return;
    const existingIndex = formData.items.findIndex(i => i.item_id === selectedProduct.product_id);
    if (existingIndex >= 0) {
      const updated = [...formData.items];
      updated[existingIndex].quantity += parseInt(itemQty);
      updated[existingIndex].cost_price = parseFloat(itemPrice);
      setFormData({...formData, items: updated});
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          item_id: selectedProduct.product_id,
          quantity: parseInt(itemQty),
          cost_price: parseFloat(itemPrice),
        }]
      });
    }
    setSelectedProduct(null);
    setProductSearch('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleRemoveItem = (index) => {
    setFormData({...formData, items: formData.items.filter((_, i) => i !== index)});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id || formData.items.length === 0) {
      alert('Please select supplier and add at least one item');
      return;
    }
    setSaving(true);
    try {
      const response = purchase
        ? await purchasesAPI.update(purchase.purchase_id, formData)
        : await purchasesAPI.create(formData);
      if (isOfflineQueuedResponse(response)) {
        await onSave({ offlineQueued: true });
        return;
      }
      await onSave();
    } catch (err) {
      const connectivity = getConnectivityErrorMessage(err);
      alert(
        connectivity ||
          err.response?.data?.error ||
          `Failed to ${purchase ? 'update' : 'create'} purchase`
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

  const modalTree = (
    <>
      <style>{purchasePortalOverlayCss}</style>
      <div className="modal-overlay zb-purchase-overlay" onClick={onClose}>
      <div className="modal purchase-modal zb-purchase-compact" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{purchase ? `Edit Purchase #${purchase.purchase_id}` : 'New Purchase'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-content">
          <div className="zb-form-grid zb-form-grid--2">
            <div className="form-group zb-form-grid__full" style={{ position: 'relative' }}>
              <label className="form-label">Supplier *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search and select supplier..."
                value={supplierSearch || (suppliers.find(s => s.supplier_id === parseInt(formData.supplier_id))?.name || '')}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setShowSupplierDropdown(true);
                  if (!e.target.value) {
                    setFormData({...formData, supplier_id: ''});
                  }
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                required
                style={{ fontSize: '14px' }}
                disabled={!!purchase}
              />
              {showSupplierDropdown && (
                <>
                  <div 
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      marginTop: '4px'
                    }}
                  >
                    {suppliers
                      .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                      .map(s => (
                        <div
                          key={s.supplier_id}
                          onClick={() => {
                            setFormData({...formData, supplier_id: s.supplier_id.toString()});
                            setSupplierSearch(s.name);
                            setShowSupplierDropdown(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => { e.target.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.target.style.backgroundColor = '#ffffff'; }}
                        >
                          <div style={{ fontWeight: '500' }}>{s.name}</div>
                          {s.contact_number && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{s.contact_number}</div>
                          )}
                        </div>
                      ))}
                    {suppliers.filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center' }}>No suppliers found</div>
                    )}
                  </div>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                    onClick={() => setShowSupplierDropdown(false)}
                  />
                </>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <select className="form-input" value={formData.payment_type} onChange={(e) => setFormData({...formData, payment_type: e.target.value})}>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
            </div>
          </div>

          <div className="purchase-items-section">
            <h3>Items</h3>
            <div className="zb-form-grid zb-form-grid--2">
              <div className="form-group zb-form-grid__full">
                <label className="form-label">Product</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search and select product..."
                    value={
                      productSearch ||
                      (selectedProduct
                        ? `${selectedProduct.item_name_english || selectedProduct.name || 'Product'} (Stock: ${
                            selectedProduct.quantity_in_stock || 0
                          })`
                        : '')
                    }
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                      if (!e.target.value) {
                        setSelectedProduct(null);
                        setItemPrice('');
                      }
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    style={{ fontSize: '14px' }}
                  />
                  {showProductDropdown && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          maxHeight: '220px',
                          overflowY: 'auto',
                          zIndex: 1000,
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          marginTop: '4px',
                        }}
                      >
                        {products
                          .filter((p) => {
                            const q = (productSearch || '').trim().toLowerCase();
                            if (!q) return true;
                            const name = String(p.item_name_english || p.name || '').toLowerCase();
                            return name.includes(q);
                          })
                          .map((p) => (
                            <div
                              key={p.product_id}
                              onClick={() => {
                                setSelectedProduct(p);
                                setItemPrice(p?.purchase_price || '');
                                setProductSearch(`${p.item_name_english || p.name || 'Product'} (Stock: ${p.quantity_in_stock || 0})`);
                                setShowProductDropdown(false);
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background-color 0.2s',
                                backgroundColor: selectedProduct?.product_id === p.product_id ? '#eff6ff' : '#ffffff',
                              }}
                              onMouseEnter={(e) => {
                                if (selectedProduct?.product_id !== p.product_id) {
                                  e.currentTarget.style.backgroundColor = '#f8fafc';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedProduct?.product_id !== p.product_id) {
                                  e.currentTarget.style.backgroundColor = '#ffffff';
                                } else {
                                  e.currentTarget.style.backgroundColor = '#eff6ff';
                                }
                              }}
                            >
                              <div style={{ fontWeight: 500 }}>{p.item_name_english || p.name || 'Product'}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Stock: {p.quantity_in_stock || 0}
                              </div>
                            </div>
                          ))}
                        {products.filter((p) => {
                          const q = (productSearch || '').trim().toLowerCase();
                          if (!q) return true;
                          const name = String(p.item_name_english || p.name || '').toLowerCase();
                          return name.includes(q);
                        }).length === 0 && (
                          <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center' }}>No products found</div>
                        )}
                      </div>
                      <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                        onClick={() => setShowProductDropdown(false)}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input 
                  type="number" 
                  className="form-input purchase-input" 
                  min="1" 
                  value={itemQty} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!isNaN(val) && parseFloat(val) >= 0)) {
                      setItemQty(val);
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value || parseFloat(e.target.value) < 1) {
                      setItemQty('1');
                    }
                  }}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-input purchase-input" 
                  min="0"
                  value={itemPrice} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!isNaN(val) && parseFloat(val) >= 0)) {
                      setItemPrice(val);
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value || parseFloat(e.target.value) < 0) {
                      setItemPrice('0');
                    }
                  }}
                  placeholder="Enter cost price"
                />
              </div>
              <div className="form-group zb-form-grid__full" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={handleAddItem}>Add</button>
              </div>
            </div>

            {formData.items.length > 0 && (
              <table className="items-table" style={{ marginTop: '12px', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => {
                    const product = products.find(p => p.product_id === item.item_id);
                    const productName = product?.item_name_english || product?.name || 'N/A';
                    return (
                      <tr key={idx}>
                        <td>{productName}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.cost_price)}</td>
                        <td>{formatCurrency(item.quantity * item.cost_price)}</td>
                        <td><button type="button" className="btn-delete" onClick={() => handleRemoveItem(idx)}>Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>Total:</strong></td>
                    <td><strong>{formatCurrency(total)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : purchase ? 'Update Purchase' : 'Save Purchase'}</button>
          </div>
        </form>
      </div>
    </div>
    </>
  );

  return createPortal(modalTree, document.body);
};

export default PurchaseModal;
