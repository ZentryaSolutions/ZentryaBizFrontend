export const settingsExtraStyles = `
*,*::before,*::after{box-sizing:border-box;}
.zb-set{font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f2f1ed;color:#14120e;-webkit-font-smoothing:antialiased;}
.zb-set button{cursor:pointer;font-family:inherit;}
.zb-set input,.zb-set select,.zb-set textarea{font-family:inherit;color:#14120e;}
.zb-set ::-webkit-scrollbar{width:4px;}
.zb-set ::-webkit-scrollbar-thumb{background:#d4cfc8;border-radius:4px;}

/* content */
.zb-set .content{padding:18px 6px 40px;display:flex;gap:24px;align-items:flex-start;}
.zb-set .settings-nav{width:220px;flex-shrink:0;background:#fff;border:1px solid #e8e5df;border-radius:16px;padding:12px 10px;position:sticky;top:80px;}
.zb-set .sn-sect{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#b0aca4;padding:0 10px;margin:12px 0 5px;}
.zb-set .sn-sect:first-child{margin-top:4px;}
.zb-set .sn-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;font-size:13px;font-weight:600;color:#4a4740;border:none;background:transparent;width:100%;text-align:left;transition:all .12s;cursor:pointer;}
.zb-set .sn-item:hover{background:#f4f3ef;color:#14120e;}
.zb-set .sn-item.on{background:#eef2ff;color:#4f46e5;}
.zb-set .sn-item svg{width:14px;height:14px;flex-shrink:0;opacity:.6;}
.zb-set .sn-item.on svg{opacity:1;}

.zb-set .settings-body{flex:1;min-width:0;}
.zb-set .section{display:none;}
.zb-set .section.on{display:block;animation:zbFadeUp .2s ease both;}
@keyframes zbFadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.zb-set .section-hd{margin-bottom:18px;}
.zb-set .section-title{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:22px;font-weight:900;color:#14120e;letter-spacing:-.5px;margin-bottom:5px;}
.zb-set .section-sub{font-size:13px;color:#9c9890;}

.zb-set .scard{background:#fff;border:1px solid #e8e5df;border-radius:16px;margin-bottom:16px;overflow:hidden;}
.zb-set .scard-hd{padding:18px 24px 16px;border-bottom:1px solid #f4f2ee;}
.zb-set .scard-title{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:15px;font-weight:800;color:#14120e;letter-spacing:-.2px;margin-bottom:3px;}
.zb-set .scard-sub{font-size:12px;color:#9c9890;}
.zb-set .srow{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center;padding:16px 24px;border-bottom:1px solid #f8f7f3;}
.zb-set .srow:last-child{border-bottom:none;}
.zb-set .srow-label{font-size:13.5px;font-weight:800;color:#14120e;margin-bottom:3px;}
.zb-set .srow-desc{font-size:12px;color:#9c9890;line-height:1.5;}
.zb-set .srow-ctrl{display:flex;justify-content:flex-end;align-items:center;}

.zb-set .inp{width:100%;padding:10px 12px;border:1.5px solid #e8e5df;border-radius:9px;font-size:13.5px;color:#14120e;background:#faf9f6;outline:none;transition:all .18s;}
.zb-set .inp:focus{border-color:#4f46e5;background:#fff;box-shadow:0 0 0 3px rgba(79,70,229,.09);}
.zb-set .inp::placeholder{color:#c4c0b8;}
.zb-set .inp-sm{max-width:260px;}
.zb-set .inp-xs{max-width:140px;}
.zb-set textarea.inp{resize:vertical;min-height:80px;}
.zb-set select.inp{cursor:pointer;}
.zb-set .inp[disabled]{opacity:.65;cursor:not-allowed;}

.zb-set .toggle{position:relative;width:40px;height:22px;flex-shrink:0;}
.zb-set .toggle input{opacity:0;width:0;height:0;position:absolute;}
.zb-set .toggle-track{position:absolute;inset:0;background:#e8e5df;border-radius:22px;cursor:pointer;transition:background .2s;}
.zb-set .toggle input:checked+.toggle-track{background:#4f46e5;}
.zb-set .toggle-thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.15);pointer-events:none;}
.zb-set .toggle input:checked~.toggle-thumb{transform:translateX(18px);}

.zb-set .scard-ft{padding:14px 24px;border-top:1px solid #f4f2ee;background:#faf9f6;display:flex;justify-content:flex-end;gap:10px;align-items:center;}
.zb-set .btn-save{padding:9px 22px;border:none;border-radius:10px;background:#14120e;color:#fff;font-size:13px;font-weight:800;transition:all .15s;}
.zb-set .btn-save:hover{background:#2a2820;}
.zb-set .btn-cancel{padding:9px 17px;border:1px solid #e8e5df;border-radius:10px;background:#fff;font-size:13px;font-weight:700;color:#6b6760;transition:all .12s;}
.zb-set .btn-cancel:hover{background:#f8f6f2;}
.zb-set .btn-danger{padding:9px 18px;border:none;border-radius:10px;background:#dc2626;color:#fff;font-size:13px;font-weight:900;transition:all .15s;}
.zb-set .btn-danger:hover{background:#b91c1c;}
.zb-set .btn-indigo{padding:9px 18px;border:none;border-radius:10px;background:#4f46e5;color:#fff;font-size:13px;font-weight:900;transition:all .15s;}
.zb-set .btn-indigo:hover{background:#4338ca;}
.zb-set .btn-outline{padding:8px 16px;border:1.5px solid #e8e5df;border-radius:9px;background:#fff;font-size:13px;font-weight:800;color:#14120e;transition:all .12s;}
.zb-set .btn-outline:hover{background:#f4f3ef;border-color:#d4cfc8;}
.zb-set .btn-save[disabled],.zb-set .btn-indigo[disabled],.zb-set .btn-outline[disabled],.zb-set .btn-danger[disabled]{opacity:.6;cursor:not-allowed;}

.zb-set .danger-card{background:#fff;border:1.5px solid #fecaca;border-radius:16px;margin-top:16px;overflow:hidden;}
.zb-set .danger-hd{padding:16px 24px;border-bottom:1px solid #fef2f2;background:#fef2f2;}
.zb-set .danger-title{font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:14px;font-weight:900;color:#dc2626;letter-spacing:-.1px;}
.zb-set .danger-sub{font-size:12px;color:#ef4444;margin-top:2px;}
.zb-set .danger-row{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #fef2f2;gap:16px;}
.zb-set .danger-row:last-child{border-bottom:none;}
.zb-set .danger-row-label{font-size:13.5px;font-weight:900;color:#14120e;}
.zb-set .danger-row-desc{font-size:12px;color:#9c9890;margin-top:2px;}

.zb-set .badge{display:inline-block;font-size:11.5px;font-weight:900;padding:3px 10px;border-radius:20px;}
.zb-set .bg-green{background:#f0fdf4;color:#15803d;}
.zb-set .bg-amber{background:#fffbeb;color:#b45309;}
.zb-set .bg-indigo{background:#eef2ff;color:#4f46e5;}
.zb-set .bg-gray{background:#f4f3ef;color:#6b6760;}
.zb-set .bg-red{background:#fef2f2;color:#b91c1c;}

.zb-set .list-item{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid #f8f7f3;gap:12px;}
.zb-set .list-item:last-child{border-bottom:none;}
.zb-set .list-item-left{display:flex;align-items:center;gap:10px;min-width:0;}
.zb-set .list-item-icon{width:32px;height:32px;border-radius:8px;background:#eef2ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.zb-set .list-item-name{font-size:13.5px;font-weight:900;color:#14120e;}
.zb-set .list-item-sub{font-size:12px;color:#9c9890;margin-top:1px;}
.zb-set .list-item-acts{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.zb-set .la{width:28px;height:28px;border-radius:7px;border:1px solid #e8e5df;background:#fff;display:flex;align-items:center;justify-content:center;color:#6b6760;transition:all .12s;}
.zb-set .la:hover{background:#f4f3ef;color:#14120e;}
.zb-set .la.del:hover{background:#fef2f2;color:#dc2626;border-color:#fecaca;}

.zb-set .user-row{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid #f8f7f3;gap:12px;}
.zb-set .user-row:last-child{border-bottom:none;}
.zb-set .user-av{width:34px;height:34px;border-radius:50%;background:#4f46e5;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.zb-set .user-name{font-size:13.5px;font-weight:900;color:#14120e;}
.zb-set .user-email{font-size:12px;color:#9c9890;}

.zb-set .bill-table{width:100%;border-collapse:collapse;font-size:13px;}
.zb-set .bill-table th{text-align:left;padding:10px 16px;font-size:10px;font-weight:900;color:#b0aca4;letter-spacing:.07em;text-transform:uppercase;border-bottom:1px solid #f4f2ee;background:#faf9f6;}
.zb-set .bill-table td{padding:12px 16px;border-bottom:1px solid #f8f7f3;color:#4a4740;}
.zb-set .bill-table tr:last-child td{border-bottom:none;}

.zb-set .tw{position:fixed;bottom:20px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:7px;}
.zb-set .toast{background:#fff;border:1px solid #e8e5df;border-radius:11px;padding:11px 15px;display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700;color:#14120e;box-shadow:0 4px 18px rgba(0,0,0,.09);transform:translateX(120%);transition:transform .3s cubic-bezier(.22,1,.36,1);}
.zb-set .toast.show{transform:translateX(0);}
.zb-set .t-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}

@media(max-width:900px){.zb-set .content{flex-direction:column;}.zb-set .settings-nav{width:100%;position:static;top:auto;}}
`;

