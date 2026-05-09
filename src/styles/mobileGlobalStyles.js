export const mobileGlobalStyles = `
/* Mobile-first stability: prevent horizontal overflow + layout overlap */
@media (max-width: 768px) {
  html, body {
    overflow-x: hidden !important;
  }

  /* Topbar */
  .zb-topbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 10px;
  }
  .header-left {
    min-width: 0;
    flex: 1 1 auto;
    gap: 8px;
  }
  .zb-tb-title {
    max-width: 52vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zb-tb-divider,
  .zb-tb-shop-label {
    display: none !important;
  }
  .zb-tb-myshops {
    font-size: 12px;
    padding: 6px 8px;
  }
  .header-menu-toggle {
    padding: 6px 8px;
  }

  /* Sidebar becomes an overlay drawer */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    max-width: 82vw;
    z-index: 1001;
    transform: translateX(-110%);
    transition: transform 180ms ease;
  }
  .sidebar.sidebar--open {
    transform: translateX(0);
  }
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.38);
    z-index: 1000;
  }

  /* Main shell */
  .zb-workspace-shell {
    overflow-x: hidden;
  }
  .zb-main-col {
    min-width: 0;
    width: 100%;
  }

  /* Tables: allow horizontal scroll instead of overflow */
  .zb-main-col table {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Common cards/panels: reduce padding */
  .page-container,
  .content,
  .dashboard-container {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  /* Modals should not exceed viewport */
  .modal,
  .modal-content,
  .zb-modal,
  .zb-modal__panel {
    max-width: calc(100vw - 20px) !important;
  }
}
`;

