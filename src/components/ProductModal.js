import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ProductModal.css';

const ProductModal = ({ product, suppliers, categories = [], units = [], onClose, onSave }) => {
  const modalScopedStyles = `
    .modal-overlay{position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:6px!important;background:rgba(15,23,42,.42)!important;backdrop-filter:blur(7px)!important;z-index:9999!important}
    .product-modal{width:min(560px,94vw)!important;max-height:78vh!important;border-radius:14px!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;font-family:Manrope,Inter,system-ui,-apple-system,sans-serif!important}
    .product-modal .modal-header{padding:9px 10px!important;border-bottom:1px solid #eef1f6!important}
    .product-modal .modal-header h2{font-size:17px!important;font-weight:600!important;margin:0!important;line-height:1.1!important;color:#111827!important;letter-spacing:-.01em}
    .pm3-subtitle{margin:2px 0 0!important;font-size:11.5px!important;color:#8b94a5!important;font-weight:500!important}
    .product-form{padding:4px 10px 5px!important;flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important}
    .pm3-sectionTitle{margin:6px 0 3px!important;font-size:11.5px!important;font-weight:600!important;color:#1f2937!important;letter-spacing:.01em}
    .form-grid--3{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px 7px!important}
    .form-group--span-3{grid-column:1 / -1!important}
    .form-group--span-2{grid-column:span 2!important}
    .form-label{font-size:10.75px!important;font-weight:500!important;margin-bottom:3px!important;color:#374151!important;letter-spacing:.01em;text-transform:none!important}
    .form-input{border-radius:9px!important;min-height:32px!important;font-size:12.25px!important;padding:5px 8px!important;border-color:#e5e9f0!important;background:#fafbfc!important}
    .form-input:focus{border-color:#94a3b8!important;box-shadow:0 0 0 3px rgba(148,163,184,.12)!important}
    textarea.form-input{min-height:40px!important;resize:vertical!important}
    .form-hint{margin-top:2px!important;font-size:9.75px!important;color:#9ca3af!important;line-height:1.3!important}
    .product-modal-footer{display:flex!important;justify-content:flex-end!important;gap:8px!important;padding:7px 10px!important;border-top:1px solid #eef1f6!important;background:#ffffff!important}
    .btn{height:30px!important;padding:0 12px!important;font-size:12px!important;font-weight:500!important;border-radius:9px!important}
    @media (max-width:900px){.form-grid--3{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media (max-width:640px){.form-grid--3{grid-template-columns:1fr!important}}
  `;
  const safeCategories = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);
  const safeUnits = useMemo(() => (Array.isArray(units) ? units : []), [units]);
  const activeCategories = useMemo(
    () => safeCategories.filter((c) => String(c.status || 'active').toLowerCase() !== 'inactive'),
    [safeCategories]
  );

  const defaultCategoryName = useMemo(() => {
    const gen = safeCategories.find((c) => String(c.category_name || '').toLowerCase() === 'general');
    return gen?.category_name || 'General';
  }, [safeCategories]);
  const defaultCategoryId = useMemo(() => {
    const gen = safeCategories.find((c) => String(c.category_name || '').toLowerCase() === 'general');
    return gen?.category_id ?? null;
  }, [safeCategories]);

  const [formData, setFormData] = useState({
    item_name_english: '',
    sku: '',
    category: 'General',
    category_id: null,
    purchase_price: '',
    retail_price: '',
    wholesale_price: '',
    special_price: '',
    selling_price: '',
    unit_type: 'piece',
    is_frequently_sold: false,
    quantity_in_stock: '0',
    low_stock_threshold: '10',
    description: '',
    note_tag: '',
    supplier_id: '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        item_name_english: product.item_name_english || product.name || '',
        sku: product.sku || '',
        category: product.category_name || product.category || defaultCategoryName,
        category_id: product.category_id ?? defaultCategoryId,
        purchase_price: product.purchase_price || '',
        retail_price: product.retail_price || product.selling_price || '',
        wholesale_price: product.wholesale_price || product.retail_price || product.selling_price || '',
        special_price: product.special_price || '',
        selling_price: product.selling_price || product.retail_price || '',
        unit_type: product.unit_type || 'piece',
        is_frequently_sold: product.is_frequently_sold || false,
        quantity_in_stock: product.quantity_in_stock || '0',
        low_stock_threshold: product.low_stock_threshold || '10',
        description: product.description || '',
        note_tag: product.note_tag || '',
        supplier_id: product.supplier_id || '',
      });
    } else {
      // New product: initialize category defaults from real categories list
      setFormData((prev) => ({
        ...prev,
        category: prev.category || defaultCategoryName,
        category_id: prev.category_id ?? defaultCategoryId,
      }));
    }
  }, [product, suppliers, defaultCategoryId, defaultCategoryName]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const validate = () => {
    const newErrors = {};

    // Item Name English: required
    if (!formData.item_name_english || !formData.item_name_english.trim()) {
      newErrors.item_name_english = 'Item name (English) is required';
    }

    // Purchase Price: numeric, >0
    const purchasePrice = parseFloat(formData.purchase_price);
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      newErrors.purchase_price = 'Purchase price must be greater than 0';
    }

    // Retail Price: numeric, >0
    const retailPrice = parseFloat(formData.retail_price);
    if (isNaN(retailPrice) || retailPrice <= 0) {
      newErrors.retail_price = 'Retail price must be greater than 0';
    }

    // Quantity: integer, ≥0
    const quantity = parseInt(formData.quantity_in_stock);
    if (isNaN(quantity) || quantity < 0) {
      newErrors.quantity_in_stock = 'Quantity must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        name: formData.item_name_english.trim(), // Backward compatibility
        item_name_english: formData.item_name_english.trim(),
        sku: formData.sku?.trim() || null,
        category: formData.category || defaultCategoryName,
        category_id: formData.category_id ?? defaultCategoryId,
        purchase_price: parseFloat(formData.purchase_price),
        retail_price: parseFloat(formData.retail_price),
        wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : parseFloat(formData.retail_price),
        special_price: formData.special_price ? parseFloat(formData.special_price) : null,
        selling_price: parseFloat(formData.retail_price), // For backward compatibility
        unit_type: formData.unit_type || 'piece',
        is_frequently_sold: formData.is_frequently_sold || false,
        quantity_in_stock: parseInt(formData.quantity_in_stock),
        low_stock_threshold: formData.low_stock_threshold ? parseInt(formData.low_stock_threshold) : null,
        description: formData.description?.trim() || null,
        supplier_id: formData.supplier_id || null,
      };

      await onSave(submitData);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to save product';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <style>{modalScopedStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal product-modal product-modal--wide" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2>{product ? 'Edit Product' : 'Add Product'}</h2>
              <p className="pm3-subtitle">New product to your inventory</p>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <form id="product-modal-form" onSubmit={handleSubmit} className="product-form product-form--compact">
          <div className="pm3-sectionTitle">Product Identity</div>
          <div className="form-grid form-grid--3">
            <div className="form-group form-group--span-3">
              <label className="form-label" htmlFor="pm-item-name">
                Product Name <span className="required">*</span>
              </label>
              <input
                id="pm-item-name"
                type="text"
                name="item_name_english"
                value={formData.item_name_english}
                onChange={handleChange}
                className={`form-input ${errors.item_name_english ? 'error' : ''}`}
                placeholder="e.g. PVC Pipe 1 inch"
              />
              {errors.item_name_english && <span className="error-message">{errors.item_name_english}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-sku">SKU / Code</label>
              <input
                id="pm-sku"
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. PVC-001"
              />
              <div className="form-hint">Auto-generated if left blank</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-category">Category</label>
              <select
                id="pm-category"
                name="category_id"
                value={formData.category_id ?? ''}
                onChange={(e) => {
                  const nextId = e.target.value ? Number(e.target.value) : null;
                  const found = safeCategories.find((c) => String(c.category_id) === String(nextId));
                  setFormData((prev) => ({
                    ...prev,
                    category_id: nextId,
                    category: found?.category_name || prev.category || defaultCategoryName,
                  }));
                }}
                className="form-input"
              >
                {(activeCategories.length ? activeCategories : safeCategories).map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-unit-type">Unit of Measure</label>
              <select
                id="pm-unit-type"
                name="unit_type"
                value={formData.unit_type}
                onChange={handleChange}
                className="form-input"
              >
                {(safeUnits.length
                  ? safeUnits
                      .filter((u) => String(u.status || 'active').toLowerCase() !== 'inactive')
                      .map((u) => ({ key: u.unit_code || u.unit_name, label: `${u.unit_name} (${u.unit_code})`, value: u.unit_code }))
                  : [
                      { key: 'piece', label: 'pcs', value: 'piece' },
                      { key: 'packet', label: 'packet', value: 'packet' },
                      { key: 'meter', label: 'meter', value: 'meter' },
                      { key: 'box', label: 'box', value: 'box' },
                      { key: 'kg', label: 'kg', value: 'kg' },
                      { key: 'roll', label: 'roll', value: 'roll' },
                    ]
                ).map((u) => (
                  <option key={u.key} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-frequent-sel">Frequently Sold</label>
              <select
                id="pm-frequent-sel"
                name="is_frequently_sold"
                value={formData.is_frequently_sold ? 'yes' : 'no'}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_frequently_sold: e.target.value === 'yes' }))}
                className="form-input"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div className="form-group form-group--span-2">
              <label className="form-label" htmlFor="pm-description">Description (optional)</label>
              <textarea
                id="pm-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-input"
                rows="1"
                placeholder="Brief product description or notes..."
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-note-tag">Tag / Label</label>
              <input
                id="pm-note-tag"
                type="text"
                name="note_tag"
                value={formData.note_tag}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g. Fast moving"
              />
            </div>
          </div>

          <div className="pm3-sectionTitle">Pricing</div>
          <div className="form-grid form-grid--3">
            <div className="form-group">
              <label className="form-label" htmlFor="pm-retail-price">
                Selling Price (PKR) <span className="required">*</span>
              </label>
              <input
                id="pm-retail-price"
                type="number"
                name="retail_price"
                value={formData.retail_price}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className={`form-input ${errors.retail_price ? 'error' : ''}`}
                placeholder="PKR 0"
              />
              {errors.retail_price && <span className="error-message">{errors.retail_price}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-wholesale-price">
                Wholesale Price (optional)
              </label>
              <input
                id="pm-wholesale-price"
                type="number"
                name="wholesale_price"
                value={formData.wholesale_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="form-input"
                placeholder="PKR 0"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-special-price">Special / Promo Price (optional)</label>
              <input
                id="pm-special-price"
                type="number"
                name="special_price"
                value={formData.special_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="form-input"
                placeholder="PKR 0"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-purchase-price">
                Purchase Price (PKR) <span className="required">*</span>
              </label>
              <input
                id="pm-purchase-price"
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className={`form-input ${errors.purchase_price ? 'error' : ''}`}
                placeholder="PKR 0"
              />
              {errors.purchase_price && <span className="error-message">{errors.purchase_price}</span>}
            </div>
          </div>

          <div className="pm3-sectionTitle">Stock Setup</div>
          <div className="form-grid form-grid--3">
            <div className="form-group">
              <label className="form-label" htmlFor="pm-qty-stock">
                Opening Stock <span className="required">*</span>
              </label>
              <input
                id="pm-qty-stock"
                type="number"
                name="quantity_in_stock"
                value={formData.quantity_in_stock}
                onChange={handleChange}
                min="0"
                step="1"
                className={`form-input ${errors.quantity_in_stock ? 'error' : ''}`}
                placeholder="How many units do you have right now"
              />
              {errors.quantity_in_stock && (
                <span className="error-message">{errors.quantity_in_stock}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-low-stock">Low Stock Alert Below</label>
              <input
                id="pm-low-stock"
                type="number"
                name="low_stock_threshold"
                value={formData.low_stock_threshold}
                onChange={handleChange}
                min="0"
                step="1"
                className="form-input"
                placeholder="10"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pm-supplier">Supplier</label>
              <select
                id="pm-supplier"
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">No Supplier</option>
                {suppliers.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          </form>

          <div className="product-modal-footer modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="product-modal-form" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : product ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ProductModal;
