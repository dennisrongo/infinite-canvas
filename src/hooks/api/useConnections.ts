'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionApi } from '@/lib/api';
import { canvasKeys } from '@/lib/queryKeys';

export function useCanvasConnections(canvasId: string) {
  return useQuery({
    queryKey: canvasKeys.connections(canvasId),
    queryFn: () => connectionApi.listByCanvas(canvasId),
    enabled: !!canvasId,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ canvasId, sourceNoteId, targetNoteId }: {
      canvasId: string;
      sourceNoteId: string;
      targetNoteId: string;
    }) => connectionApi.create(canvasId, { sourceNoteId, targetNoteId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.connections(variables.canvasId) });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, canvasId }: { connectionId: string; canvasId: string }) =>
      connectionApi.delete(connectionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.connections(variables.canvasId) });
    },
  });
}
