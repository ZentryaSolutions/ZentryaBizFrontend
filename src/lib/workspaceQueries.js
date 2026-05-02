import {
  productsAPI,
  suppliersAPI,
  categoriesAPI,
  reportsAPI,
  customersAPI,
  customerPaymentsAPI,
  settingsAPI,
  salesAPI,
  purchasesAPI,
  supplierPaymentsAPI,
} from '../services/api';
import { zbKeys } from './queryKeys';

/** Used by Inventory + Billing + Categories + Suppliers + bootstrap prefetch */
export async function fetchInventoryBundle() {
  let suppliersData = [];
  try {
    const suppliersResponse = await suppliersAPI.getAll();
    suppliersData = Array.isArray(suppliersResponse.data) ? suppliersResponse.data : [];
  } catch (supplierErr) {
    console.warn('Suppliers API not accessible (may require admin role):', supplierErr.message);
    suppliersData = [];
  }

  const categoriesResponse = await categoriesAPI.getAll();
  const categories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];

  const productsResponse = await productsAPI.getAll();
  let productsData = Array.isArray(productsResponse.data) ? productsResponse.data : [];

  productsData.sort((a, b) => {
    const aTime = new Date(a.updated_at || a.modified_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.modified_at || b.created_at || 0).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return Number(b.product_id || 0) - Number(a.product_id || 0);
  });

  return { suppliers: suppliersData, categories, products: productsData };
}

export async function fetchDashboardData() {
  const response = await reportsAPI.getDashboard();
  return response.data;
}

export async function fetchCustomersList() {
  const response = await customersAPI.getAll();
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchSettingsDoc() {
  const response = await settingsAPI.get();
  return response.data;
}

export async function fetchSalesList() {
  const response = await salesAPI.getAll();
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function fetchPurchasesList() {
  const response = await purchasesAPI.getAll();
  return Array.isArray(response.data) ? response.data : [];
}

/** Warm-up + CustomerDetailView — one round-trip bundle */
export async function fetchCustomerDetailPack(customerId) {
  const [custRes, salesRes, payRes] = await Promise.all([
    customersAPI.getById(customerId),
    salesAPI.getAll({ customer_id: customerId, limit: 500 }),
    customerPaymentsAPI.getAll({ customer_id: customerId }),
  ]);
  return {
    customer: custRes.data,
    salesHistory: Array.isArray(salesRes.data) ? salesRes.data : [],
    paymentsHistory: Array.isArray(payRes.data) ? payRes.data : [],
  };
}

/** Warm-up + ProductDetailView */
export async function fetchProductDetailPack(productId) {
  const [prodRes, actRes] = await Promise.all([
    productsAPI.getById(productId),
    productsAPI.getActivity(productId).catch(() => ({ data: { purchases: [], sales: [] } })),
  ]);
  return {
    product: prodRes.data,
    activity: {
      purchases: actRes.data?.purchases || [],
      sales: actRes.data?.sales || [],
    },
  };
}

/**
 * Warm-up + SupplierDetailView — uses purchases + products from React Query cache when present.
 */
export async function fetchSupplierDetailPack({ supplierId, queryClient, shopId }) {
  const keys = zbKeys(shopId);
  const allPurchases = queryClient.getQueryData(keys.purchasesList()) || [];
  const purchases = allPurchases.filter(
    (p) => String(p.supplier_id) === String(supplierId)
  );
  const bundle = queryClient.getQueryData(keys.inventoryBundle());
  let products = bundle?.products;
  if (!Array.isArray(products)) {
    const prodRes = await productsAPI.getAll();
    products = Array.isArray(prodRes.data) ? prodRes.data : [];
  }

  const [supRes, ledgerRes, payRes] = await Promise.all([
    suppliersAPI.getById(supplierId),
    suppliersAPI.getLedger(supplierId),
    supplierPaymentsAPI.getAll({ supplier_id: supplierId }),
  ]);

  return {
    supplier: supRes.data,
    ledger: ledgerRes.data,
    payments: payRes.data || [],
    purchases,
    products,
  };
}

/** Caps for shop bootstrap detail warm-up (avoid hundreds of parallel API calls). */
export const DETAIL_WARM_MAX = {
  customers: 80,
  products: 120,
  suppliers: 60,
};
export const DETAIL_PREFETCH_CONCURRENCY = 6;
