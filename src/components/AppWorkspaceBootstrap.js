import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { zbKeys } from '../lib/queryKeys';
import {
  fetchInventoryBundle,
  fetchDashboardData,
  fetchCustomersList,
  fetchSettingsDoc,
  fetchSalesList,
  fetchPurchasesList,
  fetchCustomerDetailPack,
  fetchProductDetailPack,
  fetchSupplierDetailPack,
  reportsMonthlyPrefetchTaskDefs,
  DETAIL_WARM_MAX,
  DETAIL_PREFETCH_CONCURRENCY,
} from '../lib/workspaceQueries';
import './AppWorkspaceBootstrap.css';

function WorkspaceLoadingOverlay() {
  const logoSrc = `${process.env.PUBLIC_URL}/companylogo.jpeg`;
  return (
    <div className="zb-workspace-boot" role="status" aria-live="polite" aria-busy="true">
      <div className="zb-workspace-boot__panel">
        <img
          src={logoSrc}
          alt=""
          width={72}
          height={72}
          decoding="async"
          className="zb-workspace-boot__logo"
        />
        <p className="zb-workspace-boot__brand">Zentrya Biz</p>
        <p className="zb-workspace-boot__title">Preparing your workspace</p>
        <p className="zb-workspace-boot__sub">Syncing products, sales, reports, and settings.</p>

        <div className="zb-boot-viz" aria-hidden>
          <div className="zb-boot-viz__glow" />
          <div className="zb-boot-viz__ring zb-boot-viz__ring--a" />
          <div className="zb-boot-viz__ring zb-boot-viz__ring--b" />
          <div className="zb-boot-viz__dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * First entry after shop select: parallel prefetch into React Query cache.
 * Shows a branded loader until prefetch settles (failures still allow entering the app).
 */
export default function AppWorkspaceBootstrap({ shopId, children }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!shopId) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    const keys = zbKeys(shopId);
    const tasks = [
      { queryKey: keys.dashboard(), queryFn: fetchDashboardData },
      { queryKey: keys.inventoryBundle(), queryFn: fetchInventoryBundle },
      { queryKey: keys.customersList(), queryFn: fetchCustomersList },
      { queryKey: keys.settingsDoc(), queryFn: fetchSettingsDoc },
      { queryKey: keys.salesList(), queryFn: fetchSalesList },
      { queryKey: keys.purchasesList(), queryFn: fetchPurchasesList },
      ...reportsMonthlyPrefetchTaskDefs(shopId),
    ];

    (async () => {
      await Promise.allSettled(
        tasks.map((t) =>
          queryClient.prefetchQuery({
            queryKey: t.queryKey,
            queryFn: t.queryFn,
            staleTime: 60 * 1000,
          })
        )
      );

      if (cancelled) return;

      const customers = queryClient.getQueryData(keys.customersList()) || [];
      const bundle = queryClient.getQueryData(keys.inventoryBundle()) || {};
      const productIds = (bundle.products || []).map((p) => p.product_id).filter((x) => x != null);
      const supplierIds = (bundle.suppliers || []).map((s) => s.supplier_id).filter((x) => x != null);
      const customerIds = customers.map((c) => c.customer_id).filter((x) => x != null);

      const cIds = customerIds.slice(0, DETAIL_WARM_MAX.customers);
      const pIds = productIds.slice(0, DETAIL_WARM_MAX.products);
      const sIds = supplierIds.slice(0, DETAIL_WARM_MAX.suppliers);

      const warmTasks = [
        ...cIds.map((id) => ({
          queryKey: keys.customerDetailPack(id),
          queryFn: () => fetchCustomerDetailPack(id),
        })),
        ...pIds.map((id) => ({
          queryKey: keys.productDetailPack(id),
          queryFn: () => fetchProductDetailPack(id),
        })),
        ...sIds.map((id) => ({
          queryKey: keys.supplierDetailPack(id),
          queryFn: () => fetchSupplierDetailPack({ supplierId: id, queryClient, shopId }),
        })),
      ];

      if (warmTasks.length === 0) {
        if (!cancelled) setReady(true);
        return;
      }

      const conc = DETAIL_PREFETCH_CONCURRENCY;
      const totalBatches = Math.ceil(warmTasks.length / conc);
      for (let b = 0; b < totalBatches; b += 1) {
        if (cancelled) return;
        const slice = warmTasks.slice(b * conc, b * conc + conc);
        await Promise.allSettled(
          slice.map((t) =>
            queryClient.prefetchQuery({
              queryKey: t.queryKey,
              queryFn: t.queryFn,
              staleTime: 60 * 1000,
            })
          )
        );
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, queryClient]);

  if (!shopId) return children;

  if (!ready) {
    return <WorkspaceLoadingOverlay />;
  }

  return children;
}
