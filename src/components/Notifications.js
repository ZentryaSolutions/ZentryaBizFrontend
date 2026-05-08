import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { notificationsAPI } from '../services/api';
import { hasPosBackendSession, ZB_BACKEND_SESSION_CHANGED } from '../lib/appMode';
import './Notifications.css';

const Notifications = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      if (!hasPosBackendSession()) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const [notificationsResponse, countResponse] = await Promise.all([
        notificationsAPI.getAll({ limit: 50 }),
        notificationsAPI.getUnreadCount()
      ]);

      let list = notificationsResponse.data || [];

      setNotifications(list);
      setUnreadCount((countResponse.data?.count || 0));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    const onSess = () => fetchNotifications();
    window.addEventListener(ZB_BACKEND_SESSION_CHANGED, onSess);

    return () => {
      clearInterval(interval);
      window.removeEventListener(ZB_BACKEND_SESSION_CHANGED, onSess);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const notification = notifications.find(n => n.notification_id === notificationId);
      if (notification?.link) {
        window.location.href = notification.link;
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="notifications-container" ref={dropdownRef}>
      <button 
        className="notifications-icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        data-navigation="true"
      >
        <span className="notifications-icon" aria-hidden>
          <FontAwesomeIcon icon={faBell} className="notifications-icon-fa" />
        </span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>{t('header.notifications')}</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                {t('header.markAllAsRead')}
              </button>
            )}
          </div>

          <div className="notifications-list">
            {loading ? (
              <div className="no-notifications">
                <p>{t('common.loading')}...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="no-notifications">
                <p>{t('header.noNewNotifications')}</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.notification_id}
                  className={`notification-item ${!notification.read ? 'unread' : ''} ${notification.type || 'info'}`}
                  onClick={() => handleNotificationClick(notification.notification_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification.notification_id);
                    }
                  }}
                >
                  <div className="notification-content">
                    <h4 className="notification-title">{notification.title}</h4>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatTime(notification.created_at)}</span>
                  </div>
                  {!notification.read && <div className="unread-indicator"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

