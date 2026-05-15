import React, { useState, useEffect } from 'react';
import { getConnectivityErrorMessage, isOfflineQueuedResponse } from '../lib/offlineUserMessages';
import { createPortal } from 'react-dom';
import { productsAPI } from '../services/api';

const overlayCss = `
.zb-sa-overlay{position:fixed!important;inset:0!important;z-index:10050!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:16px!important;background:rgba(15,23,42,.42)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;overflow:auto!important}
.zb-sa-modal{width:min(440px,100%)!important;max-height:min(88vh,720px)!important;background:#fff!important;border-radius:14px!important;box-shadow:0 25px 50px -12px rgba(0,0,0,.25)!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
.zb-sa-head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:12px!important;padding:16px 18px!important;border-bottom:1px solid #eef1f6!important}
.zb-sa-head h2{margin:0!important;font-size:17px!important;font-weight:600!important;color:#111827!important}
.zb-sa-body{padding:16px 18px!important;overflow-y:auto!important}
.zb-sa-foot{display:flex!important;justify-content:flex-end!important;gap:10px!important;padding:12px 18px!important;border-top:1px solid #eef1f6!important;background:#fafafa!important}
.zb-sa-close{border:none!important;background:transparent!important;font-size:22px!important;line-height:1!important;color:#64748b!important;cursor:pointer!important;padding:0 4px!important}
.zb-sa-close:hover{color:#0f172a!important}
.zb-sa-label{display:block!important;font-size:11px!important;font-weight:600!important;letter-spacing:.04em!important;text-transform:uppercase!important;color:#64748b!important;margin-bottom:6px!important}
.zb-sa-input{width:100%!important;border:1px solid #e2e8f0!important;border-radius:10px!important;padding:10px 12px!important;font-size:15px!important}
.zb-sa-input:focus{outline:none!important;border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.15)!important}
.zb-sa-hint{font-size:13px!important;color:#64748b!important;margin-top:10px!important;line-height:1.45!important}
.btn-zb{height:38px!important;padding:0 16px!important;border-radius:10px!important;font-size:14px!important;font-weight:500!important;cursor:pointer!important;border:1px solid transparent!important}
.btn-zb-secondary{background:#fff!important;border-color:#e2e8f0!important;color:#334155!important}
.btn-zb-primary{background:#111827!important;color:#fff!important}
.btn-zb-primary:disabled{opacity:.55!important;cursor:not-allowed!important}
`;

function buildUpdatePayload(product, newQtyInt) {
  const retail = Number(product.retail_price ?? product.selling_price ?? 0);
  const purchase = Number(product.purchase_price ?? 0);
  const wholesale = Number(product.wholesale_price ?? retail);
  return {
    item_name_english: (product.item_name_english || product.name || '').trim(),
    sku: product.sku?.trim() || null,
    category: product.category_name || product.category || 'General',
    category_id: product.category_id ?? null,
    sub_category_id: product.sub_category_id ?? null,
    purchase_price: purchase,
    retail_price: retail,
    wholesale_price: wholesale,
    special_price:
      product.special_price != null && product.special_price !== ''
        ? Number(product.special_price)
        : null,
    unit_type: product.unit_type || 'piece',
    is_frequently_sold: !!product.is_frequently_sold,
    quantity_in_stock: newQtyInt,
    supplier_id: product.supplier_id || null,
  };
}

const StockAdjustmentModal = ({ product, onClose, onSaved }) => {
  const current = Number(product?.quantity_in_stock ?? 0);
  const [qty, setQty] = useState(String(current));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQty(String(current));
  }, [product, current]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const n = parseInt(String(qty).trim(), 10);
    if (Number.isNaN(n) || n < 0) {
      alert('Enter a valid quantity (0 or greater).');
      return;
    }
    setSaving(true);
    try {
      const payload = buildUpdatePayload(product, n);
      const res = await productsAPI.update(product.product_id, payload);
      if (!isOfflineQueuedResponse(res)) {
        await onSaved();
      }
      onClose();
    } catch (err) {
      alert(getConnectivityErrorMessage(err) || err.response?.data?.error || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const name = product?.item_name_english || product?.name || 'Product';

  return createPortal(
    <>
      <style>{overlayCss}</style>
      <div className="zb-sa-overlay" onClick={onClose} role="presentation">
        <div className="zb-sa-modal" onClick={(e) => e.stopPropagation()}>
          <div className="zb-sa-head">
            <div>
              <h2>Adjust stock</h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{name}</p>
            </div>
            <button type="button" className="zb-sa-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="zb-sa-body">
              <span className="zb-sa-label">Current on hand</span>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
                {current}{' '}
                <span style={{ fontWeight: 500, color: '#64748b' }}>
                  {product?.unit_type || 'pcs'}
                </span>
              </div>
              <label className="zb-sa-label" htmlFor="zb-sa-qty">
                New quantity
              </label>
              <input
                id="zb-sa-qty"
                type="number"
                min={0}
                step={1}
                className="zb-sa-input"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <p className="zb-sa-hint">
                Set the total quantity you should have on hand after this adjustment (damage,
                recount, etc.).
              </p>
            </div>
            <div className="zb-sa-foot">
              <button type="button" className="btn-zb btn-zb-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-zb btn-zb-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};

export default StockAdjustmentModal;
