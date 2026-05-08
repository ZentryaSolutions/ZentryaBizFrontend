import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBoxesStacked,
  faDollarSign,
  faEye,
  faPenToSquare,
  faReceipt,
  faTrashCan,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { customersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { zbKeys } from '../lib/queryKeys';
import { fetchCustomersList } from '../lib/workspaceQueries';
import PageLoadingCenter from './PageLoadingCenter';
import CustomerModal from './CustomerModal';
import CustomerDetailView from './CustomerDetailView';
import Pagination from './Pagination';
import './Customers.css';
import { posApiQueriesEnabled } from '../lib/appMode';
import './Suppliers.css';

const Customers = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: zbKeys(activeShopId).customersList(),
    queryFn: fetchCustomersList,
    enabled: posApiQueriesEnabled(activeShopId),
  });

  const error = useMemo(() => {
    if (!isError || !queryError) return null;
    return queryError.response?.data?.error || t('customers.failedToLoad');
  }, [isError, queryError, t]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleView = (customer) => {
    setViewingCustomer(customer.customer_id);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const handleDelete = async (customerId) => {
    try {
      await customersAPI.delete(customerId);
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).customersList() });
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert(err.response?.data?.error || t('customers.failedToDelete'));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCustomer(null);
  };

  const handleModalSave = async (customerData) => {
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.customer_id, customerData);
      } else {
        await customersAPI.create(customerData);
      }
      await queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).customersList() });
      handleModalClose();
    } catch (err) {
      console.error('Error saving customer:', err);
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

  const getLastMovementDate = (customer) =>
    customer.last_sale_date || customer.last_payment_date || customer.created_at || null;

  const isRecentlyActive = (date) => {
    if (!date) return false;
    const then = new Date(date).getTime();
    if (Number.isNaN(then)) return false;
    const diffDays = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (balanceFilter === 'due') {
      list = list.filter((c) => parseFloat(c.current_due || c.current_balance || 0) > 0);
    } else if (balanceFilter === 'cleared') {
      list = list.filter((c) => parseFloat(c.current_due || c.current_balance || 0) === 0);
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const query = searchQuery.toLowerCase().trim();
    return list.filter((customer) => {
      const name = (customer.name || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [customers, searchQuery, balanceFilter]);

  const summary = useMemo(() => {
    const totalReceivable = customers.reduce(
      (sum, c) => sum + Math.max(0, Number(c.current_due || c.current_balance || 0)),
      0
    );
    const activeCustomers = customers.filter((c) =>
      isRecentlyActive(getLastMovementDate(c))
    ).length;
    const dueCount = customers.filter((c) => Number(c.current_due || c.current_balance || 0) > 0).length;
    const settledCount = customers.filter((c) => Number(c.current_due || c.current_balance || 0) <= 0).length;
    return { totalReceivable, activeCustomers, dueCount, settledCount };
  }, [customers]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, balanceFilter]);

  if (loading) {
    return (
      <div className="content-container cus2">
        <PageLoadingCenter message={`${t('common.loading')} ${t('customers.title').toLowerCase()}…`} />
      </div>
    );
  }

  if (viewingCustomer) {
    return (
      <CustomerDetailView
        customerId={viewingCustomer}
        onClose={() => {
          setViewingCustomer(null);
          queryClient.invalidateQueries({ queryKey: zbKeys(activeShopId).customersList() });
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
        <h1>{t('customers.title')}</h1>
      </div>

      <section className="sup3-stats">
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--money">
            <FontAwesomeIcon icon={faDollarSign} />
          </span>
          <h3>{`PKR ${Math.round(summary.totalReceivable).toLocaleString()}`}</h3>
          <p>Total Receivable</p>
          <small>{summary.dueCount} pending dues</small>
        </article>
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--green">
            <FontAwesomeIcon icon={faUsers} />
          </span>
          <h3>{customers.length}</h3>
          <p>Total Customers</p>
          <small>{summary.activeCustomers} active this week</small>
        </article>
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--blue">
            <FontAwesomeIcon icon={faBoxesStacked} />
          </span>
          <h3>{summary.dueCount}</h3>
          <p>Customers with dues</p>
          <small>{summary.settledCount} settled</small>
        </article>
        <article className="sup3-statCard">
          <span className="sup3-statIcon sup3-statIcon--purple">
            <FontAwesomeIcon icon={faReceipt} />
          </span>
          <h3>{filteredCustomers.length}</h3>
          <p>Filtered Results</p>
          <small>Current view</small>
        </article>
      </section>

      <header className="sup3-header">
        <div>
          <h2>Customers</h2>
          <p>Manage customer balances and payment activity</p>
        </div>
        {!readOnly ? (
          <button className="sup3-addBtn" onClick={handleAdd}>
            + Add Customer
          </button>
        ) : null}
      </header>

      {error ? <div className="sup2-alert sup2-alert--error">{error}</div> : null}

      <section className="sup3-mainCard">
        <div className="sup3-filterRow">
          <input
            type="text"
            className="sup3-search"
            placeholder="Search by name or phone..."
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
              className={`sup3-chip ${balanceFilter === 'due' ? 'is-active' : ''}`}
              onClick={() => setBalanceFilter('due')}
              type="button"
            >
              Balance Due <span>{summary.dueCount}</span>
            </button>
            <button
              className={`sup3-chip ${balanceFilter === 'cleared' ? 'is-active' : ''}`}
              onClick={() => setBalanceFilter('cleared')}
              type="button"
            >
              Cleared <span>{summary.settledCount}</span>
            </button>
          </div>
        </div>

        <div className="sup3-tableWrap">
          <table className="sup3-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="sup2-empty">
                    {searchQuery
                      ? t('customers.noCustomersMatching', { query: searchQuery })
                      : t('customers.noCustomers')}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const due = parseFloat(customer.current_due || customer.current_balance || 0);
                  const lastActivity = getLastMovementDate(customer);
                  const statusText = isRecentlyActive(lastActivity) ? 'Active' : 'Inactive';
                  return (
                    <tr key={customer.customer_id}>
                      <td>
                        <div className="sup3-supplierCell">
                          <span className="sup3-avatar">
                            {String(customer.name || 'C')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <div>
                            <strong className="sup2-name">{customer.name}</strong>
                            <small>{customer.address || '-'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sup3-contactCell">
                          <div>{customer.phone || '-'}</div>
                          <small>{customer.customer_type || 'cash'}</small>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`sup2-balance ${due > 0 ? 'sup2-balance--due' : 'sup2-balance--clear'}`}
                        >
                          {due > 0 ? `PKR ${Math.round(due).toLocaleString()}` : '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`sup3-status ${statusText === 'Active' ? 'is-active' : 'is-inactive'}`}>
                          <span className="sup3-statusDot" aria-hidden="true" />
                          {statusText}
                        </span>
                      </td>
                      <td className="sup3-lastOrder">{formatRelative(lastActivity)}</td>
                      <td className="sup2-actions">
                        {!readOnly ? (
                          <div className="sup3-rowActions">
                            <button className="sup3-rowAction" onClick={() => handleView(customer)} aria-label="View customer">
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                            <button className="sup3-rowAction" onClick={() => handleEdit(customer)} aria-label="Edit customer">
                              <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button className="sup3-rowAction sup3-rowAction--danger" onClick={() => setDeleteConfirm(customer.customer_id)} aria-label="Delete customer">
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

        {filteredCustomers.length > 0 ? (
          <div className="sup2-pagination">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCustomers.length}
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
            <p>{t('customers.deleteConfirm')} {t('common.cannotBeUndone')}</p>
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
        <CustomerModal customer={editingCustomer} onClose={handleModalClose} onSave={handleModalSave} />
      ) : null}
    </div>
  );
};

export default Customers;
