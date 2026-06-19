export const authLayoutExtraStyles = `
/* Auth cards: slightly bigger + more breathing room (matches screenshot request) */
.zb-auth__card--split{
  width:min(1080px, calc(100vw - 56px)) !important;
  border-radius:20px !important;
}
.zb-auth__left{
  padding:32px 32px 28px !important;
}
.zb-auth__right{
  min-height:540px !important;
}
.zb-auth__header h1{font-size:32px !important; line-height:1.15 !important;}
.zb-auth__header p{font-size:14px !important;}
.zb-auth__panelWrap{margin-top:10px !important;}
.zb-auth__panel{
  border-radius:16px !important;
  padding:18px 18px 16px !important;
}
.zb-auth__form--modern input,
.zb-auth__form--modern button{
  min-height:44px !important;
  font-size:14px !important;
}
.zb-auth__ctaRow{margin-top:12px !important;}
.zb-auth__divider{display:flex;align-items:center;gap:12px;margin:16px 0 14px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
.zb-auth__divider::before,.zb-auth__divider::after{content:'';flex:1;height:1px;background:#e5e7eb}
.zb-auth__googleWrap{display:flex;flex-direction:column;align-items:center;width:100%}
.zb-auth__googleBtnHost{display:flex;justify-content:center;width:100%;min-height:44px}
.zb-auth__googleErr{margin:8px 0 0;font-size:12px;color:#b91c1c;text-align:center}
.zb-auth__googleFallback{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid #dadce0;background:#fff;color:#3c4043;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;box-shadow:0 1px 2px rgba(60,64,67,.08)}
.zb-auth__googleFallback:hover:not(:disabled){background:#f8f9fa;border-color:#c6c9cc}
.zb-auth__googleFallback:disabled{opacity:.55;cursor:not-allowed}
.zb-auth__googleFallbackIcon{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 18px}
.zb-auth__googleFallbackIcon svg{display:block;width:18px;height:18px}

.modal-overlay--signup-role{
  z-index: 40000 !important;
  align-items: center;
  justify-content: center;
  display: flex;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
}

  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:8px 12px;
  margin:2px 0 10px;
}
.zb-auth__signupAs-label{
  font-size:12px;
  font-weight:600;
  color:#64748b;
  flex:0 0 auto;
}
.zb-auth__signupAs-option{
  display:inline-flex;
  align-items:center;
  gap:5px;
  margin:0;
  font-size:12px;
  font-weight:500;
  color:#475569;
  cursor:pointer;
  user-select:none;
}
.zb-auth__signupAs-option input{
  width:13px;
  height:13px;
  margin:0;
  accent-color:#2563eb;
  flex-shrink:0;
}

@media (max-width: 980px){
  .zb-auth__card--split{width:min(780px, calc(100vw - 40px)) !important;}
  .zb-auth__right{display:none !important;}
  .zb-auth__left{padding:26px 22px 20px !important;}
  .zb-auth__header h1{font-size:28px !important;}
}
@media (max-width: 520px){
  .zb-auth__card--split{width:calc(100vw - 24px) !important;}
  .zb-auth__left{padding:22px 16px 16px !important;}
}
`;

