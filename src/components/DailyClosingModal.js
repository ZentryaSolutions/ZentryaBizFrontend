import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { dailyClosingAPI } from '../services/api';
const formatCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
};

export default function DailyClosingModal({ onClose, shopName = 'Shop' }) {
  const [summary, setSummary] = useState(null);
  const [opening, setOpening] = useState('');
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    dailyClosingAPI
      .todaySummary()
      .then((r) => {
        setSummary(r.data);
        setOpening(String(r.data?.opening_cash ?? 0));
      })
      .catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  const openingNum = parseFloat(opening) || 0;
  const expected =
    summary != null
      ? openingNum +
        (parseFloat(summary.cash_sales) || 0) +
        (parseFloat(summary.credit_payments) || 0) -
        (parseFloat(summary.cash_refunds) || 0) -
        (parseFloat(summary.expenses) || 0)
      : 0;
  const actualNum = parseFloat(actual);
  const diff = Number.isFinite(actualNum) ? actualNum - expected : null;

  const printSummary = (closing) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const c = closing || {};
    w.document.write(`
      <html><head><title>Day closing ${c.closing_date || ''}</title>
      <style>body{font-family:system-ui;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #eee}</style></head>
      <body>
        <h1>${shopName} — Daily closing</h1>
        <p>Date: ${c.closing_date || summary?.date || ''}</p>
        <table>
          <tr><td>Invoices today</td><td>${c.invoice_count ?? summary?.invoice_count}</td></tr>
          <tr><td>Gross sales</td><td>${formatCurrency(c.gross_sales ?? summary?.gross_sales)}</td></tr>
          <tr><td>Cash sales</td><td>${formatCurrency(c.cash_sales ?? summary?.cash_sales)}</td></tr>
          <tr><td>Cash refunds</td><td>${formatCurrency(c.cash_refunds ?? summary?.cash_refunds)}</td></tr>
          <tr><td>Credit sales</td><td>${formatCurrency(c.credit_sales ?? summary?.credit_sales)}</td></tr>
          <tr><td>Credit payments in</td><td>${formatCurrency(c.credit_payments ?? summary?.credit_payments)}</td></tr>
          <tr><td>Expenses</td><td>${formatCurrency(c.expenses ?? summary?.expenses)}</td></tr>
          <tr><td><strong>Expected cash</strong></td><td><strong>${formatCurrency(c.expected_cash ?? expected)}</strong></td></tr>
          <tr><td><strong>Actual counted</strong></td><td><strong>${formatCurrency(c.actual_cash ?? actualNum)}</strong></td></tr>
          <tr><td>Difference</td><td>${formatCurrency(c.difference ?? diff)}</td></tr>
        </table>
        ${c.notes || notes ? `<p>Notes: ${c.notes || notes}</p>` : ''}
        <script>window.print();</script>
      </body></html>`);
    w.document.close();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!Number.isFinite(actualNum)) {
      setError('Enter actual cash counted in drawer.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await dailyClosingAPI.close({
        opening_cash: openingNum,
        actual_cash: actualNum,
        notes,
      });
      setDone(res.data?.closing);
      printSummary(res.data?.closing);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to close day');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="sal2-modal-overlay" onClick={onClose}>
      <form className="sal2-modal modal" onClick={(ev) => ev.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Close day — cash reconciliation</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          {summary ? (
            <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
              <div>Date: <strong>{summary.date}</strong></div>
              <div>Cash sales: {formatCurrency(summary.cash_sales)}</div>
              <div>Cash refunds: {formatCurrency(summary.cash_refunds)}</div>
              <div>Credit payments received: {formatCurrency(summary.credit_payments)}</div>
              <div>Expenses: {formatCurrency(summary.expenses)}</div>
              <div>Invoices: {summary.invoice_count}</div>
            </div>
          ) : null}
          <label className="form-label">Opening cash</label>
          <input className="form-input" type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
          <label className="form-label" style={{ marginTop: 10 }}>
            Expected in drawer
          </label>
          <input className="form-input" type="number" value={expected.toFixed(2)} readOnly />
          <label className="form-label" style={{ marginTop: 10 }}>
            Actual cash counted
          </label>
          <input className="form-input" type="number" value={actual} onChange={(e) => setActual(e.target.value)} required />
          {diff != null ? (
            <p style={{ marginTop: 8, fontWeight: 600, color: diff === 0 ? '#047857' : '#b45309' }}>
              Difference: {formatCurrency(diff)} {diff > 0 ? '(over)' : diff < 0 ? '(short)' : ''}
            </p>
          ) : null}
          <label className="form-label" style={{ marginTop: 10 }}>Notes</label>
          <textarea className="form-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error ? <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div> : null}
          {done ? <div style={{ color: '#047857', marginTop: 8 }}>Day closed. Print dialog opened.</div> : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done ? (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Confirm & print'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => printSummary(done)}>
              Print again
            </button>
          )}
        </div>
      </form>
    </div>,
    document.body
  );
}
