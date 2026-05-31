/** Support tickets workspace */
export const supportTicketsStyles = `
.content-container.stk-page{padding:16px 20px 28px;box-sizing:border-box;max-width:100%}
@media (min-width:768px){.content-container.stk-page{padding:20px 24px 32px}}
@media (min-width:1280px){.content-container.stk-page{padding:24px 32px 36px}}
.stk-wrap{max-width:1100px;margin:0 auto;padding:0}
.stk-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}
.stk-title{margin:0;font-size:1.5rem;font-weight:700;color:#111827;letter-spacing:-.02em}
.stk-sub{margin:.35rem 0 0;font-size:.875rem;color:#6b7280}
.stk-btn-primary{display:inline-flex;align-items:center;gap:.45rem;padding:.6rem 1rem;border-radius:10px;border:none;background:#111827;color:#fff;font-size:.875rem;font-weight:600;cursor:pointer}
.stk-btn-primary:hover{background:#1f2937}
.stk-btn-primary:disabled{opacity:.55;cursor:not-allowed}
.stk-card{background:#fff;border:1px solid #e8eaee;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.05);overflow:hidden}
.stk-table{width:100%;border-collapse:collapse;font-size:.875rem}
.stk-table th{text-align:left;padding:.65rem 1rem;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af;background:#fafaf8;border-bottom:1px solid #eee}
.stk-table td{padding:.7rem 1rem;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:middle}
.stk-table tbody tr:hover td{background:#fafaf8}
.stk-table tbody tr{cursor:pointer}
.stk-num{font-weight:700;color:#111827;font-variant-numeric:tabular-nums}
.stk-badge{display:inline-flex;align-items:center;padding:.2rem .55rem;border-radius:6px;font-size:.75rem;font-weight:700}
.stk-badge--open{background:#fff7ed;color:#c2410c}
.stk-badge--resolved{background:#ecfdf5;color:#047857}
.stk-empty{padding:2.5rem 1rem;text-align:center;color:#9ca3af}
.stk-overlay{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
.stk-modal{width:100%;max-width:520px;max-height:90vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 48px rgba(15,23,42,.2);padding:1.35rem 1.5rem}
.stk-modal--wide{max-width:640px}
.stk-modal h2{margin:0 0 1rem;font-size:1.15rem;font-weight:700}
.stk-field{margin-bottom:1rem}
.stk-field label{display:block;font-size:.75rem;font-weight:600;color:#6b7280;margin-bottom:.35rem}
.stk-field input,.stk-field textarea{width:100%;padding:.55rem .7rem;border:1px solid #d1d5db;border-radius:10px;font-size:.875rem;font-family:inherit}
.stk-field textarea{min-height:100px;resize:vertical}
.stk-hint{font-size:.75rem;color:#9ca3af;margin-top:.25rem}
.stk-img-grid{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}
.stk-img-thumb{width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb}
.stk-img-pick{display:flex;flex-wrap:wrap;gap:.5rem}
.stk-img-slot{position:relative;width:88px;height:88px;border:2px dashed #d1d5db;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#9ca3af;cursor:pointer;overflow:hidden}
.stk-img-slot input{position:absolute;inset:0;opacity:0;cursor:pointer}
.stk-img-slot img{width:100%;height:100%;object-fit:cover}
.stk-img-remove{position:absolute;top:2px;right:2px;width:22px;height:22px;border:none;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:.75rem;cursor:pointer}
.stk-modal-actions{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f0f1f4}
.stk-btn-ghost{padding:.5rem .9rem;border-radius:10px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:.875rem}
.stk-detail-meta{display:grid;gap:.5rem;margin-bottom:1rem;font-size:.875rem}
.stk-detail-meta dt{color:#9ca3af;font-size:.7rem;text-transform:uppercase;font-weight:600}
.stk-detail-meta dd{margin:0;color:#111827}
.stk-detail-imgs{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:.75rem}
.stk-detail-imgs img{max-width:160px;max-height:120px;border-radius:10px;border:1px solid #e5e7eb;cursor:pointer}
.stk-alert{padding:.65rem .85rem;border-radius:10px;margin-bottom:1rem;font-size:.875rem}
.stk-alert--error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.stk-alert--ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
`;
