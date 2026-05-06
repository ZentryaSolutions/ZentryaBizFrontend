/** Billing workspace (tabs + left cart + right summary) — scoped styles. */
export const billingWorkspaceStyles = `
.bil2{max-width:100%;padding:0;background:#f2f1ed;color:#14120e;font-family:'DM Sans',Inter,system-ui,sans-serif}
.bil2 *,.bil2 *::before,.bil2 *::after{box-sizing:border-box}
.bil2 button{cursor:pointer;font-family:inherit}
.bil2 input,.bil2 select,.bil2 textarea{font-family:inherit;color:#14120e}
.bil2-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 14px;border-radius:12px;margin:12px 14px;font-size:14px}

/* Tabbar */
.bil2-tabbar{height:44px;background:#f5f3ee;border-bottom:1px solid #e8e5df;display:flex;align-items:stretch;padding-left:12px;flex-shrink:0;overflow-x:auto;overflow-y:hidden}
.bil2-tabbar::-webkit-scrollbar{height:0}
.bil2-tab{display:flex;align-items:center;padding:0 10px 0 11px;gap:7px;min-width:158px;max-width:220px;flex-shrink:0;cursor:pointer;border-right:1px solid #e5e3de;transition:background .1s;position:relative}
.bil2-tab:hover:not(.active){background:#ede9e3}
.bil2-tab.active{background:#fff;border-top:1px solid #e5e3de;border-left:1px solid #e5e3de;border-right:1px solid #e5e3de;border-bottom:2.5px solid #4f46e5;margin-bottom:-1px;z-index:1}
.bil2-tabdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;background:#d4cfc8}
.bil2-tabinfo{flex:1;min-width:0}
.bil2-tablabel{font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#6b6760}
.bil2-tab.active .bil2-tablabel{color:#14120e}
.bil2-tabsub{font-size:10px;color:#9c9890;margin-top:1px;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:6px}
.bil2-creditbadge{background:#fef2f2;color:#dc2626;font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:4px}
.bil2-tabsep{width:1px;background:#e5e3de;margin:9px 8px;flex-shrink:0}
.bil2-newtab{display:flex;align-items:center;gap:6px;padding:0 13px;color:#6b6760;flex-shrink:0;border:none;background:transparent;font-size:12px;font-weight:700;transition:color .12s}
.bil2-newtab:hover{color:#4f46e5}
.bil2-clock{margin-left:auto;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;padding:0 14px;gap:2px}
.bil2-ctime{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:14px;font-weight:900;color:#14120e;letter-spacing:-.2px;line-height:1}
.bil2-cdate{font-size:10.5px;color:#9c9890;line-height:1.1}

/* Billing area */
.bil2-area{height:calc(100vh - 52px - 44px);display:flex;overflow:hidden}
@media(max-width:1100px){.bil2-area{height:auto;min-height:calc(100vh - 52px - 44px);flex-direction:column}}

.bil2-left{flex:1;min-width:0;display:flex;flex-direction:column;padding:14px;gap:11px;background:#f2f1ed;overflow:hidden}
.bil2-searchcard{background:#fff;border-radius:12px;border:1px solid #e8e5df;padding:11px 12px;position:relative;flex-shrink:0}
.bil2-srchrow{position:relative;display:flex;align-items:center}
.bil2-srchico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#b0aca4;pointer-events:none;display:flex}
.bil2-srchin{width:100%;padding:10px 36px 10px 36px;border:1px solid #e8e5df;border-radius:9px;background:#f8f7f4;font-size:13.5px;outline:none;transition:all .18s}
.bil2-srchin:focus{border-color:#4f46e5;background:#fff;box-shadow:0 0 0 3px rgba(79,70,229,.09)}
.bil2-srchin::placeholder{color:#c4c0b8}
.bil2-drop{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:300;background:#fff;border-radius:12px;border:1px solid #e5e3de;box-shadow:0 12px 40px rgba(0,0,0,.11);overflow:hidden}
.bil2-droprow{display:flex;align-items:center;padding:9px 13px;gap:10px;cursor:pointer;border-bottom:1px solid #f5f3ef;transition:background .1s}
.bil2-droprow:last-child{border-bottom:none}
.bil2-droprow:hover,.bil2-droprow.hi{background:#f8f7f4}
.bil2-drthumb{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:#f1f5f9;color:#475569}
.bil2-drname{font-size:13px;font-weight:600;color:#14120e}
.bil2-drsku{font-size:10.5px;color:#b0aca4;margin-top:1px}
.bil2-drprice{font-size:13px;font-weight:800;color:#14120e;font-variant-numeric:tabular-nums;text-align:right}
.bil2-drstock{font-size:10px;color:#9c9890;text-align:right;margin-top:1px}
.bil2-dropempty{padding:14px;text-align:center;font-size:13px;color:#b0aca4}

.bil2-items{background:#fff;border-radius:12px;border:1px solid #e8e5df;flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0}

/* Customer bar */
.bil2-custbar{padding:10px 13px;border-bottom:1px solid #f4f2ee;display:flex;flex-direction:column;gap:8px;flex-shrink:0}
.bil2-crow{display:flex;align-items:center;gap:8px}
.bil2-cico{color:#b0aca4;display:flex;align-items:center;flex-shrink:0}
.bil2-clbl{font-size:12px;color:#9c9890;flex-shrink:0}
.bil2-combowrap{position:relative;flex:1;min-width:0}
.bil2-comboinp{width:100%;padding:6px 30px 6px 10px;border:1px solid #e5e3de;border-radius:8px;font-size:13px;background:#f8f7f4;outline:none;cursor:pointer;transition:all .15s}
.bil2-comboinp:focus{border-color:#4f46e5;background:#fff;box-shadow:0 0 0 3px rgba(79,70,229,.09)}
.bil2-comboinp::placeholder{color:#c4c0b8}
.bil2-comboarrow{position:absolute;right:9px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9c9890}
.bil2-cdrop{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:400;background:#fff;border-radius:10px;border:1px solid #e5e3de;box-shadow:0 10px 34px rgba(0,0,0,.1);overflow:hidden}
.bil2-cdrow{display:flex;align-items:center;padding:9px 12px;gap:9px;cursor:pointer;border-bottom:1px solid #f5f3ef;transition:background .1s}
.bil2-cdrow:last-child{border-bottom:none}
.bil2-cdrow:hover{background:#f8f7f4}
.bil2-cdav{width:28px;height:28px;border-radius:50%;background:#eef2ff;color:#4f46e5;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bil2-cdname{font-size:13px;font-weight:600;color:#14120e}
.bil2-cdphone{font-size:11px;color:#9c9890;margin-top:1px}
.bil2-cddue{font-size:11.5px;font-weight:800;padding:2px 7px;border-radius:5px;flex-shrink:0}
.bil2-cddue.has{background:#fef2f2;color:#dc2626}
.bil2-cddue.none{background:#f0fdf4;color:#15803d}
.bil2-cdcreate{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;background:#fafafe;transition:background .1s;border-top:1px solid #f0eee9}
.bil2-cdcreate:hover{background:#f0f0fe}
.bil2-cdcreateico{width:28px;height:28px;border-radius:50%;background:#eef2ff;border:1.5px dashed #818cf8;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#4f46e5}
.bil2-cdcreatelbl{font-size:13px;font-weight:700;color:#4f46e5}
.bil2-itemcount{margin-left:auto;font-size:11px;color:#b0aca4;flex-shrink:0}

/* Items table */
.bil2-thead{display:grid;grid-template-columns:1fr 104px 110px 96px 28px;padding:8px 13px;border-bottom:1px solid #f4f2ee;flex-shrink:0}
.bil2-th{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#b0aca4}
.bil2-scroll{flex:1;overflow-y:auto}
.bil2-row{display:grid;grid-template-columns:1fr 104px 110px 96px 28px;align-items:center;padding:10px 13px;border-bottom:1px solid #f8f7f3;transition:background .1s}
.bil2-row:last-child{border-bottom:none}
.bil2-row:hover{background:#fafaf8}
.bil2-itname{font-size:13px;font-weight:600;color:#14120e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bil2-itsku{font-size:10px;color:#c4c0b8;margin-top:1px}
.bil2-qtywrap{display:flex;align-items:center;justify-content:center;gap:3px}
.bil2-qtybtn{width:22px;height:22px;border-radius:6px;border:1px solid #e5e3de;background:#fff;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;color:#6b6760;padding:0;transition:all .1s}
.bil2-qtybtn:hover{background:#f5f3ef;border-color:#c4c0b8}
.bil2-qtynum{width:44px;height:22px;border:1px solid #e5e3de;border-radius:5px;font-size:12px;font-weight:600;text-align:center;background:#fff;outline:none;font-variant-numeric:tabular-nums}
.bil2-qtynum:focus{border-color:#4f46e5}
.bil2-pricewrap{display:flex;align-items:center;justify-content:center;gap:6px}
.bil2-ptype{height:28px;border:1px solid #e5e3de;border-radius:7px;padding:0 8px;font-size:12px;background:#fff;color:#6b6760;font-weight:700}
.bil2-price{width:84px;height:28px;border:1px solid #e5e3de;border-radius:7px;font-size:12.5px;text-align:center;background:#fff;outline:none;font-variant-numeric:tabular-nums}
.bil2-price:focus{border-color:#4f46e5}
.bil2-total{font-size:13px;font-weight:700;text-align:right;padding-right:4px;font-variant-numeric:tabular-nums}
.bil2-del{width:24px;height:24px;border-radius:5px;border:none;background:transparent;font-size:16px;line-height:1;color:#c4c0b8;display:flex;align-items:center;justify-content:center;padding:0;transition:all .1s}
.bil2-del:hover{background:#fef2f2;color:#ef4444}
.bil2-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:7px;text-align:center;flex:1}
.bil2-emptyt{font-size:13px;color:#b0aca4}
.bil2-emptys{font-size:11.5px;color:#c4c0b8}
.bil2-kbd{display:inline-block;padding:1px 6px;background:#f0eee9;border:1px solid #e5e3de;border-radius:4px;font-size:10.5px;font-weight:800;color:#6b6760}
.bil2-foot{padding:10px 13px;border-top:1px solid #f4f2ee;display:flex;justify-content:flex-end;align-items:center;gap:10px;flex-shrink:0}
.bil2-footlbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#b0aca4}
.bil2-footval{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;color:#14120e}

/* Right panel */
.bil2-right{width:308px;flex-shrink:0;background:#fff;border-left:1px solid #e8e5df;display:flex;flex-direction:column;overflow-y:auto}
@media(max-width:1100px){.bil2-right{width:auto;border-left:none;border-top:1px solid #e8e5df}}
.bil2-invhd{padding:13px 17px 11px;border-bottom:1px solid #f4f2ee;flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
.bil2-invnum{font-size:12px;font-weight:700;color:#9c9890}
.bil2-ist{font-size:11px;font-weight:800;padding:3px 9px;border-radius:20px}
.bil2-ist.draft{background:#f4f3ef;color:#9c9890}
.bil2-ist.saved{background:#f0fdf4;color:#15803d}
.bil2-ist.credit{background:#fef2f2;color:#dc2626}
.bil2-rp{padding:14px 17px;display:flex;flex-direction:column;gap:10px;flex:1}
.bil2-seclbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#b0aca4}
.bil2-payrow{display:flex;gap:6px;flex-wrap:wrap}
.bil2-pt{display:flex;align-items:center;gap:6px;padding:6px 11px;border-radius:8px;border:1.5px solid #e5e3de;background:#f8f7f4;font-size:12px;font-weight:700;color:#6b6760;transition:all .15s}
.bil2-pt.on{border-color:#4f46e5;background:#eef2ff;color:#4f46e5}
.bil2-pt:hover:not(.on){background:#f0eeea;border-color:#d4d0c8}
.bil2-sep{height:1px;background:#f4f2ee;flex-shrink:0}
.bil2-cmrow{display:flex;gap:6px}
.bil2-cm{flex:1;padding:7px 10px;border-radius:8px;border:1.5px solid #e5e3de;background:#f8f7f4;font-size:12px;font-weight:700;color:#6b6760;transition:all .15s}
.bil2-cm.on{border-color:#dc2626;background:#fef2f2;color:#dc2626}
.bil2-cm:hover:not(.on){background:#f0eeea}
.bil2-banner{background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:10px 12px;display:flex;align-items:flex-start;gap:8px}
.bil2-banner strong{display:block;font-size:12.5px;font-weight:800;color:#b91c1c}
.bil2-banner span{display:block;font-size:11.5px;color:#dc2626;margin-top:1px}
.bil2-sumrow{display:flex;justify-content:space-between;align-items:center}
.bil2-sl{font-size:13px;color:#6b6760}
.bil2-sv{font-size:13px;font-weight:700;color:#14120e;font-variant-numeric:tabular-nums}
.bil2-discctrl{display:flex;align-items:center;gap:6px}
.bil2-disctog{font-size:11px;padding:3px 7px;border-radius:6px;border:1px solid #e5e3de;background:#f8f7f4;color:#6b6760;font-weight:900}
.bil2-discinp{width:68px;text-align:right;border:1px solid #e5e3de;border-radius:7px;padding:4px 8px;font-size:13px;background:#fff;outline:none;font-variant-numeric:tabular-nums}
.bil2-discinp:focus{border-color:#4f46e5}
.bil2-grand{background:#4f46e5;border-radius:10px;padding:13px 15px;display:flex;justify-content:space-between;align-items:center}
.bil2-grand span:first-child{font-size:12px;font-weight:700;color:rgba(255,255,255,.75)}
.bil2-grand span:last-child{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.bil2-paidrow{display:flex;justify-content:space-between;align-items:center}
.bil2-paidinp{width:106px;text-align:right;border:1px solid #e5e3de;border-radius:7px;padding:5px 9px;font-size:13px;font-weight:800;background:#fff;outline:none;font-variant-numeric:tabular-nums}
.bil2-paidinp:focus{border-color:#4f46e5}
.bil2-paidinp:disabled{background:#f4f3ef;color:#9c9890;cursor:not-allowed}
.bil2-qp{display:flex;gap:5px;flex-wrap:wrap}
.bil2-qpbtn{padding:4px 10px;border-radius:7px;border:1px solid #e5e3de;background:#f8f7f4;font-size:11.5px;font-weight:700;color:#4a4740}
.bil2-qpbtn:hover{background:#eef2ff;color:#4f46e5;border-color:#c7d2fe}
.bil2-bal{border-radius:9px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center}
.bil2-bal .lbl{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
.bil2-bal .val{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:17px;font-weight:900;letter-spacing:-.4px;font-variant-numeric:tabular-nums}
.bil2-bal.zero{background:#f4f3ef}.bil2-bal.zero .lbl,.bil2-bal.zero .val{color:#9c9890}
.bil2-bal.due{background:#fff7ed}.bil2-bal.due .lbl{color:#b45309}.bil2-bal.due .val{color:#d97706}
.bil2-bal.change{background:#f0fdf4}.bil2-bal.change .lbl{color:#166534}.bil2-bal.change .val{color:#15803d}
.bil2-bal.credit{background:#fef2f2}.bil2-bal.credit .lbl{color:#b91c1c}.bil2-bal.credit .val{color:#dc2626}
.bil2-note{width:100%;height:52px;border:1px solid #e5e3de;border-radius:9px;padding:7px 10px;font-size:12.5px;color:#374151;background:#f8f7f4;resize:none;outline:none}
.bil2-note:focus{border-color:#4f46e5;background:#fff}
.bil2-actions{padding:0 17px 16px;display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.bil2-act{width:100%;padding:11px;border:none;border-radius:10px;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s}
.bil2-save{background:#4f46e5;color:#fff}.bil2-save:hover{background:#4338ca}
.bil2-print{background:#15803d;color:#fff}.bil2-print:hover{background:#166534}
.bil2-cancel{background:transparent;color:#9c9890;border:1px solid #e5e3de}.bil2-cancel:hover{background:#fef2f2;color:#ef4444;border-color:#fca5a5}

/* Full-screen modal overlay */
.bil2-ov{position:fixed;inset:0;z-index:30000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(12,10,22,.52);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.bil2-modal{width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border-radius:18px;background:#fff;box-shadow:0 24px 64px rgba(0,0,0,.16);border:1px solid rgba(226,232,240,.9)}
.bil2-mhd{padding:18px 18px 12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.bil2-mt{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:18px;font-weight:900;color:#14120e;letter-spacing:-.3px}
.bil2-ms{font-size:12.5px;color:#9c9890;margin-top:2px}
.bil2-mx{width:28px;height:28px;border-radius:7px;border:none;background:#f4f3ef;display:flex;align-items:center;justify-content:center;color:#6b6760}
.bil2-mx:hover{background:#ece9e3;color:#14120e}
.bil2-mbody{padding:0 18px 16px}
.bil2-fi{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.bil2-fi label{font-size:11.5px;font-weight:800;color:#4a4740}
.bil2-fi input{padding:9px 11px;border:1.5px solid #e8e5df;border-radius:9px;font-size:13.5px;background:#faf9f6;outline:none}
.bil2-fi input:focus{border-color:#4f46e5;background:#fff;box-shadow:0 0 0 3px rgba(79,70,229,.09)}
.bil2-mft{padding:0 18px 18px;display:flex;justify-content:flex-end;gap:9px}
.bil2-btnc{padding:9px 16px;border:1px solid #e8e5df;border-radius:9px;background:#fff;font-size:13px;font-weight:800;color:#6b6760}
.bil2-btnc:hover{background:#f8f6f2}
.bil2-btns{padding:9px 20px;border:none;border-radius:9px;background:#14120e;color:#fff;font-size:13px;font-weight:800}
.bil2-btns:hover{background:#2a2820}
`;

