import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { salesAPI } from '../services/api';
const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
};

export default function ReturnSaleModal({ sale, onClose, onSuccess }) {
  const [lines, setLines] = useState([]);
  const [refundType, setRefundType] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sale?.items) return;
    setLines(
      sale.items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name || it.name,
        max_qty: Number(it.quantity) || 0,
        quantity: 0,
        selling_price: Number(it.selling_price) || 0,
      }))
    );
    const pt = String(sale.payment_type || sale.payment_mode || 'cash').toLowerCase();
    setRefundType(sale.customer_id && (pt === 'credit' || pt === 'split') ? 'credit' : 'cash');
  }, [sale]);

  const totalReturn = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.selling_price) || 0),
    0
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const items = lines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        selling_price: l.selling_price,
      }));
    if (!items.length) {
      setError('Select quantity to return for at least one item.');
      return;
    }
    setBusy(true);
    try {
      const res = await salesAPI.createReturn(sale.sale_id, { items, refund_type: refundType });
      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Return failed');
    } finally {
      setBusy(false);
    }
  };

  if (!sale) return null;

  return createPortal(
    <div className="sal2-modal-overlay" onClick={onClose}>
      <form className="sal2-modal modal" onClick={(ev) => ev.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Return / Refund — {sale.invoice_number}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Creates a credit note, adds stock back, and updates customer balance if applicable.
          </p>
          <table className="sales-items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Sold</th>
                <th>Return qty</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.product_id || idx}>
                  <td>{l.product_name}</td>
                  <td>{l.max_qty}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={l.max_qty}
                      step="any"
                      value={l.quantity}
                      onChange={(e) => {
                        const v = Math.min(l.max_qty, Math.max(0, parseFloat(e.target.value) || 0));
                        setLines((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, quantity: v } : x))
                        );
                      }}
                      style={{ width: 72 }}
                    />
                  </td>
                  <td>{formatCurrency(l.selling_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13 }}>Refund type</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <label>
                <input
                  type="radio"
                  name="refundType"
                  checked={refundType === 'cash'}
                  onChange={() => setRefundType('cash')}
                />{' '}
                Cash refund {refundType === 'cash' ? `(${formatCurrency(totalReturn)})` : ''}
              </label>
              {sale.customer_id ? (
                <label>
                  <input
                    type="radio"
                    name="refundType"
                    checked={refundType === 'credit'}
                    onChange={() => setRefundType('credit')}
                  />{' '}
                  Reduce customer credit (Udhar)
                </label>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 12, fontWeight: 700 }}>Return total: {formatCurrency(totalReturn)}</div>
          {error ? (
            <div style={{ color: '#b91c1c', marginTop: 10, fontSize: 13 }}>{error}</div>
          ) : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || totalReturn <= 0}>
            {busy ? 'Saving…' : 'Save return'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
