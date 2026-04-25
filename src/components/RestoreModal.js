import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { backupAPI } from '../services/api';
import './RestoreModal.css';

const RestoreModal = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null); // 'idle', 'in-progress', 'success', 'error'
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreDetails, setRestoreDetails] = useState('');

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await backupAPI.list();
      if (response.data.success && response.data.backups) {
        const backupList = response.data.backups;
        setBackups(backupList);
        
        // Auto-select most recent backup
        if (backupList.length > 0) {
          setSelectedBackup(backupList[0].filename);
        }
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
      setRestoreStatus('error');
      setRestoreMessage(t('backup.restoreFailed'));
      setRestoreDetails(err.response?.data?.message || err.message || t('backup.fetchBackupsFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) {
      setRestoreStatus('error');
      setRestoreMessage(t('backup.noBackupSelected'));
      setRestoreDetails(t('backup.selectBackupFileError'));
      return;
    }

    try {
      setRestoring(true);
      setRestoreStatus('in-progress');
      setRestoreMessage(t('backup.restoringInProgress'));
      setRestoreDetails('');

      console.log('[RestoreModal] Starting restore from:', selectedBackup);
      const response = await backupAPI.restore(selectedBackup);

      console.log('[RestoreModal] Restore response:', response);

      if (response.data.success) {
        setRestoreStatus('success');
        setRestoreMessage(t('backup.restoreSuccess'));
        setRestoreDetails(t('backup.restoreSuccessDetails', { filename: selectedBackup }));

        // Wait a moment to show success, then restart
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          
          // Restart Electron app if available
          if (window.electronAPI && window.electronAPI.restartApp) {
            console.log('[RestoreModal] Restarting Electron app...');
            window.electronAPI.restartApp();
          } else {
            // Fallback: reload page
            console.log('[RestoreModal] Reloading page...');
            window.location.reload();
          }
        }, 2000);
      } else {
        throw new Error(response.data.error || t('backup.restoreFailed'));
      }
    } catch (err) {
      console.error('[RestoreModal] Error restoring backup:', err);
      setRestoreStatus('error');
      setRestoreMessage(t('backup.restoreFailed'));
      
      const errorDetails = err.response?.data?.message || err.response?.data?.details || err.message || t('backup.restoreErrorUnknown');
      setRestoreDetails(errorDetails);
      setRestoring(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const selectedBackupInfo = backups.find(b => b.filename === selectedBackup);

  return (
    <div className="modal-overlay" onClick={!restoring && restoreStatus !== 'in-progress' ? onClose : undefined}>
      <div className="modal restore-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔄 {t('backup.restore')}</h2>
          {!restoring && restoreStatus !== 'in-progress' && (
            <button className="modal-close" onClick={onClose}>×</button>
          )}
        </div>

        <div className="modal-content restore-modal-content">
          {/* Warning Section */}
          <div className="restore-warning-section">
            <div className="restore-warning-icon">⚠️</div>
            <div className="restore-warning-content">
              <h3>{t('backup.restoreWarningTitle')}</h3>
              <ul className="restore-warning-list">
                <li>{t('backup.restoreWarning1')}</li>
                <li>{t('backup.restoreWarning2')}</li>
                <li>{t('backup.restoreWarning3')}</li>
              </ul>
            </div>
          </div>

          {/* Backup Selection */}
          {loading ? (
            <div className="restore-loading">
              <div className="spinner"></div>
              <p>{t('backup.loadingBackups')}</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="restore-error-box">
              <div className="restore-error-icon">❌</div>
              <p>{t('backup.noBackupsAvailable')}</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">{t('backup.selectBackupFile')}</label>
                <select
                  className="form-input"
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  disabled={restoring || restoreStatus === 'in-progress'}
                >
                  {backups.map((backup) => (
                    <option key={backup.filename} value={backup.filename}>
                      {backup.filename} ({formatFileSize(backup.size)}) - {formatDate(backup.created)}
                    </option>
                  ))}
                </select>
                {selectedBackupInfo && (
                  <div className="backup-info-box">
                    <div className="backup-info-row">
                      <span className="backup-info-label">{t('backup.fileName')}:</span>
                      <span className="backup-info-value">{selectedBackupInfo.filename}</span>
                    </div>
                    <div className="backup-info-row">
                      <span className="backup-info-label">{t('backup.fileSize')}:</span>
                      <span className="backup-info-value">{formatFileSize(selectedBackupInfo.size)}</span>
                    </div>
                    <div className="backup-info-row">
                      <span className="backup-info-label">{t('backup.createdDate')}:</span>
                      <span className="backup-info-value">{formatDate(selectedBackupInfo.created)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Restore Status */}
              {restoreStatus === 'in-progress' && (
                <div className="restore-status-box restore-status-progress">
                  <div className="restore-status-icon">
                    <div className="spinner"></div>
                  </div>
                  <div className="restore-status-content">
                    <h4>{t('backup.restoringInProgress')}</h4>
                    <p>{t('backup.restoreInProgressDetails')}</p>
                  </div>
                </div>
              )}

              {restoreStatus === 'success' && (
                <div className="restore-status-box restore-status-success">
                  <div className="restore-status-icon">✅</div>
                  <div className="restore-status-content">
                    <h4>{restoreMessage}</h4>
                    <p>{restoreDetails}</p>
                    <p className="restore-restart-notice">{t('backup.appWillRestart')}</p>
                  </div>
                </div>
              )}

              {restoreStatus === 'error' && (
                <div className="restore-status-box restore-status-error">
                  <div className="restore-status-icon">❌</div>
                  <div className="restore-status-content">
                    <h4>{restoreMessage}</h4>
                    {restoreDetails && (
                      <div className="restore-error-details">
                        <p><strong>{t('backup.errorDetails')}:</strong></p>
                        <pre>{restoreDetails}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {restoreStatus !== 'success' && (
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={restoring || restoreStatus === 'in-progress'}
            >
              {t('common.cancel')}
            </button>
          )}
          {backups.length > 0 && restoreStatus !== 'success' && (
            <button
              className="btn btn-danger"
              onClick={handleRestore}
              disabled={!selectedBackup || restoring || restoreStatus === 'in-progress'}
            >
              {restoring || restoreStatus === 'in-progress' 
                ? t('backup.restoring') 
                : t('backup.confirmRestore')}
            </button>
          )}
          {restoreStatus === 'success' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (window.electronAPI && window.electronAPI.restartApp) {
                  window.electronAPI.restartApp();
                } else {
                  window.location.reload();
                }
              }}
            >
              {t('backup.restartNow')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestoreModal;

