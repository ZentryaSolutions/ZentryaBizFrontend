import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { salesAPI } from '../services/api';
import { returnModalStyles } from '../styles/salesWorkspaceStyles';

const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
};

export default function ReturnSaleModal({ sale, onClose, onSuccess }) {
  const [lines, setLines] = useState([]);
  const [returnReason, setReturnReason] = useState('');
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
    setReturnReason('');
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
    const reason = returnReason.trim();
    if (reason.length < 3) {
      setError('Return reason is required (at least 3 characters).');
      return;
    }
    setBusy(true);
    try {
      const res = await salesAPI.createReturn(sale.sale_id, {
        items,
        refund_type: refundType,
        return_reason: reason,
      });
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
    <>
      <style>{returnModalStyles}</style>
      <div className="sal2-modal-overlay" onClick={onClose} role="presentation">
        <form
          className="sal2-ret-modal"
          onClick={(ev) => ev.stopPropagation()}
          onSubmit={submit}
          role="dialog"
          aria-labelledby="ret-modal-title"
        >
          <div className="sal2-ret-modal__hd">
            <div className="sal2-ret-modal__ico" aria-hidden>
              <FontAwesomeIcon icon={faRotateLeft} />
            </div>
            <div className="sal2-ret-modal__hdText">
              <h2 id="ret-modal-title" className="sal2-ret-modal__tit">
                Return / Refund — {sale.invoice_number}
              </h2>
              <p className="sal2-ret-modal__sub">
                Creates a credit note, adds stock back, and updates customer balance if applicable.
              </p>
            </div>
            <button type="button" className="sal2-ret-modal__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="sal2-ret-modal__body">
            <div className="sal2-ret-table-wrap">
              <table className="sal2-ret-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="sal2-ret-th--num">Sold</th>
                    <th className="sal2-ret-th--qty">Return qty</th>
                    <th className="sal2-ret-th--num">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.product_id || idx}>
                      <td className="sal2-ret-td-name">{l.product_name}</td>
                      <td className="sal2-ret-td-num">{l.max_qty}</td>
                      <td className="sal2-ret-td-qty">
                        <input
                          type="number"
                          className="sal2-ret-qty"
                          min={0}
                          max={l.max_qty}
                          step="any"
                          value={l.quantity}
                          aria-label={`Return quantity for ${l.product_name}`}
                          onChange={(e) => {
                            const v = Math.min(l.max_qty, Math.max(0, parseFloat(e.target.value) || 0));
                            setLines((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, quantity: v } : x))
                            );
                          }}
                        />
                      </td>
                      <td className="sal2-ret-td-num">{formatCurrency(l.selling_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sal2-ret-reason">
              <label className="sal2-ret-reason__lbl" htmlFor="sal2-return-reason">
                Return reason <span className="sal2-ret-reason__req">*</span>
              </label>
              <textarea
                id="sal2-return-reason"
                className="sal2-ret-reason__input"
                rows={3}
                maxLength={500}
                placeholder="e.g. Damaged item, wrong size, customer changed mind…"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                required
              />
            </div>

            <div className="sal2-ret-refund">
              <span className="sal2-ret-refund__lbl">Refund type</span>
              <div className="sal2-ret-options">
                <label
                  className={`sal2-ret-option${refundType === 'cash' ? ' sal2-ret-option--on' : ''}`}
                >
                  <input
                    type="radio"
                    name="refundType"
                    checked={refundType === 'cash'}
                    onChange={() => setRefundType('cash')}
                  />
                  <span className="sal2-ret-option__text">
                    Cash refund
                    <span className="sal2-ret-option__amt">
                      {refundType === 'cash' ? formatCurrency(totalReturn) : 'Pay customer in cash'}
                    </span>
                  </span>
                </label>
                {sale.customer_id ? (
                  <label
                    className={`sal2-ret-option${refundType === 'credit' ? ' sal2-ret-option--on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="refundType"
                      checked={refundType === 'credit'}
                      onChange={() => setRefundType('credit')}
                    />
                    <span className="sal2-ret-option__text">
                      Reduce customer credit balance
                      <span className="sal2-ret-option__amt">Adjust outstanding balance</span>
                    </span>
                  </label>
                ) : null}
              </div>
            </div>

            <div className="sal2-ret-total">
              <span className="sal2-ret-total__lbl">Return total</span>
              <span className="sal2-ret-total__val">{formatCurrency(totalReturn)}</span>
            </div>

            {error ? (
              <div className="sal2-ret-err" role="alert">
                {error}
              </div>
            ) : null}
          </div>

          <div className="sal2-ret-modal__ft">
            <button type="button" className="sal2-ret-btnCancel" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="sal2-ret-btnSave"
              disabled={busy || totalReturn <= 0 || returnReason.trim().length < 3}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              {busy ? 'Saving…' : 'Save return'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}
