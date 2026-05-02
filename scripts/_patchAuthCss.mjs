import fs from "fs";
const p = "src/pages/auth/AuthPages.css";
let out = fs.readFileSync(p, "utf8");
const authBlock = `.zb-auth {
  --auth-accent: #4f46e5;
  --auth-accent-soft: rgba(79, 70, 229, 0.16);
  --auth-accent-border: rgba(79, 70, 229, 0.45);
  --auth-accent-muted: #6366f1;
  --auth-navy: #14142b;
  --auth-navy-mid: #1a1a3f;

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 18px;
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(165deg, #ede9fe 0%, #e0e7ff 45%, #ddd6fe 100%);
}

.zb-auth__glow {
  position: absolute;
  inset: -25%;
  background: radial-gradient(closest-side, rgba(99, 102, 241, 0.22), transparent 72%);
  pointer-events: none;
  z-index: 0;
}`;
const cardBlock = `.zb-auth__card--split {
  max-width: 1000px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #ffffff;
  border-radius: 22px;
  border: 1px solid rgba(199, 210, 254, 0.65);
  box-shadow:
    0 4px 6px rgba(15, 23, 42, 0.05),
    0 28px 56px rgba(30, 27, 75, 0.14);
  overflow: hidden;
}`;
const rightBlock = `.zb-auth__right {
  position: relative;
  background: linear-gradient(165deg, var(--auth-navy-mid) 0%, var(--auth-navy) 55%, #0c0c18 100%);
  padding: 28px 32px 36px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  overflow: hidden;
}

.zb-auth__rightPattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.55;
  pointer-events: none;
}

.zb-auth__rightGlowCorner {
  position: absolute;
  top: -30%;
  right: -25%;
  width: 70%;
  height: 70%;
  background: radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.35), transparent 55%);
  pointer-events: none;
}

.zb-auth__rightTop {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
}

.zb-auth__livePill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
}

.zb-auth__liveDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.25);
  animation: zbAuthPulse 2s ease-in-out infinite;
}

@keyframes zbAuthPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.zb-auth__promoCard {
  margin-left: auto;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  min-width: 200px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.zb-auth__promoLabel {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 6px;
}

.zb-auth__promoValue {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
  line-height: 1.1;
}

.zb-auth__promoDelta {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #6ee7b7;
}

.zb-auth__promoMeta {
  margin-top: 10px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}

.zb-auth__rightInner {
  position: relative;
  z-index: 1;
  max-width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 8px;
}

.zb-auth__heroTitle {
  margin: 0 0 14px;
  font-size: clamp(24px, 3.2vw, 32px);
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.zb-auth__heroText {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.78);
  font-weight: 450;
}

.zb-auth__featureList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zb-auth__featureItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.45;
}

.zb-auth__featureIcon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
`;
out = out.replace(/^\.zb-auth \{[^]*?\n\}/m, authBlock);
out = out.replace(/^\.zb-auth__card--split \{[^]*?\n\}/m, cardBlock);
const start = out.indexOf(".zb-auth__right {");
const end = out.indexOf(".zb-auth__panelWrap");
if (start < 0 || end < 0) throw new Error("markers");
out = out.slice(0, start) + rightBlock + "\n" + out.slice(end);
out = out.replace(".zb-auth__left {\n  padding: 36px 40px 28px;", ".zb-auth__left {\n  padding: 32px 36px 26px;");
out = out.replace("  border-radius: 14px;\n  padding: 0 14px;\n  background: #fff;", "  border-radius: 12px;\n  padding: 0 14px;\n  background: #f8fafc;");
fs.writeFileSync(p, out);
console.log("done");
