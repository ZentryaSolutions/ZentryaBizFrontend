import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faComments, faPaperPlane, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { supportTicketsAPI } from '../services/api';
import { zbKeys } from '../lib/queryKeys';
import { supportTicketsStyles } from '../styles/supportTicketsStyles';
import { withCurrentScope } from '../utils/appRouteScope';
import SupportTicketScreenshots from './SupportTicketScreenshots';
import PageLoadingCenter from './PageLoadingCenter';
import { posApiQueriesEnabled } from '../lib/appMode';
import { getConnectivityErrorMessage, isLikelyConnectivityError } from '../lib/offlineUserMessages';

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

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatRoleLabel(role) {
  const r = String(role || '').trim();
  if (!r) return 'Staff';
  if (r.toLowerCase() === 'administrator') return 'Admin';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function initials(name) {
  const parts = String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function SupportTicketChat({ readOnly = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId: ticketIdParam } = useParams();
  const ticketId = parseInt(ticketIdParam, 10);
  const { activeShopId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const keys = zbKeys(activeShopId);
  const chatEndRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const [statusError, setStatusError] = useState('');

  const ticketsPath = withCurrentScope(location.pathname, '/support-tickets');
  const validId = Number.isFinite(ticketId) && ticketId > 0;

  const {
    data: ticket,
    isLoading: ticketLoading,
    isError: ticketIsError,
    error: ticketErr,
  } = useQuery({
    queryKey: keys.supportTicketDetail(ticketId),
    queryFn: async () => {
      const res = await supportTicketsAPI.getById(ticketId);
      return res.data;
    },
    enabled: posApiQueriesEnabled(activeShopId) && validId,
    retry: false,
  });

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesIsError,
    error: messagesErr,
  } = useQuery({
    queryKey: keys.supportTicketMessages(ticketId),
    queryFn: async () => {
      const res = await supportTicketsAPI.getMessages(ticketId);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: posApiQueriesEnabled(activeShopId) && validId,
    refetchInterval: validId ? 4000 : false,
  });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, ticketId]);

  const sendMutation = useMutation({
    mutationFn: (body) => supportTicketsAPI.sendMessage(ticketId, { body }),
    onSuccess: () => {
      setDraft('');
      setSendError('');
      queryClient.invalidateQueries({ queryKey: keys.supportTicketMessages(ticketId) });
      queryClient.invalidateQueries({ queryKey: keys.supportTicketsList() });
      queryClient.invalidateQueries({ queryKey: keys.supportTicketDetail(ticketId) });
    },
    onError: (err) => {
      setSendError(
        err.response?.data?.error ||
          getConnectivityErrorMessage(err) ||
          t('supportTickets.chatSendFailed', { defaultValue: 'Could not send message.' })
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => supportTicketsAPI.updateStatus(ticketId, status),
    onSuccess: (res) => {
      setStatusError('');
      queryClient.setQueryData(keys.supportTicketDetail(ticketId), res.data);
      queryClient.invalidateQueries({ queryKey: keys.supportTicketsList() });
    },
    onError: (err) => {
      setStatusError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          getConnectivityErrorMessage(err) ||
          t('supportTickets.statusUpdateFailed', { defaultValue: 'Could not update ticket status.' })
      );
    },
  });

  const loadError = useMemo(() => {
    const err = ticketErr || messagesErr;
    const failed = ticketIsError || messagesIsError;
    if (!failed || !err) return null;
    if (isLikelyConnectivityError(err)) return getConnectivityErrorMessage(err);
    return (
      err.response?.data?.error ||
      err.response?.data?.message ||
      t('supportTickets.chatLoadFailed', { defaultValue: 'Failed to load chat.' })
    );
  }, [ticketIsError, ticketErr, messagesIsError, messagesErr, t]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sendMutation.isPending || readOnly) return;
    setSendError('');
    sendMutation.mutate(text);
  };

  const goBack = () => navigate(ticketsPath);

  if (!validId) {
    return (
      <div className="content-container stk-page">
        <div className="stk-alert stk-alert--error">
          {t('supportTickets.invalidTicket', { defaultValue: 'Invalid ticket.' })}
        </div>
        <button type="button" className="stk-btn-ghost" onClick={goBack}>
          {t('supportTickets.backToList', { defaultValue: 'Back to tickets' })}
        </button>
      </div>
    );
  }

  if (ticketLoading) {
    return (
      <div className="content-container stk-page stk-chat-page">
        <PageLoadingCenter message={t('common.loading')} />
      </div>
    );
  }

  if (ticketIsError || !ticket) {
    return (
      <div className="content-container stk-page stk-chat-page">
        <style>{supportTicketsStyles}</style>
        <div className="stk-alert stk-alert--error">
          {loadError || t('supportTickets.ticketNotFound', { defaultValue: 'Ticket not found.' })}
        </div>
        <button type="button" className="stk-btn-ghost" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> {t('supportTickets.backToList', { defaultValue: 'Back to tickets' })}
        </button>
      </div>
    );
  }

  const resolved = ticket.status === 'resolved';
  const adminView = isAdmin();

  return (
    <div className="content-container stk-page stk-chat-page">
      <style>{supportTicketsStyles}</style>

      <div className="stk-chat-screen">
        <header className="stk-chat-topbar">
          <button type="button" className="stk-chat-back" onClick={goBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>{t('supportTickets.backToList', { defaultValue: 'All tickets' })}</span>
          </button>
          <div className="stk-chat-topbar-main">
            <div className="stk-chat-topbar-icon">
              <FontAwesomeIcon icon={faComments} />
            </div>
            <div className="stk-chat-topbar-text">
              <div className="stk-chat-topbar-row">
                <h1>{ticket.ticket_number}</h1>
                <span className={`stk-badge ${resolved ? 'stk-badge--resolved' : 'stk-badge--open'}`}>
                  {resolved
                    ? t('supportTickets.statusResolved', { defaultValue: 'Resolved' })
                    : t('supportTickets.statusOpen', { defaultValue: 'Not resolved' })}
                </span>
              </div>
              <p>{ticket.heading}</p>
              {resolved && ticket.resolved_by_name ? (
                <p className="stk-resolved-by">
                  {t('supportTickets.resolvedBy', {
                    defaultValue: 'Marked as resolved by {{name}} ({{role}})',
                    name: ticket.resolved_by_name,
                    role: formatRoleLabel(ticket.resolved_by_role),
                  })}
                  {ticket.resolved_at ? ` · ${formatWhen(ticket.resolved_at)}` : ''}
                </p>
              ) : null}
            </div>
          </div>
          {!readOnly ? (
            <div className="stk-chat-topbar-actions">
              {resolved ? (
                <button
                  type="button"
                  className="stk-resolve-btn stk-reopen-btn"
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    setStatusError('');
                    statusMutation.mutate('open');
                  }}
                >
                  <FontAwesomeIcon icon={faRotateLeft} />
                  {t('supportTickets.reopen', { defaultValue: 'Reopen ticket' })}
                </button>
              ) : (
                <button
                  type="button"
                  className="stk-resolve-btn"
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    setStatusError('');
                    statusMutation.mutate('resolved');
                  }}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  {t('supportTickets.markResolved', { defaultValue: 'Mark as resolved' })}
                </button>
              )}
            </div>
          ) : null}
        </header>

        {statusError ? <div className="stk-alert stk-alert--error">{statusError}</div> : null}

        <div className="stk-chat-layout">
          <aside className="stk-chat-sidebar">
            <h2>{t('supportTickets.ticketDetails', { defaultValue: 'Ticket details' })}</h2>
            <dl className="stk-chat-facts">
              <div>
                <dt>{t('supportTickets.colDate', { defaultValue: 'Date' })}</dt>
                <dd>{formatWhen(ticket.created_at)}</dd>
              </div>
              {adminView ? (
                <div>
                  <dt>{t('supportTickets.colRaisedBy', { defaultValue: 'Raised by' })}</dt>
                  <dd>
                    {ticket.created_by_name} ({ticket.created_by_role})
                  </dd>
                </div>
              ) : null}
              {resolved && ticket.resolved_by_name ? (
                <div>
                  <dt>{t('supportTickets.resolvedByLabel', { defaultValue: 'Resolved by' })}</dt>
                  <dd>
                    {ticket.resolved_by_name} ({formatRoleLabel(ticket.resolved_by_role)})
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>{t('supportTickets.problemDescription', { defaultValue: 'Problem description' })}</dt>
                <dd className="stk-chat-desc">{ticket.description}</dd>
              </div>
              {(ticket.images || []).length > 0 ? (
                <div>
                  <dt>{t('supportTickets.screenshots', { defaultValue: 'Screenshots' })}</dt>
                  <dd>
                    <SupportTicketScreenshots images={ticket.images} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>

          <section className="stk-chat-panel" aria-label="Ticket conversation">
            <div className="stk-chat-panel-hd">
              <span>{t('supportTickets.conversation', { defaultValue: 'Conversation' })}</span>
              <span className="stk-chat-live">{t('supportTickets.liveSync', { defaultValue: 'Live' })}</span>
            </div>

            <div className="stk-chat-thread">
              {messagesLoading ? (
                <div className="stk-chat-thread-empty">{t('common.loading')}</div>
              ) : loadError && messagesIsError ? (
                <div className="stk-alert stk-alert--error">{loadError}</div>
              ) : messages.length === 0 ? (
                <div className="stk-chat-thread-empty">
                  <FontAwesomeIcon icon={faComments} size="2x" style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p>
                    {t('supportTickets.chatEmpty', {
                      defaultValue: 'No messages yet. Shop admin and cashier can discuss this issue here.',
                    })}
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isPlatform = msg.sender_kind === 'platform_admin';
                  const isMine = msg.is_mine;
                  const who = isPlatform
                    ? t('supportTickets.platformSupport', { defaultValue: 'Zentrya Support' })
                    : msg.sender_name || 'User';
                  const role = isPlatform ? '' : msg.sender_role;
                  return (
                    <div
                      key={msg.message_id}
                      className={`stk-msg-row ${isMine ? 'stk-msg-row--mine' : 'stk-msg-row--other'}`}
                    >
                      {!isMine ? (
                        <div
                          className={`stk-msg-avatar ${isPlatform ? 'stk-msg-avatar--platform' : ''}`}
                          aria-hidden
                        >
                          {initials(who)}
                        </div>
                      ) : null}
                      <div className={`stk-msg ${isMine ? 'stk-msg--mine' : isPlatform ? 'stk-msg--platform' : 'stk-msg--other'}`}>
                        <div className="stk-msg-head">
                          <strong>{who}</strong>
                          {role ? <span className="stk-msg-role">{role}</span> : null}
                          <time dateTime={msg.created_at}>{formatTime(msg.created_at)}</time>
                        </div>
                        <div className="stk-msg-body">{msg.body}</div>
                      </div>
                      {isMine ? (
                        <div className="stk-msg-avatar stk-msg-avatar--mine" aria-hidden>
                          {initials(who)}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {sendError ? <div className="stk-alert stk-alert--error stk-chat-send-err">{sendError}</div> : null}

            {!readOnly ? (
              <form className="stk-chat-footer" onSubmit={handleSend}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('supportTickets.chatPlaceholder', { defaultValue: 'Write a message…' })}
                  maxLength={4000}
                  rows={2}
                  disabled={sendMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="stk-chat-send"
                  disabled={sendMutation.isPending || !draft.trim()}
                  aria-label={t('supportTickets.send', { defaultValue: 'Send' })}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                  <span>{t('supportTickets.send', { defaultValue: 'Send' })}</span>
                </button>
              </form>
            ) : (
              <div className="stk-chat-readonly">
                {t('supportTickets.readOnlyChat', { defaultValue: 'Read-only mode — cannot send messages.' })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
