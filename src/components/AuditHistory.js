import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  view: 'Viewed',
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login failed',
  finalize: 'Finalized',
  view_sensitive: 'Viewed',
};

const MODULE_LABELS = {
  users: 'Users & staff',
  audit: 'Audit history',
  audit_logs: 'Audit history',
  auth: 'Sign in / out',
  sales: 'Sales',
  products: 'Products',
  customers: 'Customers',
  suppliers: 'Suppliers',
  purchases: 'Purchases',
  daily_expenses: 'Expenses',
  settings: 'Settings',
  reports: 'Reports',
};

const FIELD_LABELS = {
  item_name_english: 'Product name',
  sku: 'SKU',
  purchase_price: 'Purchase price',
  retail_price: 'Retail price',
  wholesale_price: 'Wholesale price',
  special_price: 'Special price',
  quantity_in_stock: 'Stock qty',
  invoice_number: 'Invoice',
  total_amount: 'Total',
  discount: 'Discount',
  name: 'Name',
  phone: 'Phone',
  expense_category: 'Category',
  amount: 'Amount',
};

function parseAuditValues(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fmtMoney(v) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return v == null || v === '' ? '—' : String(v);
  return `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function formatFieldValue(key, v) {
  if (v == null || v === '') return '—';
  if (String(key).includes('price') || key === 'amount' || key === 'total_amount') {
    return fmtMoney(v);
  }
  return String(v);
}

function valuesDiffer(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) > 0.0001;
  return String(a ?? '') !== String(b ?? '');
}

const LEGACY_SENSITIVE_NOTES = {
  users: 'Opened Users & staff page',
  audit_logs: 'Opened Audit history',
  reports: 'Opened Reports',
};

function formatModuleName(tableName) {
  if (!tableName) return '—';
  return MODULE_LABELS[tableName] || tableName.replace(/_/g, ' ');
}

function formatAuditSummary(log) {
  const notes = (log.notes || '').trim();
  if (log.action === 'login' || log.action === 'login_failed' || log.action === 'logout') {
    return notes || ACTION_LABELS[log.action] || '—';
  }
  if (notes && !/^Accessed sensitive resource:/i.test(notes)) {
    return notes;
  }
  const m = notes.match(/^Accessed sensitive resource:\s*(.+)$/i);
  if (m) {
    const key = m[1].trim();
    return LEGACY_SENSITIVE_NOTES[key] || `Opened ${formatModuleName(key)}`;
  }
  const action = log.action;
  const mod = formatModuleName(log.table_name);
  const rid = log.record_id != null ? `#${log.record_id}` : '';
  if (action === 'create') return `Created ${mod} ${rid}`.trim();
  if (action === 'update') return `Updated ${mod} ${rid}`.trim();
  if (action === 'delete') return `Deleted ${mod} ${rid}`.trim();
  if (action === 'view' || action === 'view_sensitive') return `Opened ${mod}`;
  if (action === 'login') return notes || 'User logged in';
  if (action === 'logout') return notes || 'User logged out';
  return notes || '—';
}

function formatAuditAction(log) {
  const notes = (log.notes || '').trim();
  if (log.action === 'login') return 'Signed in';
  if (log.action === 'login_failed') return 'Sign-in failed';
  if (log.action === 'logout') return 'Signed out';
  if (notes.startsWith('Opened ')) return 'Opened';
  if (notes.startsWith('Loaded ')) return 'Loaded';
  if (notes.startsWith('Exported ')) return 'Exported';
  if (notes.startsWith('Added product')) return 'Created';
  if (notes.startsWith('Deleted product')) return 'Deleted';
  if (notes.startsWith('Imported ')) return 'Imported';
  const mapped = ACTION_LABELS[log.action];
  if (mapped) return mapped;
  return log.action || '—';
}

function AuditChangeTable({ log }) {
  const oldV = parseAuditValues(log.old_values);
  const newV = parseAuditValues(log.new_values);
  if (!oldV && !newV) return null;

  const keys = [
    ...new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})]),
  ].filter((k) => !['product_id', 'import_count'].includes(k));

  const rows = keys
    .map((key) => {
      const o = oldV?.[key];
      const n = newV?.[key];
      const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');
      if (log.action === 'delete') {
        if (o == null && o !== 0) return null;
        return { key, label, before: formatFieldValue(key, o), after: '—' };
      }
      if (log.action === 'create') {
        if (n == null && n !== 0) return null;
        return { key, label, before: '—', after: formatFieldValue(key, n) };
      }
      if (!valuesDiffer(o, n)) return null;
      return { key, label, before: formatFieldValue(key, o), after: formatFieldValue(key, n) };
    })
    .filter(Boolean);

  if (!rows.length) return null;

  return (
    <table className="zb-audit-changes" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}>Field</th>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}>Before</th>
          <th style={{ textAlign: 'left', padding: '4px 8px' }}>After</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td style={{ padding: '4px 8px', color: '#6b7280' }}>{r.label}</td>
            <td style={{ padding: '4px 8px' }}>{r.before}</td>
            <td style={{ padding: '4px 8px', fontWeight: 600 }}>{r.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatWhen(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

function JsonBlock({ data }) {
  if (data == null || data === '') return <span className="zb-audit-muted">—</span>;
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }
  }
  let text;
  try {
    text = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
  } catch {
    text = String(parsed);
  }
  return <pre className="zb-audit-json">{text}</pre>;
}

