import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton — cleared on logout; shop-scoped keys under ['zb', shopId, ...] are purged on shop switch
 * (see ShopCacheSync).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
