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

