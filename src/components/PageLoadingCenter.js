import React from 'react';
import './PageLoadingCenter.css';

/**
 * Centered loader for route pages — use while useQuery isLoading / isFetching initial load.
 */
export default function PageLoadingCenter({ message = 'Loading…' }) {
  return (
    <div className="zb-page-load">
      <div className="zb-page-load__inner">
        <div className="zb-page-load__spinner" aria-hidden />
        <p className="zb-page-load__text">{message}</p>
        <div className="zb-page-load__bar">
          <div className="zb-page-load__barFill" />
        </div>
      </div>
    </div>
  );
}
