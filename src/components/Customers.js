import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { customersAPI } from '../services/api';
import CustomerModal from './CustomerModal';
import CustomerDetailView from './CustomerDetailView';
import Pagination from './Pagination';
import './Customers.css';

const Customers = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersAPI.getAll();
      setCustomers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err.response?.data?.error || t('customers.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

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
      setCustomers(customers.filter((c) => c.customer_id !== customerId));
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
        const response = await customersAPI.update(editingCustomer.customer_id, customerData);
        setCustomers(
          customers.map((c) => (c.customer_id === editingCustomer.customer_id ? response.data : c))
        );
      } else {
        const response = await customersAPI.create(customerData);
        setCustomers(
          [...customers, response.data].sort(
            (a, b) => (parseFloat(b.current_due) || 0) - (parseFloat(a.current_due) || 0)
          )
        );
      }
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
        <div className="cus2-loading">
          <span className="cus2-loading-ring" aria-hidden />
          <p>
            {t('common.loading')} {t('customers.title').toLowerCase()}...
          </p>
        </div>
      </div>
    );
  }

  if (viewingCustomer) {
    return (
      <CustomerDetailView
        customerId={viewingCustomer}
        onClose={() => {
          setViewingCustomer(null);
          fetchCustomers();
        }}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="content-container cus2">
      <header className="cus2-hero">
        <div className="cus2-hero-accent" aria-hidden />
        <div className="cus2-hero-inner">
          <div>
            <span className="cus2-eyebrow">{t('menu.customers')}</span>
            <h1 className="cus2-hero-title">{t('customers.title')}</h1>
            <p className="cus2-hero-sub">{t('customers.subtitle')}</p>
          </div>
          <div className="cus2-hero-stat">
            <span className="cus2-hero-stat-val">{filteredCustomers.length}</span>
            <span className="cus2-hero-stat-label">{t('customers.results')}</span>
          </div>
        </div>
      </header>

      {error ? <div className="cus2-alert cus2-alert--error">{error}</div> : null}

      {!readOnly ? (
        <section className="cus2-panel cus2-panel--head">
          <div className="cus2-panel-head-row">
            <h2>{t('customers.title')}</h2>
            <button type="button" className="cus2-btn cus2-btn--primary" onClick={handleAdd}>
              + {t('customers.addCustomer')}
            </button>
          </div>
        </section>
      ) : null}

      {modalOpen ? (
        <CustomerModal customer={editingCustomer} onClose={handleModalClose} onSave={handleModalSave} />
      ) : null}

      {!modalOpen ? (
        <>
          <section className="cus2-panel cus2-panel--filters">
            <div className="cus2-filter-grid">
              <div className="cus2-field">
                <label className="cus2-label">{t('customers.searchCustomer')}</label>
                <input
                  type="text"
                  className="cus2-input"
                  placeholder={t('customers.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="cus2-filter-actions">
                {searchQuery ? (
                  <button type="button" className="cus2-btn cus2-btn--ghost" onClick={() => setSearchQuery('')}>
                    {t('common.clear')}
                  </button>
                ) : null}
                <div className="cus2-segment" role="tablist" aria-label="Balance filter">
                  <button
                    type="button"
                    className={`cus2-segment-btn ${balanceFilter === 'all' ? 'cus2-segment-btn--on' : ''}`}
                    onClick={() => setBalanceFilter('all')}
                  >
                    {t('customers.filterAll')}
                  </button>
                  <button
                    type="button"
                    className={`cus2-segment-btn ${balanceFilter === 'due' ? 'cus2-segment-btn--on' : ''}`}
                    onClick={() => setBalanceFilter('due')}
                  >
                    {t('customers.filterWithBalance')}
                  </button>
                  <button
                    type="button"
                    className={`cus2-segment-btn ${balanceFilter === 'cleared' ? 'cus2-segment-btn--on' : ''}`}
                    onClick={() => setBalanceFilter('cleared')}
                  >
                    {t('customers.filterCleared')}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="cus2-panel">
            <div className="cus2-toolbar">
              <h2>{t('customers.customersList')}</h2>
              {readOnly ? <span className="cus2-readonly">{t('common.readOnlyMode')}</span> : null}
            </div>

            <div className="cus2-table-wrap">
              <table className="cus2-table">
                <thead>
                  <tr>
                    <th>{t('customers.customerName')}</th>
                    <th>{t('customers.mobileNumber')}</th>
                    <th>{t('customers.totalDue')}</th>
                    <th>{t('customers.lastActivity')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="cus2-empty">
                        {searchQuery
                          ? t('customers.noCustomersMatching', { query: searchQuery })
                          : t('customers.noCustomers')}
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((customer) => {
                      const due = parseFloat(customer.current_due || customer.current_balance || 0);
                      const lastActivity = customer.last_sale_date || customer.last_payment_date;
                      return (
                        <tr key={customer.customer_id}>
                          <td>
                            <strong className="cus2-name">{customer.name}</strong>
                          </td>
                          <td>{customer.phone || '-'}</td>
                          <td>
                            <span
                              className={`cus2-due ${due > 0 ? 'cus2-due--negative' : due === 0 ? 'cus2-due--clear' : ''}`}
                            >
                              {formatCurrency(due)}
                            </span>
                          </td>
                          <td>{formatDate(lastActivity)}</td>
                          <td className="cus2-actions">
                            {!readOnly ? (
                              <>
                                <button type="button" className="cus2-action cus2-action--view" onClick={() => handleView(customer)}>
                                  {t('common.view')}
                                </button>
                                <button type="button" className="cus2-action cus2-action--edit" onClick={() => handleEdit(customer)}>
                                  {t('common.edit')}
                                </button>
                                <button
                                  type="button"
                                  className="cus2-action cus2-action--delete"
                                  onClick={() => setDeleteConfirm(customer.customer_id)}
                                >
                                  {t('common.delete')}
                                </button>
                              </>
                            ) : (
                              <span className="cus2-viewonly">{t('common.viewOnly')}</span>
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
              <div className="cus2-pagination">
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
              <div className="modal delete-modal cus2-delete-modal" onClick={(e) => e.stopPropagation()}>
                <h3>{t('common.confirmDelete')}</h3>
                <p>
                  {t('customers.deleteConfirm')} {t('common.cannotBeUndone')}
                </p>
                <div className="modal-actions">
                  <button className="cus2-btn cus2-btn--ghost" onClick={() => setDeleteConfirm(null)}>
                    {t('common.cancel')}
                  </button>
                  <button className="cus2-btn cus2-btn--danger" onClick={() => handleDelete(deleteConfirm)}>
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default Customers;
