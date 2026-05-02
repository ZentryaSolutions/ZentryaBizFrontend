import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

/**
 * When switching shops, remove cached queries for the *previous* shop so another shop's data
 * cannot be shown or mixed. Keys must follow ['zb', shopId, ...] (see queryKeys.js).
 */
export default function ShopCacheSync() {
  const { activeShopId } = useAuth();
  const queryClient = useQueryClient();
  const prevRef = useRef(activeShopId);

  useEffect(() => {
    const prev = prevRef.current;
    const next = activeShopId;

    const purgeShop = (shopId) => {
      if (!shopId) return;
      queryClient.removeQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'zb' &&
          String(q.queryKey[1]) === String(shopId),
      });
    };

    if (prev && next && String(prev) !== String(next)) {
      purgeShop(prev);
    } else if (prev && !next) {
      purgeShop(prev);
    }

    prevRef.current = next;
  }, [activeShopId, queryClient]);

  return null;
}
