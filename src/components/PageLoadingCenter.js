import React from 'react';
import './PageLoadingCenter.css';

/**
 * Centered loader for route pages — use while useQuery isLoading / isFetching initial load.
 */
export default function PageLoadingCenter({ message = 'Loading…' }) {
  const s = {
    wrap: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 240,
      padding: '28px 16px',
    },
    card: {
      width: 'min(860px, 100%)',
      background: '#fff',
      border: '1px solid #e8e5df',
      borderRadius: 18,
      padding: 18,
      boxShadow: '0 10px 35px rgba(18, 16, 10, 0.06)',
    },
    title: { margin: '0 0 10px', fontSize: 13, color: '#8f8b84', fontWeight: 700, letterSpacing: 0.2 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 10 },
    sk: (h, span) => ({
      gridColumn: `span ${span}`,
      height: h,
      borderRadius: 12,
      background: 'linear-gradient(90deg,#f2f1ed 0%, #eceae4 40%, #f2f1ed 80%)',
      backgroundSize: '200% 100%',
      animation: 'zbSk 1.05s ease-in-out infinite',
    }),
    note: { margin: '12px 0 0', fontSize: 13, color: '#9c9890' },
  };
  return (
    <div className="zb-page-load" style={s.wrap}>
      <style>{`
        @keyframes zbSk { 0%{background-position: 0% 0;} 100%{background-position: 200% 0;} }
      `}</style>
      <div className="zb-page-load__inner" style={s.card} aria-busy="true" aria-live="polite">
        <div style={s.title}>Loading</div>
        <div style={s.grid} aria-hidden>
          <div style={s.sk(18, 6)} />
          <div style={s.sk(18, 4)} />
          <div style={s.sk(44, 12)} />
          <div style={s.sk(90, 4)} />
          <div style={s.sk(90, 4)} />
          <div style={s.sk(90, 4)} />
          <div style={s.sk(16, 8)} />
          <div style={s.sk(16, 5)} />
        </div>
        <p className="zb-page-load__text" style={s.note}>
          {message}
        </p>
      </div>
    </div>
  );
}
