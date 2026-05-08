import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { categoriesAPI, productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchInventoryBundle } from '../lib/workspaceQueries';
import PageLoadingCenter from './PageLoadingCenter';
import Pagination from './Pagination';
import { posApiQueriesEnabled } from '../lib/appMode';
import './Categories.css';

const Categories = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: zbKeys(activeShopId).inventoryBundle(),
    queryFn: fetchInventoryBundle,
    enabled: posApiQueriesEnabled(activeShopId),
    select: (d) => d?.categories ?? [],
  });

  const error = useMemo(() => {
    if (!isError || !queryError) return null;
    return queryError.response?.data?.error || t('categories.failedToLoad');
  }, [isError, queryError, t]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingItems, setViewingItems] = useState(null);
  const [itemsList, setItemsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleSaveCategory = async (data) => {
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.category_id, data);
      } else {
        await categoriesAPI.create(data);
      }
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
      setModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    if (category && category.category_name.toLowerCase() === 'general') {
      alert(t('categories.cannotDeleteGeneral'));
      return;
    }
    if (!window.confirm(t('categories.deleteConfirm'))) return;
    try {
      await categoriesAPI.delete(categoryId);
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
    } catch (err) {
      alert(err.response?.data?.error || t('categories.categoryDeleteFailed'));
    }
  };

  const handleViewItems = async (category) => {
    try {
      const params = { category_id: category.category_id };
      const response = await productsAPI.getAll(params);
      setItemsList(response.data || []);
      setViewingItems({ category });
    } catch (err) {
      console.error('Error fetching items:', err);
      alert(t('categories.failedToLoad'));
    }
  };

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(cat => {
      const name = (cat.category_name || '').toLowerCase();
      return name.includes(query);
    });
  }, [categories, searchQuery]);

  // Pagination logic for categories
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="content-container">
        <PageLoadingCenter message={t('categories.loading')} />
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('categories.title')}</h1>
        <p className="page-subtitle">{t('categories.subtitle')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block', fontSize: '13px' }}>{t('categories.searchCategories')}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t('categories.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '14px', width: '100%' }}
          />
        </div>
      </div>

      {/* Categories Section */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-content">
            <h2>{t('categories.title')}</h2>
            {!readOnly && (
              <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setModalOpen(true); }}>
                + {t('categories.addCategory')}
              </button>
            )}
          </div>
        </div>
        <div className="table-container">
          <table className="categories-table">
            <thead>
              <tr>
                <th>{t('categories.categoryName')}</th>
                <th>{t('categories.status')}</th>
                <th>{t('categories.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.length === 0 ? (
                <tr><td colSpan="3" className="empty-state">{searchQuery ? t('categories.noCategoriesMatching', { query: searchQuery }) : t('categories.noCategories')}</td></tr>
              ) : (
                paginatedCategories.map(cat => (
                  <tr key={cat.category_id}>
                    <td><strong>{cat.category_name}</strong></td>
                    <td><span className={`status-badge ${cat.status}`}>{cat.status}</span></td>
                    <td className="actions-cell" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {!readOnly && (
                        <>
                          <button className="btn-edit" onClick={() => { setEditingCategory(cat); setModalOpen(true); }}>{t('categories.edit')}</button>
                          <button className="btn-delete" onClick={() => handleDelete(cat.category_id)}>{t('categories.delete')}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredCategories.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredCategories.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Category Modal */}
      {modalOpen && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSaveCategory}
          onClose={() => { setModalOpen(false); setEditingCategory(null); }}
        />
      )}

      {/* View Items Modal */}
      {viewingItems && (
        <ItemsListViewModal
          category={viewingItems.category}
          items={itemsList}
          onClose={() => { setViewingItems(null); setItemsList([]); }}
        />
      )}
    </div>
  );
};

const CategoryModal = ({ category, onSave, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    category_name: category?.category_name || '',
    status: category?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      alert(err.response?.data?.error || t('categories.categoryFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{category ? t('categories.editCategory') : t('categories.addCategory')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-content">
          <div className="zb-form-grid zb-form-grid--2">
            <div className="form-group">
              <label className="form-label">
                {t('categories.categoryNameLabel')}
              </label>
              <input 
                className="form-input" 
                required 
                value={formData.category_name} 
                onChange={(e) => setFormData({...formData, category_name: e.target.value})}
                disabled={category && category.category_name.toLowerCase() === 'general'}
              />
              {category && category.category_name.toLowerCase() === 'general' && (
                <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {t('categories.generalCannotBeRenamed')}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">{t('categories.status')}</label>
              <select className="form-input" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                <option value="active">{t('categories.active')}</option>
                <option value="inactive">{t('categories.inactive')}</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('categories.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('categories.saving') : t('categories.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ItemsListViewModal = ({ category, items, onClose }) => {
  const { t } = useTranslation();
  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>{t('categories.itemsInCategory', { categoryName: category.category_name })}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          {items.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              <p>{t('categories.noItemsInCategory')}</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="categories-table">
                <thead>
                  <tr>
                    <th>{t('categories.productName')}</th>
                    <th>{t('categories.purchasePrice')}</th>
                    <th>{t('categories.retailPrice')}</th>
                    <th>{t('categories.wholesalePrice')}</th>
                    <th>{t('categories.stock')}</th>
                    <th>{t('categories.unit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.product_id}>
                      <td>{item.item_name_english || item.name || 'N/A'}</td>
                      <td>{formatCurrency(item.purchase_price)}</td>
                      <td>{formatCurrency(item.retail_price || item.selling_price)}</td>
                      <td>{formatCurrency(item.wholesale_price || item.retail_price || item.selling_price)}</td>
                      <td>{item.quantity_in_stock || 0}</td>
                      <td>{item.unit_type || 'piece'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button className="btn btn-secondary" onClick={onClose}>{t('categories.close')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
