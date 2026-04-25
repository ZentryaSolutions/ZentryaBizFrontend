import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBasketShopping,
  faBell,
  faBolt,
  faBox,
  faChartLine,
  faPenToSquare,
  faPlus,
  faSliders,
  faTag,
} from '@fortawesome/free-solid-svg-icons';
import { productsAPI } from '../services/api';
import { withCurrentScope } from '../utils/appRouteScope';
import './ProductDetailView.css';

const LOW_STOCK_THRESHOLD = 5;

const ProductDetailView = ({ readOnly = false }) => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [product, setProduct] = useState(null);
  const [activity, setActivity] = useState({ purchases: [], sales: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('purchases');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!productId) return;
      setLoading(true);
      setError(null);
      try {
        const [prodRes, actRes] = await Promise.all([
          productsAPI.getById(productId),
          productsAPI.getActivity(productId).catch(() => ({ data: { purchases: [], sales: [] } })),
        ]);
        if (!cancelled) {
          setProduct(prodRes.data);
          setActivity({
            purchases: actRes.data?.purchases || [],
            sales: actRes.data?.sales || [],
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.response?.data?.error || t('inventory.failedToLoadProduct'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, t]);

  const formatCurrency = (amount) => {
    if (amount == null || amount === '') return '—';
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
  const avgCost = product?.purchase_price;
  const stockNum = product != null ? Number(product.quantity_in_stock) : 0;
  const isLowStock = stockNum <= LOW_STOCK_THRESHOLD;
  const isFrequent =
    product &&
    (product.is_frequently_sold === true || product.is_frequently_sold === 1);

  const { totalPurchased, totalSold } = useMemo(() => {
    const tp = (activity.purchases || []).reduce((s, r) => s + Number(r.quantity || 0), 0);
    const ts = (activity.sales || []).reduce((s, r) => s + Number(r.quantity || 0), 0);
    return { totalPurchased: tp, totalSold: ts };
  }, [activity]);

  const stockQtyDisplay = formatQty(stockNum);

  const goBack = () => navigate(withCurrentScope(location.pathname, '/inventory'));

  const handleEdit = () => {
    navigate(withCurrentScope(location.pathname, '/inventory'), { state: { editProductId: Number(productId) } });
  };

  const handleAddPurchase = () => navigate(withCurrentScope(location.pathname, '/purchases'));

  if (loading) {
    return (
      <div className="content-container pdv2">
        <div className="pdv2-loading">
          <span className="pdv2-loading-ring" aria-hidden />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="content-container pdv2">
        <div className="pdv2-error-panel">
          <p>{error || t('inventory.failedToLoadProduct')}</p>
          <button type="button" className="pdv2-btn pdv2-btn--ghost" onClick={goBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> {t('inventory.backToProducts')}
          </button>
        </div>
      </div>
    );
  }

  const categoryLabel = formatOptional(product.category_name || product.category, emptyLabel);
  const unitLabel = formatOptional(product.unit_type, emptyLabel);

  return (
    <div className="content-container pdv2">
      <div className="pdv2-topbar">
        <button type="button" className="pdv2-backlink" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>{t('inventory.backToProducts')}</span>
        </button>
        <div className="pdv2-topbar-meta">
          <span className="pdv2-topbar-title">{t('inventory.productDetails')}</span>
          <span className="pdv2-topbar-dot" aria-hidden />
          <span className="pdv2-topbar-sub">{t('inventory.productDetailsSubtitle')}</span>
        </div>
      </div>

      <header className="pdv2-hero">
        <div className="pdv2-hero-accent" aria-hidden />
        <div className="pdv2-hero-inner">
          <div className="pdv2-hero-main">
            <h1 className="pdv2-hero-name">{displayName}</h1>
            <div className="pdv2-hero-chips">
              <span className="pdv2-chip">{categoryLabel}</span>
              <span className="pdv2-chip pdv2-chip--outline">{unitLabel}</span>
              {isFrequent ? (
                <span className="pdv2-chip pdv2-chip--accent">
                  <FontAwesomeIcon icon={faBolt} /> {t('inventory.frequentlySoldOnly')}
                </span>
              ) : null}
            </div>
          </div>
          <div className="pdv2-hero-actions">
            {isLowStock ? (
              <span className="pdv2-alert-pill">
                <FontAwesomeIcon icon={faBell} /> {t('inventory.lowStock')}
              </span>
            ) : null}
            {!readOnly ? (
              <>
                <button type="button" className="pdv2-btn pdv2-btn--secondary" onClick={handleEdit}>
                  <FontAwesomeIcon icon={faPenToSquare} /> {t('common.edit')}
                </button>
                <button type="button" className="pdv2-btn pdv2-btn--primary" onClick={handleEdit}>
                  <FontAwesomeIcon icon={faPlus} /> {t('inventory.adjustStock')}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <section className="pdv2-kpis" aria-label={t('inventory.summary')}>
        <article
          className={`pdv2-kpi pdv2-kpi--lead ${isLowStock ? 'pdv2-kpi--warn' : ''} ${stockNum < 0 ? 'pdv2-kpi--danger' : ''}`}
        >
          <div className="pdv2-kpi-icon" aria-hidden>
            <FontAwesomeIcon icon={faBox} />
          </div>
          <div className="pdv2-kpi-body">
            <span className="pdv2-kpi-label">{t('inventory.currentStock')}</span>
            <div className="pdv2-kpi-value-row">
              <strong className="pdv2-kpi-value">{stockQtyDisplay}</strong>
              {String(product.unit_type ?? '').trim() ? (
                <span className="pdv2-kpi-unit">{product.unit_type}</span>
              ) : null}
            </div>
            <p className="pdv2-kpi-note">{t('inventory.stockCalculatedHint')}</p>
          </div>
        </article>
        <article className="pdv2-kpi">
          <div className="pdv2-kpi-icon pdv2-kpi-icon--green" aria-hidden>
            <FontAwesomeIcon icon={faBasketShopping} />
          </div>
          <div className="pdv2-kpi-body">
            <span className="pdv2-kpi-label">{t('inventory.totalPurchased')}</span>
            <strong className="pdv2-kpi-value pdv2-kpi-value--in">{formatQty(totalPurchased)}</strong>
          </div>
        </article>
        <article className="pdv2-kpi">
          <div className="pdv2-kpi-icon pdv2-kpi-icon--rose" aria-hidden>
            <FontAwesomeIcon icon={faTag} />
          </div>
          <div className="pdv2-kpi-body">
            <span className="pdv2-kpi-label">{t('inventory.totalSold')}</span>
            <strong className="pdv2-kpi-value pdv2-kpi-value--out">{formatQty(totalSold)}</strong>
          </div>
        </article>
        <article className="pdv2-kpi">
          <div className="pdv2-kpi-icon pdv2-kpi-icon--violet" aria-hidden>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="pdv2-kpi-body">
            <span className="pdv2-kpi-label">{t('inventory.sellingPrice')}</span>
            <strong className="pdv2-kpi-value pdv2-kpi-value--sm">{formatCurrency(retail)}</strong>
            <span className="pdv2-kpi-sub">
              {t('inventory.averageCost')}: {formatCurrency(avgCost)}
            </span>
          </div>
        </article>
      </section>

      <section className="pdv2-panel">
        <h2 className="pdv2-panel-title">{t('inventory.productInformation')}</h2>
        <dl className="pdv2-spec-grid">
          <div className="pdv2-spec-row">
            <dt>{t('inventory.productName')}</dt>
            <dd>{displayName}</dd>
          </div>
          <div className="pdv2-spec-row">
            <dt>{t('inventory.category')}</dt>
            <dd className={!(product.category_name || product.category) ? 'pdv2-spec-row--muted' : ''}>
              {categoryLabel}
            </dd>
          </div>
          <div className="pdv2-spec-row">
            <dt>{t('inventory.barcodeSku')}</dt>
            <dd className={!String(product.sku ?? '').trim() ? 'pdv2-spec-row--muted' : ''}>
              {formatOptional(product.sku, emptyLabel)}
            </dd>
          </div>
          <div className="pdv2-spec-row">
            <dt>{t('inventory.sellingPrice')}</dt>
            <dd>{formatCurrency(retail)}</dd>
          </div>
          <div className="pdv2-spec-row">
            <dt>{t('inventory.averageCost')}</dt>
            <dd>{formatCurrency(avgCost)}</dd>
          </div>
          <div className="pdv2-spec-row">
            <dt>{t('inventory.unitType')}</dt>
            <dd className={!String(product.unit_type ?? '').trim() ? 'pdv2-spec-row--muted' : ''}>
              {unitLabel}
            </dd>
          </div>
        </dl>
      </section>

      <section className="pdv2-panel pdv2-panel--activity">
        <div className="pdv2-activity-toolbar">
          <div className="pdv2-segment" role="tablist" aria-label={t('inventory.productDetails')}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'purchases'}
              className={`pdv2-segment-btn ${activeTab === 'purchases' ? 'pdv2-segment-btn--on' : ''}`}
              onClick={() => setActiveTab('purchases')}
            >
              <FontAwesomeIcon icon={faBasketShopping} /> {t('menu.purchases')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sales'}
              className={`pdv2-segment-btn ${activeTab === 'sales' ? 'pdv2-segment-btn--on' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <FontAwesomeIcon icon={faTag} /> {t('menu.sales')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'adjustments'}
              className={`pdv2-segment-btn ${activeTab === 'adjustments' ? 'pdv2-segment-btn--on' : ''}`}
              onClick={() => setActiveTab('adjustments')}
            >
              <FontAwesomeIcon icon={faSliders} /> {t('inventory.adjustments')}
            </button>
          </div>
          {!readOnly && activeTab === 'purchases' ? (
            <button type="button" className="pdv2-btn pdv2-btn--primary pdv2-btn--compact" onClick={handleAddPurchase}>
              <FontAwesomeIcon icon={faPlus} /> {t('inventory.addPurchase')}
            </button>
          ) : null}
        </div>

        {activeTab === 'purchases' && (
          <div className="pdv2-table-scroll">
            <table className="pdv2-table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('purchases.supplier')}</th>
                  <th className="pdv2-table-num">{t('inventory.qtyIn')}</th>
                  <th>{t('common.price')}</th>
                  <th>{t('inventory.invoice')}</th>
                </tr>
              </thead>
              <tbody>
                {activity.purchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pdv2-table-empty">
                      {t('inventory.noPurchaseLines')}
                    </td>
                  </tr>
                ) : (
                  activity.purchases.map((row) => (
                    <tr key={`${row.purchase_id}-${row.purchase_item_id}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.supplier_name || '—'}</td>
                      <td className="pdv2-table-num pdv2-num-in">+{formatQty(row.quantity)}</td>
                      <td>{formatCurrency(row.cost_price)}</td>
                      <td>
                        <code className="pdv2-code">{row.invoice_ref}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="pdv2-table-scroll">
            <table className="pdv2-table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('billing.customer')}</th>
                  <th className="pdv2-table-num">{t('inventory.qtyOut')}</th>
                  <th>{t('common.price')}</th>
                  <th>{t('billing.invoiceNumber')}</th>
                </tr>
              </thead>
              <tbody>
                {activity.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pdv2-table-empty">
                      {t('inventory.noSaleLines')}
                    </td>
                  </tr>
                ) : (
                  activity.sales.map((row, idx) => (
                    <tr key={`${row.sale_id}-${idx}`}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.customer_name || '—'}</td>
                      <td className="pdv2-table-num pdv2-num-out">−{formatQty(row.quantity)}</td>
                      <td>{formatCurrency(row.selling_price)}</td>
                      <td>
                        <code className="pdv2-code">{row.invoice_number || '—'}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'adjustments' && (
          <div className="pdv2-empty-state">
            <FontAwesomeIcon icon={faBox} className="pdv2-empty-icon" />
            <p>{t('inventory.adjustmentsEmpty')}</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductDetailView;
