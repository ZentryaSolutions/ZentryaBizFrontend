import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeadset, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { supportTicketsAPI } from '../services/api';
import { zbKeys } from '../lib/queryKeys';
import { supportTicketsStyles } from '../styles/supportTicketsStyles';
import PageLoadingCenter from './PageLoadingCenter';
import { posApiQueriesEnabled } from '../lib/appMode';
import { getConnectivityErrorMessage, isLikelyConnectivityError } from '../lib/offlineUserMessages';

const MAX_IMAGES = 3;
const MAX_BYTES = 1.5 * 1024 * 1024;

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

const SupportTickets = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { activeShopId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const keys = zbKeys(activeShopId);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [imageSlots, setImageSlots] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitOk, setSubmitOk] = useState('');

  const {
    data: tickets = [],
    isLoading,
    isError,
    error: listErr,
  } = useQuery({
    queryKey: keys.supportTicketsList(),
    queryFn: async () => {
      const res = await supportTicketsAPI.getAll();
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: posApiQueriesEnabled(activeShopId),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: keys.supportTicketDetail(detailId),
    queryFn: async () => {
      const res = await supportTicketsAPI.getById(detailId);
      return res.data;
    },
    enabled: posApiQueriesEnabled(activeShopId) && detailId != null,
  });

  useEffect(() => {
    setDetailId(null);
    setCreateOpen(false);
    setSubmitOk('');
  }, [activeShopId]);

  const createMutation = useMutation({
    mutationFn: (body) => supportTicketsAPI.create(body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: keys.supportTicketsList() });
      setCreateOpen(false);
      setHeading('');
      setDescription('');
      setImageSlots([]);
      setFormError('');
      setSubmitOk(res.data?.message || t('supportTickets.submitted', { defaultValue: 'Ticket submitted.' }));
      if (res.data?.ticket_id) setDetailId(res.data.ticket_id);
    },
    onError: (err) => {
      setFormError(
        err.response?.data?.error ||
          getConnectivityErrorMessage(err) ||
          t('supportTickets.submitFailed', { defaultValue: 'Could not submit ticket.' })
      );
    },
  });

  const listError = useMemo(() => {
    if (!isError || !listErr) return null;
    if (isLikelyConnectivityError(listErr)) {
      return getConnectivityErrorMessage(listErr);
    }
    return (
      listErr.response?.data?.error ||
      listErr.response?.data?.message ||
      t('supportTickets.loadFailed', { defaultValue: 'Failed to load tickets.' })
    );
  }, [isError, listErr, t]);

  const adminView = isAdmin();

  const resetCreateForm = () => {
    setHeading('');
    setDescription('');
    setImageSlots([]);
    setFormError('');
  };

  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const next = [...imageSlots];
    for (const file of files) {
      if (next.length >= MAX_IMAGES) break;
      if (!file.type.startsWith('image/')) {
        setFormError(t('supportTickets.imagesType', { defaultValue: 'Only image files allowed.' }));
        continue;
      }
      if (file.size > MAX_BYTES) {
        setFormError(t('supportTickets.imagesSize', { defaultValue: 'Each image must be under 1.5 MB.' }));
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        next.push({
          id: `${Date.now()}-${Math.random()}`,
          preview: dataUrl,
          file_name: file.name,
          mime_type: file.type,
          data_base64: dataUrl,
        });
      } catch {
        setFormError(t('supportTickets.imagesRead', { defaultValue: 'Could not read image.' }));
      }
    }
    setImageSlots(next.slice(0, MAX_IMAGES));
  };

  const removeSlot = (id) => {
    setImageSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    const h = heading.trim();
    const d = description.trim();
    if (h.length < 3) {
      setFormError(t('supportTickets.headingRequired', { defaultValue: 'Enter a problem heading (min 3 characters).' }));
      return;
    }
    if (d.length < 10) {
      setFormError(
        t('supportTickets.descRequired', { defaultValue: 'Describe the problem (min 10 characters).' })
      );
      return;
    }
    createMutation.mutate({
      heading: h,
      description: d,
      images: imageSlots.map((s) => ({
        file_name: s.file_name,
        mime_type: s.mime_type,
        data_base64: s.data_base64,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="content-container stk-page">
        <PageLoadingCenter message={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="content-container stk-page stk-wrap">
      <style>{supportTicketsStyles}</style>

      <div className="stk-head">
        <div>
          <h1 className="stk-title">{t('menu.supportTickets', { defaultValue: 'Support Tickets' })}</h1>
          <p className="stk-sub">
            {adminView
              ? t('supportTickets.subAdmin', {
                  defaultValue: 'All tickets from your shop (you and cashiers). Status updates when Zentrya resolves them.',
                })
              : t('supportTickets.subStaff', {
                  defaultValue: 'Report an issue and track your ticket status.',
                })}
          </p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            className="stk-btn-primary"
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} />{' '}
            {t('supportTickets.newTicket', { defaultValue: 'New ticket' })}
          </button>
        ) : null}
      </div>

      {submitOk ? <div className="stk-alert stk-alert--ok">{submitOk}</div> : null}
      {listError ? <div className="stk-alert stk-alert--error">{listError}</div> : null}

      <div className="stk-card">
        {tickets.length === 0 ? (
          <div className="stk-empty">
            <FontAwesomeIcon icon={faHeadset} size="2x" style={{ marginBottom: 12, opacity: 0.35 }} />
            <p>{t('supportTickets.empty', { defaultValue: 'No support tickets yet.' })}</p>
          </div>
        ) : (
          <table className="stk-table">
            <thead>
              <tr>
                <th>{t('supportTickets.colNumber', { defaultValue: 'Ticket #' })}</th>
                <th>{t('supportTickets.colHeading', { defaultValue: 'Problem' })}</th>
                {adminView ? (
                  <th>{t('supportTickets.colRaisedBy', { defaultValue: 'Raised by' })}</th>
                ) : null}
                <th>{t('supportTickets.colDate', { defaultValue: 'Date' })}</th>
                <th>{t('supportTickets.colStatus', { defaultValue: 'Status' })}</th>
                <th>{t('supportTickets.colPhotos', { defaultValue: 'Photos' })}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((row) => {
                const resolved = row.status === 'resolved';
                return (
                  <tr key={row.ticket_id} onClick={() => setDetailId(row.ticket_id)}>
                    <td>
                      <span className="stk-num">{row.ticket_number}</span>
                    </td>
                    <td>{row.heading}</td>
                    {adminView ? (
                      <td>
                        {row.created_by_name || '—'}
                        {row.created_by_role ? (
                          <span style={{ color: '#9ca3af', fontSize: 12 }}> · {row.created_by_role}</span>
                        ) : null}
                      </td>
                    ) : null}
                    <td>{formatWhen(row.created_at)}</td>
                    <td>
                      <span className={`stk-badge ${resolved ? 'stk-badge--resolved' : 'stk-badge--open'}`}>
                        {resolved
                          ? t('supportTickets.statusResolved', { defaultValue: 'Resolved' })
                          : t('supportTickets.statusOpen', { defaultValue: 'Not resolved' })}
                      </span>
                    </td>
                    <td>{row.image_count || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="stk-overlay"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget && !createMutation.isPending) setCreateOpen(false);
              }}
            >
              <div className="stk-modal" role="dialog" aria-modal="true" aria-labelledby="stk-create-title">
                <h2 id="stk-create-title">
                  {t('supportTickets.createTitle', { defaultValue: 'Report a problem' })}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="stk-field">
                    <label htmlFor="stk-heading">
                      {t('supportTickets.problemHeading', { defaultValue: 'Problem heading' })}
                    </label>
                    <input
                      id="stk-heading"
                      value={heading}
                      onChange={(e) => setHeading(e.target.value)}
                      maxLength={200}
                      placeholder={t('supportTickets.headingPh', { defaultValue: 'Short title of the issue' })}
                      disabled={createMutation.isPending}
                    />
                  </div>
                  <div className="stk-field">
                    <label htmlFor="stk-desc">
                      {t('supportTickets.problemDescription', { defaultValue: 'Problem description' })}
                    </label>
                    <textarea
                      id="stk-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={4000}
                      placeholder={t('supportTickets.descPh', {
                        defaultValue: 'What happened? Steps to reproduce, error messages…',
                      })}
                      disabled={createMutation.isPending}
                    />
                  </div>
                  <div className="stk-field">
                    <label>
                      {t('supportTickets.screenshots', { defaultValue: 'Screenshots' })} ({imageSlots.length}/
                      {MAX_IMAGES})
                    </label>
                    <p className="stk-hint">
                      {t('supportTickets.screenshotsHint', {
                        defaultValue: 'Optional — up to 3 images, max 1.5 MB each.',
                      })}
                    </p>
                    <div className="stk-img-pick">
                      {imageSlots.map((slot) => (
                        <div key={slot.id} className="stk-img-slot">
                          <img src={slot.preview} alt="" />
                          <button
                            type="button"
                            className="stk-img-remove"
                            aria-label="Remove"
                            onClick={() => removeSlot(slot.id)}
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </div>
                      ))}
                      {imageSlots.length < MAX_IMAGES ? (
                        <label className="stk-img-slot">
                          + {t('supportTickets.addPhoto', { defaultValue: 'Add' })}
                          <input type="file" accept="image/*" multiple onChange={onPickImages} />
                        </label>
                      ) : null}
                    </div>
                  </div>
                  {formError ? <div className="stk-alert stk-alert--error">{formError}</div> : null}
                  <div className="stk-modal-actions">
                    <button
                      type="button"
                      className="stk-btn-ghost"
                      disabled={createMutation.isPending}
                      onClick={() => setCreateOpen(false)}
                    >
                      {t('common.cancel', { defaultValue: 'Cancel' })}
                    </button>
                    <button type="submit" className="stk-btn-primary" disabled={createMutation.isPending}>
                      {createMutation.isPending
                        ? t('common.loading', { defaultValue: 'Loading…' })
                        : t('supportTickets.submit', { defaultValue: 'Submit ticket' })}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {detailId != null && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="stk-overlay"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setDetailId(null);
              }}
            >
              <div className="stk-modal stk-modal--wide" role="dialog" aria-modal="true">
                {detailLoading || !detail ? (
                  <p>{t('common.loading')}</p>
                ) : (
                  <>
                    <h2>
                      {detail.ticket_number} — {detail.heading}
                    </h2>
                    <dl className="stk-detail-meta">
                      <div>
                        <dt>{t('supportTickets.colStatus', { defaultValue: 'Status' })}</dt>
                        <dd>
                          <span
                            className={`stk-badge ${
                              detail.status === 'resolved' ? 'stk-badge--resolved' : 'stk-badge--open'
                            }`}
                          >
                            {detail.status === 'resolved'
                              ? t('supportTickets.statusResolved', { defaultValue: 'Resolved' })
                              : t('supportTickets.statusOpen', { defaultValue: 'Not resolved' })}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>{t('supportTickets.colDate', { defaultValue: 'Date' })}</dt>
                        <dd>{formatWhen(detail.created_at)}</dd>
                      </div>
                      {adminView ? (
                        <div>
                          <dt>{t('supportTickets.colRaisedBy', { defaultValue: 'Raised by' })}</dt>
                          <dd>
                            {detail.created_by_name} ({detail.created_by_role})
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>{t('supportTickets.problemDescription', { defaultValue: 'Problem description' })}</dt>
                        <dd style={{ whiteSpace: 'pre-wrap' }}>{detail.description}</dd>
                      </div>
                    </dl>
                    {(detail.images || []).length > 0 ? (
                      <div>
                        <strong style={{ fontSize: 13, color: '#6b7280' }}>
                          {t('supportTickets.screenshots', { defaultValue: 'Screenshots' })}
                        </strong>
                        <div className="stk-detail-imgs">
                          {detail.images.map((img) => (
                            <a key={img.image_id} href={img.data_url} target="_blank" rel="noopener noreferrer">
                              <img src={img.data_url} alt={img.file_name || 'screenshot'} />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="stk-modal-actions">
                      <button type="button" className="stk-btn-ghost" onClick={() => setDetailId(null)}>
                        {t('common.close', { defaultValue: 'Close' })}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default SupportTickets;
