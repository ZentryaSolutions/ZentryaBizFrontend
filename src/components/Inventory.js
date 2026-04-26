import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDownWideShort,
  faArrowUpWideShort,
  faArrowsUpDown,
  faBolt,
  faBoxOpen,
  faFilter,
  faPlus,
  faTrash,
  faPenToSquare,
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import { productsAPI, suppliersAPI, categoriesAPI } from '../services/api';
import { withCurrentScope } from '../utils/appRouteScope';
import ProductModal from './ProductModal';
import Pagination from './Pagination';
import './Inventory.css';

const LOW_STOCK_THRESHOLD = 5;

const Inventory = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFrequentlySoldOnly, setShowFrequentlySoldOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const filteredProducts = useMemo(() => {
    let filtered = safeProducts;

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (showFrequentlySoldOnly) {
      filtered = filtered.filter((p) => p.is_frequently_sold === true || p.is_frequently_sold === 1);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const nameEnglish = (product.item_name_english || product.name || '').toLowerCase();
        return nameEnglish.includes(query);
      });
    }

    return filtered;
  }, [safeProducts, searchQuery, selectedCategory, showFrequentlySoldOnly]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const filterActive = Boolean(selectedCategory || showFrequentlySoldOnly || searchQuery.trim());

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, showFrequentlySoldOnly]);

  useEffect(() => {
    const raw = location.state?.editProductId;
    if (raw == null) return;
    const id = Number(raw);
    if (Number.isNaN(id)) return;
    if (loading) return;
    const p = safeProducts.find((x) => Number(x.product_id) === id);
    if (p) {
      setEditingProduct(p);
      setModalOpen(true);
    }
    navigate(withCurrentScope(location.pathname, '/inventory'), { replace: true, state: {} });
  }, [location.state, safeProducts, navigate, loading]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let suppliersData = [];
      try {
        const suppliersResponse = await suppliersAPI.getAll();
        suppliersData = Array.isArray(suppliersResponse.data) ? suppliersResponse.data : [];
      } catch (supplierErr) {
        console.warn('Suppliers API not accessible (may require admin role):', supplierErr.message);
        suppliersData = [];
      }

      const categoriesResponse = await categoriesAPI.getAll();

      setSuppliers(suppliersData);
      setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []);

      await fetchProducts();
    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('Cannot connect to backend server. Please ensure the backend is running on port 5000.');
      } else if (err.response?.status === 403 || err.response?.data?.error === 'Access denied') {
        setError(err.response?.data?.message || 'Access denied. Please contact administrator.');
      } else {
        setError(err.response?.data?.error || 'Failed to load inventory data. Please check the console for details.');
      }
      setSuppliers([]);
      setCategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsResponse = await productsAPI.getAll();
      const productsData = Array.isArray(productsResponse.data) ? productsResponse.data : [];

      productsData.sort((a, b) => {
        const aFrequent = a.is_frequently_sold === true || a.is_frequently_sold === 1;
        const bFrequent = b.is_frequently_sold === true || b.is_frequently_sold === 1;
        if (aFrequent && !bFrequent) return -1;
        if (!aFrequent && bFrequent) return 1;
        const nameA = (a.item_name_english || a.name || '').toLowerCase();
        const nameB = (b.item_name_english || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setProducts(productsData);
    } catch (err) {
      console.error('Error fetching products:', err);
      if (err.response?.status === 403 || err.response?.data?.error === 'Access denied') {
        setError(err.response?.data?.message || 'Access denied. Please contact administrator.');
      } else {
        setError(err.response?.data?.error || 'Failed to load products. Please check the console for details.');
      }
      setProducts([]);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const list = Array.isArray(products) ? products : [];
    const sortedProducts = [...list].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (key === 'quantity_in_stock') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setProducts(sortedProducts);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleViewDetails = (product) => {
    navigate(withCurrentScope(location.pathname, `/inventory/product/${product.product_id}`));
  };

  const handleDelete = async (productId) => {
    try {
      await productsAPI.delete(productId);
      const list = Array.isArray(products) ? products : [];
      setProducts(list.filter((p) => p.product_id !== productId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err.response?.data?.error || t('inventory.productFailed'));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleModalSave = async (productData) => {
    try {
      const list = Array.isArray(products) ? products : [];
      if (editingProduct) {
        const response = await productsAPI.update(editingProduct.product_id, productData);
        setProducts(list.map((p) => (p.product_id === editingProduct.product_id ? response.data : p)));
      } else {
        const response = await productsAPI.create(productData);
        setProducts([...list, response.data]);
      }
      handleModalClose();
    } catch (err) {
      console.error('Error saving product:', err);
      throw err;
    }
  };

  const formatCurrency = (amount) => {
    return `PKR ${Number(amount).toFixed(2)}`;
  };

  const formatQty = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return '—';
    const rounded = Math.round(x * 1000) / 1000;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
      return String(Math.round(rounded));
    }
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FontAwesomeIcon icon={faArrowsUpDown} className="inv2-sort-icon" />;
    }
    return (
      <FontAwesomeIcon
        icon={sortConfig.direction === 'asc' ? faArrowUpWideShort : faArrowDownWideShort}
        className="inv2-sort-icon inv2-sort-icon--active"
      />
    );
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setShowFrequentlySoldOnly(false);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="content-container inv2">
        <div className="inv2-loading">
          <span className="inv2-loading-ring" aria-hidden />
          <p>
            {t('common.loading')} {t('inventory.title').toLowerCase()}…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container inv2">
      <header className="inv2-hero">
        <div className="inv2-hero-accent" aria-hidden />
        <div className="inv2-hero-inner">
          <div className="inv2-hero-main">
            <span className="inv2-eyebrow">{t('menu.products')}</span>
            <h1 className="inv2-hero-title">{t('inventory.title')}</h1>
            <p className="inv2-hero-sub">{t('inventory.subtitle')}</p>
          </div>
          <div className="inv2-hero-stat" aria-hidden>
            <FontAwesomeIcon icon={faBoxOpen} className="inv2-hero-stat-icon" />
            <div>
              <span className="inv2-hero-stat-val">{filteredProducts.length}</span>
              <span className="inv2-hero-stat-label">{t('menu.products')}</span>
            </div>
          </div>
        </div>
      </header>

      {error ? <div className="inv2-alert inv2-alert--error">{error}</div> : null}

      <section className="inv2-panel inv2-panel--filters" aria-label={t('inventory.filterByCategory')}>
        <div className="inv2-panel-head">
          <FontAwesomeIcon icon={faFilter} className="inv2-panel-head-icon" />
          <h2 className="inv2-panel-title">{t('inventory.filterByCategory')}</h2>
        </div>
        <div className="inv2-filter-grid">
          <div className="inv2-field">
            <label className="inv2-label" htmlFor="inv-search">
              {t('inventory.searchProducts')}
            </label>
            <input
              id="inv-search"
              type="search"
              className="inv2-input"
              placeholder={t('inventory.searchProducts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="inv2-field">
            <label className="inv2-label" htmlFor="inv-category">
              {t('inventory.category')}
            </label>
            <select
              id="inv-category"
              className="inv2-select"
              value={selectedCategory || ''}
              onChange={(e) => {
                setSelectedCategory(e.target.value ? parseInt(e.target.value, 10) : null);
              }}
            >
              <option value="">{t('inventory.allCategories')}</option>
              {safeCategories
                .filter((c) => c.status === 'active')
                .map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="inv2-field inv2-field--row">
            <label className="inv2-toggle">
              <input
                type="checkbox"
                checked={showFrequentlySoldOnly}
                onChange={(e) => setShowFrequentlySoldOnly(e.target.checked)}
              />
              <span>{t('inventory.frequentlySoldOnly')}</span>
            </label>
            {filterActive ? (
              <button type="button" className="inv2-btn inv2-btn--ghost" onClick={clearFilters}>
                {t('common.clearFilters')}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="inv2-panel inv2-panel--list">
        <div className="inv2-toolbar">
          <h2 className="inv2-toolbar-title">{t('menu.products')}</h2>
          <div className="inv2-toolbar-actions">
            {readOnly ? (
              <span className="inv2-readonly">{t('common.readOnlyMode')}</span>
            ) : (
              <button type="button" className="inv2-btn inv2-btn--primary" onClick={handleAdd}>
                <FontAwesomeIcon icon={faPlus} />
                {t('inventory.addProduct')}
              </button>
            )}
          </div>
        </div>

        <div className="inv2-table-scroll">
          <table className="inv2-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="inv2-th-btn" onClick={() => handleSort('name')}>
                    {t('inventory.productName')}
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th>{t('inventory.category')}</th>
                <th>{t('inventory.purchasePrice')}</th>
                <th>{t('inventory.sellingPrice')}</th>
                <th>
                  <button type="button" className="inv2-th-btn" onClick={() => handleSort('quantity_in_stock')}>
                    {t('inventory.stock')}
                    {renderSortIcon('quantity_in_stock')}
                  </button>
                </th>
                <th>{t('suppliers.title')}</th>
                <th className="inv2-col-actions">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="inv2-empty">
                    {searchQuery
                      ? t('inventory.noProductsMatching', { query: searchQuery })
                      : readOnly
                        ? t('inventory.noProductsReadOnly')
                        : t('inventory.noProducts')}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const displayName = product.item_name_english || product.name || 'N/A';
                  const retailPrice = product.retail_price || product.selling_price;
                  const wholesalePrice = product.wholesale_price || retailPrice;
                  const isFrequent = product.is_frequently_sold === true || product.is_frequently_sold === 1;
                  const qty = Number(product.quantity_in_stock);
                  const low = qty <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={product.product_id} className={low ? 'inv2-row--low' : ''}>
                      <td>
                        <div className="inv2-cell-name">
                          <span>{displayName}</span>
                          {isFrequent ? (
                            <span className="inv2-chip inv2-chip--fast">
                              <FontAwesomeIcon icon={faBolt} />
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={!(product.category_name || product.category) ? 'inv2-muted' : ''}>
                        {product.category_name || product.category || '—'}
                      </td>
                      <td className="inv2-num">{formatCurrency(product.purchase_price)}</td>
                      <td>
                        <div>{formatCurrency(retailPrice)}</div>
                        {wholesalePrice !== retailPrice ? (
                          <div className="inv2-price-sub">
                            {t('billing.wholesale')}: {formatCurrency(wholesalePrice)}
                          </div>
                        ) : null}
                        {product.special_price ? (
                          <div className="inv2-price-sub inv2-price-sub--special">
                            {t('billing.special')}: {formatCurrency(product.special_price)}
                          </div>
                        ) : null}
                      </td>
                      <td className="inv2-num">
                        <span className={low ? 'inv2-stock-low' : ''}>
                          {formatQty(product.quantity_in_stock)}
                          {product.unit_type ? (
                            <span className="inv2-unit"> {product.unit_type}</span>
                          ) : null}
                        </span>
                      </td>
                      <td>{product.supplier_name || '—'}</td>
                      <td className="inv2-actions">
                        <button
                          type="button"
                          className="inv2-action inv2-action--view"
                          onClick={() => handleViewDetails(product)}
                        >
                          <FontAwesomeIcon icon={faEye} />
                          <span>{t('inventory.view')}</span>
                        </button>
                        {!readOnly ? (
                          <>
                            <button
                              type="button"
                              className="inv2-action inv2-action--edit"
                              onClick={() => handleEdit(product)}
                            >
                              <FontAwesomeIcon icon={faPenToSquare} />
                              <span>{t('common.edit')}</span>
                            </button>
                            <button
                              type="button"
                              className="inv2-action inv2-action--delete"
                              onClick={() => setDeleteConfirm(product.product_id)}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                              <span>{t('common.delete')}</span>
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="inv2-pagination">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProducts.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          </div>
        ) : null}
      </section>

      {deleteConfirm ? (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal delete-modal inv2-delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('common.confirmDelete')}</h3>
            <p>
              {t('inventory.deleteConfirm')} {t('common.cannotBeUndone')}
            </p>
            <div className="modal-actions">
              <button type="button" className="inv2-btn inv2-btn--ghost" onClick={() => setDeleteConfirm(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="inv2-btn inv2-btn--danger" onClick={() => handleDelete(deleteConfirm)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <ProductModal
          product={editingProduct}
          suppliers={suppliers}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      ) : null}
    </div>
  );
};

export default Inventory;
