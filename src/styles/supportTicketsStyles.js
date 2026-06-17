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
.stk-chat-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.4rem .75rem;border-radius:8px;border:1px solid #e5e7eb;background:#f9fafb;color:#111827;font-size:.75rem;font-weight:600;cursor:pointer}
.stk-chat-btn:hover{background:#fff;border-color:#111827}
.stk-table td.stk-chat-cell{cursor:default}
.stk-chat-page{padding-bottom:0!important;height:calc(100vh - 56px);max-height:calc(100vh - 56px);display:flex;flex-direction:column}
@media (min-width:768px){.stk-chat-page{height:calc(100vh - 64px);max-height:calc(100vh - 64px)}}
.stk-chat-screen{flex:1;display:flex;flex-direction:column;min-height:0;max-width:1200px;width:100%;margin:0 auto}
.stk-chat-topbar{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1rem;padding-bottom:1rem;border-bottom:1px solid #eceef2;margin-bottom:1rem}
.stk-chat-back{display:inline-flex;align-items:center;gap:.45rem;padding:.45rem .7rem;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#374151;font-size:.8125rem;font-weight:600;cursor:pointer}
.stk-chat-back:hover{background:#f9fafb;border-color:#d1d5db}
.stk-chat-topbar-main{display:flex;align-items:flex-start;gap:.85rem;flex:1;min-width:0}
.stk-chat-topbar-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#111827,#374151);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stk-chat-topbar-text{min-width:0;flex:1}
.stk-chat-topbar-row{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem}
.stk-chat-topbar-text h1{margin:0;font-size:1.2rem;font-weight:800;color:#111827;letter-spacing:-.02em}
.stk-chat-topbar-text p{margin:.2rem 0 0;font-size:.875rem;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stk-chat-layout{flex:1;display:grid;grid-template-columns:1fr;gap:.75rem;min-height:0}
@media (min-width:900px){.stk-chat-layout{grid-template-columns:minmax(180px,220px) minmax(0,1fr)}}
.stk-chat-sidebar{display:none;background:#fff;border:1px solid #e8eaee;border-radius:14px;padding:.85rem .95rem;overflow:auto;font-size:.8125rem}
@media (min-width:900px){.stk-chat-sidebar{display:block}}
.stk-chat-sidebar h2{margin:0 0 .85rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af}
.stk-chat-facts{display:grid;gap:.85rem;margin:0}
.stk-chat-facts dt{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:.2rem}
.stk-chat-facts dd{margin:0;font-size:.8125rem;color:#111827;line-height:1.45}
.stk-chat-desc{white-space:pre-wrap;max-height:140px;overflow:auto}
.stk-chat-thumbs{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.35rem}
.stk-img-thumb-btn{padding:0;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;overflow:hidden;line-height:0;transition:border-color .15s,box-shadow .15s}
.stk-img-thumb-btn:hover{border-color:#111827;box-shadow:0 2px 8px rgba(15,23,42,.12)}
.stk-img-thumb-btn img{width:64px;height:64px;object-fit:cover;display:block}
.stk-lightbox{position:fixed;inset:0;z-index:13000;background:rgba(15,23,42,.88);display:flex;align-items:center;justify-content:center;padding:3rem 4rem}
.stk-lightbox-stage{max-width:min(92vw,900px);max-height:85vh;display:flex;flex-direction:column;align-items:center;gap:.75rem}
.stk-lightbox-stage img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:8px;box-shadow:0 16px 48px rgba(0,0,0,.35)}
.stk-lightbox-counter{margin:0;font-size:.8125rem;color:rgba(255,255,255,.75)}
.stk-lightbox-close{position:absolute;top:1rem;right:1rem;width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:1.1rem;cursor:pointer}
.stk-lightbox-close:hover{background:rgba(255,255,255,.25)}
.stk-lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border:none;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
.stk-lightbox-nav:hover{background:rgba(255,255,255,.28)}
.stk-lightbox-nav--prev{left:1rem}
.stk-lightbox-nav--next{right:1rem}
.stk-resolve-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .85rem;border-radius:10px;border:1px solid #047857;background:#ecfdf5;color:#047857;font-size:.75rem;font-weight:700;cursor:pointer;white-space:nowrap}
.stk-resolve-btn:hover{background:#d1fae5}
.stk-resolve-btn:disabled{opacity:.55;cursor:not-allowed}
.stk-reopen-btn{border-color:#c2410c;background:#fff7ed;color:#c2410c}
.stk-reopen-btn:hover{background:#ffedd5}
.stk-chat-topbar-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-left:auto}
.stk-resolved-by{margin:.35rem 0 0;font-size:.78rem;color:#047857;font-weight:600}
.stk-chat-facts dt{font-size:.65rem}
.stk-chat-facts dd{font-size:.8rem}
.stk-chat-desc{max-height:100px}
.stk-chat-panel{flex:1;display:flex;flex-direction:column;min-height:0;background:#fff;border:1px solid #e8eaee;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.04);overflow:hidden}
.stk-chat-panel-hd{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-bottom:1px solid #f0f1f4;font-size:.8125rem;font-weight:700;color:#374151;background:#fafaf8}
.stk-chat-live{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#047857;background:#ecfdf5;padding:.2rem .5rem;border-radius:999px}
.stk-chat-thread{flex:1;overflow-y:auto;padding:1rem;min-height:280px;background:linear-gradient(180deg,#fafaf8 0%,#fff 100%)}
.stk-chat-thread-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#9ca3af;font-size:.875rem;min-height:220px;padding:1.5rem}
.stk-msg-row{display:flex;align-items:flex-end;gap:.55rem;margin-bottom:.85rem;max-width:92%}
.stk-msg-row--mine{margin-left:auto;flex-direction:row}
.stk-msg-row--other{margin-right:auto}
.stk-msg-avatar{width:32px;height:32px;border-radius:50%;background:#e5e7eb;color:#374151;font-size:.68rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stk-msg-avatar--mine{background:#111827;color:#fff}
.stk-msg-avatar--platform{background:#eef2ff;color:#4338ca}
.stk-msg{max-width:100%;min-width:0}
.stk-msg--mine .stk-msg-body{background:#111827;color:#fff;border-radius:14px 14px 4px 14px}
.stk-msg--other .stk-msg-body{background:#fff;border:1px solid #e5e7eb;color:#111827;border-radius:14px 14px 14px 4px}
.stk-msg--platform .stk-msg-body{background:#eef2ff;border:1px solid #c7d2fe;color:#312e81;border-radius:14px 14px 14px 4px}
.stk-msg-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem .5rem;margin-bottom:.25rem;font-size:.7rem;color:#6b7280}
.stk-msg-head strong{color:#111827;font-size:.75rem}
.stk-msg-row--mine .stk-msg-head{justify-content:flex-end}
.stk-msg-row--mine .stk-msg-head strong{color:#374151}
.stk-msg-role{color:#9ca3af}
.stk-msg-head time{margin-left:auto;font-variant-numeric:tabular-nums}
.stk-msg-body{padding:.6rem .8rem;font-size:.875rem;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.stk-chat-footer{display:flex;gap:.65rem;align-items:flex-end;padding:.85rem 1rem;border-top:1px solid #f0f1f4;background:#fff}
.stk-chat-footer textarea{flex:1;min-height:48px;max-height:120px;resize:vertical;padding:.65rem .75rem;border:1px solid #d1d5db;border-radius:12px;font-size:.875rem;font-family:inherit;line-height:1.4}
.stk-chat-footer textarea:focus{outline:2px solid #111827;border-color:#111827}
.stk-chat-send{display:inline-flex;align-items:center;gap:.4rem;padding:.65rem 1rem;border:none;border-radius:12px;background:#111827;color:#fff;font-size:.8125rem;font-weight:700;cursor:pointer;flex-shrink:0}
.stk-chat-send:hover:not(:disabled){background:#1f2937}
.stk-chat-send:disabled{opacity:.5;cursor:not-allowed}
.stk-chat-send-err{margin:0 1rem .5rem}
.stk-chat-readonly{padding:.85rem 1rem;border-top:1px solid #f0f1f4;font-size:.8125rem;color:#6b7280;background:#fafaf8;text-align:center}
`;
