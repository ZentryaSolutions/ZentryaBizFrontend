import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
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
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchInventoryBundle, sortRowsByRecencyDesc } from '../lib/workspaceQueries';
import { withCurrentScope } from '../utils/appRouteScope';
import { inventoryCustomStyles } from '../styles/inventoryCustomStyles';
import ProductModal from './ProductModal';
import Pagination from './Pagination';
import PageLoadingCenter from './PageLoadingCenter';
import './Inventory.css';

const LOW_STOCK_THRESHOLD = 5;

const Inventory = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: zbKeys(activeShopId).inventoryBundle(),
    queryFn: fetchInventoryBundle,
    enabled: Boolean(activeShopId),
  });

  const suppliers = data?.suppliers ?? [];
  const categories = data?.categories ?? [];
  const rawProducts = useMemo(
    () => (Array.isArray(data?.products) ? data.products : []),
    [data?.products]
  );
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showFrequentlySoldOnly, setShowFrequentlySoldOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const products = useMemo(() => {
    if (!sortConfig.key) {
      return sortRowsByRecencyDesc(rawProducts, 'product_id');
    }
    const list = Array.isArray(rawProducts) ? [...rawProducts] : [];
    const key = sortConfig.key;
    const direction = sortConfig.direction;
    return list.sort((a, b) => {
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
  }, [rawProducts, sortConfig]);

  const error = useMemo(() => {
    if (!isError || !queryError) return null;
    const err = queryError;
    const msg = err.message || '';
    const code = err.code;
    if (code === 'ECONNREFUSED' || msg.includes('Network Error')) {
      return 'Cannot connect to backend server. Please ensure the backend is running on port 5000.';
    }
    const status = err.response?.status;
    const apiErr = err.response?.data?.error;
    if (status === 403 || apiErr === 'Access denied') {
      return err.response?.data?.message || 'Access denied. Please contact administrator.';
    }
    return err.response?.data?.error || 'Failed to load inventory data. Please check the console for details.';
  }, [isError, queryError]);

  const safeCategories = Array.isArray(categories) ? categories : [];

  const filteredProducts = useMemo(() => {
    let filtered = products;

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
  }, [products, searchQuery, selectedCategory, showFrequentlySoldOnly]);

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
    const p = products.find((x) => Number(x.product_id) === id);
    if (p) {
      setEditingProduct(p);
      setModalOpen(true);
    }
    navigate(withCurrentScope(location.pathname, '/inventory'), { replace: true, state: {} });
  }, [location.state, products, navigate, loading]);

  useEffect(() => {
    const onRefresh = () => {
      queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
    };
    window.addEventListener('data-refresh', onRefresh);
    return () => window.removeEventListener('data-refresh', onRefresh);
  }, [activeShopId, queryClient]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
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
      if (editingProduct) {
        await productsAPI.update(editingProduct.product_id, productData);
      } else {
        await productsAPI.create(productData);
      }
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
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

  const handleInlineBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(withCurrentScope(location.pathname, '/app'));
  };

  const exportCsv = () => {
    const rows = filteredProducts.map((p) => ({
      Product: p.item_name_english || p.name || '',
      Category: p.category_name || p.category || '',
      RetailPrice: Number(p.retail_price || p.selling_price || 0).toFixed(2),
      WholesalePrice: Number(p.wholesale_price || p.retail_price || p.selling_price || 0).toFixed(2),
      Stock: Number(p.quantity_in_stock || 0).toString(),
      Supplier: p.supplier_name || '',
    }));
    const header = Object.keys(rows[0] || { Product: '', Category: '', RetailPrice: '', WholesalePrice: '', Stock: '', Supplier: '' });
    const csv = [
      header.join(','),
      ...rows.map((r) => header.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.csv';
    link.click();
    URL.revokeObjectURL(url);
  };


  const totalProducts = filteredProducts.length;
  const lowStockCount = filteredProducts.filter((p) => Number(p.quantity_in_stock) > 0 && Number(p.quantity_in_stock) <= LOW_STOCK_THRESHOLD).length;
  const outOfStockCount = filteredProducts.filter((p) => Number(p.quantity_in_stock) <= 0).length;
  const inventoryValue = filteredProducts.reduce(
    (sum, p) => sum + (Number(p.purchase_price || 0) * Math.max(0, Number(p.quantity_in_stock || 0))),
    0
  );
  const formatCompactPKR = (value) => {
    if (!Number.isFinite(value)) return 'PKR 0';
    if (value >= 100000) return `PKR ${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `PKR ${(value / 1000).toFixed(1)}K`;
    return `PKR ${Math.round(value)}`;
  };

  if (loading) {
    return (
      <div className="content-container inv2">
        <PageLoadingCenter message={`${t('common.loading')} ${t('inventory.title').toLowerCase()}…`} />
      </div>
    );
  }

  return (
    <div className="content-container inv2 inv3">
      <style>{inventoryCustomStyles}</style>
      <nav className="inv3-breadcrumb" aria-label={t('inventory.title')}>
        <button type="button" className="inv3-breadcrumbPill" onClick={handleInlineBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          {t('common.back')}
        </button>
      </nav>

      <div className="inv3-topCards">
        <div className="inv3-card">
          <div className="inv3-cardHead">
            <FontAwesomeIcon icon={faBoxOpen} />
            <span className="inv3-pill">Total</span>
          </div>
          <div className="inv3-cardVal">{totalProducts}</div>
          <div className="inv3-cardLbl">Products</div>
          <div className="inv3-cardSub">Across all categories</div>
        </div>
        <div className="inv3-card">
          <div className="inv3-cardHead">
            <FontAwesomeIcon icon={faFilter} />
            <span className="inv3-pill">Alert</span>
          </div>
          <div className="inv3-cardVal">{lowStockCount}</div>
          <div className="inv3-cardLbl">Low Stock</div>
          <div className="inv3-cardSub">Below minimum threshold</div>
        </div>
        <div className="inv3-card">
          <div className="inv3-cardHead">
            <span>$</span>
            <span className="inv3-pill">Value</span>
          </div>
          <div className="inv3-cardVal">{formatCompactPKR(inventoryValue)}</div>
          <div className="inv3-cardLbl">Inventory Value</div>
          <div className="inv3-cardSub">At purchase price</div>
        </div>
        <div className="inv3-card">
          <div className="inv3-cardHead">
            <FontAwesomeIcon icon={faBolt} />
            <span className="inv3-pill">Watch</span>
          </div>
          <div className="inv3-cardVal">{outOfStockCount}</div>
          <div className="inv3-cardLbl">Out of Stock</div>
          <div className="inv3-cardSub">Needs restocking via PO</div>
        </div>
      </div>

      <div className="inv3-headingRow">
        <div>
          <h1 className="inv3-title">{t('inventory.title')}</h1>
          <p className="inv3-subtitle">Manage your products, prices and stock levels</p>
        </div>
        {!readOnly ? (
          <button type="button" className="inv3-addBtn" onClick={handleAdd}>
            <FontAwesomeIcon icon={faPlus} />
            Add Product
          </button>
        ) : null}
      </div>

      {error ? <div className="inv2-alert inv2-alert--error">{error}</div> : null}

      <section className="inv3-filterBar" aria-label={t('inventory.filterByCategory')}>
        <input
          id="inv-search"
          type="search"
          className="inv3-input"
          placeholder="Search by name, SKU or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
        <select
          id="inv-category"
          className="inv3-select"
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
        <button
          type="button"
          className="inv3-chipBtn"
          onClick={() => setShowFrequentlySoldOnly((v) => !v)}
        >
          <span style={{ color: '#7869f7' }}>●</span>
          Frequently Sold
        </button>
        <button type="button" className="inv3-chipBtn" onClick={exportCsv}>
          <FontAwesomeIcon icon={faDownload} />
          Export
        </button>
        {filterActive ? (
          <button type="button" className="inv3-chipBtn" onClick={clearFilters}>
            {t('common.clearFilters')}
          </button>
        ) : (
          <span />
        )}
      </section>

      <section className="inv3-listShell">
        <div className="inv3-listHead">
          <h3>Products</h3>
          <span className="inv3-listCount">Showing {paginatedProducts.length} of {filteredProducts.length} products</span>
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
                <th>Wholesale</th>
                <th>
                  <button type="button" className="inv2-th-btn" onClick={() => handleSort('quantity_in_stock')}>
                    {t('inventory.stock')}
                    {renderSortIcon('quantity_in_stock')}
                  </button>
                </th>
                <th>Status</th>
                <th className="inv2-col-actions">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="inv2-empty">
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
                      <td className="inv2-num">{formatCurrency(retailPrice)}</td>
                      <td>
                        <div>{formatCurrency(wholesalePrice)}</div>
                      </td>
                      <td>
                        <div className="inv3-stockWrap">
                          <span className={low ? 'inv2-stock-low' : ''}>
                            {formatQty(product.quantity_in_stock)}
                            {product.unit_type ? <span className="inv2-unit"> {product.unit_type}</span> : null}
                          </span>
                          <span className="inv3-stockBar">
                            <span style={{ width: `${Math.min(100, Math.max(8, Number(product.quantity_in_stock || 0)))}%` }} />
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inv3-status ${
                            qty <= 0 ? 'inv3-status--out' : low ? 'inv3-status--low' : 'inv3-status--ok'
                          }`}
                        >
                          {qty <= 0 ? 'Out Stock' : low ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="inv2-actions">
                        <button
                          type="button"
                          className="inv2-action inv2-action--view"
                          onClick={() => handleViewDetails(product)}
                          aria-label="View product"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        {!readOnly ? (
                          <>
                            <button
                              type="button"
                              className="inv2-action inv2-action--edit"
                              onClick={() => handleEdit(product)}
                              aria-label="Edit product"
                            >
                              <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button
                              type="button"
                              className="inv2-action inv2-action--delete"
                              onClick={() => setDeleteConfirm(product.product_id)}
                              aria-label="Delete product"
                            >
                              <FontAwesomeIcon icon={faTrash} />
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
