import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { productsAPI, categoriesAPI } from '../services/api';
import Pagination from './Pagination';
import './RateList.css';

const RateList = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsResponse, productsResponse] = await Promise.all([
        categoriesAPI.getAll(),
        productsAPI.getAll()
      ]);
      setCategories(catsResponse.data || []);
      const productsData = Array.isArray(productsResponse.data) ? productsResponse.data : [];
      const filtered = productsData.filter(p => p.status !== 'inactive');
      setProducts(filtered);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || t('rateList.failedToLoad'));
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  // Handle opening edit modal
  const handleEdit = (product) => {
    if (readOnly) return;
    setEditingProduct(product);
    setModalOpen(true);
  };

  // Handle price update from modal
  const handlePriceUpdate = async (updateData) => {
    try {
      const product = editingProduct;
      
      // Prepare update data with all required fields
      const fullUpdateData = {
        name: product.item_name_english || product.name,
        item_name_english: product.item_name_english || product.name,
        purchase_price: product.purchase_price,
        retail_price: updateData.retail_price,
        wholesale_price: updateData.wholesale_price,
        special_price: updateData.special_price || null,
        selling_price: updateData.retail_price, // selling_price should match retail_price
        unit_type: product.unit_type || 'piece',
        is_frequently_sold: product.is_frequently_sold || false,
        quantity_in_stock: product.quantity_in_stock || 0,
        supplier_id: product.supplier_id || null,
        category_id: product.category_id || null,
      };

      await productsAPI.update(product.product_id, fullUpdateData);
      
      // Update local state
      const updatedProducts = products.map(p => {
        if (p.product_id === product.product_id) {
          return { 
            ...p, 
            retail_price: updateData.retail_price,
            wholesale_price: updateData.wholesale_price,
            special_price: updateData.special_price || null,
            selling_price: updateData.retail_price
          };
        }
        return p;
      });
      setProducts(updatedProducts);
      
      setModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      alert(err.response?.data?.error || t('rateList.failedToUpdatePrices'));
      throw err;
    }
  };

  // Apply filters to products (search, category)
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.item_name_english && p.item_name_english.toLowerCase().includes(query)) ||
        (p.name && p.name.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  // Group products by category
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const catName = product.category_name || product.category || t('rateList.uncategorized');
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(product);
    return acc;
  }, {});

  // Flatten grouped products for pagination
  const flattenedProducts = Object.entries(groupedProducts).flatMap(([categoryName, categoryProducts]) => {
    return [{ type: 'header', categoryName }, ...categoryProducts.map(p => ({ type: 'product', ...p }))];
  });

  // Pagination logic
  const totalPages = Math.ceil(flattenedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = flattenedProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  if (loading) {
    return <div className="content-container"><div className="loading">{t('rateList.loading')}</div></div>;
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('rateList.title')}</h1>
        <p className="page-subtitle">{t('rateList.subtitle')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Filters & Search */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>{t('rateList.searchByProductName')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('rateList.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '14px' }}
              />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>{t('rateList.category')}</label>
              <select 
                className="form-input" 
                value={selectedCategory || ''} 
                onChange={(e) => {
                  setSelectedCategory(e.target.value ? parseInt(e.target.value) : null);
                }}
                style={{ fontSize: '14px' }}
              >
                <option value="">{t('rateList.allCategories')}</option>
                {categories.filter(c => c.status === 'active').map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>{cat.category_name}</option>
                ))}
              </select>
            </div>
            <div>
              <button 
                className="btn btn-secondary" 
                onClick={() => { 
                  setSelectedCategory(null); 
                  setSearchQuery('');
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                {t('rateList.clearAll')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rate List by Category */}
      <div className="card">
        <div className="table-container">
          <table className="rate-list-table">
            <thead>
              <tr>
                <th>{t('rateList.itemName')}</th>
                <th>{t('rateList.unit')}</th>
                <th>{t('rateList.retailPrice')}</th>
                <th>{t('rateList.wholesalePrice')}</th>
                <th>{t('rateList.specialPrice')}</th>
                {!readOnly && <th>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr><td colSpan={readOnly ? 5 : 6} className="empty-state">{t('rateList.noProductsFound')}{searchQuery ? ` ${t('rateList.matchingSearch')}` : ''}</td></tr>
              ) : (
                paginatedProducts.map((item, index) => {
                  if (item.type === 'header') {
                    return (
                      <tr key={`header-${item.categoryName}-${index}`} className="category-header-row">
                        <td colSpan={readOnly ? 5 : 6}><strong>{item.categoryName}</strong></td>
                      </tr>
                    );
                  } else {
                    const product = item;
                    const retailPrice = product.retail_price || product.selling_price;
                    const wholesalePrice = product.wholesale_price || product.retail_price || product.selling_price;
                    const specialPrice = product.special_price;

                    return (
                      <tr key={product.product_id}>
                        <td>{product.item_name_english || product.name || 'N/A'}</td>
                        <td>{product.unit_type || 'piece'}</td>
                        <td className="price-cell">{formatCurrency(retailPrice)}</td>
                        <td className="price-cell">{formatCurrency(wholesalePrice)}</td>
                        <td className="price-cell">{specialPrice ? formatCurrency(specialPrice) : '-'}</td>
                        {!readOnly && (
                          <td>
                            <button 
                              className="btn-edit" 
                              onClick={() => handleEdit(product)}
                              style={{ padding: '4px 12px', fontSize: '13px' }}
                            >
                              {t('common.edit')}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
        
        {flattenedProducts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={flattenedProducts.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Price Edit Modal */}
      {modalOpen && editingProduct && (
        <PriceEditModal
          product={editingProduct}
          onSave={handlePriceUpdate}
          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

// Price Edit Modal Component
const PriceEditModal = ({ product, onSave, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    retail_price: product.retail_price || product.selling_price || '',
    wholesale_price: product.wholesale_price || product.retail_price || product.selling_price || '',
    special_price: product.special_price || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Retail price validation
    const retailPrice = parseFloat(formData.retail_price);
    if (isNaN(retailPrice) || retailPrice <= 0) {
      newErrors.retail_price = t('rateList.retailPriceMustBeGreaterThanZero');
    }

    // Wholesale price validation
    const wholesalePrice = parseFloat(formData.wholesale_price);
    if (isNaN(wholesalePrice) || wholesalePrice <= 0) {
      newErrors.wholesale_price = t('rateList.wholesalePriceMustBeGreaterThanZero');
    }

    // Special price validation (optional)
    if (formData.special_price && formData.special_price.trim() !== '') {
      const specialPrice = parseFloat(formData.special_price);
      if (isNaN(specialPrice) || specialPrice < 0) {
        newErrors.special_price = t('rateList.specialPriceMustBeZeroOrGreater');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        retail_price: parseFloat(formData.retail_price),
        wholesale_price: parseFloat(formData.wholesale_price),
        special_price: formData.special_price && formData.special_price.trim() !== '' 
          ? parseFloat(formData.special_price) 
          : null,
      });
    } catch (err) {
      // Error already handled in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{t('rateList.editPrices')} - {product.item_name_english || product.name || 'N/A'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-content">
          {/* Product Info (Read-only) */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f8fafc', 
            borderRadius: '6px', 
            marginBottom: '20px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong style={{ color: '#64748b' }}>{t('rateList.productName')}:</strong>
                <div style={{ marginTop: '4px', color: '#1e293b' }}>
                  {product.item_name_english || product.name || 'N/A'}
                </div>
              </div>
              <div>
                <strong style={{ color: '#64748b' }}>{t('rateList.unit')}:</strong>
                <div style={{ marginTop: '4px', color: '#1e293b' }}>
                  {product.unit_type || 'piece'}
                </div>
              </div>
              <div>
                <strong style={{ color: '#64748b' }}>{t('rateList.purchasePrice')}:</strong>
                <div style={{ marginTop: '4px', color: '#1e293b' }}>
                  {formatCurrency(product.purchase_price)}
                </div>
              </div>
              <div>
                <strong style={{ color: '#64748b' }}>{t('rateList.currentStock')}:</strong>
                <div style={{ marginTop: '4px', color: '#1e293b' }}>
                  {product.quantity_in_stock || 0} {product.unit_type || 'piece'}
                </div>
              </div>
            </div>
          </div>

          {/* Editable Price Fields */}
          <div className="form-group">
            <label className="form-label">
              {t('rateList.retailPrice')} (PKR) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="retail_price"
              value={formData.retail_price}
              onChange={handleChange}
              className={`form-input ${errors.retail_price ? 'error' : ''}`}
              placeholder="0.00"
            />
            {errors.retail_price && (
              <span className="error-message">{errors.retail_price}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('rateList.wholesalePrice')} (PKR) <span className="required">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="wholesale_price"
              value={formData.wholesale_price}
              onChange={handleChange}
              className={`form-input ${errors.wholesale_price ? 'error' : ''}`}
              placeholder="0.00"
            />
            {errors.wholesale_price && (
              <span className="error-message">{errors.wholesale_price}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('rateList.specialPrice')} (PKR) <span style={{ fontSize: '12px', color: '#64748b' }}>({t('common.optional')})</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="special_price"
              value={formData.special_price}
              onChange={handleChange}
              className={`form-input ${errors.special_price ? 'error' : ''}`}
              placeholder={t('rateList.leaveEmptyToRemove')}
            />
            {errors.special_price && (
              <span className="error-message">{errors.special_price}</span>
            )}
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {t('rateList.leaveEmptyToRemoveSpecialPrice')}
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('common.loading') : t('rateList.savePrices')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateList;

