/** Returns workspace — extends sales list theme (sal2) with detail layout helpers */
import { salesWorkspaceStyles } from './salesWorkspaceStyles';

export const returnsWorkspaceStyles = `${salesWorkspaceStyles}
.ret2-detail{max-width:920px;margin:0 auto;padding:0 16px 32px}
.ret2-back{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;margin-bottom:16px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#475569;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.ret2-back:hover{background:#f8fafc;color:#0f172a;border-color:#d1d5db}
.ret2-hero{background:#fff;border:1px solid #ececec;border-radius:16px;padding:20px 22px;margin-bottom:16px;box-shadow:0 2px 12px rgba(15,23,42,.05)}
.ret2-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.ret2-hero-ico{width:52px;height:52px;border-radius:14px;background:#fff7ed;color:#ea580c;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.ret2-hero-tit{margin:0;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:clamp(1.35rem,2.5vw,1.75rem);font-weight:800;color:#0f172a;letter-spacing:-.03em}
.ret2-hero-sub{margin:6px 0 0;font-size:14px;color:#64748b;font-weight:500}
.ret2-pill{display:inline-flex;align-items:center;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:800;text-transform:capitalize}
.ret2-pill--cash{background:#ecfdf5;color:#15803d}
.ret2-pill--credit{background:#eff6ff;color:#1d4ed8}
.ret2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media(max-width:720px){.ret2-grid{grid-template-columns:1fr}}
.ret2-stat{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px}
.ret2-stat-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:6px}
.ret2-stat-val{font-size:1.05rem;font-weight:800;color:#0f172a;font-family:'Bricolage Grotesque','DM Sans',sans-serif}
.ret2-card{background:#fff;border:1px solid #ececec;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,.05);margin-bottom:16px}
.ret2-card-hd{padding:14px 18px;border-bottom:1px solid #f1f5f9;font-family:'Bricolage Grotesque','DM Sans',sans-serif;font-size:1.05rem;font-weight:700;color:#0f172a}
.ret2-reason{padding:16px 18px;font-size:14px;color:#334155;line-height:1.55;white-space:pre-wrap}
.ret2-link-btn{font:inherit;font-weight:700;color:#1e40af;background:none;border:none;padding:0;cursor:pointer}
.ret2-link-btn:hover{text-decoration:underline}
.sal2-st--return{background:#fff7ed;color:#c2410c}
`;
