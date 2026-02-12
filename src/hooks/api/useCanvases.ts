'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canvasApi, connectionApi } from '@/lib/api';
import { canvasKeys, folderKeys } from '@/lib/queryKeys';

export function useCanvases() {
  return useQuery({
    queryKey: canvasKeys.all,
    queryFn: () => canvasApi.list(),
  });
}

export function useCanvas(id: string) {
  return useQuery({
    queryKey: canvasKeys.detail(id),
    queryFn: () => canvasApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, folderId, csrfToken }: { name: string; folderId?: string; csrfToken?: string }) =>
      canvasApi.create({ name, folderId }, csrfToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useDeleteCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => canvasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useRenameCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      canvasApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useMoveCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      canvasApi.update(id, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useConnections(canvasId: string) {
  return useQuery({
    queryKey: canvasKeys.connections(canvasId),
    queryFn: () => connectionApi.listByCanvas(canvasId),
    enabled: !!canvasId,
  });
}

export function useUpdateViewport() {
  return useMutation({
    mutationFn: ({ id, viewport }: { id: string; viewport: { viewportX: number; viewportY: number; zoom: number } }) =>
      canvasApi.update(id, viewport),
  });
}

export function useImportCanvas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ importData, folderId }: { importData: any; folderId?: string }) =>
      canvasApi.import({ importData, folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}
