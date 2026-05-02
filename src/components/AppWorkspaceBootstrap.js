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
  DETAIL_WARM_MAX,
  DETAIL_PREFETCH_CONCURRENCY,
} from '../lib/workspaceQueries';
import './AppWorkspaceBootstrap.css';

function WorkspaceLoadingOverlay({ progress }) {
  const pct = Math.min(100, Math.max(0, progress));
  const sub =
    progress < 50
      ? 'Loading products, sales, and settings so pages open instantly.'
      : 'Caching customer, product, and supplier details for faster detail screens.';
  return (
    <div className="zb-workspace-boot" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="zb-workspace-boot__panel">
        <div className="zb-workspace-boot__brand">Zentrya Biz</div>
        <p className="zb-workspace-boot__title">Preparing your workspace</p>
        <p className="zb-workspace-boot__sub">{sub}</p>
        <div className="zb-workspace-boot__track">
          <div className="zb-workspace-boot__fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="zb-workspace-boot__pct">{pct}%</p>
        <div className="zb-workspace-boot__spinner" aria-hidden />
      </div>
    </div>
  );
}

/**
 * First entry after shop select: parallel prefetch into React Query cache.
 * Shows centered progress until all tasks settle (failures still allow entering the app).
 */
export default function AppWorkspaceBootstrap({ shopId, children }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!shopId) {
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    setProgress(0);

    const keys = zbKeys(shopId);
    const tasks = [
      { queryKey: keys.dashboard(), queryFn: fetchDashboardData },
      { queryKey: keys.inventoryBundle(), queryFn: fetchInventoryBundle },
      { queryKey: keys.customersList(), queryFn: fetchCustomersList },
      { queryKey: keys.settingsDoc(), queryFn: fetchSettingsDoc },
      { queryKey: keys.salesList(), queryFn: fetchSalesList },
      { queryKey: keys.purchasesList(), queryFn: fetchPurchasesList },
    ];

    const total = tasks.length;
    let completed = 0;

    const bump = () => {
      completed += 1;
      if (!cancelled) setProgress(Math.round((completed / total) * 50));
    };

    (async () => {
      await Promise.allSettled(
        tasks.map((t) =>
          queryClient
            .prefetchQuery({
              queryKey: t.queryKey,
              queryFn: t.queryFn,
              staleTime: 60 * 1000,
            })
            .finally(bump)
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
        if (!cancelled) {
          setProgress(100);
          setReady(true);
        }
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
        if (!cancelled) {
          setProgress(50 + Math.round(((b + 1) / totalBatches) * 50));
        }
      }

      if (!cancelled) {
        setProgress(100);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, queryClient]);

  if (!shopId) return children;

  if (!ready) {
    return <WorkspaceLoadingOverlay progress={progress} />;
  }

  return children;
}
