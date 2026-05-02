import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowDown,
  faArrowUp,
  faBasketShopping,
  faBell,
  faBolt,
  faBox,
  faCheck,
  faFolderOpen,
  faLaptop,
  faPenToSquare,
  faPlus,
  faSliders,
  faTag,
} from '@fortawesome/free-solid-svg-icons';
import { productsAPI, suppliersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchProductDetailPack } from '../lib/workspaceQueries';
import PurchaseModal from './PurchaseModal';
import ProductModal from './ProductModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import { withCurrentScope } from '../utils/appRouteScope';
import { productDetailPremiumCss } from './productDetailPremiumStyles';

const LOW_STOCK_THRESHOLD = 5;

const ProductDetailView = ({ readOnly = false }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();
  const keys = zbKeys(activeShopId);

  const {
    data: pack,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: keys.productDetailPack(productId),
    queryFn: () => fetchProductDetailPack(productId),
    enabled: Boolean(activeShopId && productId),
    staleTime: 60 * 1000,
  });

  const product = pack?.product ?? null;
  const activity = useMemo(
    () => pack?.activity ?? { purchases: [], sales: [] },
    [pack]
  );
  const error =
    queryError &&
    (queryError.response?.data?.error || queryError.message || t('inventory.failedToLoadProduct'));
  const [activeTab, setActiveTab] = useState('purchases');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseModalSuppliers, setPurchaseModalSuppliers] = useState([]);
  const [purchaseModalProducts, setPurchaseModalProducts] = useState([]);
  const [purchaseModalLoading, setPurchaseModalLoading] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalSuppliers, setEditModalSuppliers] = useState([]);

  const formatCurrency = (amount) => {
    if (amount == null || amount === '') return '—';
    return `PKR ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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

  const formatOptional = (value, emptyLabel) => {
    if (value == null) return emptyLabel;
    const s = String(value).trim();
    return s.length ? s : emptyLabel;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const emptyLabel = t('inventory.fieldNotSet');
  const displayName = product
    ? formatOptional(product.item_name_english || product.name, emptyLabel)
    : '';
  const retail = product?.retail_price ?? product?.selling_price;
  const wholesale = product?.wholesale_price;
  const avgCost = product?.purchase_price;
  const stockNum = product != null ? Number(product.quantity_in_stock) : 0;
  const isLowStock = stockNum <= LOW_STOCK_THRESHOLD && stockNum >= 0;
  const isFrequent =
    product &&
    (product.is_frequently_sold === true || product.is_frequently_sold === 1);

  const { totalPurchased, totalSold, totalPurchasedAmt, totalSoldAmt, openingStock } =
    useMemo(() => {
      const purchases = activity.purchases || [];
      const sales = activity.sales || [];
      const tpQty = purchases.reduce((s, r) => s + Number(r.quantity || 0), 0);
      const tsQty = sales.reduce((s, r) => s + Number(r.quantity || 0), 0);
      const tpAmt = purchases.reduce(
        (s, r) => s + Number(r.quantity || 0) * Number(r.cost_price || 0),
        0
      );
      const tsAmt = sales.reduce(
        (s, r) => s + Number(r.quantity || 0) * Number(r.selling_price || 0),
        0
      );
      const current = Number(product?.quantity_in_stock ?? 0);
      const opening = Math.max(0, current - tpQty + tsQty);
      return {
        totalPurchased: tpQty,
        totalSold: tsQty,
        totalPurchasedAmt: tpAmt,
        totalSoldAmt: tsAmt,
        openingStock: opening,
      };
    }, [activity, product]);

  const stockBarPct = useMemo(() => {
    if (stockNum <= 0) return 0;
    return Math.min(100, Math.round((stockNum / Math.max(stockNum + 24, 1)) * 100));
  }, [stockNum]);

  const stockQtyDisplay = formatQty(stockNum);

  const goBack = () => navigate(withCurrentScope(location.pathname, '/inventory'));

  const handleAdjustStock = () => setAdjustmentModalOpen(true);

  const refreshProductActivity = async () => {
    if (!productId) return;
    await queryClient.invalidateQueries({ queryKey: keys.productDetailPack(productId) });
    await queryClient.invalidateQueries({ queryKey: keys.inventoryBundle() });
  };

  const openEditProductModal = async () => {
    try {
      const supRes = await suppliersAPI.getAll();
      setEditModalSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
    } catch {
      setEditModalSuppliers([]);
    }
    setEditModalOpen(true);
  };

  const handleProductModalSave = async (productData) => {
    await productsAPI.update(Number(productId), productData);
    setEditModalOpen(false);
    await refreshProductActivity();
  };

  const handleAddPurchase = async () => {
    setPurchaseModalLoading(true);
    try {
      const [supRes, prodRes] = await Promise.all([
        suppliersAPI.getAll(),
        productsAPI.getAll(),
      ]);
      setPurchaseModalSuppliers(supRes.data);
      setPurchaseModalProducts(prodRes.data);
      setPurchaseModalOpen(true);
    } catch (e) {
      alert(e.response?.data?.error || t('purchases.failedToLoad'));
    } finally {
      setPurchaseModalLoading(false);
    }
  };

  const handleAddSale = () => {
    if (!productId) return;
    navigate(withCurrentScope(location.pathname, '/billing'), {
      state: { billingAddProductId: Number(productId) },
    });
  };

  const purchaseCount = (activity.purchases || []).length;
  const saleCount = (activity.sales || []).length;
  const weightedCostLabel =
    avgCost != null && Number(avgCost) > 0
      ? formatCurrency(avgCost)
      : purchaseCount === 0
        ? 'No POs yet'
        : '—';

  if (loading) {
    return (
      <div className="content-container pdv3-wrap">
        <style>{productDetailPremiumCss}</style>
        <div className="pdv3-loading">
          <span className="pdv3-loading-ring" aria-hidden />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="content-container pdv3-wrap">
        <style>{productDetailPremiumCss}</style>
        <div className="pdv3-error">
          <p>{error || t('inventory.failedToLoadProduct')}</p>
          <button type="button" className="pdv3-btn-ghost" onClick={goBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> {t('inventory.backToProducts')}
          </button>
        </div>
      </div>
    );
  }

  const categoryLabel = formatOptional(product.category_name || product.category, emptyLabel);
  const unitLabel = formatOptional(product.unit_type, emptyLabel);
  const skuLabel = formatOptional(product.sku, emptyLabel);
  const hasSpecial =
    product.special_price != null &&
    product.special_price !== '' &&
    Number(product.special_price) > 0;
  const specialLabel = hasSpecial ? formatCurrency(product.special_price) : emptyLabel;
  const descriptionText = formatOptional(product.description, emptyLabel);

  return (
    <div className="content-container pdv3-wrap">
      <style>{productDetailPremiumCss}</style>
      <div className="pdv3">
        <nav className="pdv3-nav" aria-label={t('inventory.title')}>
          <button type="button" className="pdv3-back" onClick={goBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>{t('inventory.backToProducts')}</span>
          </button>
          <div className="pdv3-crumb">
            <span className="pdv3-crumb-current">{displayName}</span>
          </div>
        </nav>

        <header className="pdv3-hero">
          <div className="pdv3-hero-top">
            <div className="pdv3-hero-id">
              <div className="pdv3-hero-icon" aria-hidden>
                <FontAwesomeIcon icon={faLaptop} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 className="pdv3-hero-title">{displayName}</h1>
                <div className="pdv3-hero-chips">
                  <span className="pdv3-chip">{categoryLabel}</span>
                  <span className="pdv3-chip">{unitLabel}</span>
                  {isFrequent ? (
                    <span className="pdv3-chip pdv3-chip--accent">
                      <FontAwesomeIcon icon={faBolt} /> {t('inventory.frequentlySoldOnly')}
                    </span>
                  ) : null}
                  {isLowStock ? (
                    <span className="pdv3-chip" style={{ borderColor: 'rgba(251,191,36,0.5)', color: '#fde68a' }}>
                      <FontAwesomeIcon icon={faBell} /> {t('inventory.lowStock')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="pdv3-hero-stock">
              <span className="pdv3-hero-stock-label">{t('inventory.currentStock')}</span>
              <div className="pdv3-hero-stock-num">{stockQtyDisplay}</div>
              <span className="pdv3-hero-stock-sub">
                {unitLabel !== emptyLabel ? `${unitLabel} available` : 'units available'}
              </span>
              <div className="pdv3-hero-stock-bar" aria-hidden>
                <span style={{ width: `${stockBarPct}%` }} />
              </div>
            </div>
          </div>

          <div className="pdv3-hero-stats">
            <div className="pdv3-hero-stat">
              <label>{t('inventory.sellingPrice')}</label>
              <strong>{formatCurrency(retail)}</strong>
            </div>
            <div className="pdv3-hero-stat">
              <label>Wholesale price</label>
              <strong>{formatCurrency(wholesale)}</strong>
              <span className="pdv3-trade">Trade price</span>
            </div>
            <div className="pdv3-hero-stat">
              <label>{t('inventory.totalPurchased')}</label>
              <strong>
                {formatQty(totalPurchased)} {unitLabel !== emptyLabel ? unitLabel : 'pcs'}
              </strong>
              <span className="pdv3-sub">{formatCurrency(totalPurchasedAmt)}</span>
            </div>
            <div className="pdv3-hero-stat">
              <label>{t('inventory.totalSold')}</label>
              <strong>
                {formatQty(totalSold)} {unitLabel !== emptyLabel ? unitLabel : 'pcs'}
              </strong>
              <span className="pdv3-sub">{formatCurrency(totalSoldAmt)}</span>
            </div>
          </div>

          {!readOnly ? (
            <div className="pdv3-hero-actions">
              <button type="button" className="pdv3-btn-light pdv3-btn-light--solid" onClick={handleAdjustStock}>
                <FontAwesomeIcon icon={faPlus} /> {t('inventory.adjustStock')}
              </button>
              <button type="button" className="pdv3-btn-light pdv3-btn-light--outline" onClick={openEditProductModal}>
                <FontAwesomeIcon icon={faPenToSquare} /> Edit product
              </button>
            </div>
          ) : null}
        </header>

        <div className="pdv3-layout">
          <div className="pdv3-main-col">
            <section className="pdv3-card">
              <div className="pdv3-card-pad">
                <div className="pdv3-card-head">
                  <h2 className="pdv3-card-title">{t('inventory.productInformation')}</h2>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="pdv3-icon-btn"
                      onClick={openEditProductModal}
                      aria-label={t('common.edit')}
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                  ) : null}
                </div>
                <dl className="pdv3-spec-grid">
                  <div className="pdv3-spec-cell">
                    <dt>{t('inventory.productName')}</dt>
                    <dd>{displayName}</dd>
                  </div>
                  <div className={`pdv3-spec-cell ${!String(product.sku ?? '').trim() ? 'pdv3-spec-cell--muted' : ''}`}>
                    <dt>{t('inventory.barcodeSku')}</dt>
                    <dd>{skuLabel}</dd>
                  </div>
                  <div className={`pdv3-spec-cell ${!(product.category_name || product.category) ? 'pdv3-spec-cell--muted' : ''}`}>
                    <dt>{t('inventory.category')}</dt>
                    <dd>{categoryLabel}</dd>
                  </div>
                  <div className={`pdv3-spec-cell ${!String(product.unit_type ?? '').trim() ? 'pdv3-spec-cell--muted' : ''}`}>
                    <dt>{t('inventory.unitType')}</dt>
                    <dd>{unitLabel}</dd>
                  </div>
                  <div className="pdv3-spec-cell">
                    <dt>{t('inventory.sellingPrice')}</dt>
                    <dd>{formatCurrency(retail)}</dd>
                  </div>
                  <div className="pdv3-spec-cell">
                    <dt>Wholesale price</dt>
                    <dd>{formatCurrency(wholesale)}</dd>
                  </div>
                  <div className={`pdv3-spec-cell ${!hasSpecial ? 'pdv3-spec-cell--muted' : ''}`}>
                    <dt>Special / Promo</dt>
                    <dd>{specialLabel}</dd>
                  </div>
                  <div className="pdv3-spec-cell">
                    <dt>Low stock alert</dt>
                    <dd>Below {LOW_STOCK_THRESHOLD} {unitLabel !== emptyLabel ? unitLabel : 'pcs'}</dd>
                  </div>
                  <div className="pdv3-spec-cell pdv3-spec-cell--full">
                    <dt>Weighted avg cost</dt>
                    <dd>{weightedCostLabel}</dd>
                  </div>
                </dl>
                <div className="pdv3-desc">
                  <dt>Description</dt>
                  <dd>{descriptionText}</dd>
                </div>
              </div>
            </section>

            <section className="pdv3-card pdv3-tabs-card">
              <div className="pdv3-tabs-toolbar">
                <div className="pdv3-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'purchases'}
                    className={`pdv3-tab ${activeTab === 'purchases' ? 'pdv3-tab--active' : ''}`}
                    onClick={() => setActiveTab('purchases')}
                  >
                    <FontAwesomeIcon icon={faBasketShopping} /> {t('menu.purchases')} ({purchaseCount})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'sales'}
                    className={`pdv3-tab ${activeTab === 'sales' ? 'pdv3-tab--active' : ''}`}
                    onClick={() => setActiveTab('sales')}
                  >
                    <FontAwesomeIcon icon={faTag} /> {t('menu.sales')} ({saleCount})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'adjustments'}
                    className={`pdv3-tab ${activeTab === 'adjustments' ? 'pdv3-tab--active' : ''}`}
                    onClick={() => setActiveTab('adjustments')}
                  >
                    <FontAwesomeIcon icon={faSliders} /> {t('inventory.adjustments')} (0)
                  </button>
                </div>
              </div>

              {activeTab === 'purchases' && (
                <>
                  <div className="pdv3-table-wrap">
                    <table className="pdv3-table">
                      <thead>
                        <tr>
                          <th>{t('common.date')}</th>
                          <th>{t('purchases.supplier')}</th>
                          <th className="pdv3-table-num">{t('inventory.qtyIn')}</th>
                          <th className="pdv3-table-num">Unit cost</th>
                          <th className="pdv3-table-num">Total</th>
                          <th>{t('inventory.invoice')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.purchases.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: 0, border: 'none' }}>
                              <div className="pdv3-empty">
                                <FontAwesomeIcon icon={faFolderOpen} />
                                <p>No purchases yet</p>
                                <small>Record stock received via Add Purchase</small>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          activity.purchases.map((row) => {
                            const lineTotal =
                              Number(row.quantity || 0) * Number(row.cost_price || 0);
                            return (
                              <tr key={`${row.purchase_id}-${row.purchase_item_id}`}>
                                <td>{formatDate(row.date)}</td>
                                <td>{row.supplier_name || '—'}</td>
                                <td className="pdv3-table-num pdv3-num-in">
                                  +{formatQty(row.quantity)}
                                </td>
                                <td className="pdv3-table-num">{formatCurrency(row.cost_price)}</td>
                                <td className="pdv3-table-num">{formatCurrency(lineTotal)}</td>
                                <td>
                                  <code className="pdv3-code">{row.invoice_ref}</code>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="pdv3-table-footer">
                    <span>
                      {purchaseCount}{' '}
                      {purchaseCount === 1 ? 'purchase line' : 'purchase lines'}
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="pdv3-add-purchase"
                        onClick={handleAddPurchase}
                        disabled={purchaseModalLoading}
                      >
                        <FontAwesomeIcon icon={faPlus} />{' '}
                        {purchaseModalLoading ? t('common.loading') : t('inventory.addPurchase')}
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              {activeTab === 'sales' && (
                <>
                  <div className="pdv3-table-wrap">
                    <table className="pdv3-table">
                      <thead>
                        <tr>
                          <th>{t('common.date')}</th>
                          <th>{t('billing.customer')}</th>
                          <th className="pdv3-table-num">{t('inventory.qtyOut')}</th>
                          <th>{t('common.price')}</th>
                          <th>{t('billing.invoiceNumber')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.sales.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                              <div className="pdv3-empty">
                                <FontAwesomeIcon icon={faFolderOpen} />
                                <p>{t('inventory.noSaleLines')}</p>
                                <small>Create a sale from Billing or use Add Sale below</small>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          activity.sales.map((row, idx) => (
                            <tr key={`${row.sale_id}-${idx}`}>
                              <td>{formatDate(row.date)}</td>
                              <td>{row.customer_name || '—'}</td>
                              <td className="pdv3-table-num pdv3-num-out">
                                −{formatQty(row.quantity)}
                              </td>
                              <td>{formatCurrency(row.selling_price)}</td>
                              <td>
                                <code className="pdv3-code">{row.invoice_number || '—'}</code>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="pdv3-table-footer">
                    <span>
                      {saleCount} {saleCount === 1 ? 'sale line' : 'sale lines'}
                    </span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="pdv3-add-purchase pdv3-footer-action-light"
                        onClick={handleAddSale}
                      >
                        <FontAwesomeIcon icon={faPlus} /> Add sale
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              {activeTab === 'adjustments' && (
                <>
                  <div className="pdv3-empty" style={{ padding: '2rem 1.5rem 1rem' }}>
                    <FontAwesomeIcon icon={faBox} />
                    <p>{t('inventory.adjustmentsEmpty')}</p>
                    <small>Record a manual stock correction below</small>
                  </div>
                  <div className="pdv3-table-footer">
                    <span>Adjustments are saved to current quantity on hand</span>
                    {!readOnly ? (
                      <button
                        type="button"
                        className="pdv3-add-purchase pdv3-footer-action-light"
                        onClick={() => setAdjustmentModalOpen(true)}
                      >
                        <FontAwesomeIcon icon={faPlus} /> Add adjustment
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="pdv3-side-col">
            <section className="pdv3-card">
              <div className="pdv3-card-pad">
                <h3 className="pdv3-side-title">Stock breakdown</h3>
                <ul className="pdv3-break-list">
                  <li className="pdv3-break-item">
                    <span className="pdv3-break-left">
                      <FontAwesomeIcon icon={faCheck} style={{ color: '#22c55e' }} />
                      Opening stock
                    </span>
                    <span className="pdv3-break-val">{formatQty(openingStock)}</span>
                  </li>
                  <li className="pdv3-break-item">
                    <span className="pdv3-break-left">
                      <FontAwesomeIcon icon={faArrowUp} style={{ color: '#3b82f6' }} />
                      Purchased
                    </span>
                    <span className="pdv3-break-val pdv3-break-val--in">+{formatQty(totalPurchased)}</span>
                  </li>
                  <li className="pdv3-break-item">
                    <span className="pdv3-break-left">
                      <FontAwesomeIcon icon={faArrowDown} style={{ color: '#f59e0b' }} />
                      Sold
                    </span>
                    <span className="pdv3-break-val pdv3-break-val--out">−{formatQty(totalSold)}</span>
                  </li>
                  <li className="pdv3-break-item">
                    <span className="pdv3-break-left">
                      <FontAwesomeIcon icon={faPlus} style={{ color: '#8b5cf6' }} />
                      Adjustments
                    </span>
                    <span className="pdv3-break-val pdv3-break-val--adj">+0</span>
                  </li>
                </ul>
                <div className="pdv3-instock-footer">
                  <span>In stock now</span>
                  <strong>
                    {stockQtyDisplay}{' '}
                    {unitLabel !== emptyLabel ? unitLabel : 'pcs'}
                  </strong>
                </div>
              </div>
            </section>

            <section className="pdv3-card">
              <div className="pdv3-card-pad">
                <h3 className="pdv3-side-title">Pricing</h3>
                <div className="pdv3-price-row">
                  <span>Retail price</span>
                  <span>{formatCurrency(retail)}</span>
                </div>
                <div className="pdv3-price-row">
                  <span>Wholesale</span>
                  <span>{formatCurrency(wholesale)}</span>
                </div>
                <div className={`pdv3-price-row ${!hasSpecial ? 'pdv3-price-row--muted' : ''}`}>
                  <span>Special / Promo</span>
                  <span>{hasSpecial ? formatCurrency(product.special_price) : 'Not set'}</span>
                </div>
                <div
                  className={`pdv3-price-row ${
                    avgCost == null || Number(avgCost) <= 0 ? 'pdv3-price-row--muted' : ''
                  }`}
                >
                  <span>Weighted avg cost</span>
                  <span>{weightedCostLabel}</span>
                </div>
              </div>
            </section>

            <section className="pdv3-card">
              <div className="pdv3-card-pad">
                <h3 className="pdv3-side-title">Activity</h3>
                <div className="pdv3-activity-item">
                  <span className="pdv3-activity-dot" aria-hidden />
                  <div>
                    <strong>Product in catalog</strong>
                    <span>
                      Opening stock (est.): {formatQty(openingStock)}{' '}
                      {unitLabel !== emptyLabel ? unitLabel : 'pcs'}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {purchaseModalOpen && (
        <PurchaseModal
          suppliers={purchaseModalSuppliers}
          products={purchaseModalProducts}
          initialProductId={Number(productId)}
          onClose={() => setPurchaseModalOpen(false)}
          onSave={async () => {
            setPurchaseModalOpen(false);
            await refreshProductActivity();
          }}
        />
      )}

      {adjustmentModalOpen && product ? (
        <StockAdjustmentModal
          product={product}
          onClose={() => setAdjustmentModalOpen(false)}
          onSaved={refreshProductActivity}
        />
      ) : null}

      {editModalOpen && product ? (
        <ProductModal
          product={product}
          suppliers={editModalSuppliers}
          onClose={() => setEditModalOpen(false)}
          onSave={handleProductModalSave}
        />
      ) : null}
    </div>
  );
};

export default ProductDetailView;
