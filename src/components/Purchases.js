import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { purchasesAPI, suppliersAPI, productsAPI } from '../services/api';
import Pagination from './Pagination';
import './Purchases.css';

const Purchases = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await purchasesAPI.getAll();
      setPurchases(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError(err.response?.data?.error || t('purchases.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleView = async (purchaseId) => {
    try {
      const response = await purchasesAPI.getById(purchaseId);
      setViewingPurchase(response.data);
    } catch (err) {
      alert(t('purchases.failedToLoadDetails'));
    }
  };

  const handleDelete = async (purchaseId) => {
    if (!window.confirm(t('purchases.deleteConfirm'))) return;
    try {
      await purchasesAPI.delete(purchaseId);
      await fetchPurchases();
      await fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || t('purchases.purchaseFailed'));
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  // Filter purchases by supplier
  const filteredPurchases = useMemo(() => {
    if (!selectedSupplier) {
      return purchases;
    }
    return purchases.filter(p => p.supplier_id === selectedSupplier);
  }, [purchases, selectedSupplier]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);

  // Reset to page 1 when supplier filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSupplier]);

  if (loading) {
    return <div className="content-container"><div className="loading">Loading purchases...</div></div>;
  }

  if (viewingPurchase && !editingPurchase) {
    return (
      <PurchaseDetailView 
        purchase={viewingPurchase}
        onClose={() => { setViewingPurchase(null); }}
        onDelete={handleDelete}
        onEdit={() => setEditingPurchase(viewingPurchase)}
        readOnly={readOnly}
      />
    );
  }

  if (editingPurchase) {
    return (
      <PurchaseModal
        suppliers={suppliers}
        products={products}
        purchase={editingPurchase}
        onSave={async () => {
          await fetchPurchases();
          await fetchProducts();
          setEditingPurchase(null);
          setViewingPurchase(null);
        }}
        onClose={() => { setEditingPurchase(null); setViewingPurchase(null); }}
      />
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('purchases.title')}</h1>
        <p className="page-subtitle">{t('purchases.subtitle')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!readOnly && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <h2>{t('purchases.title')}</h2>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              + {t('purchases.newPurchase')}
            </button>
          </div>
        </div>
      )}

      {/* Supplier Filter */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontSize: '13px' }}>{t('purchases.filterBySupplier')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('purchases.searchSupplier')}
                value={supplierSearch || (selectedSupplier ? (suppliers.find(s => s.supplier_id === selectedSupplier)?.name || '') : '')}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setShowSupplierDropdown(true);
                  if (!e.target.value) {
                    setSelectedSupplier(null);
                  }
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                style={{ fontSize: '14px', width: '100%' }}
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
                    <div
                      onClick={() => {
                        setSelectedSupplier(null);
                        setSupplierSearch('');
                        setShowSupplierDropdown(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s',
                        fontWeight: selectedSupplier === null ? '600' : '400'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                    >
                      <div>{t('purchases.allSuppliers')}</div>
                    </div>
                    {suppliers
                      .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                      .map(s => (
                        <div
                          key={s.supplier_id}
                          onClick={() => {
                            setSelectedSupplier(s.supplier_id);
                            setSupplierSearch(s.name);
                            setShowSupplierDropdown(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.2s',
                            backgroundColor: selectedSupplier === s.supplier_id ? '#eff6ff' : '#ffffff',
                            fontWeight: selectedSupplier === s.supplier_id ? '600' : '400'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedSupplier !== s.supplier_id) {
                              e.target.style.backgroundColor = '#f8fafc';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedSupplier !== s.supplier_id) {
                              e.target.style.backgroundColor = '#ffffff';
                            } else {
                              e.target.style.backgroundColor = '#eff6ff';
                            }
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>{s.name}</div>
                          {s.contact_number && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{s.contact_number}</div>
                          )}
                        </div>
                      ))}
                    {suppliers.filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center' }}>{t('suppliers.noSuppliers')}</div>
                    )}
                  </div>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                    onClick={() => setShowSupplierDropdown(false)}
                  />
                </>
              )}
            </div>
            {selectedSupplier && (
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setSelectedSupplier(null);
                  setSupplierSearch('');
                }}
              >
                {t('common.clearFilters')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <table className="purchases-table">
          <thead>
            <tr>
              <th>{t('purchases.purchaseId')}</th>
              <th>{t('purchases.supplier')}</th>
              <th>{t('purchases.purchaseDate')}</th>
              <th>{t('purchases.items')}</th>
              <th>{t('purchases.totalAmount')}</th>
              <th>{t('purchases.paymentType')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPurchases.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">
                  {selectedSupplier 
                    ? t('purchases.noPurchasesForSupplier', { supplier: suppliers.find(s => s.supplier_id === selectedSupplier)?.name || t('purchases.selectedSupplier') }) 
                    : t('purchases.noPurchases')}
                </td>
              </tr>
            ) : (
              paginatedPurchases.map(purchase => (
                <tr key={purchase.purchase_id}>
                  <td>#{purchase.purchase_id}</td>
                  <td>{purchase.supplier_name || 'N/A'}</td>
                  <td>{formatDate(purchase.date)}</td>
                  <td>{purchase.item_count || 0}</td>
                  <td>{formatCurrency(purchase.total_amount)}</td>
                  <td><span className={`payment-badge ${purchase.payment_type}`}>{purchase.payment_type}</span></td>
                  <td>
                    <button className="btn-view" onClick={() => handleView(purchase.purchase_id)}>{t('common.view')}</button>
                    {!readOnly && (
                      <>
                        <button className="btn-edit" onClick={async () => {
                          try {
                            const response = await purchasesAPI.getById(purchase.purchase_id);
                            setEditingPurchase(response.data);
                          } catch (err) {
                            alert(t('purchases.failedToLoadForEdit'));
                          }
                        }}>{t('common.edit')}</button>
                        <button className="btn-delete" onClick={() => handleDelete(purchase.purchase_id)}>{t('common.delete')}</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {filteredPurchases.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPurchases.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {modalOpen && (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          onSave={async () => {
            await fetchPurchases();
            await fetchProducts();
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

const PurchaseModal = ({ suppliers, products, purchase, onSave, onClose }) => {
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
      if (purchase) {
        await purchasesAPI.update(purchase.purchase_id, formData);
      } else {
        await purchasesAPI.create(formData);
      }
      await onSave();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${purchase ? 'update' : 'create'} purchase`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal purchase-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{purchase ? `Edit Purchase #${purchase.purchase_id}` : 'New Purchase'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-content">
          <div className="form-row">
            <div className="form-group" style={{ position: 'relative' }}>
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
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
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
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Product</label>
                <select className="form-input" value={selectedProduct?.product_id || ''} onChange={(e) => {
                  const product = products.find(p => p.product_id === parseInt(e.target.value));
                  setSelectedProduct(product || null);
                  setItemPrice(product?.purchase_price || '');
                }}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>
                    {p.item_name_english || p.name || 'Product'} (Stock: {p.quantity_in_stock || 0})
                  </option>)}
                </select>
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
                    // Allow empty string during typing, or valid numbers
                    if (val === '' || (!isNaN(val) && parseFloat(val) >= 0)) {
                      setItemQty(val);
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure minimum value of 1 when field loses focus
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
                    // Allow empty string during typing, or valid numbers
                    if (val === '' || (!isNaN(val) && parseFloat(val) >= 0)) {
                      setItemPrice(val);
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure minimum value of 0 when field loses focus
                    if (!e.target.value || parseFloat(e.target.value) < 0) {
                      setItemPrice('0');
                    }
                  }}
                  placeholder="Enter cost price"
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
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
  );
};

const PurchaseDetailView = ({ purchase, onClose, onDelete, onEdit, readOnly }) => {
  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">Purchase Details</h1>
        <button className="btn btn-secondary" onClick={onClose}>← Back to Purchases</button>
      </div>

      {/* Purchase Information Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2>Purchase Information</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', padding: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Purchase ID</label>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>#{purchase.purchase_id}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Supplier</label>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{purchase.supplier_name || 'N/A'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Date</label>
              <div style={{ fontSize: '16px', color: '#475569' }}>{formatDate(purchase.date)}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Payment Type</label>
              <div>
                <span className={`payment-badge ${purchase.payment_type}`} style={{ textTransform: 'capitalize' }}>
                  {purchase.payment_type}
                </span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Total Items</label>
              <div style={{ fontSize: '16px', color: '#475569' }}>{purchase.items?.length || 0} item(s)</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Total Amount</label>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>{formatCurrency(purchase.total_amount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card">
        <div className="card-header">
          <h2>Purchase Items</h2>
        </div>
        <div className="table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Cost Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items && purchase.items.length > 0 ? (
                purchase.items.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.item_name || 'N/A'}</strong></td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.cost_price)}</td>
                    <td><strong>{formatCurrency(item.subtotal)}</strong></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">No items found</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: '700' }}>Total:</td>
                <td style={{ fontWeight: '700', fontSize: '18px', color: '#059669' }}>
                  {formatCurrency(purchase.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={onEdit}>
            Edit Purchase
          </button>
          <button className="btn btn-danger" onClick={() => {
            if (window.confirm('Are you sure you want to delete this purchase? This will reverse stock updates.')) {
              onDelete(purchase.purchase_id);
              onClose();
            }
          }}>
            Delete Purchase
          </button>
        </div>
      )}
    </div>
  );
};

export default Purchases;