const AuditHistory = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const admin = isAdmin();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [expandedId, setExpandedId] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    tableName: '',
    search: '',
    start_date: '',
    end_date: '',
  });
  const [filterOptions, setFilterOptions] = useState({ actions: [], tables: [] });
  const [filterHint, setFilterHint] = useState('');

  const normalizeDateRange = (start, end) => {
    const s = String(start || '').trim();
    const e = String(end || '').trim();
    if (s && e && s > e) {
      return { start_date: e, end_date: s, swapped: true };
    }
    return { start_date: s, end_date: e, swapped: false };
  };

  const hasActiveFilters =
    Boolean(filters.userId) ||
    Boolean(filters.action) ||
    Boolean(filters.tableName) ||
    Boolean(filters.search.trim()) ||
    Boolean(filters.start_date) ||
    Boolean(filters.end_date);

  const loadUsers = useCallback(async () => {
    try {
      const res = await usersAPI.getAll({ context: 'audit_filter' });
      setUsers(Array.isArray(res.data) ? res.data : res.data?.users || []);
    } catch {
      setUsers([]);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!admin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (filters.userId) params.userId = filters.userId;
      if (filters.action) params.action = filters.action;
      if (filters.tableName) params.tableName = filters.tableName;
      if (filters.search.trim()) params.search = filters.search.trim();
      const dates = normalizeDateRange(filters.start_date, filters.end_date);
      if (dates.start_date) params.start_date = dates.start_date;
      if (dates.end_date) params.end_date = dates.end_date;
      if (dates.swapped) {
        setFilterHint('Date range was reversed (From was after To). Showing corrected range.');
      } else {
        setFilterHint('');
      }

      const res = await auditAPI.getLogs(params);
      const data = res.data || {};
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      if (data.filters) setFilterOptions(data.filters);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to load audit history';
      setError(msg);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [admin, page, pageSize, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tableOptions = useMemo(() => {
    const fromApi = filterOptions.tables || [];
    const fromRows = [...new Set(logs.map((l) => l.table_name).filter(Boolean))];
    return [...new Set([...fromApi, ...fromRows])].sort();
  }, [filterOptions.tables, logs]);

  if (!admin) {
    return (
      <div className="zb-audit-page">
        <h1>Audit History</h1>
        <p className="zb-audit-muted">Only shop administrators can view audit history.</p>
      </div>
    );
  }

  return (
    <div className="zb-audit-page">
      <style>{`
        .zb-audit-page{max-width:1200px;margin:0 auto;padding:8px 4px 32px;font-family:Inter,system-ui,sans-serif}
        .zb-audit-hd{margin-bottom:20px}
        .zb-audit-hd h1{margin:0 0 6px;font-size:1.5rem;font-weight:700;color:#111827}
        .zb-audit-hd p{margin:0;color:#6b7280;font-size:14px}
        .zb-audit-filters{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:16px;padding:14px;background:#fff;border:1px solid #e5e7eb;border-radius:12px}
        .zb-audit-filters label{display:block;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
        .zb-audit-filters input,.zb-audit-filters select{width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px}
        .zb-audit-actions{display:flex;gap:8px;align-items:flex-end}
        .zb-audit-btn{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #d1d5db;background:#fff}
        .zb-audit-btn-primary{background:#2563eb;color:#fff;border-color:#2563eb}
        .zb-audit-table-wrap{overflow:auto;border:1px solid #e5e7eb;border-radius:12px;background:#fff}
        .zb-audit-table{width:100%;border-collapse:collapse;font-size:13px}
        .zb-audit-table th,.zb-audit-table td{padding:10px 12px;text-align:left;border-bottom:1px solid #f3f4f6;vertical-align:top}
        .zb-audit-table th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
        .zb-audit-table tr:hover td{background:#fafafa}
        .zb-audit-pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
        .zb-audit-pill-create{background:#dcfce7;color:#166534}
        .zb-audit-pill-update{background:#dbeafe;color:#1e40af}
        .zb-audit-pill-delete{background:#fee2e2;color:#991b1b}
        .zb-audit-pill-login{background:#e0e7ff;color:#3730a3}
        .zb-audit-pill-default{background:#f3f4f6;color:#374151}
        .zb-audit-changes{border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
        .zb-audit-changes th{background:#f9fafb;font-size:11px;text-transform:uppercase;color:#6b7280}
        .zb-audit-muted{color:#9ca3af;font-size:12px}
        .zb-audit-json{margin:8px 0 0;padding:10px;background:#f9fafb;border-radius:8px;font-size:11px;max-height:200px;overflow:auto;white-space:pre-wrap}
        .zb-audit-detail-row td{background:#fefefe}
        .zb-audit-err{color:#dc2626;margin-bottom:12px}
      `}</style>

      <header className="zb-audit-hd">
        <h1>Audit History</h1>
        <p>Who changed what — product prices, stock, sales, sign-in/out, and deletions. Expand a row for before/after values.</p>
      </header>

      <div className="zb-audit-filters">
        <div>
          <label>User</label>
          <select
            value={filters.userId}
            onChange={(e) => { setPage(1); setFilters({ ...filters, userId: e.target.value }); }}
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name || u.username || `User #${u.user_id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Action</label>
          <select
            value={filters.action}
            onChange={(e) => { setPage(1); setFilters({ ...filters, action: e.target.value }); }}
          >
            <option value="">All actions</option>
            {(filterOptions.actions || []).map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Module</label>
          <select
            value={filters.tableName}
            onChange={(e) => { setPage(1); setFilters({ ...filters, tableName: e.target.value }); }}
          >
            <option value="">All modules</option>
            {tableOptions.map((tbl) => (
              <option key={tbl} value={tbl}>{tbl}</option>
            ))}
          </select>
        </div>
        <div>
          <label>From</label>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => { setPage(1); setFilters({ ...filters, start_date: e.target.value }); }}
          />
        </div>
        <div>
          <label>To</label>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => { setPage(1); setFilters({ ...filters, end_date: e.target.value }); }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label>Search</label>
          <input
            type="search"
            placeholder="Notes, user, module, action…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadLogs(); } }}
          />
        </div>
        <div className="zb-audit-actions">
          <button type="button" className="zb-audit-btn zb-audit-btn-primary" onClick={() => { setPage(1); loadLogs(); }}>
            Apply
          </button>
          <button
            type="button"
            className="zb-audit-btn"
            onClick={() => {
              setFilters({ userId: '', action: '', tableName: '', search: '', start_date: '', end_date: '' });
              setFilterHint('');
              setPage(1);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {filterHint ? (
        <p style={{ marginBottom: 10, color: '#b45309', fontSize: 13 }}>{filterHint}</p>
      ) : null}

      {error ? <div className="zb-audit-err">{error}</div> : null}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <>
          <div className="zb-audit-table-wrap">
            <table className="zb-audit-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Record</th>
                  <th>Summary</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="zb-audit-muted" style={{ textAlign: 'center', padding: 24 }}>
                      {hasActiveFilters
                        ? 'No entries match these filters. Click Clear, then try again.'
                        : 'No audit entries yet. Save a sale, edit a product, or add an expense — then refresh this page.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionCls =
                      log.action === 'create'
                        ? 'zb-audit-pill-create'
                        : log.action === 'update'
                          ? 'zb-audit-pill-update'
                          : log.action === 'delete'
                            ? 'zb-audit-pill-delete'
                            : log.action === 'login' || log.action === 'logout'
                              ? 'zb-audit-pill-login'
                              : log.action === 'login_failed'
                                ? 'zb-audit-pill-delete'
                                : 'zb-audit-pill-default';
                    const open = expandedId === log.log_id;
                    return (
                      <React.Fragment key={log.log_id}>
                        <tr>
                          <td>{formatWhen(log.timestamp)}</td>
                          <td>{log.user_name || log.username || 'System'}</td>
                          <td>
                            <span className={`zb-audit-pill ${actionCls}`}>
                              {formatAuditAction(log)}
                            </span>
                          </td>
                          <td>{formatModuleName(log.table_name)}</td>
                          <td>{log.record_id != null ? `#${log.record_id}` : '—'}</td>
                          <td style={{ maxWidth: 320 }}>
                            <span title={formatAuditSummary(log)}>{formatAuditSummary(log)}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="zb-audit-btn"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => setExpandedId(open ? null : log.log_id)}
                            >
                              {open ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="zb-audit-detail-row">
                            <td colSpan={7}>
                              <AuditChangeTable log={log} />
                              <details style={{ marginTop: 10 }}>
                                <summary className="zb-audit-muted" style={{ cursor: 'pointer' }}>
                                  Raw JSON
                                </summary>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                                  <div>
                                    <strong>Before</strong>
                                    <JsonBlock data={log.old_values} />
                                  </div>
                                  <div>
                                    <strong>After</strong>
                                    <JsonBlock data={log.new_values} />
                                  </div>
                                </div>
                              </details>
                              {log.ip_address ? (
                                <p className="zb-audit-muted" style={{ marginTop: 8 }}>
                                  IP: {log.ip_address}
                                </p>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {total > 0 ? (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              itemsPerPage={pageSize}
              totalItems={total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
};

export default AuditHistory;
