import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface AutoRefreshOptions {
  queryKeys?: string[][];
  exactQueryKeys?: Array<{ queryKey: unknown[]; exact?: boolean }>;
  interval?: number;
  enabled?: boolean;
  onRefresh?: () => void;
  pollApi?: () => Promise<void>;
}

export const useAutoRefresh = ({
  queryKeys = [],
  exactQueryKeys = [],
  interval = 30000,
  enabled = true,
  onRefresh,
  pollApi,
}: AutoRefreshOptions) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    if (queryKeys.length > 0) {
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    }

    if (exactQueryKeys.length > 0) {
      exactQueryKeys.forEach(({ queryKey, exact = true }) => {
        queryClient.invalidateQueries({ queryKey, exact });
      });
    }

    if (pollApi) {
      pollApi();
    }

    onRefresh?.();
  }, [queryClient, queryKeys, exactQueryKeys, pollApi, onRefresh]);

  const refreshNow = useCallback(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(refresh, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh, interval, enabled]);

  return { refresh: refreshNow };
};
