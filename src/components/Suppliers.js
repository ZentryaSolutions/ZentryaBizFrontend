import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersAPI } from '../services/api';
import SupplierModal from './SupplierModal';
import SupplierDetailView from './SupplierDetailView';
import Pagination from './Pagination';
import './Suppliers.css';

const Suppliers = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersAPI.getAll();
      setSuppliers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err.response?.data?.error || t('suppliers.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setModalOpen(true);
  };

  const handleView = (supplier) => {
    setViewingSupplier(supplier.supplier_id);
  };

  const handleDelete = async (supplierId) => {
    try {
      await suppliersAPI.delete(supplierId);
      setSuppliers(suppliers.filter((s) => s.supplier_id !== supplierId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting supplier:', err);
      alert(err.response?.data?.error || t('suppliers.supplierFailed'));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingSupplier(null);
  };

  const handleModalSave = async (supplierData) => {
    try {
      if (editingSupplier) {
        const response = await suppliersAPI.update(editingSupplier.supplier_id, supplierData);
        setSuppliers(
          suppliers.map((s) => (s.supplier_id === editingSupplier.supplier_id ? response.data : s))
        );
      } else {
        const response = await suppliersAPI.create(supplierData);
        setSuppliers([...suppliers, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      handleModalClose();
    } catch (err) {
      console.error('Error saving supplier:', err);
      throw err;
    }
  };

  const formatCurrency = (amount) => `PKR ${Number(amount || 0).toFixed(2)}`;

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) {
      return suppliers;
    }
    const query = searchQuery.toLowerCase().trim();
    return suppliers.filter((supplier) => {
      const name = (supplier.name || '').toLowerCase();
      const contact = (supplier.contact_number || '').toLowerCase();
      return name.includes(query) || contact.includes(query);
    });
  }, [suppliers, searchQuery]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="content-container sup2">
        <div className="sup2-loading">
          <span className="sup2-loading-ring" aria-hidden />
          <p>
            {t('common.loading')} {t('suppliers.title').toLowerCase()}...
          </p>
        </div>
      </div>
    );
  }

  if (viewingSupplier) {
    return (
      <SupplierDetailView
        supplierId={viewingSupplier}
        onClose={() => {
          setViewingSupplier(null);
          fetchSuppliers();
        }}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="content-container sup2">
      <header className="sup2-hero">
        <div className="sup2-hero-accent" aria-hidden />
        <div className="sup2-hero-inner">
          <div>
            <span className="sup2-eyebrow">{t('menu.suppliers')}</span>
            <h1 className="sup2-hero-title">{t('suppliers.title')}</h1>
            <p className="sup2-hero-sub">{t('suppliers.subtitle')}</p>
          </div>
          <div className="sup2-hero-stat">
            <span className="sup2-hero-stat-val">{filteredSuppliers.length}</span>
            <span className="sup2-hero-stat-label">{t('suppliers.results')}</span>
          </div>
        </div>
      </header>

      {error ? <div className="sup2-alert sup2-alert--error">{error}</div> : null}

      {!readOnly ? (
        <section className="sup2-panel sup2-panel--head">
          <div className="sup2-panel-head-row">
            <h2>{t('suppliers.title')}</h2>
            <button className="sup2-btn sup2-btn--primary" onClick={handleAdd}>
              + {t('suppliers.addSupplier')}
            </button>
          </div>
        </section>
      ) : null}

      <section className="sup2-panel sup2-panel--filters">
        <div className="sup2-filter-grid">
          <div className="sup2-field">
            <label className="sup2-label">{t('suppliers.searchSuppliers')}</label>
            <input
              type="text"
              className="sup2-input"
              placeholder={t('suppliers.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery ? (
            <button type="button" className="sup2-btn sup2-btn--ghost" onClick={() => setSearchQuery('')}>
              {t('common.clear')}
            </button>
          ) : null}
        </div>
      </section>

      <section className="sup2-panel">
        <div className="sup2-toolbar">
          <h2>{t('suppliers.suppliersList')}</h2>
          {readOnly ? <span className="sup2-readonly">{t('common.readOnlyMode')}</span> : null}
        </div>

        <div className="sup2-table-wrap">
          <table className="sup2-table">
            <thead>
              <tr>
                <th>{t('suppliers.supplierName')}</th>
                <th>{t('suppliers.contact')}</th>
                <th>{t('suppliers.balance')}</th>
                <th>{t('suppliers.lastActivity')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="sup2-empty">
                    {searchQuery ? t('suppliers.noSuppliersMatching', { query: searchQuery }) : t('suppliers.noSuppliers')}
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((supplier) => {
                  const balance = parseFloat(supplier.current_payable_balance || 0);
                  const lastActivity = supplier.last_purchase_date || supplier.last_payment_date;
                  return (
                    <tr key={supplier.supplier_id}>
                      <td><strong className="sup2-name">{supplier.name}</strong></td>
                      <td>{supplier.contact_number || '-'}</td>
                      <td>
                        <span
                          className={`sup2-balance ${balance > 0 ? 'sup2-balance--due' : balance === 0 ? 'sup2-balance--clear' : ''}`}
                        >
                          {formatCurrency(balance)}
                        </span>
                      </td>
                      <td>{formatDate(lastActivity)}</td>
                      <td className="sup2-actions">
                        {!readOnly ? (
                          <>
                            <button className="sup2-action sup2-action--view" onClick={() => handleView(supplier)}>
                              {t('common.view')}
                            </button>
                            <button className="sup2-action sup2-action--edit" onClick={() => handleEdit(supplier)}>
                              {t('common.edit')}
                            </button>
                            <button className="sup2-action sup2-action--delete" onClick={() => setDeleteConfirm(supplier.supplier_id)}>
                              {t('common.delete')}
                            </button>
                          </>
                        ) : (
                          <span className="sup2-viewonly">{t('common.viewOnly')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length > 0 ? (
          <div className="sup2-pagination">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredSuppliers.length}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          </div>
        ) : null}
      </section>

      {deleteConfirm ? (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal delete-modal sup2-delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('common.confirmDelete')}</h3>
            <p>{t('suppliers.deleteConfirm')} {t('common.cannotBeUndone')}</p>
            <div className="modal-actions">
              <button className="sup2-btn sup2-btn--ghost" onClick={() => setDeleteConfirm(null)}>
                {t('common.cancel')}
              </button>
              <button className="sup2-btn sup2-btn--danger" onClick={() => handleDelete(deleteConfirm)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <SupplierModal supplier={editingSupplier} onClose={handleModalClose} onSave={handleModalSave} />
      ) : null}
    </div>
  );
};

export default Suppliers;
