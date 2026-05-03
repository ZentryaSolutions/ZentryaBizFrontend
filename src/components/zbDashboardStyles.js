import React from 'react';

/** Injected stylesheet (avoids blocked static CSS paths in tooling). */
const ZB_SHELL_AND_DASH_CSS = `
/* shell */
.zb-workspace-shell{font-family:'DM Sans',-apple-system,sans-serif;background:#fdfcf8;color:#14120e;--sidebar-width:220px;--header-height:52px}
/* App root: lock viewport + row; main column scrolls (avoid clipping dashboard below KPIs) */
.zb-workspace-shell.app{height:100vh;max-height:100vh;overflow:hidden;display:flex!important;flex-direction:row!important;align-items:stretch;width:100%}
.zb-workspace-shell .zb-main-col{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;margin-left:220px;overflow:hidden}
@media(max-width:1024px){.zb-workspace-shell .zb-main-col{margin-left:0}}
.zb-workspace-shell .sidebar-backdrop{animation:none!important;transition:none!important}
.zb-workspace-shell .sidebar{top:0;height:100vh;height:100dvh;width:220px!important;max-width:220px!important;background:#fff;border-right:1px solid #e8e5df;box-shadow:none;display:flex;flex-direction:column;overflow:hidden;transition:none!important}
@media(min-width:1025px){
  .zb-workspace-shell aside.sidebar{
    position:fixed!important;left:0!important;top:0!important;bottom:0!important;
    flex:none!important;margin:0!important;
    width:220px!important;max-width:220px!important;z-index:30!important;box-shadow:none
  }
  .zb-workspace-shell aside.sidebar:hover,.zb-workspace-shell aside.sidebar:focus-within{width:220px!important;max-width:220px!important;box-shadow:none!important}
}
.zb-workspace-shell .main-content{margin-left:0;background:#fdfcf8;padding-top:0;flex:1;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
/* Kill legacy "icon rail" collapse: always show full labels (image 2) */
.zb-workspace-shell aside.sidebar .menu-label,.zb-workspace-shell aside.sidebar:not(:hover):not(:focus-within) .menu-label,.zb-workspace-shell aside.sidebar:hover .menu-label,.zb-workspace-shell aside.sidebar:focus-within .menu-label{
  opacity:1!important;max-width:none!important;overflow:visible!important;white-space:normal!important;pointer-events:auto!important;margin:0!important;padding:0!important;display:block!important;
  transition:none!important;transform:none!important
}
.zb-workspace-shell aside.sidebar .menu-item,.zb-workspace-shell aside.sidebar:not(:hover) .menu-item{justify-content:flex-start!important}
/* Sidebar: no motion — kill legacy Sidebar.css transitions/transforms inside rail */
.zb-workspace-shell aside.sidebar,.zb-workspace-shell aside.sidebar *{transition:none!important;animation:none!important}
.zb-workspace-shell .app-header.zb-topbar{position:sticky;top:0;z-index:1200;height:52px;background:#fff;border-bottom:1px solid #e8e5df;display:flex;align-items:center;padding:0 22px;gap:12px}
.zb-workspace-shell .app-header.zb-topbar .header-brand,.zb-workspace-shell .app-header.zb-topbar .header-brandLogo{display:none}
.zb-workspace-shell .zb-tb-myshops{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:1px solid #e5e2db;border-radius:8px;background:transparent;font-size:12px;font-weight:600;color:#6b6760;cursor:pointer;font-family:inherit}
.zb-workspace-shell .zb-tb-divider{width:1px;height:14px;background:#e8e5df}
.zb-workspace-shell .zb-tb-title{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700;color:#14120e}
.zb-workspace-shell .zb-tb-fill{flex:1}
.zb-workspace-shell .zb-tb-live{display:flex;align-items:center;gap:6px;font-size:12px;color:#15803d;font-weight:500}
.zb-workspace-shell .zb-tb-live-dot{width:7px;height:7px;background:#22c55e;border-radius:50%;animation:zb-pulse 2s infinite}
@keyframes zb-pulse{0%,100%{opacity:1}50%{opacity:.45}}
.zb-workspace-shell .header-left{display:flex;align-items:center;gap:12px;flex:0 1 auto}
.zb-workspace-shell .header-menu-toggle{font-size:1rem}
.zb-workspace-shell .notifications-container button.notification-button{width:28px;height:28px;border-radius:50%;background:#f4f3ef;border:none;color:#6b6760}
.zb-workspace-shell .zb-tb-shop-label{font-size:12px;color:#9c9890;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zb-workspace-shell .zb-tb-av-mini{width:28px;height:28px;border-radius:50%;background:#4f46e5;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center}
.zb-sidebar-brand{padding:9px 11px 8px;border-bottom:1px solid #e8e5df;display:flex;align-items:center;gap:9px;flex-shrink:0}
.zb-sb-logo-wrap{width:32px;height:32px;border-radius:8px;background:#fff;border:1px solid #e8e5df;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
.zb-sb-logo-img{width:100%;height:100%;object-fit:contain;padding:2px;display:block}
.zb-sb-logo-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#4f46e5;color:#fff;font-size:13px;font-weight:800;font-family:'Bricolage Grotesque',sans-serif;border:none}
.zb-sb-name{font-family:'DM Sans',-apple-system,sans-serif;font-size:13.5px;font-weight:700;color:#111827;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.02em;line-height:1.2}
.zb-sb-sect{font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:.055em;color:#9ca3af;padding:0 8px;margin:5px 0 3px;line-height:1.15}
.zb-sb-sect:first-of-type{margin-top:1px}
.zb-sb-bottom{padding:6px 8px 8px;border-top:1px solid #f4f2ee;background:#fff;flex-shrink:0}
.zb-sb-user{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:8px;background:#f8f7f4}
.zb-sb-av{width:28px;height:28px;border-radius:50%;background:#4f46e5;color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.zb-sb-meta{flex:1;min-width:0}
.zb-sb-un{font-size:12px;font-weight:600;color:#14120e;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zb-sb-em{font-size:10px;color:#9c9890;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}

/* dashboard page */
.zb-dash{font-family:'DM Sans',sans-serif;padding:22px 24px 60px}
.zb-dash .page-hd{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.zb-dash .ph-title{font-family:'Bricolage Grotesque',sans-serif;font-size:24px;font-weight:800;color:#14120e;letter-spacing:-.6px;margin-bottom:4px}
.zb-dash .ph-sub{font-size:12.5px;color:#9c9890}
.zb-dash .date-badge{font-size:11.5px;font-weight:600;color:#6b6760;background:#fff;border:1px solid #e8e5df;padding:6px 13px;border-radius:9px;display:inline-flex;align-items:center;gap:6px}
.zb-stock-alert{display:flex;align-items:center;gap:12px;background:#fff7ed;border:1.5px solid #fde68a;border-radius:12px;padding:13px 18px;margin-bottom:18px;cursor:pointer;transition:border-color .15s}
.zb-stock-alert:hover{border-color:#f59e0b}
.zb-sa-icon{width:34px;height:34px;border-radius:9px;background:#fef3c7;border:1px solid #fde68a;display:flex;align-items:center;justify-content:center;color:#b45309;flex-shrink:0}
.zb-sa-text{flex:1;font-size:13px;color:#92400e;font-weight:500;line-height:1.45}
.zb-qa-row{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.zb-qa-btn{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:10px;border:1px solid #e8e5df;background:#fff;font-size:13px;font-weight:600;color:#4a4740;font-family:inherit;cursor:pointer}
.zb-qa-btn:hover{border-color:#c4c0b8;color:#14120e}
.zb-qa-primary{background:#14120e;color:#fff;border:none}
.zb-qa-primary:hover{background:#2a2820;color:#fff}
.zb-kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px}
@media(max-width:1100px){.zb-kpi-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.zb-kpi-grid{grid-template-columns:1fr}}
.zb-kpi{background:#fff;border:1px solid #e8e5df;border-radius:16px;padding:16px 18px;position:relative;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,14,.04),0 6px 20px rgba(20,18,14,.06);transition:transform .15s,border-color .15s}
.zb-kpi:hover{border-color:#d4cfc8}
.zb-kpi-stripe{position:absolute;top:0;left:0;right:0;height:3px;border-radius:16px 16px 0 0}
.zb-kpi-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}
.zb-kpi-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center}
.zb-kpi-badge{font-size:10.5px;font-weight:600;padding:3px 7px;border-radius:6px}
.zb-kpi .kpi-badge{font-size:10.5px;font-weight:600;padding:3px 7px;border-radius:6px;display:inline-block;line-height:1.2}
.zb-kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#b0aca4;margin-bottom:5px}
.zb-kpi-val{font-family:'Bricolage Grotesque',sans-serif;font-size:20px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.zb-kpi-sub{font-size:11.5px;color:#9c9890;margin-top:5px}
.zb-kpi-sub.up{color:#15803d}
.zb-card{background:#fff;border:1px solid #e8e5df;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(20,18,14,.04),0 8px 24px rgba(20,18,14,.06)}
.zb-card-hd{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 20px 14px;gap:10px}
.zb-card-t{font-family:'Bricolage Grotesque',sans-serif;font-size:15px;font-weight:700;color:#14120e}
.zb-card-s{font-size:12px;color:#9c9890;margin-top:2px}
.zb-card-link{font-size:12px;font-weight:600;color:#4f46e5;background:none;border:none;cursor:pointer;padding:0;font-family:inherit}
.zb-leg{display:flex;gap:14px;flex-wrap:wrap}
.zb-leg-i{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#6b6760}
.zb-leg-dot{width:8px;height:8px;border-radius:50%}
.zb-chart-box{padding:0 20px 18px}
.zb-chart-h{height:220px;position:relative;width:100%;min-height:200px}
.zb-chart-h canvas{display:block;width:100%!important;height:100%!important}
.zb-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;align-items:start}
@media(max-width:900px){.zb-two{grid-template-columns:1fr}}
.zb-split{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px;align-items:start}
@media(max-width:900px){.zb-split{grid-template-columns:1fr}}
.zb-seller-row{display:grid;grid-template-columns:26px 1fr auto;gap:10px;padding:11px 20px;border-bottom:1px solid #f4f2ee}
.zb-rank{font-size:11px;font-weight:700;color:#b0aca4;text-align:center}
.zb-rank.gold{width:22px;height:22px;border-radius:50%;background:#fff7ed;color:#b45309;display:flex;align-items:center;justify-content:center;margin:0 auto}
.zb-sn{font-size:13px;font-weight:600;color:#14120e}
.zb-sm{font-size:11px;color:#b0aca4;margin-top:1px}
.zb-amt{font-size:13px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.zb-bar-wrap{grid-column:1/-1;padding:0 20px 6px}
.zb-bar-bg{background:#f4f3ef;border-radius:4px;height:4px;overflow:hidden}
.zb-bar-f{height:4px;border-radius:4px}
.zb-mini{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e8e5df}
.zb-mini>div{background:#f8f7f4;padding:14px;text-align:center}
.zb-mini .v{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;font-weight:700;font-variant-numeric:tabular-nums}
.zb-mini .l{font-size:10px;font-weight:600;color:#9c9890;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

.zb-workspace-shell .sidebar .sidebar-nav{padding:6px 8px 8px;flex:1;overflow-y:auto;overflow-x:hidden;background:#fff;min-height:0}
.zb-workspace-shell .sidebar-nav .menu-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0}
.zb-workspace-shell .sidebar-nav .menu-list>li{margin:0!important;padding:0!important}
/* Per-item hover only: kill legacy rail rules that transition every label when sidebar:hover */
.zb-workspace-shell .sidebar-nav .menu-item{
  justify-content:flex-start;gap:8px;background:transparent;border:none;width:100%;
  border-radius:7px;font-size:12.5px;font-weight:500;color:#4b5563;text-align:left;
  cursor:pointer;margin:0;padding:4px 9px;font-family:inherit;line-height:1.25;
  transition:none!important;transform:none!important
}
.zb-workspace-shell .sidebar-nav .menu-item:hover{background:#f4f3ef;color:#14120e}
.zb-workspace-shell .sidebar-nav .menu-item.active{background:#eef2ff;color:#4f46e5;font-weight:600;box-shadow:inset 3px 0 0 #4f46e5}
.zb-workspace-shell .sidebar-nav .menu-label{display:block;font-size:12.5px;transition:none!important;transform:none!important}
.zb-workspace-shell .sidebar-nav .menu-icon{opacity:.78;flex-shrink:0;width:1.4rem;height:1.4rem}
.zb-workspace-shell .sidebar-nav .menu-item:not(:hover):not(.active) .menu-icon{transform:none!important}
.zb-workspace-shell .sidebar-nav .menu-item:hover .menu-icon{
  background:rgba(79,70,229,.06);transform:none!important;opacity:.95
}
.zb-workspace-shell .sidebar-nav .menu-item.active .menu-icon{opacity:1;color:#4f46e5;background:rgba(79,70,229,.1);transform:none!important}
.zb-workspace-shell .sidebar-nav .menu-icon svg{width:15px;height:15px}
.zb-workspace-shell .sidebar-nav .menu-item::before{transition:none!important}
.zb-workspace-shell .sidebar-nav .menu-item:not(:hover):not(.active)::before{height:0!important;opacity:0!important}
.zb-workspace-shell .sidebar-nav .menu-item:hover:not(.active)::before{height:34%!important;opacity:.22!important}
.zb-workspace-shell .sidebar-nav .menu-item.active::before{height:56%!important;opacity:1!important}
.zb-workspace-shell .sidebar-nav .menu-item:hover{transform:none!important}

.zb-sb-logout{border:none;background:transparent;display:flex;color:#b0aca4;border-radius:5px;width:26px;height:26px;align-items:center;justify-content:center;cursor:pointer;transition:none!important}
.zb-sb-logout:hover{background:#fef2f2;color:#ef4444}

.zb-bill{display:grid;grid-template-columns:1fr auto;gap:10px;padding:12px 20px;margin:0;box-sizing:border-box;text-align:left;font:inherit;color:inherit;background:transparent;width:100%;cursor:pointer;font-family:inherit;border:none;border-radius:0;border-bottom:1px solid #f4f2ee;-webkit-appearance:none;appearance:none}
.zb-bill:hover{background:#fafaf8}
.zb-bill:focus{outline:none}
.zb-bill:focus-visible{outline:2px solid #4f46e5;outline-offset:-2px}

.zb-badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10.5px;font-weight:600;margin-left:6px}
.zb-paid{background:#f0fdf4;color:#15803d}
.zb-partial{background:#fffbeb;color:#b45309}
.zb-credit{background:#fef2f2;color:#dc2626}

.zb-act{display:flex;gap:11px;padding:11px 20px;border-bottom:1px solid #f4f2ee;font-size:12.5px;color:#6b6760;line-height:1.5}
.zb-act:last-child{border-bottom:none}
.zb-act b{color:#14120e;font-weight:600}
.zb-act-t{font-size:11px;color:#b0aca4;white-space:nowrap}

.zb-snap{padding:4px 20px 14px;display:flex;flex-direction:column;gap:8px}
.zb-sn-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f4f2ee;font-size:13px;color:#6b6760}
.zb-sn-row:last-child{border:none}
.sn-left{display:flex;align-items:center;gap:8px}
.sn-val{font-weight:700;font-variant-numeric:tabular-nums}
`;

export function ZbWorkspaceDashboardStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ZB_SHELL_AND_DASH_CSS }} />;
}
