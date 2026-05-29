import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
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

function getAuditChangeRows(log) {
  const oldV = parseAuditValues(log.old_values);
  const newV = parseAuditValues(log.new_values);
  if (!oldV && !newV) return [];

  const keys = [
    ...new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})]),
  ].filter((k) => !['product_id', 'import_count'].includes(k));

  return keys
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
}

function AuditChangeTable({ log }) {
  const rows = getAuditChangeRows(log);
  if (!rows.length) return null;

  return (
    <table className="zb-audit-changes">
      <thead>
        <tr>
          <th>Field</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td>{r.label}</td>
            <td className="zb-audit-val-before">{r.before}</td>
            <td className="zb-audit-val-after">{r.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AuditExpandPanel({ log }) {
  const [showTech, setShowTech] = useState(false);
  const changeRows = getAuditChangeRows(log);

  return (
    <div className="zb-audit-expand-inner">
      {changeRows.length > 0 ? (
        <>
          <p className="zb-audit-changes-title">What changed</p>
          <AuditChangeTable log={log} />
        </>
      ) : (
        <p className="zb-audit-no-changes">No before/after details for this entry.</p>
      )}
      <div className="zb-audit-expand-footer">
        {log.record_id != null ? <span>Record #{log.record_id}</span> : null}
        {log.ip_address ? <span>IP {log.ip_address}</span> : null}
        <button
          type="button"
          className="zb-audit-tech-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setShowTech((v) => !v);
          }}
        >
          {showTech ? 'Hide technical data' : 'Technical data'}
        </button>
      </div>
      {showTech ? (
        <div className="zb-audit-tech-body">
          <div>
            <h4>Before</h4>
            <JsonBlock data={log.old_values} />
          </div>
          <div>
            <h4>After</h4>
            <JsonBlock data={log.new_values} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatWhenParts(ts) {
  if (!ts) return { date: '—', time: '' };
  try {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { date: String(ts), time: '' };
  }
}

function actionPillClass(action) {
  if (action === 'create') return 'zb-audit-pill-create';
  if (action === 'update') return 'zb-audit-pill-update';
  if (action === 'delete' || action === 'login_failed') return 'zb-audit-pill-delete';
  if (action === 'login' || action === 'logout') return 'zb-audit-pill-login';
  return 'zb-audit-pill-default';
}

function formatUserRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (!r) return '—';
  if (r === 'administrator' || r === 'admin' || r === 'owner') return 'Admin';
  if (r === 'cashier') return 'Cashier';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function userRolePillClass(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'administrator' || r === 'admin' || r === 'owner') return 'zb-audit-role-admin';
  if (r === 'cashier') return 'zb-audit-role-cashier';
  return 'zb-audit-role-default';
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
  const [showFilters, setShowFilters] = useState(false);

  const normalizeDateRange = (start, end) => {
    const s = String(start || '').trim();
    const e = String(end || '').trim();
    if (s && e && s > e) {
      return { start_date: e, end_date: s, swapped: true };
    }
    return { start_date: s, end_date: e, swapped: false };
  };

  const activeFilterCount = [
    filters.userId,
    filters.action,
    filters.tableName,
    filters.start_date,
    filters.end_date,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || Boolean(filters.search.trim());

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

  useEffect(() => {
    if (hasActiveFilters) setShowFilters(true);
  }, [hasActiveFilters]);

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

  const clearFilters = () => {
    setFilters({ userId: '', action: '', tableName: '', search: '', start_date: '', end_date: '' });
    setFilterHint('');
    setPage(1);
  };

  return (
    <div className="zb-audit-page">
      <style>{`
        .zb-audit-page{max-width:1100px;margin:0 auto;padding:0 4px 32px}
        .zb-audit-hd{margin-bottom:18px}
        .zb-audit-hd h1{margin:0 0 4px;font-size:1.35rem;font-weight:700;color:#111827;letter-spacing:-.02em}
        .zb-audit-hd p{margin:0;color:#6b7280;font-size:13px;line-height:1.45;max-width:52ch}
        .zb-audit-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:12px}
        .zb-audit-search-wrap{flex:1 1 220px;min-width:180px;position:relative}
        .zb-audit-search-wrap input{width:100%;box-sizing:border-box;padding:9px 12px 9px 36px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;background:#fff}
        .zb-audit-search-wrap input:focus{outline:none;border-color:#5e5adb;box-shadow:0 0 0 3px rgba(94,90,219,.12)}
        .zb-audit-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:14px;pointer-events:none}
        .zb-audit-toolbar-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .zb-audit-count{font-size:12px;font-weight:600;color:#6b7280;white-space:nowrap}
        .zb-audit-btn{padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #e5e7eb;background:#fff;color:#374151;font-family:inherit}
        .zb-audit-btn:hover{background:#f9fafb}
        .zb-audit-btn-primary{background:#111827;color:#fff;border-color:#111827}
        .zb-audit-btn-primary:hover{background:#1f2937}
        .zb-audit-btn-filter{display:inline-flex;align-items:center;gap:6px}
        .zb-audit-filter-badge{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#5e5adb;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
        .zb-audit-filters-panel{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px 14px;padding:14px 16px;margin-bottom:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px}
        .zb-audit-filters-panel label{display:block;font-size:11px;font-weight:600;color:#6b7280;margin-bottom:5px}
        .zb-audit-filters-panel input,.zb-audit-filters-panel select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:#fff;font-family:inherit}
        .zb-audit-hint{margin:-8px 0 12px;padding:8px 12px;font-size:12px;color:#b45309;background:#fffbeb;border-radius:8px;border:1px solid #fde68a}
        .zb-audit-err{color:#dc2626;margin-bottom:12px;padding:10px 12px;background:#fef2f2;border-radius:8px;font-size:13px}
        .zb-audit-list{border:1px solid #e5e7eb;border-radius:12px;background:#fff;overflow:hidden}
        .zb-audit-list-header{display:grid;grid-template-columns:130px 110px 76px 96px 1fr 40px;gap:12px;padding:10px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
        .zb-audit-row{border-bottom:1px solid #f3f4f6}
        .zb-audit-row:last-child{border-bottom:none}
        .zb-audit-row-main{display:grid;grid-template-columns:130px 110px 76px 96px 1fr 40px;gap:12px;align-items:center;padding:12px 16px;cursor:pointer;transition:background .1s}
        .zb-audit-row-main:hover{background:#fafafa}
        .zb-audit-row-main.is-open{background:#f8fafc}
        .zb-audit-col-time{font-size:12px;color:#6b7280;line-height:1.35}
        .zb-audit-col-time strong{display:block;color:#111827;font-weight:600;font-size:13px}
        .zb-audit-col-user{font-size:13px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .zb-audit-user-role-inline{display:none;font-weight:500;color:#9ca3af}
        .zb-audit-col-role{font-size:12px}
        .zb-audit-role{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap}
        .zb-audit-role-admin{background:#ede9fe;color:#5b21b6}
        .zb-audit-role-cashier{background:#f3f4f6;color:#4b5563}
        .zb-audit-role-default{background:#f9fafb;color:#6b7280}
        .zb-audit-col-event{min-width:0}
        .zb-audit-event-summary{font-size:13px;color:#374151;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .zb-audit-event-meta{margin-top:4px;font-size:11px;color:#9ca3af}
        .zb-audit-chevron{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:none;border-radius:8px;background:transparent;color:#9ca3af;cursor:pointer;transition:transform .15s,background .12s}
        .zb-audit-chevron:hover{background:#f3f4f6;color:#374151}
        .zb-audit-chevron.is-open{transform:rotate(180deg);color:#5e5adb}
        .zb-audit-expand{padding:0 16px 14px;border-top:1px dashed #e5e7eb;background:#fafbfc}
        .zb-audit-expand-inner{padding-top:12px}
        .zb-audit-changes-title{margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
        .zb-audit-changes{width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff}
        .zb-audit-changes th{background:#f9fafb;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;text-align:left;padding:8px 12px}
        .zb-audit-changes td{padding:8px 12px;border-top:1px solid #f3f4f6;vertical-align:top}
        .zb-audit-changes td:first-child{color:#6b7280;width:28%}
        .zb-audit-val-before{color:#9ca3af}
        .zb-audit-val-after{font-weight:600;color:#111827}
        .zb-audit-no-changes{font-size:13px;color:#6b7280;margin:0}
        .zb-audit-expand-footer{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af}
        .zb-audit-tech-toggle{margin:0;padding:0;border:none;background:none;font-size:12px;font-weight:600;color:#6b7280;cursor:pointer;font-family:inherit}
        .zb-audit-tech-toggle:hover{color:#111827}
        .zb-audit-tech-body{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .zb-audit-tech-body h4{margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase}
        .zb-audit-json{margin:0;padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:11px;max-height:160px;overflow:auto;white-space:pre-wrap}
        .zb-audit-pill{display:inline-block;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap}
        .zb-audit-pill-create{background:#dcfce7;color:#166534}
        .zb-audit-pill-update{background:#dbeafe;color:#1e40af}
        .zb-audit-pill-delete{background:#fee2e2;color:#991b1b}
        .zb-audit-pill-login{background:#e0e7ff;color:#3730a3}
        .zb-audit-pill-default{background:#f3f4f6;color:#374151}
        .zb-audit-muted{color:#9ca3af;font-size:13px}
        .zb-audit-empty{text-align:center;padding:48px 24px;color:#6b7280;font-size:14px;line-height:1.5}
        .zb-audit-pagination{margin-top:16px}
        @media(max-width:768px){
          .zb-audit-filters-panel{grid-template-columns:1fr 1fr}
          .zb-audit-list-header{display:none}
          .zb-audit-row-main{grid-template-columns:1fr auto;grid-template-rows:auto auto auto;gap:6px 10px}
          .zb-audit-col-time{grid-column:1;grid-row:1}
          .zb-audit-col-user{grid-column:1;grid-row:2;font-size:12px;font-weight:500;color:#6b7280}
          .zb-audit-user-role-inline{display:inline}
          .zb-audit-col-role{display:none}
          .zb-audit-pill-wrap{grid-column:2;grid-row:1;justify-self:end}
          .zb-audit-col-event{grid-column:1/-1;grid-row:3}
          .zb-audit-chevron{grid-column:2;grid-row:3;justify-self:end;align-self:start}
          .zb-audit-tech-body{grid-template-columns:1fr}
        }
      `}</style>

      <header className="zb-audit-hd">
        <h1>Audit History</h1>
        <p>Track sign-ins, product edits, sales, and deletions. Click a row to see what changed.</p>
      </header>

      <div className="zb-audit-toolbar">
        <div className="zb-audit-search-wrap">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="zb-audit-search-icon" />
          <input
            type="search"
            placeholder="Search notes, user, module…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                loadLogs();
              }
            }}
          />
        </div>
        <div className="zb-audit-toolbar-actions">
          <button
            type="button"
            className="zb-audit-btn zb-audit-btn-filter"
            onClick={() => setShowFilters((v) => !v)}
          >
            Filters
            {activeFilterCount > 0 ? (
              <span className="zb-audit-filter-badge">{activeFilterCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className="zb-audit-btn zb-audit-btn-primary"
            onClick={() => {
              setPage(1);
              loadLogs();
            }}
          >
            Apply
          </button>
          {hasActiveFilters ? (
            <button type="button" className="zb-audit-btn" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
          {!loading && total > 0 ? (
            <span className="zb-audit-count">{total.toLocaleString()} entries</span>
          ) : null}
        </div>
      </div>

      {showFilters ? (
        <div className="zb-audit-filters-panel">
          <div>
            <label>User</label>
            <select
              value={filters.userId}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, userId: e.target.value });
              }}
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
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, action: e.target.value });
              }}
            >
              <option value="">All actions</option>
              {(filterOptions.actions || []).map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] || a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Module</label>
            <select
              value={filters.tableName}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, tableName: e.target.value });
              }}
            >
              <option value="">All modules</option>
              {tableOptions.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {formatModuleName(tbl)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>From</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, start_date: e.target.value });
              }}
            />
          </div>
          <div>
            <label>To</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, end_date: e.target.value });
              }}
            />
          </div>
        </div>
      ) : null}

      {filterHint ? <p className="zb-audit-hint">{filterHint}</p> : null}
      {error ? <div className="zb-audit-err">{error}</div> : null}

      {loading ? (
        <p className="zb-audit-muted">{t('common.loading')}</p>
      ) : (
        <>
          <div className="zb-audit-list">
            {logs.length > 0 ? (
              <div className="zb-audit-list-header">
                <span>Time</span>
                <span>User</span>
                <span>Role</span>
                <span>Action</span>
                <span>What happened</span>
                <span />
              </div>
            ) : null}
            {logs.length === 0 ? (
              <div className="zb-audit-empty">
                {hasActiveFilters
                  ? 'No entries match your filters. Try Clear or widen the date range.'
                  : 'No activity yet. Edits to products, sales, or sign-ins will appear here.'}
              </div>
            ) : (
              logs.map((log) => {
                const open = expandedId === log.log_id;
                const when = formatWhenParts(log.timestamp);
                const pillCls = actionPillClass(log.action);
                const moduleLabel = formatModuleName(log.table_name);
                const summary = formatAuditSummary(log);

                return (
                  <article key={log.log_id} className="zb-audit-row">
                    <div
                      className={`zb-audit-row-main${open ? ' is-open' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId(open ? null : log.log_id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedId(open ? null : log.log_id);
                        }
                      }}
                    >
                      <div className="zb-audit-col-time">
                        <strong>{when.date}</strong>
                        {when.time}
                      </div>
                      <div className="zb-audit-col-user">
                        {log.user_name || log.username || 'System'}
                        <span className="zb-audit-user-role-inline">
                          {' '}
                          · {formatUserRole(log.user_role)}
                        </span>
                      </div>
                      <div className="zb-audit-col-role">
                        <span className={`zb-audit-role ${userRolePillClass(log.user_role)}`}>
                          {formatUserRole(log.user_role)}
                        </span>
                      </div>
                      <div className="zb-audit-pill-wrap">
                        <span className={`zb-audit-pill ${pillCls}`}>
                          {formatAuditAction(log)}
                        </span>
                      </div>
                      <div className="zb-audit-col-event">
                        <div className="zb-audit-event-summary" title={summary}>
                          {summary}
                        </div>
                        <div className="zb-audit-event-meta">{moduleLabel}</div>
                      </div>
                      <button
                        type="button"
                        className={`zb-audit-chevron${open ? ' is-open' : ''}`}
                        aria-label={open ? 'Collapse details' : 'Expand details'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(open ? null : log.log_id);
                        }}
                      >
                        <FontAwesomeIcon icon={faChevronDown} />
                      </button>
                    </div>
                    {open ? (
                      <div className="zb-audit-expand">
                        <AuditExpandPanel log={log} />
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
          {total > 0 ? (
            <div className="zb-audit-pagination">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                itemsPerPage={pageSize}
                totalItems={total}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default AuditHistory;
