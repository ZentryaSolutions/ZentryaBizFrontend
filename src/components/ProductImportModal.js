import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { productsAPI } from '../services/api';
import { hasPosBackendSession } from '../lib/appMode';
import { salesWorkspaceStyles } from '../styles/salesWorkspaceStyles';

const importModalExtraStyles = `
.zb-import-modal .btn{border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#334155}
.zb-import-modal .btn-primary{background:#111827;color:#fff;border-color:#111827}
.zb-import-modal .btn-secondary{background:#fff;color:#334155}
.zb-import-modal .btn:disabled{opacity:.55;cursor:not-allowed}
.zb-import-modal .sales-items-table{width:100%;border-collapse:collapse}
.zb-import-modal .sales-items-table th,.zb-import-modal .sales-items-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #f1f5f9}
`;

const TEMPLATE_HEADERS = [
  'Name',
  'SKU',
  'Category',
  'Unit',
  'Purchase Price',
  'Selling Price',
  'Wholesale Price',
  'Opening Stock',
];

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      const key = h.replace(/\s+/g, '_');
      obj[key] = cells[idx] ?? '';
      if (h === 'name') obj.name = cells[idx];
      if (h === 'sku') obj.sku = cells[idx];
      if (h === 'category') obj.category = cells[idx];
      if (h === 'unit') obj.unit = cells[idx];
      if (h === 'purchase_price' || h === 'purchase price') obj.purchase_price = cells[idx];
      if (h === 'selling_price' || h === 'selling price') obj.selling_price = cells[idx];
      if (h === 'wholesale_price' || h === 'wholesale price') obj.wholesale_price = cells[idx];
      if (h === 'opening_stock' || h === 'opening stock') obj.opening_stock = cells[idx];
    });
    rows.push(obj);
  }
  return rows;
}

export default function ProductImportModal({ onClose, onImported }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    const csv = `${TEMPLATE_HEADERS.join(',')}\nSample PVC Pipe,SKU-001,Plumbing,piece,350,450,400,100`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'product-import-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!hasPosBackendSession()) {
      setError('Session not ready. Sign out and sign in again, then import.');
      return;
    }
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        setError('CSV is empty or missing data rows. Use the template and add at least one product row.');
        return;
      }
      const res = await productsAPI.importBulk({ rows, previewOnly: true });
      setPreview(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to parse file';
      setError(msg);
    } finally {
      e.target.value = '';
    }
  };

  const confirmImport = async () => {
    if (!preview?.preview?.length) return;
    setBusy(true);
    setError('');
    try {
      const rows = preview.preview
        .filter((r) => !r.errors?.length)
        .map((r) => ({
          name: r.name,
          sku: r.sku,
          category: r.category,
          unit: r.unit,
          purchase_price: r.purchase_price,
          selling_price: r.selling_price,
          wholesale_price: r.wholesale_price,
          opening_stock: r.opening_stock,
        }));
      const res = await productsAPI.importBulk({ rows });
      onImported?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <>
      <style>{`${salesWorkspaceStyles}${importModalExtraStyles}`}</style>
      <div className="sal2-modal-overlay zb-import-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sal2-modal modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-header">
          <h2>Import products</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Download the template, fill in Excel, then upload. Review errors before confirming.
          </p>
          <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
              Download template
            </button>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              Upload CSV
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
            </label>
          </div>
          {preview ? (
            <>
              <p style={{ fontWeight: 600 }}>
                Valid: {preview.validCount} · Errors: {preview.errorCount}
              </p>
              <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <table className="sales-items-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Purchase</th>
                      <th>Sell</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.name || '—'}</td>
                        <td>{r.category}</td>
                        <td>{r.purchase_price ?? '—'}</td>
                        <td>{r.selling_price}</td>
                        <td>{r.opening_stock}</td>
                        <td style={{ color: r.errors?.length ? '#b91c1c' : '#047857' }}>
                          {r.errors?.length ? r.errors.join('; ') : 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          {error ? <div style={{ color: '#b91c1c', marginTop: 10 }}>{error}</div> : null}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !preview?.validCount}
            onClick={confirmImport}
          >
            {busy ? 'Importing…' : `Import ${preview?.validCount || 0} products`}
          </button>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
}
