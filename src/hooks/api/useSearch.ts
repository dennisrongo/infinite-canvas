'use client';

import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api';
import { searchKeys } from '@/lib/queryKeys';

export function useSearch(
  query: string,
  filters?: {
    canvasId?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFilter?: string;
  }
) {
  return useQuery({
    queryKey: searchKeys.results(query, filters),
    queryFn: () =>
      searchApi.search({
        query: query.trim(),
        ...filters,
      }),
    enabled: !!query.trim(),
  });
}
