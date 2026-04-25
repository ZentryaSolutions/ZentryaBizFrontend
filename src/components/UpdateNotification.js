import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './UpdateNotification.css';

// Use the safe, pre-exposed API from preload.js
const electronAPI = window.electronAPI || null;

const UpdateNotification = () => {
  const { t } = useTranslation();
  const [updateState, setUpdateState] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);

  useEffect(() => {
    if (!electronAPI) return;

    // Listen for update events from custom UpdateManager
    const handleUpdateAvailable = (_event, info) => {
      const mandatory = info.mandatory || false;
      setIsMandatory(mandatory);
      
      setUpdateState({
        type: 'available',
        version: info.version,
        downloadUrl: info.downloadUrl,
        checksum: info.checksum,
        releaseDate: info.releaseDate,
        updateInfo: info // Store full info for installation
      });
      setShowNotification(true);
      
      // If mandatory, block UI and auto-start download
      if (mandatory) {
        handleInstallNow(info);
      }
    };

    const handleDownloadStarted = (_event, info) => {
      setUpdateState(prev => ({
        ...prev,
        type: 'downloading',
        version: info.version
      }));
      setShowNotification(true);
      setDownloadProgress(0);
    };

    const handleDownloadProgress = (_event, progress) => {
      setDownloadProgress(progress.percent || 0);
      setUpdateState(prev => ({ ...prev, type: 'downloading' }));
    };

    const handleInstalling = (_event, info) => {
      setUpdateState({
        type: 'installing',
        version: info.version
      });
      setShowNotification(true);
      setDownloadProgress(100);
    };

    const handleUpdateError = (_event, error) => {
      setUpdateState({ 
        type: 'error', 
        message: error.message || 'Update failed. Please try again later.'
      });
      setShowNotification(true);
      
      // If mandatory update failed, show retry option
      if (isMandatory) {
        // Keep notification visible for mandatory updates
      }
    };

    electronAPI.onUpdateEvent('update-available', handleUpdateAvailable);
    electronAPI.onUpdateEvent('update-download-started', handleDownloadStarted);
    electronAPI.onUpdateEvent('update-download-progress', handleDownloadProgress);
    electronAPI.onUpdateEvent('update-installing', handleInstalling);
    electronAPI.onUpdateEvent('update-error', handleUpdateError);

    return () => {
      electronAPI.removeUpdateListener('update-available', handleUpdateAvailable);
      electronAPI.removeUpdateListener('update-download-started', handleDownloadStarted);
      electronAPI.removeUpdateListener('update-download-progress', handleDownloadProgress);
      electronAPI.removeUpdateListener('update-installing', handleInstalling);
      electronAPI.removeUpdateListener('update-error', handleUpdateError);
    };
  }, [isMandatory]);

  const handleInstallNow = async (updateInfo = null) => {
    if (!electronAPI) return;
    
    try {
      const info = updateInfo || updateState?.updateInfo;
      if (!info) {
        console.error('No update info available');
        return;
      }
      
      const result = await electronAPI.installUpdateNow(info);
      if (!result.success) {
        setUpdateState({ type: 'error', message: result.error });
      }
    } catch (error) {
      console.error('Error installing update:', error);
      setUpdateState({ type: 'error', message: error.message });
    }
  };

  const handleSkip = async () => {
    if (!electronAPI || !updateState?.version) return;
    
    try {
      await electronAPI.skipUpdateVersion(updateState.version);
      setShowNotification(false);
      setUpdateState(null);
    } catch (error) {
      console.error('Error skipping update:', error);
    }
  };

  const handleLater = () => {
    if (isMandatory) {
      // Cannot skip mandatory updates
      return;
    }
    setShowNotification(false);
  };

  if (!showNotification || !updateState) {
    return null;
  }

  return (
    <div className={`update-notification-overlay ${isMandatory ? 'blocking' : ''}`}>
      <div className="update-notification">
        {updateState.type === 'checking' && (
          <div className="update-content">
            <div className="update-icon">🔄</div>
            <h3>{t('updates.checking')}</h3>
            <p>{t('updates.checkingMessage')}</p>
          </div>
        )}

        {updateState.type === 'available' && (
          <div className="update-content">
            <div className="update-icon">{isMandatory ? '🔒' : '✨'}</div>
            <h3>
              {isMandatory ? t('updates.mandatoryUpdate') : t('updates.updateAvailable')}
            </h3>
            <p>
              {t('updates.newVersionAvailable')}: <strong>v{updateState.version}</strong>
            </p>
            {isMandatory && (
              <p className="update-warning">
                {t('updates.mandatoryUpdateMessage')}
              </p>
            )}
            <div className="update-actions">
              <button className="btn btn-primary" onClick={() => handleInstallNow()}>
                {t('updates.updateNow')}
              </button>
              {!isMandatory && (
                <button className="btn btn-secondary" onClick={handleLater}>
                  {t('updates.later')}
                </button>
              )}
            </div>
          </div>
        )}

        {updateState.type === 'downloading' && (
          <div className="update-content">
            <div className="update-icon">⬇️</div>
            <h3>{t('updates.downloading')}</h3>
            <div className="update-progress">
              <div className="update-progress-bar">
                <div 
                  className="update-progress-fill" 
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <span className="update-progress-text">{Math.round(downloadProgress)}%</span>
            </div>
            <p>{t('updates.downloadingMessage')}</p>
          </div>
        )}

        {updateState.type === 'installing' && (
          <div className="update-content">
            <div className="update-icon">⚙️</div>
            <h3>{t('updates.installing')}</h3>
            <p>
              {t('updates.installingMessage')}: <strong>v{updateState.version}</strong>
            </p>
            <p className="update-warning">
              {t('updates.restartRequired')}
            </p>
            <div className="update-progress">
              <div className="update-progress-bar">
                <div 
                  className="update-progress-fill" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {updateState.type === 'error' && (
          <div className="update-content">
            <div className="update-icon">⚠️</div>
            <h3>{t('updates.updateError')}</h3>
            <p>{updateState.message || t('updates.updateErrorMessage')}</p>
            <div className="update-actions">
              <button className="btn btn-secondary" onClick={handleLater}>
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateNotification;


