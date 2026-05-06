/** Injected on Purchases list view — matches workspace shell (HK-style cards + table). */
export const purchasesWorkspaceStyles = `
.pur2{max-width:100%;padding:0 16px 24px;background:#f2f1ed;color:#111827;font-family:'DM Sans',Inter,system-ui,sans-serif}
.pur2-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap}
.pur2-title{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:clamp(1.45rem,2.4vw,1.85rem);font-weight:800;letter-spacing:-.04em;margin:0;line-height:1.1;color:#0f172a}
.pur2-sub{margin:6px 0 0;font-size:14px;color:#64748b;font-weight:500;max-width:48ch;line-height:1.4}
.pur2-new{height:44px;padding:0 20px;border-radius:12px;border:none;background:#111827;color:#fff;font-size:15px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit;box-shadow:0 4px 14px rgba(17,24,39,.2)}
.pur2-new:hover{background:#1e293b}
.pur2-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 14px;border-radius:12px;margin-bottom:14px;font-size:14px}
.pur2-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
@media(max-width:1100px){.pur2-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.pur2-kpis{grid-template-columns:1fr}}
.pur2-kpi{background:#fff;border:1px solid #e8e5df;border-radius:14px;padding:14px 16px 12px;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.pur2-kpi-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.pur2-kpi-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px}
.pur2-kpi--blue .pur2-kpi-ico{background:#eff6ff;color:#2563eb}
.pur2-kpi--ink .pur2-kpi-ico{background:#f1f5f9;color:#0f172a}
.pur2-kpi--red .pur2-kpi-ico{background:#fef2f2;color:#dc2626}
.pur2-kpi--green .pur2-kpi-ico{background:#ecfdf5;color:#16a34a}
.pur2-kpi-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8}
.pur2-kpi-val{margin-top:4px;font-size:1.35rem;font-weight:800;font-family:'Bricolage Grotesque','DM Sans',sans-serif;color:#0f172a;letter-spacing:-.02em}
.pur2-kpi-sub{margin-top:4px;font-size:12px;color:#9ca3af;font-weight:500}
.pur2-shell{background:#fff;border:1px solid #e8e5df;border-radius:16px;box-shadow:0 2px 12px rgba(15,23,42,.05);overflow:hidden}
.pur2-shell-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px 12px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap}
.pur2-shell-tit{margin:0;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:1.15rem;font-weight:700;color:#0f172a}
.pur2-badge{font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px 10px;white-space:nowrap}
.pur2-toolbar{display:grid;grid-template-columns:1.4fr .85fr .85fr;gap:10px;padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafaf9}
@media(max-width:900px){.pur2-toolbar{grid-template-columns:1fr}}
.pur2-search-wrap{position:relative;display:flex;align-items:center}
.pur2-search-wrap svg{position:absolute;left:12px;color:#94a3b8;font-size:14px;pointer-events:none}
.pur2-search{height:40px;width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px 0 38px;font-size:13px;font-family:inherit;background:#fff;color:#111827}
.pur2-select{height:40px;border:1px solid #e5e7eb;border-radius:10px;padding:0 12px;font-size:13px;font-family:inherit;background:#fff;color:#374151;font-weight:500}
.pur2-table-wrap{overflow-x:auto}
.pur2-table{width:100%;border-collapse:collapse;min-width:920px}
.pur2-table th{text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:11px 14px;border-bottom:1px solid #f1f5f9;background:#fcfcfb}
.pur2-table td{padding:12px 14px;border-bottom:1px solid #f4f4f5;font-size:13px;color:#334155;vertical-align:middle}
.pur2-table tbody tr:hover td{background:#fafaf9}
.pur2-link{background:none;border:none;padding:0;font:inherit;font-weight:700;color:#2563eb;cursor:pointer;text-decoration:none}
.pur2-link:hover{text-decoration:underline}
.pur2-sup{font-weight:700;color:#0f172a}
.pur2-date{color:#64748b;font-size:12px}
.pur2-items-badge{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:26px;padding:0 8px;border-radius:8px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700}
.pur2-amt{font-weight:700;color:#0f172a}
.pur2-paid{color:#16a34a;font-weight:700}
.pur2-bal0{color:#94a3b8;font-weight:600}
.pur2-bal{color:#dc2626;font-weight:700}
.pur2-pay{display:inline-block;text-transform:capitalize;font-size:12px;font-weight:600;color:#475569}
.pur2-st{display:inline-flex;align-items:center;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
.pur2-st--paid{background:#ecfdf5;color:#15803d}
.pur2-st--pending{background:#fef2f2;color:#b91c1c}
.pur2-st--partial{background:#fffbeb;color:#b45309}
.pur2-actions{display:flex;align-items:center;gap:6px;white-space:nowrap}
.pur2-iconbtn{width:34px;height:34px;border-radius:9px;border:1px solid #e5e7eb;background:#fff;color:#64748b;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.pur2-iconbtn:hover{background:#f8fafc;color:#111827;border-color:#d1d5db}
.pur2-iconbtn--del:hover{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
.pur2-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid #f1f5f9;background:#fafaf9}
.pur2-foot-total{font-size:14px;color:#64748b}
.pur2-foot-total strong{font-size:15px;color:#2563eb;font-weight:800}
.pur2-foot-meta{font-size:12px;color:#94a3b8;font-weight:500}
.pur2-empty{padding:36px 16px;text-align:center;color:#94a3b8;font-size:14px}
.pur2 .sup2-pagination{border-top:1px solid #f1f5f9;background:#fff}
`;
