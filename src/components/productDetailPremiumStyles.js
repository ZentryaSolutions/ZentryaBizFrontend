/** Scoped product detail premium UI — injected once via <style> */
export const productDetailPremiumCss = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
.pdv3{--pdv3-bg:#f4f5f7;--pdv3-card:#fff;--pdv3-border:#e8eaee;--pdv3-text:#1c1d1f;--pdv3-muted:#6b7280;--pdv3-muted2:#9ca3af;--pdv3-hero:#1a1d2e;--pdv3-hero-sub:rgba(255,255,255,.72);--pdv3-radius:16px;--pdv3-radius-sm:12px;--pdv3-shadow:0 1px 2px rgba(15,23,42,.04),0 4px 20px rgba(15,23,42,.06);--pdv3-font:"Plus Jakarta Sans",system-ui,sans-serif;max-width:1280px;margin:0 auto;padding:0 0 2rem;font-family:var(--pdv3-font);font-size:15px;font-weight:450;line-height:1.5;color:var(--pdv3-text)}
.pdv3 *{box-sizing:border-box}
.pdv3-nav{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .85rem;margin-bottom:.35rem}
.pdv3-back{display:inline-flex;align-items:center;gap:.45rem;padding:.5rem .95rem;border-radius:999px;border:1px solid var(--pdv3-border);background:var(--pdv3-card);color:var(--pdv3-text);font-size:.875rem;font-weight:500;cursor:pointer;transition:background .15s,border-color .15s}
.pdv3-back:hover{background:#fafafa;border-color:#dcdfe4}
.pdv3-crumb{display:flex;align-items:center;gap:.45rem;font-size:.875rem;color:var(--pdv3-muted)}
.pdv3-crumb-sep{color:var(--pdv3-muted2);font-weight:400}
.pdv3-crumb-current{color:var(--pdv3-text);font-weight:600;max-width:min(48vw,22rem);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pdv3-hero{position:relative;border-radius:var(--pdv3-radius);background:var(--pdv3-hero);color:#fff;padding:1.5rem 1.5rem 1.25rem;margin-bottom:1.5rem;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,.2)}
.pdv3-hero::before{content:"";position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:24px 24px;opacity:.5;pointer-events:none}
.pdv3-hero-top{position:relative;z-index:1;display:grid;grid-template-columns:1fr;gap:1.5rem}
@media (min-width:900px){.pdv3-hero-top{grid-template-columns:1fr auto;align-items:start}}
.pdv3-hero-id{display:flex;gap:1rem;align-items:flex-start;min-width:0}
.pdv3-hero-icon{flex-shrink:0;width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:1.35rem;color:rgba(255,255,255,.95)}
.pdv3-hero-title{margin:0 0 .65rem;font-size:clamp(1.35rem,2.5vw,1.65rem);font-weight:600;letter-spacing:-.02em;line-height:1.25}
.pdv3-hero-chips{display:flex;flex-wrap:wrap;gap:.45rem}
.pdv3-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.28rem .65rem;border-radius:999px;font-size:.75rem;font-weight:500;background:rgba(255,255,255,.12);color:var(--pdv3-hero-sub);border:1px solid rgba(255,255,255,.14)}
.pdv3-chip--accent{background:rgba(139,92,246,.25);border-color:rgba(167,139,250,.45);color:#e9d5ff}
.pdv3-hero-stock{position:relative;z-index:1;text-align:right;min-width:0}
.pdv3-hero-stock-label{display:block;font-size:.65rem;font-weight:500;letter-spacing:.1em;color:var(--pdv3-hero-sub);text-transform:uppercase;margin-bottom:.2rem}
.pdv3-hero-stock-num{font-size:clamp(2rem,5vw,2.75rem);font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.03em;line-height:1}
.pdv3-hero-stock-sub{display:block;margin-top:.35rem;font-size:.875rem;color:var(--pdv3-hero-sub);font-weight:450}
.pdv3-hero-stock-bar{margin-top:.75rem;height:4px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;max-width:200px;margin-left:auto}
.pdv3-hero-stock-bar>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#34d399,#22c55e);transition:width .35s ease}
.pdv3-hero-stats{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,1fr);gap:1rem 1.25rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,.1)}
@media (min-width:700px){.pdv3-hero-stats{grid-template-columns:repeat(4,1fr)}}
.pdv3-hero-stat label{display:block;font-size:.65rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--pdv3-hero-sub);margin-bottom:.35rem}
.pdv3-hero-stat strong{display:block;font-size:1rem;font-weight:600;font-variant-numeric:tabular-nums}
.pdv3-hero-stat .pdv3-sub{display:block;margin-top:.2rem;font-size:.8125rem;font-weight:450;color:var(--pdv3-hero-sub)}
.pdv3-hero-stat .pdv3-trade{font-size:.75rem;color:rgba(255,255,255,.45);margin-top:.15rem}
.pdv3-hero-actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.6rem;margin-top:1.25rem}
.pdv3-btn-light{display:inline-flex;align-items:center;gap:.45rem;padding:.55rem 1rem;border-radius:999px;font-size:.875rem;font-weight:500;cursor:pointer;border:1px solid transparent;transition:background .15s,color .15s,border-color .15s}
.pdv3-btn-light--solid{background:#fff;color:var(--pdv3-hero)}.pdv3-btn-light--solid:hover{background:#f3f4f6}
.pdv3-btn-light--outline{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}.pdv3-btn-light--outline:hover{background:rgba(255,255,255,.08)}
.pdv3-layout{display:grid;grid-template-columns:1fr;gap:1.25rem;align-items:start}
@media (min-width:1024px){.pdv3-layout{grid-template-columns:minmax(0,1fr) 320px;gap:1.5rem}}
.pdv3-main-col{display:flex;flex-direction:column;gap:1.25rem;min-width:0}
.pdv3-card{background:var(--pdv3-card);border:1px solid var(--pdv3-border);border-radius:var(--pdv3-radius);box-shadow:var(--pdv3-shadow)}
.pdv3-card-pad{padding:1.35rem 1.5rem}
.pdv3-card-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:1.15rem}
.pdv3-card-title{margin:0;font-size:1rem;font-weight:600;color:var(--pdv3-text);letter-spacing:-.01em}
.pdv3-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:2.25rem;height:2.25rem;border-radius:10px;border:1px solid var(--pdv3-border);background:#fafafa;color:var(--pdv3-muted);cursor:pointer;transition:background .15s,color .15s}
.pdv3-icon-btn:hover{background:#f3f4f6;color:var(--pdv3-text)}
.pdv3-spec-grid{margin:0;display:grid;grid-template-columns:1fr;gap:0}
@media (min-width:640px){.pdv3-spec-grid{grid-template-columns:repeat(2,1fr)}}
.pdv3-spec-cell{padding:.75rem 0;border-bottom:1px solid #f0f1f4}
@media (min-width:640px){.pdv3-spec-cell:nth-child(odd){padding-right:1.25rem}.pdv3-spec-cell:nth-child(even){padding-left:1.25rem;border-left:1px solid #f0f1f4}}
.pdv3-spec-cell dt{margin:0 0 .2rem;font-size:.65rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--pdv3-muted2)}
.pdv3-spec-cell dd{margin:0;font-size:.9375rem;font-weight:450;color:var(--pdv3-text);word-break:break-word}
@media (min-width:640px){.pdv3-spec-cell--full{grid-column:1/-1;padding-left:0;padding-right:0;border-left:none}}
.pdv3-spec-cell--full{border-bottom:1px solid #f0f1f4}
.pdv3-spec-cell--muted dd{color:var(--pdv3-muted2);font-style:italic}
.pdv3-desc{margin-top:.5rem;padding-top:1rem;border-top:1px solid #f0f1f4}
.pdv3-desc dt{margin:0 0 .35rem;font-size:.65rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--pdv3-muted2)}
.pdv3-desc dd{margin:0;font-size:.9375rem;font-weight:450;color:var(--pdv3-text);line-height:1.55}
.pdv3-side-col{display:flex;flex-direction:column;gap:1.25rem;min-width:0}
.pdv3-side-title{margin:0 0 .9rem;font-size:.8125rem;font-weight:600;color:var(--pdv3-text)}
.pdv3-break-list{margin:0;padding:0;list-style:none}
.pdv3-break-item{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.55rem 0;font-size:.875rem;border-bottom:1px solid #f0f1f4}
.pdv3-break-item:last-of-type{border-bottom:none}
.pdv3-break-left{display:flex;align-items:center;gap:.5rem;color:var(--pdv3-muted);font-weight:450}
.pdv3-break-left svg{width:14px;opacity:.85}
.pdv3-break-val{font-weight:600;font-variant-numeric:tabular-nums;color:var(--pdv3-text)}
.pdv3-break-val--in{color:#3b82f6}.pdv3-break-val--out{color:#f59e0b}.pdv3-break-val--adj{color:#8b5cf6}
.pdv3-instock-footer{margin-top:1rem;padding:.65rem .85rem;border-radius:var(--pdv3-radius-sm);background:#f3f4f6;display:flex;align-items:center;justify-content:space-between;font-size:.8125rem}
.pdv3-instock-footer span:first-child{color:var(--pdv3-muted);font-weight:500}
.pdv3-instock-footer strong{font-size:.9375rem;font-weight:600;font-variant-numeric:tabular-nums}
.pdv3-price-row{display:flex;justify-content:space-between;gap:.75rem;padding:.45rem 0;font-size:.875rem;border-bottom:1px solid #f0f1f4}
.pdv3-price-row:last-child{border-bottom:none}
.pdv3-price-row span:first-child{color:var(--pdv3-muted);font-weight:450}
.pdv3-price-row span:last-child{font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.pdv3-price-row--muted span:last-child{font-weight:450;color:var(--pdv3-muted)}
.pdv3-activity-item{display:flex;gap:.65rem;align-items:flex-start}
.pdv3-activity-dot{width:8px;height:8px;border-radius:50%;background:#d1d5db;margin-top:.35rem;flex-shrink:0}
.pdv3-activity-item strong{display:block;font-size:.875rem;font-weight:600}
.pdv3-activity-item span{font-size:.8125rem;color:var(--pdv3-muted);font-weight:450}
.pdv3-tabs-card{overflow:hidden}
.pdv3-tabs-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem 1rem;padding:.85rem 1.25rem 0;border-bottom:1px solid var(--pdv3-border);background:linear-gradient(180deg,#fafafa 0%,#fff 100%)}
.pdv3-tabs{display:flex;flex-wrap:wrap;gap:.15rem .25rem}
.pdv3-tab{position:relative;display:inline-flex;align-items:center;gap:.4rem;padding:.65rem .85rem;border:none;background:none;font-family:inherit;font-size:.875rem;font-weight:500;color:var(--pdv3-muted);cursor:pointer;transition:color .15s}
.pdv3-tab:hover{color:var(--pdv3-text)}.pdv3-tab--active{color:var(--pdv3-text);font-weight:600}
.pdv3-tab--active::after{content:"";position:absolute;left:.5rem;right:.5rem;bottom:0;height:2px;background:var(--pdv3-text);border-radius:2px 2px 0 0}
.pdv3-add-purchase{display:inline-flex;align-items:center;gap:.45rem;padding:.5rem 1rem;border-radius:10px;font-family:inherit;font-size:.8125rem;font-weight:500;background:var(--pdv3-text);color:#fff;border:none;cursor:pointer;transition:opacity .15s}
.pdv3-add-purchase:hover:not(:disabled){opacity:.92}.pdv3-add-purchase:disabled{opacity:.55;cursor:not-allowed}
.pdv3-footer-action-light{background:#fff!important;color:#1a1d2e!important;border:1px solid #e2e4e8!important;box-shadow:0 1px 2px rgba(15,23,42,.06)!important}
.pdv3-footer-action-light:hover:not(:disabled){background:#f8f9fb!important}
.pdv3-table-wrap{overflow-x:auto;padding:0 1.25rem 1rem}
.pdv3-table{width:100%;border-collapse:collapse;font-size:.8125rem}
.pdv3-table th{text-align:left;padding:.65rem .5rem;font-size:.65rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--pdv3-muted2);border-bottom:1px solid var(--pdv3-border);white-space:nowrap;background:#fff}
.pdv3-table td{padding:.7rem .5rem;border-bottom:1px solid #f3f4f6;color:#374151;font-weight:450;vertical-align:middle}
.pdv3-table tbody tr:hover td{background:#fafafa}
.pdv3-table-num{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
.pdv3-num-in{color:#059669}.pdv3-num-out{color:#dc2626}
.pdv3-code{font-family:ui-monospace,Cascadia Code,monospace;font-size:.78rem;padding:.12rem .35rem;background:#f3f4f6;border-radius:6px;color:#4b5563}
.pdv3-table-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;padding:.75rem 1.25rem 1.1rem;border-top:1px solid #f0f1f4;font-size:.8125rem;color:var(--pdv3-muted)}
.pdv3-empty{text-align:center;padding:2.5rem 1.5rem 2rem;color:var(--pdv3-muted)}
.pdv3-empty svg{font-size:2rem;opacity:.35;margin-bottom:.75rem}
.pdv3-empty p{margin:0 0 .35rem;font-size:.9375rem;font-weight:500;color:var(--pdv3-text)}
.pdv3-empty small{font-size:.8125rem;font-weight:450;color:var(--pdv3-muted)}
.pdv3-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;gap:1rem;color:var(--pdv3-muted);font-family:var(--pdv3-font)}
.pdv3-loading-ring{width:36px;height:36px;border:2px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:pdv3spin .7s linear infinite}
@keyframes pdv3spin{to{transform:rotate(360deg)}}
.pdv3-error{max-width:420px;margin:2rem auto;padding:1.25rem;background:#fef2f2;border:1px solid #fecaca;border-radius:var(--pdv3-radius-sm);color:#991b1b;text-align:center;font-family:var(--pdv3-font)}
.pdv3-btn-ghost{margin-top:.75rem;display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .85rem;border-radius:10px;border:1px solid var(--pdv3-border);background:#fff;cursor:pointer;font-family:inherit;font-size:.875rem;font-weight:500}
.content-container.pdv3-wrap{background:var(--pdv3-bg);padding-top:.25rem;padding-left:1rem;padding-right:1rem;max-width:100%}
@media (min-width:1280px){.content-container.pdv3-wrap{padding-left:1.5rem;padding-right:1.5rem}}
`;
