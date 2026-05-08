import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';
import InviteStaffModal from './InviteStaffModal';
import './Users.css';

const Users = () => {
  const { t } = useTranslation();
  const { user: currentUser, activeShopId } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, [activeShopId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser({ ...user });
  };

  const handleSave = async () => {
    try {
      const { user_id } = editingUser;
      const updateData = {
        name: editingUser.name || '',
        role: editingUser.role || 'cashier',
      };
      await usersAPI.update(user_id, updateData);
      await fetchUsers();
      setEditingUser(null);
      alert(t('users.updateSuccess'));
    } catch (err) {
      alert(err.response?.data?.message || t('users.updateFailed'));
    }
  };

  const handleDelete = async (userId) => {
    try {
      await usersAPI.delete(userId);
      await fetchUsers();
      setDeleteConfirm(null);
      alert(t('users.deleteSuccess'));
    } catch (err) {
      alert(err.response?.data?.message || t('users.deleteFailed'));
    }
  };

  const handleAdd = async (userData) => {
    try {
      await usersAPI.sendInvitation(userData);
      setShowAddModal(false);
      alert('Invitation sent successfully');
    } catch (err) {
      const d = err.response?.data;
      const msg = [d?.message, d?.detail].filter(Boolean).join('\n');
      alert(msg || t('users.createFailed'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isLastAdmin = (user) => {
    if (user.role !== 'administrator') return false;
    const activeAdmins = users.filter(u => u.role === 'administrator' && u.is_active);
    return activeAdmins.length === 1;
  };

  const isCurrentUser = (user) => {
    return currentUser && user.user_id === currentUser.userId;
  };

  // Pagination
  const filteredUsers = users;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="content-container">
        <div className="loading">{t('users.loading')}</div>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div className="page-header">
        <h1 className="page-title">{t('menu.users')}</h1>
        <p className="page-subtitle">{t('users.subtitle')}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-header-content">
            <h2>{t('users.userList')}</h2>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + {t('users.addUser')}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>{t('users.email')}</th>
                <th>{t('users.name')}</th>
                <th>{t('users.role')}</th>
                <th>{t('users.status')}</th>
                <th>{t('users.createdAt')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {t('users.noUsers')}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>{user.username}</td>
                    <td>{user.name || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${user.role === 'administrator' ? 'admin' : 'cashier'}`}>
                        {user.role === 'administrator' ? t('auth.admin') : t('auth.cashier')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td className="actions-cell">
                      {editingUser?.user_id === user.user_id ? (
                        <>
                          <button className="btn-edit" onClick={handleSave}>
                            {t('common.save')}
                          </button>
                          <button className="btn-secondary" onClick={() => setEditingUser(null)}>
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(user)}
                            disabled={isCurrentUser(user) && isLastAdmin(user)}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => setDeleteConfirm(user.user_id)}
                            disabled={isCurrentUser(user) || isLastAdmin(user)}
                            title={
                              isCurrentUser(user)
                                ? t('users.cannotDeleteSelf')
                                : isLastAdmin(user)
                                ? t('users.cannotDeleteLastAdmin')
                                : ''
                            }
                          >
                            {t('common.delete')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('users.editUser')}</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="modal-content">
              <div className="zb-form-grid zb-form-grid--2">
                <div className="form-group zb-form-grid__full">
                  <label>{t('users.email')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editingUser.username || ''}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.role')}</label>
                  <select
                    className="form-input"
                    value={editingUser.role || 'cashier'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    disabled={isCurrentUser(editingUser) || isLastAdmin(editingUser)}
                  >
                    <option value="administrator">{t('auth.admin')}</option>
                    <option value="cashier">{t('auth.cashier')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={handleSave}>
                  {t('common.save')}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <InviteStaffModal onClose={() => setShowAddModal(false)} onSave={handleAdd} />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('users.confirmDelete')}</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-content">
              <p>{t('users.deleteWarning')}</p>
              <div className="modal-actions">
                <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                  {t('common.delete')}
                </button>
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

