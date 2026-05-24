import React from 'react';
import MarketingHeader from './MarketingHeader';
import '../pages/LandingPage.css';

const legalStyles = `
.zbx-legalMain {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  color: var(--zbx-text, #0f172a);
}
.zbx-legalPanel {
  background: var(--zbx-surface, #fff);
  border: 1px solid var(--zbx-border, #e2e8f0);
  border-radius: 16px;
  padding: 32px 36px 40px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.06);
}
.zbx-legalMain h1 {
  font-family: 'Bricolage Grotesque', 'DM Sans', system-ui, sans-serif;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--zbx-text, #0f172a);
  margin: 0 0 8px;
}
.zbx-legalMain .zbx-legalUpdated {
  font-size: 13px;
  color: var(--zbx-muted, #64748b);
  margin: 0 0 28px;
}
.zbx-legalMain h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e293b;
  margin: 28px 0 10px;
}
.zbx-legalMain p,
.zbx-legalMain li {
  font-size: 15px;
  line-height: 1.65;
  color: #334155;
  margin: 0 0 12px;
}
.zbx-legalMain ul {
  margin: 0 0 16px;
  padding-left: 1.25rem;
}
.zbx-legalMain a {
  color: var(--zbx-accent, #4f46e5);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.zbx-legalMain a:hover {
  color: var(--zbx-accent2, #7c3aed);
}
@media (max-width: 640px) {
  .zbx-legalPanel {
    padding: 24px 20px 28px;
  }
}
`;

export default function LegalPageShell({ title, children }) {
  return (
    <div className="zbx">
      <style>{legalStyles}</style>
      <MarketingHeader />
      <main className="zbx-legalMain">
        <div className="zbx-legalPanel">
          <h1>{title}</h1>
          <p className="zbx-legalUpdated">Last updated: {new Date().getFullYear()}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
