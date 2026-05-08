import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBoxesStacked,
  faDollarSign,
  faDownload,
  faEye,
  faFileInvoiceDollar,
  faPenToSquare,
  faReceipt,
  faTrashCan,
  faTruckFast,
} from '@fortawesome/free-solid-svg-icons';
import { suppliersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchInventoryBundle } from '../lib/workspaceQueries';
import PageLoadingCenter from './PageLoadingCenter';
import SupplierModal from './SupplierModal';
import SupplierDetailView from './SupplierDetailView';
import Pagination from './Pagination';
import { posApiQueriesEnabled } from '../lib/appMode';
import './Suppliers.css';

const Suppliers = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: suppliers = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: zbKeys(activeShopId).inventoryBundle(),
    queryFn: fetchInventoryBundle,
    enabled: posApiQueriesEnabled(activeShopId),
    select: (d) => d?.suppliers ?? [],
  });

  const error = useMemo(() => {
    if (!isError || !queryError) return null;
    return queryError.response?.data?.error || t('suppliers.failedToLoad');
  }, [isError, queryError, t]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleAdd = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleEdit = (supplier) => {
    // Open immediately for snappy UX, then hydrate with latest DB row in background.
    setEditingSupplier(supplier);
    setModalOpen(true);
    suppliersAPI
      .getById(supplier.supplier_id)
      .then((response) => {
        setEditingSupplier((prev) =>
          prev && prev.supplier_id === supplier.supplier_id ? (response.data || prev) : prev
        );
      })
      .catch((err) => {
        console.warn('Failed to fetch latest supplier after opening edit modal:', err);
      });
  };

  const handleView = (supplier) => {
    setViewingSupplier(supplier.supplier_id);
  };

  const handleDelete = async (supplierId) => {
    try {
      await suppliersAPI.delete(supplierId);
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
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
        await suppliersAPI.update(editingSupplier.supplier_id, supplierData);
      } else {
        await suppliersAPI.create(supplierData);
      }
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
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

  const formatRelative = (date) => {
    if (!date) return '-';
    const now = Date.now();
    const then = new Date(date).getTime();
    if (Number.isNaN(then)) return '-';
    const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return '1 week ago';
    if (weeks < 5) return `${weeks} weeks ago`;
    return formatDate(date);
  };

  const isRecentlyActive = (date) => {
    if (!date) return false;
    const then = new Date(date).getTime();
    if (Number.isNaN(then)) return false;
    const diffDays = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const getLastMovementDate = (supplier) =>
    supplier.last_purchase_date || supplier.last_payment_date || supplier.created_at || null;

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return suppliers.filter((supplier) => {
      const name = (supplier.name || '').toLowerCase();
      const contact = (supplier.contact_number || '').toLowerCase();
      const email = (supplier.email || '').toLowerCase();
      const balance = Number(supplier.current_payable_balance || 0);
      const matchesSearch =
        !query || name.includes(query) || contact.includes(query) || email.includes(query);
      const matchesBalance =
        balanceFilter === 'all'
          ? true
          : balanceFilter === 'owed'
            ? balance > 0
            : balance <= 0;
      return matchesSearch && matchesBalance;
    });
  }, [suppliers, searchQuery, balanceFilter]);

  const summary = useMemo(() => {
    const totalPayable = suppliers.reduce(
      (sum, s) => sum + Math.max(0, Number(s.current_payable_balance || 0)),
      0
    );
    const activeSuppliers = suppliers.filter(
      (s) => String(s.status || 'active').toLowerCase() === 'active'
    ).length;
    const totalCreditPurchases = suppliers.reduce(
      (sum, s) => sum + Math.max(0, Number(s.total_credit_purchases || 0)),
      0
    );
    const owedCount = suppliers.filter((s) => Number(s.current_payable_balance || 0) > 0).length;
    const settledCount = suppliers.filter((s) => Number(s.current_payable_balance || 0) <= 0).length;
    return {
      totalPayable,
      activeSuppliers,
      totalCreditPurchases,
      owedCount,
      settledCount,
    };
  }, [suppliers]);

  const exportCsv = () => {
    const rows = filteredSuppliers.map((s) => ({
      Name: s.name || '',
      Contact: s.contact_number || '',
      Email: s.email || '',
      Balance: Number(s.current_payable_balance || 0).toFixed(2),
      Status: s.status || 'active',
      LastOrder: getLastMovementDate(s) ? formatDate(getLastMovementDate(s)) : '',
    }));
    const header = Object.keys(rows[0] || {
      Name: '',
      Contact: '',
      Email: '',
      Balance: '',
      Status: '',
      LastOrder: '',
    });
    const csv = [
      header.join(','),
      ...rows.map((r) =>
        header.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'suppliers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, balanceFilter]);

  if (loading) {
    return (
      <div className="content-container sup2">
        <PageLoadingCenter message={`${t('common.loading')} ${t('suppliers.title').toLowerCase()}…`} />
      </div>
    );
  }

  if (viewingSupplier) {
    return (
      <SupplierDetailView
        supplierId={viewingSupplier}
        onClose={() => {
          setViewingSupplier(null);
          queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).inventoryBundle() });
        }}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="content-container sup2">
      <div className="sup3-topline">
        <button type="button" className="sup3-back" onClick={() => window.history.back()}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1>{t('suppliers.title')}</h1>
      </div>

      <section className="sup3-stats">
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--money">
            <FontAwesomeIcon icon={faDollarSign} />
          </span>
          <h3>{`PKR ${summary.totalPayable.toLocaleString()}`}</h3>
          <p>Total Payable</p>
          <small>{summary.owedCount} pending payments</small>
        </article>
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--green">
            <FontAwesomeIcon icon={faTruckFast} />
          </span>
          <h3>{suppliers.length}</h3>
          <p>Total Suppliers</p>
          <small>{summary.activeSuppliers} active this month</small>
        </article>
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--blue">
            <FontAwesomeIcon icon={faBoxesStacked} />
          </span>
          <h3>{summary.owedCount}</h3>
          <p>Suppliers with dues</p>
          <small>{summary.settledCount} settled</small>
        </article>
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--purple">
            <FontAwesomeIcon icon={faFileInvoiceDollar} />
          </span>
          <h3>{`PKR ${summary.totalCreditPurchases.toLocaleString()}`}</h3>
          <p>Lifetime Purchases</p>
          <small>All time</small>
        </article>
      </section>

      <header className="sup3-header">
        <div>
          <h2>Suppliers</h2>
          <p>Manage your vendors and track outstanding balances</p>
        </div>
        {!readOnly ? (
          <button className="sup3-addBtn" onClick={handleAdd}>
            + Add Supplier
          </button>
        ) : null}
      </header>

      {error ? <div className="sup2-alert sup2-alert--error">{error}</div> : null}

      <section className="sup3-mainCard">
        <div className="sup3-filterRow">
          <input
            type="text"
            className="sup3-search"
            placeholder="Search by name, contact or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="sup3-chips">
            <button
              className={`sup3-chip ${balanceFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setBalanceFilter('all')}
              type="button"
            >
              All
            </button>
            <button
              className={`sup3-chip ${balanceFilter === 'owed' ? 'is-active' : ''}`}
              onClick={() => setBalanceFilter('owed')}
              type="button"
            >
              Balance Owed <span>{summary.owedCount}</span>
            </button>
            <button
              className={`sup3-chip ${balanceFilter === 'settled' ? 'is-active' : ''}`}
              onClick={() => setBalanceFilter('settled')}
              type="button"
            >
              Settled <span>{summary.settledCount}</span>
            </button>
            <button className="sup3-chip" onClick={exportCsv} type="button">
              <FontAwesomeIcon icon={faDownload} /> Export
            </button>
          </div>
        </div>

        <div className="sup3-tableWrap">
          <table className="sup3-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Last Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sup2-empty">
                    {searchQuery ? t('suppliers.noSuppliersMatching', { query: searchQuery }) : t('suppliers.noSuppliers')}
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((supplier) => {
                  const balance = parseFloat(supplier.current_payable_balance || 0);
                  const lastMovement = getLastMovementDate(supplier);
                  const statusText = isRecentlyActive(lastMovement) ? 'Active' : 'Inactive';
                  return (
                    <tr key={supplier.supplier_id}>
                      <td>
                        <div className="sup3-supplierCell">
                          <span className="sup3-avatar">
                            {String(supplier.name || 'S')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <div>
                            <strong className="sup2-name">{supplier.name}</strong>
                            <small>{supplier.address || '-'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sup3-contactCell">
                          <div>{supplier.contact_number || '-'}</div>
                          <small>{supplier.email || '-'}</small>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`sup2-balance ${balance > 0 ? 'sup2-balance--due' : balance === 0 ? 'sup2-balance--clear' : ''}`}
                        >
                          {balance > 0 ? `PKR ${Math.round(balance).toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`sup3-status ${statusText === 'Active' ? 'is-active' : 'is-inactive'}`}>
                          <span className="sup3-statusDot" aria-hidden="true" />
                          {statusText}
                        </span>
                      </td>
                      <td className="sup3-lastOrder">{formatRelative(lastMovement)}</td>
                      <td className="sup2-actions">
                        {!readOnly ? (
                          <div className="sup3-rowActions">
                            <button className="sup3-rowAction" onClick={() => handleView(supplier)} aria-label="View supplier">
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                            <button className="sup3-rowAction" onClick={() => handleEdit(supplier)} aria-label="Edit supplier">
                              <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button className="sup3-rowAction sup3-rowAction--danger" onClick={() => setDeleteConfirm(supplier.supplier_id)} aria-label="Delete supplier">
                              <FontAwesomeIcon icon={faTrashCan} />
                            </button>
                          </div>
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
