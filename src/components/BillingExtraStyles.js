export const billingExtraStyles = `
/* ===== Billing UI additions to match reference ===== */

*,*::before,*::after{box-sizing:border-box;}
.billing-container{
  font-family:"DM Sans",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:#f2f1ed;
  color:#14120e;
  max-width:none;
  padding:14px;
}

/* Toast */
.zb-toast{
  position:fixed;
  right:20px;
  bottom:20px;
  z-index:2000;
  background:#fff;
  border:1px solid #e8e5df;
  border-radius:11px;
  padding:11px 15px;
  font-size:13px;
  font-weight:600;
  color:#14120e;
  box-shadow:0 4px 18px rgba(0,0,0,.09);
}
.zb-toast.info{border-color:#c7d2fe;}
.zb-toast.success{border-color:#bbf7d0;color:#15803d;}
.zb-toast.error{border-color:#fecaca;color:#dc2626;}

/* Tabbar (matches HTML) */
.billing-tabs-bar{margin:0;padding:0;}
.billing-tabs-left{
  height:44px;
  background:#f5f3ee;
  border-bottom:1px solid #e8e5df;
  display:flex;
  align-items:stretch;
  padding-left:12px;
  overflow-x:auto;
  overflow-y:hidden;
  gap:0;
}
.billing-tabs-left::-webkit-scrollbar{height:0;}

.billing-tab{
  display:flex;
  align-items:center;
  gap:10px;
  min-width:158px;
  max-width:190px;
  flex-shrink:0;
  cursor:pointer;
  border:none;
  border-right:1px solid #e5e3de;
  background:transparent;
  border-radius:0;
  padding:0 10px 0 11px;
  position:relative;
  box-shadow:none;
}
.billing-tab:hover:not(.active){background:#ede9e3;}
.billing-tab.active{
  background:#fff;
  border-top:1px solid #e5e3de;
  border-left:1px solid #e5e3de;
  border-right:1px solid #e5e3de;
  border-bottom:2.5px solid #4f46e5;
  margin-bottom:-1px;
  z-index:1;
}
.billing-tab-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;background:#d4cfc8;}
.billing-tab-info{flex:1;min-width:0;}
.billing-tab-title{
  font-size:11.5px;
  font-weight:600;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  color:#6b6760;
}
.billing-tab.active .billing-tab-title{color:#14120e;}
.billing-tab-sub{
  font-size:10px;
  color:#9c9890;
  margin-top:1px;
  font-variant-numeric:tabular-nums;
  display:flex;
  align-items:center;
  gap:6px;
  font-weight:500;
  text-transform:none;
  letter-spacing:0;
}
.billing-credit-badge{
  background:#fef2f2;
  color:#dc2626;
  font-size:9.5px;
  font-weight:600;
  padding:1px 5px;
  border-radius:4px;
}
.billing-tab-x{
  width:17px;height:17px;border-radius:4px;border:none;background:transparent;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;color:#b0aca4;line-height:1;padding:0;
}
.billing-tab-x:hover{background:#fde8e8;color:#e53e3e;}
.billing-tab-sep{width:1px;background:#e5e3de;margin:9px 8px;flex-shrink:0;}
.billing-tab-new{
  display:flex;align-items:center;gap:6px;
  padding:0 13px;
  color:#6b6760;
  flex-shrink:0;
  border:none;
  background:transparent;
  font-size:12px;
  font-weight:600;
  min-width:auto;
}
.billing-tab-new:hover{color:#4f46e5;background:transparent;}

/* Layout: left + right panel */
.billing-area{display:flex;gap:0;overflow:hidden;}
.left-col{
  flex:1;min-width:0;
  display:flex;flex-direction:column;
  padding:14px;
  gap:11px;
  background:#f2f1ed;
}
.right-panel{
  width:308px;
  flex-shrink:0;
  background:#fff;
  border-left:1px solid #e8e5df;
  display:flex;
  flex-direction:column;
  overflow:auto;
}

/* Search card */
.billing-search-section{
  background:#fff;
  border-radius:12px;
  border:1px solid #e8e5df;
  padding:11px 12px;
  margin:0;
}
.billing-search-box{
  background:transparent;
  border:none;
  box-shadow:none;
  padding:0;
  position:relative;
}
.billing-search-icon{
  position:absolute;
  left:11px;
  top:50%;
  transform:translateY(-50%);
  color:#b0aca4;
  pointer-events:none;
}
.billing-search-clear{
  position:absolute;
  right:10px;
  top:50%;
  transform:translateY(-50%);
  background:transparent;
  border:none;
  cursor:pointer;
  color:#b0aca4;
  font-size:18px;
  line-height:1;
  padding:2px 5px;
  border-radius:4px;
}
.billing-search-clear:hover{color:#6b6760;}
.billing-search-input{
  width:100%;
  padding:10px 36px 10px 36px;
  border:1px solid #e8e5df;
  border-radius:9px;
  background:#f8f7f4;
  font-size:13.5px;
  outline:none;
}
.billing-search-input:focus{
  border-color:#4f46e5;
  background:#fff;
  box-shadow:0 0 0 3px rgba(79,70,229,.09);
}
.billing-search-input::placeholder{color:#c4c0b8;}
.billing-search-results{
  top:calc(100% + 5px);
  border-radius:12px;
  border:1px solid #e5e3de;
  box-shadow:0 12px 40px rgba(0,0,0,.11);
}
.billing-search-result-item{padding:9px 13px;}

/* Items card */
.billing-items-section{
  background:#fff;
  border-radius:12px;
  border:1px solid #e8e5df;
  box-shadow:none;
  overflow:hidden;
  flex:1;
  min-height:0;
  display:flex;
  flex-direction:column;
}
.billing-section-header{
  background:#fff;
  border-bottom:1px solid #f4f2ee;
  padding:10px 13px;
}
.billing-section-header h3{display:none;}

/* Customer combo row */
.billing-customer-selector-wrapper{
  width:100%;
  display:flex;
  align-items:center;
  gap:8px;
}
.billing-cust-ico{color:#b0aca4;display:flex;align-items:center;flex-shrink:0;}
.billing-cust-label{font-size:12px;color:#9c9890;flex-shrink:0;}
.billing-item-count{margin-left:auto;font-size:11px;color:#b0aca4;flex-shrink:0;}
.billing-customer-dropdown-container{position:relative;flex:1;}
.billing-customer-combo{
  width:100%;
  padding:6px 30px 6px 10px;
  border:1px solid #e5e3de;
  border-radius:8px;
  font-size:13px;
  background:#f8f7f4;
  color:#14120e;
  outline:none;
  transition:all .15s;
}
.billing-customer-combo:focus{
  border-color:#4f46e5;
  background:#fff;
  box-shadow:0 0 0 3px rgba(79,70,229,.09);
}
.billing-customer-combo::placeholder{color:#c4c0b8;}
.billing-dropdown-arrow{
  position:absolute;
  right:9px;
  top:50%;
  transform:translateY(-50%);
  pointer-events:none;
  color:#9c9890;
}
.billing-customer-dropdown{
  left:0;
  right:0;
  width:auto;
  border-radius:10px;
  border:1px solid #e5e3de;
  box-shadow:0 10px 34px rgba(0,0,0,.1);
}
.billing-customer-option{
  display:flex;
  align-items:center;
  gap:9px;
  border-top:1px solid #f5f3ef;
  padding:9px 12px;
}
.billing-customer-avatar{
  width:28px;height:28px;border-radius:50%;
  background:#eef2ff;
  color:#4f46e5;
  font-size:10px;
  font-weight:700;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-shrink:0;
}
.billing-customer-main{flex:1;min-width:0;display:flex;flex-direction:column;}
.billing-customer-name{font-size:13px;font-weight:500;color:#14120e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.billing-customer-meta{font-size:11px;color:#9c9890;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.billing-customer-duechip{
  font-size:11.5px;
  font-weight:600;
  padding:2px 7px;
  border-radius:5px;
  flex-shrink:0;
}
.billing-customer-duechip.has-due{background:#fef2f2;color:#dc2626;}
.billing-customer-duechip.no-due{background:#f0fdf4;color:#15803d;}
.billing-customer-select-trigger{
  width:100%;
  padding:6px 30px 6px 10px;
  border:1px solid #e5e3de;
  border-radius:8px;
  background:#f8f7f4;
  font-size:13px;
}
.billing-customer-select-trigger:hover{background:#f8f7f4;}
.billing-customer-select-trigger:focus-within{
  border-color:#4f46e5;
  background:#fff;
  box-shadow:0 0 0 3px rgba(79,70,229,.09);
}
.billing-items-table-container{flex:1;min-height:0;}
.billing-items-table th{font-size:10px;color:#b0aca4;border-bottom:1px solid #f4f2ee;}
.billing-items-table td{border-bottom:1px solid #f8f7f3;}

/* Customer Due Alert (inside items card) */
.cust-due-alert{
  display:flex;
  align-items:center;
  gap:9px;
  background:#fff7ed;
  border:1px solid #fde68a;
  border-radius:8px;
  padding:8px 11px;
  margin:10px 13px 0;
}
.cda-icon{color:#d97706;flex-shrink:0;display:flex;}
.cda-text{flex:1;min-width:0;}
.cda-name{font-size:12.5px;font-weight:600;color:#92400e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cda-due{font-size:12px;color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cda-clear{
  font-size:11px;
  color:#9c9890;
  padding:3px 7px;
  border-radius:5px;
  border:none;
  background:transparent;
  cursor:pointer;
  transition:background .12s;
  flex-shrink:0;
}
.cda-clear:hover{background:#ffe4b2;}

/* Right panel header + body */
.inv-hd{
  padding:13px 17px 11px;
  border-bottom:1px solid #f4f2ee;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.inv-num{font-size:12px;font-weight:600;color:#9c9890;}
.inv-status{font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;}
.inv-status.draft{background:#f4f3ef;color:#9c9890;}
.inv-status.credit{background:#fef2f2;color:#dc2626;}

.rp-body{padding:14px 17px;display:flex;flex-direction:column;gap:10px;flex:1;}
.sec-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#b0aca4;margin-bottom:8px;}
.rp-sep{height:1px;background:#f4f2ee;flex-shrink:0;}

.pay-type-row{display:flex;gap:6px;flex-wrap:wrap;}
.pt-btn{
  display:flex;align-items:center;gap:5px;
  padding:6px 11px;border-radius:8px;
  border:1.5px solid #e5e3de;background:#f8f7f4;
  font-size:12px;font-weight:500;color:#6b6760;
  transition:all .15s;
}
.pt-btn.on{border-color:#4f46e5;background:#eef2ff;color:#4f46e5;font-weight:600;}
.pt-btn:hover:not(.on){background:#f0eeea;border-color:#d4d0c8;}

.credit-mode-row{display:flex;gap:6px;}
.cm-btn{flex:1;padding:7px 10px;border-radius:8px;border:1.5px solid #e5e3de;background:#f8f7f4;font-size:12px;font-weight:500;color:#6b6760;transition:all .15s;}
.cm-btn.on{border-color:#dc2626;background:#fef2f2;color:#dc2626;font-weight:600;}
.cm-btn:hover:not(.on){background:#f0eeea;}
.cm-btn:disabled{opacity:.55;cursor:not-allowed;}

.credit-banner{background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;}
.cb-t{font-size:12.5px;font-weight:600;color:#b91c1c;}
.cb-s{font-size:11.5px;color:#dc2626;}

.sum-stack{display:flex;flex-direction:column;gap:10px;}
.sum-row{display:flex;justify-content:space-between;align-items:center;}
.sl{font-size:13px;color:#6b6760;}
.sv{font-size:13px;font-weight:500;color:#14120e;font-variant-numeric:tabular-nums;}
.disc-ctrl{display:flex;align-items:center;gap:6px;}
.disc-tog{font-size:11px;padding:3px 7px;border-radius:6px;border:1px solid #e5e3de;background:#f8f7f4;color:#6b6760;font-weight:600;}
.disc-inp{width:68px;text-align:right;border:1px solid #e5e3de;border-radius:7px;padding:4px 8px;font-size:13px;background:#fff;outline:none;font-variant-numeric:tabular-nums;}
.disc-inp:focus{border-color:#4f46e5;}

.grand-block{background:#4f46e5;border-radius:10px;padding:13px 15px;display:flex;justify-content:space-between;align-items:center;}
.gb-lbl{font-size:12px;font-weight:500;color:rgba(255,255,255,.7);}
.gb-val{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:800;color:#fff;letter-spacing:-.5px;font-variant-numeric:tabular-nums;}

.paid-row{display:flex;justify-content:space-between;align-items:center;}
.paid-inp{width:106px;text-align:right;border:1px solid #e5e3de;border-radius:7px;padding:5px 9px;font-size:13px;font-weight:500;background:#fff;outline:none;font-variant-numeric:tabular-nums;}
.paid-inp:focus{border-color:#4f46e5;}

.bal-chip{border-radius:9px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;}
.bal-chip.due{background:#fff7ed;}
.bal-chip.change{background:#f0fdf4;}
.bal-chip.zero{background:#f4f3ef;}
.bal-chip.credit{background:#fef2f2;}
.bc-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
.bal-chip.due .bc-lbl{color:#b45309;}
.bal-chip.change .bc-lbl{color:#166534;}
.bal-chip.zero .bc-lbl{color:#9c9890;}
.bal-chip.credit .bc-lbl{color:#b91c1c;}
.bc-val{font-family:"Bricolage Grotesque",sans-serif;font-size:17px;font-weight:800;letter-spacing:-.4px;font-variant-numeric:tabular-nums;}
.bal-chip.due .bc-val{color:#d97706;}
.bal-chip.change .bc-val{color:#15803d;}
.bal-chip.zero .bc-val{color:#9c9890;}
.bal-chip.credit .bc-val{color:#dc2626;}

.note-ta{width:100%;height:52px;border:1px solid #e5e3de;border-radius:9px;padding:7px 10px;font-size:12.5px;color:#374151;background:#f8f7f4;resize:none;outline:none;transition:all .15s;}
.note-ta:focus{border-color:#4f46e5;background:#fff;}
.note-ta::placeholder{color:#c4c0b8;}

.rp-actions{padding:0 17px 16px;display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
.act-btn{width:100%;padding:11px;border:none;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s;}
.btn-save{background:#4f46e5;color:#fff;}
.btn-save:hover{background:#4338ca;}
.btn-print{background:#15803d;color:#fff;}
.btn-print:hover{background:#166534;}
.btn-cancel{background:transparent;color:#9c9890;border:1px solid #e5e3de;}
.btn-cancel:hover{background:#fef2f2;color:#ef4444;border-color:#fca5a5;}

.billing-summary-title {
  display: grid;
  gap: 0.15rem;
}

.billing-summary-inv {
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 0.01em;
}

.billing-summary-status {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--bill-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.billing-summary-block {
  display: grid;
  gap: 0.45rem;
  padding-bottom: 0.25rem;
}

.billing-block-label {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--bill-muted, #64748b);
}

.billing-toggle-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
}

.billing-toggle-btn {
  border: 1px solid var(--bill-border, #e2e8f0);
  background: #fff;
  color: var(--bill-text, #0f172a);
  border-radius: 10px;
  padding: 0.48rem 0.55rem;
  font-weight: 800;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.billing-toggle-btn:hover {
  transform: translateY(-1px);
  border-color: #cbd5e1;
  background: #f8fafc;
}

.billing-toggle-btn.active {
  border-color: rgba(79, 70, 229, 0.35);
  background: rgba(79, 70, 229, 0.1);
  color: var(--bill-accent, #4f46e5);
}

.billing-toggle-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

/* Right panel: make it closer to screenshot */
.billing-summary-block{padding-bottom:0;border-bottom:none;}
`;

