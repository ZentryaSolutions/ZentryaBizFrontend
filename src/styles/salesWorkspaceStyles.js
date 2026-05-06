/** Sales list workspace — KPI row, toolbar, invoice table (light gray shell). */
export const salesWorkspaceStyles = `
.sal2{max-width:100%;padding:0 16px 24px;background:#f4f4f4;color:#111827;font-family:'DM Sans',Inter,system-ui,sans-serif}
.sal2-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 14px;border-radius:12px;margin-bottom:14px;font-size:14px}
.sal2-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
@media(max-width:1100px){.sal2-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.sal2-kpis{grid-template-columns:1fr}}
.sal2-kpi{background:#fff;border:1px solid #ececec;border-radius:14px;padding:14px 16px 14px;box-shadow:0 1px 3px rgba(15,23,42,.06);position:relative}
.sal2-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
.sal2-kpi-ico{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px}
.sal2-kpi--blue .sal2-kpi-ico{background:#eff6ff;color:#2563eb}
.sal2-kpi--green .sal2-kpi-ico{background:#ecfdf5;color:#16a34a}
.sal2-kpi--orange .sal2-kpi-ico{background:#fff7ed;color:#ea580c}
.sal2-kpi--purple .sal2-kpi-ico{background:#f5f3ff;color:#7c3aed}
.sal2-kpi-pill{font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap}
.sal2-kpi-pill--today{background:#eff6ff;color:#2563eb}
.sal2-kpi-pill--total{background:#ecfdf5;color:#15803d}
.sal2-kpi-pill--pending{background:#fff7ed;color:#c2410c}
.sal2-kpi-pill--sales{background:#f5f3ff;color:#6d28d9}
.sal2-kpi-val{font-size:1.35rem;font-weight:800;font-family:'Bricolage Grotesque','DM Sans',sans-serif;color:#0f172a;letter-spacing:-.02em;line-height:1.15;margin-bottom:6px}
.sal2-kpi-lbl{font-size:13px;font-weight:600;color:#334155}
.sal2-kpi-sub{margin-top:4px;font-size:12px;color:#94a3b8;font-weight:500}
.sal2-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px;flex-wrap:wrap}
.sal2-hd-tit{margin:0;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:clamp(1.35rem,2.2vw,1.65rem);font-weight:800;letter-spacing:-.03em;color:#0f172a}
.sal2-hd-sub{margin:6px 0 0;font-size:14px;color:#64748b;font-weight:500;max-width:52ch;line-height:1.4}
.sal2-new{height:44px;padding:0 20px;border-radius:12px;border:none;background:#111827;color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit;box-shadow:0 4px 14px rgba(17,24,39,.2)}
.sal2-new:hover{background:#1e293b}
.sal2-toolbar-wrap{background:#fff;border:1px solid #ececec;border-radius:14px;padding:12px 14px;margin-bottom:14px;box-shadow:0 1px 3px rgba(15,23,42,.05)}
.sal2-toolbar{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,.75fr) minmax(0,.75fr) minmax(0,.95fr) auto;gap:10px;align-items:center}
@media(max-width:1100px){.sal2-toolbar{grid-template-columns:1fr 1fr;grid-auto-rows:auto}}
@media(max-width:560px){.sal2-toolbar{grid-template-columns:1fr}}
.sal2-search-wrap{position:relative;display:flex;align-items:center;min-width:0}
.sal2-search-wrap svg{position:absolute;left:12px;color:#94a3b8;font-size:14px;pointer-events:none}
.sal2-search{height:40px;width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px 0 38px;font-size:13px;font-family:inherit;background:#fff;color:#111827}
.sal2-select,.sal2-date{height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px;font-size:13px;font-family:inherit;background:#fff;color:#374151;font-weight:500}
.sal2-export{height:40px;padding:0 14px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#0f172a;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;font-family:inherit}
.sal2-export:hover{background:#f8fafc;border-color:#d1d5db}
.sal2-shell{background:#fff;border:1px solid #ececec;border-radius:16px;box-shadow:0 2px 12px rgba(15,23,42,.05);overflow:hidden}
.sal2-shell-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px 12px;border-bottom:1px solid #f1f5f9}
.sal2-shell-tit{margin:0;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:1.12rem;font-weight:700;color:#0f172a}
.sal2-shell-meta{font-size:13px;color:#94a3b8;font-weight:500}
.sal2-table-wrap{overflow-x:auto}
.sal2-table{width:100%;border-collapse:collapse;min-width:980px}
.sal2-table th{text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:12px 14px;border-bottom:1px solid #f1f5f9;background:#fcfcfc}
.sal2-table td{padding:14px;border-bottom:1px solid #f4f4f5;font-size:13px;color:#334155;vertical-align:top}
.sal2-table tbody tr:hover td{background:#fafafa}
.sal2-inv-btn{font:inherit;font-weight:800;color:#0f172a;font-size:14px;display:block;background:none;border:none;padding:0;cursor:pointer;text-align:left}
.sal2-inv-btn:hover{text-decoration:underline;color:#1e40af}
.sal2-inv-sub{font-size:12px;color:#94a3b8;margin-top:4px;font-weight:500}
.sal2-cust{display:flex;align-items:flex-start;gap:10px}
.sal2-av{width:40px;height:40px;border-radius:999px;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);color:#3730a3;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sal2-cust-name{font-weight:700;color:#0f172a;display:block}
.sal2-cust-sub{font-size:12px;color:#94a3b8;margin-top:2px}
.sal2-items-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:8px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:600}
.sal2-items-preview{margin-top:6px;font-size:12px;color:#64748b;line-height:1.35;max-width:220px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sal2-amt{font-weight:700;color:#0f172a}
.sal2-paid-amt{font-weight:700;color:#0f172a}
.sal2-due-hint{margin-top:4px;font-size:11px;font-weight:700;color:#dc2626}
.sal2-method{display:inline-flex;align-items:center;gap:8px;text-transform:capitalize;font-weight:600;color:#475569}
.sal2-method svg{color:#64748b;font-size:14px}
.sal2-st{display:inline-flex;align-items:center;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:800;text-transform:capitalize;letter-spacing:.02em}
.sal2-st--paid{background:#ecfdf5;color:#15803d}
.sal2-st--credit{background:#fef2f2;color:#b91c1c}
.sal2-st--partial{background:#fff7ed;color:#c2410c}
.sal2-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sal2-iconbtn{width:34px;height:34px;border-radius:9px;border:1px solid #e5e7eb;background:#fff;color:#64748b;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.sal2-iconbtn:hover{background:#f8fafc;color:#111827;border-color:#d1d5db}
.sal2-iconbtn--del:hover{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
.sal2-empty{padding:40px 16px;text-align:center;color:#94a3b8;font-size:14px}

/* Full-screen overlay + centered modal (covers sidebar + navbar) */
.sal2-modal-overlay{position:fixed;inset:0;z-index:30000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.sal2-modal{width:min(980px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border-radius:14px;background:#fff;box-shadow:0 24px 70px rgba(2,6,23,.35);border:1px solid rgba(226,232,240,.9)}
.sal2-modal .modal-header{position:sticky;top:0;background:#fff;border-bottom:1px solid #eef2f7;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:1}
.sal2-modal .modal-header h2{margin:0;font-size:15px;font-weight:800;color:#0f172a}
.sal2-modal .modal-close{width:34px;height:34px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#64748b;cursor:pointer;font-size:18px;line-height:1}
.sal2-modal .modal-close:hover{background:#f8fafc;color:#0f172a;border-color:#d1d5db}
.sal2-modal .modal-content{padding:16px}
.sal2-modal .modal-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:14px}
`;
