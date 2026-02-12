'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { folderApi } from '@/lib/api';
import { folderKeys, canvasKeys } from '@/lib/queryKeys';

export function useFolders() {
  return useQuery({
    queryKey: folderKeys.all,
    queryFn: () => folderApi.list(),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => folderApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, moveCanvasesToRoot }: { id: string; moveCanvasesToRoot?: boolean }) =>
      folderApi.delete(id, moveCanvasesToRoot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      folderApi.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}
