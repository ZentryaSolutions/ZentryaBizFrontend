/**
 * All TanStack Query keys for shop data MUST start with ['zb', shopId, ...].
 * Never use a key without shopId for shop-scoped API data — prevents cross-shop cache bleed.
 */
export function zbKeys(shopId) {
  const sid = shopId != null ? String(shopId) : '';
  return {
    /** Prefix for this shop only — use with removeQueries predicate */
    root: ['zb', sid],
    inventoryBundle: () => ['zb', sid, 'inventoryBundle'],
    dashboard: () => ['zb', sid, 'dashboard'],
    customersList: () => ['zb', sid, 'customers'],
    settingsDoc: () => ['zb', sid, 'settings'],
    salesList: () => ['zb', sid, 'sales'],
    purchasesList: () => ['zb', sid, 'purchases'],
    /** Single cached payload for CustomerDetailView (customer + sales + payments history) */
    customerDetailPack: (customerId) => ['zb', sid, 'customerPack', String(customerId)],
    /** Single cached payload for ProductDetailView (product + activity) */
    productDetailPack: (productId) => ['zb', sid, 'productPack', String(productId)],
    /** Single cached payload for SupplierDetailView */
    supplierDetailPack: (supplierId) => ['zb', sid, 'supplierPack', String(supplierId)],

    /** Reports — keys must align with params sent from Reports.js + workspace prefetch */
    reportsDashSummary: (p) =>
      ['zb', sid, 'reports', 'dashSummary', p?.period ?? '', p?.start_date ?? '', p?.end_date ?? ''],
    reportsSalesSummary: (p) =>
      [
        'zb',
        sid,
        'reports',
        'salesSummary',
        p?.period ?? '',
        p?.start_date ?? '',
        p?.end_date ?? '',
        p?.product_id != null && p.product_id !== '' ? String(p.product_id) : '',
      ],
    reportsSalesInvoices: (p) =>
      [
        'zb',
        sid,
        'reports',
        'salesInvoices',
        p?.period ?? '',
        p?.start_date ?? '',
        p?.end_date ?? '',
        p?.product_id != null && p.product_id !== '' ? String(p.product_id) : '',
      ],
    reportsSalesByProduct: (p) =>
      [
        'zb',
        sid,
        'reports',
        'salesByProduct',
        p?.period ?? '',
        p?.start_date ?? '',
        p?.end_date ?? '',
        p?.product_id != null && p.product_id !== '' ? String(p.product_id) : '',
      ],
    reportsProfit: (p) =>
      ['zb', sid, 'reports', 'profit', p?.period ?? '', p?.start_date ?? '', p?.end_date ?? ''],
    reportsExpensesSummary: (p) =>
      ['zb', sid, 'reports', 'expensesSummary', p?.period ?? '', p?.start_date ?? '', p?.end_date ?? ''],
    reportsExpensesList: (p) =>
      ['zb', sid, 'reports', 'expensesList', p?.period ?? '', p?.start_date ?? '', p?.end_date ?? ''],
    reportsCustomersAnalytics: (start, end) => ['zb', sid, 'reports', 'custAnalytics', String(start), String(end)],
    reportsSuppliersAnalytics: (start, end) => ['zb', sid, 'reports', 'supAnalytics', String(start), String(end)],
    reportsCustomersDue: () => ['zb', sid, 'reports', 'customersDue'],
    reportsSupplierPayables: () => ['zb', sid, 'reports', 'supplierPayables'],
    reportsStockLow: (minQty) => ['zb', sid, 'reports', 'stockLow', String(minQty ?? 5)],
  };
}
