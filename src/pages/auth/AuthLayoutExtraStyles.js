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

.zb-auth__divider{
  display:flex !important;
  align-items:center !important;
  gap:12px !important;
  margin:18px 0 !important;
  color:rgba(15,23,42,0.45) !important;
  font-size:13px !important;
  font-weight:500 !important;
}
.zb-auth__divider::before,.zb-auth__divider::after{
  content:'' !important;
  flex:1 !important;
  height:1px !important;
  background:rgba(15,23,42,0.12) !important;
}
.zb-auth__btnGoogle{
  width:100% !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  gap:10px !important;
  padding:12px 16px !important;
  border-radius:999px !important;
  border:1px solid rgba(15,23,42,0.14) !important;
  background:#fff !important;
  color:#1e293b !important;
  font-size:15px !important;
  font-weight:600 !important;
  cursor:pointer !important;
  font-family:inherit !important;
  min-height:44px !important;
  box-sizing:border-box !important;
}
.zb-auth__btnGoogle:hover{
  background:#f8fafc !important;
  border-color:rgba(15,23,42,0.2) !important;
}
.zb-auth__btnGoogle:disabled{
  opacity:0.6 !important;
  cursor:not-allowed !important;
}
.zb-auth__btnGoogleIcon{flex-shrink:0 !important;}

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

