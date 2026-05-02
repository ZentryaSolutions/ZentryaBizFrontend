export const inventoryCustomStyles = `
.inv3{max-width:100%!important;padding:4px 16px 24px!important;background:#f6f5f1!important;color:#111827;font-family:Manrope,Inter,system-ui,-apple-system,sans-serif}
.inv3-breadcrumb{display:flex;align-items:center;gap:8px;margin-bottom:4px;min-height:0}
.inv3-breadcrumbPill{display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e1d6;background:#fff;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:500;color:#374151;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.inv3-breadcrumbPill:hover{background:#faf9f5;border-color:#ddd8cc}
.inv3-topCards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:12px}
.inv3-card{background:#fff;border:1px solid #ece9df;border-radius:14px;padding:14px 14px 12px;box-shadow:0 2px 10px rgba(17,24,39,.03)}
.inv3-cardHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.inv3-pill{font-size:10px;font-weight:700;color:#22a06b;background:#eefaf3;border-radius:999px;padding:2px 8px}
.inv3-cardVal{font-size:18px;font-weight:700;line-height:1.1;color:#0f172a}
.inv3-cardLbl{margin-top:3px;font-size:14px;font-weight:600;color:#5f6368}
.inv3-cardSub{margin-top:4px;font-size:12px;color:#adb1b7}
.inv3-headingRow{display:flex;align-items:flex-start;justify-content:space-between;margin:6px 0 8px}
.inv3-title{
  font-family:'Bricolage Grotesque',sans-serif;
  font-size:26px;
  font-weight:700;
  color:#14120e;
  letter-spacing:-.6px;
  line-height:1;
  margin:0 0 4px 0;
}
.inv3-subtitle{margin:0;font-size:13px;color:#7b8088;font-weight:500}
.inv3-addBtn{height:42px;border:none;border-radius:12px;background:#111;color:#fff;padding:0 16px;font-size:15px;font-weight:700;display:inline-flex;align-items:center;gap:8px;cursor:pointer}
.inv3-filterBar{display:grid;grid-template-columns:1.5fr .42fr auto auto auto;gap:10px;align-items:center;background:#fff;border:1px solid #ece9df;border-radius:14px;padding:10px;margin-bottom:12px}
.inv3-input,.inv3-select{height:38px;border:1px solid #ece9df;border-radius:10px;padding:0 12px;font-size:13px;background:#fffdf9;color:#444}
.inv3-chipBtn{height:38px;border:1px solid #ece9df;background:#fffdf9;border-radius:10px;padding:0 12px;font-size:13px;color:#5b5e66;display:inline-flex;align-items:center;gap:8px}
.inv3-listShell{background:#fff;border:1px solid #ece9df;border-radius:14px;overflow:hidden}
.inv3-listHead{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #f0ede4}
.inv3-listHead h3{
  margin:0 0 4px 0;
  font-family:'Bricolage Grotesque',sans-serif;
  font-size:26px;
  font-weight:700;
  color:#14120e;
  letter-spacing:-.6px;
  line-height:1;
}
.inv3-listCount{font-size:13px;color:#a0a39c}
.inv3 .inv2-table-scroll{padding:0!important}
.inv3 .inv2-table thead th{background:#fbfaf6!important;border-bottom:1px solid #f0ede4!important;font-size:12px!important;font-weight:700!important;color:#a4a39f!important;padding:10px 12px!important;letter-spacing:.03em}
.inv3 .inv2-table td{padding:9px 12px!important;border-bottom:1px solid #f5f1e8!important;font-size:12px!important;color:#3f4450;font-weight:500}
.inv3 .inv2-table tbody tr:hover td{background:#f8f6ef!important}
.inv3 .inv2-cell-name{font-size:13px;font-weight:700;color:#111827}
.inv3 .inv2-chip--fast{background:#edeaff;color:#5957db}
.inv3-stockWrap{display:flex;align-items:center;gap:8px}
.inv3-stockBar{width:56px;height:5px;border-radius:999px;background:#ece8de;overflow:hidden}
.inv3-stockBar > span{display:block;height:100%;background:#3ccb72}
.inv3-status{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:8px;font-size:12px;font-weight:700}
.inv3-status--ok{background:#ecfbf1;color:#0f9f58}
.inv3-status--low{background:#fff7e8;color:#c07a16}
.inv3-status--out{background:#fff0f0;color:#d04242}
.inv3 .inv2-actions{white-space:nowrap}
.inv3 .inv2-action{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:0;margin-left:6px;border-radius:8px}
.inv3 .inv2-pagination{background:#fff!important;border-top:1px solid #f0ede4!important}
@media (max-width:1200px){.inv3-topCards{grid-template-columns:repeat(2,minmax(0,1fr))}.inv3-filterBar{grid-template-columns:1fr 1fr auto}.inv3-title{font-size:24px}.inv3-listHead h3{font-size:24px}.inv3-subtitle{font-size:12px}.inv3 .inv2-table td{font-size:11.5px!important}.inv3 .inv2-table thead th{font-size:11px!important}}
`;
