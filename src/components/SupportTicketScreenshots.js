import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faXmark } from '@fortawesome/free-solid-svg-icons';

export default function SupportTicketScreenshots({ images = [], thumbClassName = 'stk-chat-thumbs' }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const list = Array.isArray(images) ? images : [];
  const open = lightboxIdx != null && list[lightboxIdx];

  const goPrev = useCallback(() => {
    setLightboxIdx((i) => (i == null || list.length < 2 ? i : (i - 1 + list.length) % list.length));
  }, [list.length]);

  const goNext = useCallback(() => {
    setLightboxIdx((i) => (i == null || list.length < 2 ? i : (i + 1) % list.length));
  }, [list.length]);

  useEffect(() => {
    if (lightboxIdx == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, goPrev, goNext]);

  if (!list.length) return null;

  return (
    <>
      <div className={thumbClassName}>
        {list.map((img, idx) => (
          <button
            key={img.image_id ?? idx}
            type="button"
            className="stk-img-thumb-btn"
            onClick={() => setLightboxIdx(idx)}
            aria-label={img.file_name || `Screenshot ${idx + 1}`}
          >
            <img src={img.data_url} alt={img.file_name || `Screenshot ${idx + 1}`} />
          </button>
        ))}
      </div>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="stk-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Screenshot viewer"
              onClick={(e) => {
                if (e.target === e.currentTarget) setLightboxIdx(null);
              }}
            >
              <button
                type="button"
                className="stk-lightbox-close"
                aria-label="Close"
                onClick={() => setLightboxIdx(null)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
              {list.length > 1 ? (
                <>
                  <button type="button" className="stk-lightbox-nav stk-lightbox-nav--prev" onClick={goPrev} aria-label="Previous">
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <button type="button" className="stk-lightbox-nav stk-lightbox-nav--next" onClick={goNext} aria-label="Next">
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </>
              ) : null}
              <div className="stk-lightbox-stage" onClick={(e) => e.stopPropagation()}>
                <img src={open.data_url} alt={open.file_name || 'Screenshot'} />
                {list.length > 1 ? (
                  <p className="stk-lightbox-counter">
                    {lightboxIdx + 1} / {list.length}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
