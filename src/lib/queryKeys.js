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
  };
}
