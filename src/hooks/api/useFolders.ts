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

export function useReorderFolders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ folderId: string; order: number }>) =>
      folderApi.reorder({ updates }),

    onMutate: async (updates) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: folderKeys.all });

      // Snapshot the previous value
      const previousFolders = queryClient.getQueryData(folderKeys.all);

      // Create a map of folder updates for quick lookup
      const updateMap = new Map(updates.map(u => [u.folderId, u.order]));

      // Optimistically update folders
      queryClient.setQueryData(folderKeys.all, (old: any) => {
        if (!old?.folders) return old;

        const newFolders = old.folders.map((folder: any) => {
          const newOrder = updateMap.get(folder.id);
          if (newOrder !== undefined) {
            return { ...folder, order: newOrder };
          }
          return folder;
        });

        // Sort by order
        newFolders.sort((a: any, b: any) => a.order - b.order);

        return { ...old, folders: newFolders };
      });

      // Return context for rollback
      return { previousFolders };
    },

    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousFolders) {
        queryClient.setQueryData(folderKeys.all, context.previousFolders);
      }
    },

    onSettled: () => {
      // Refetch to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}
