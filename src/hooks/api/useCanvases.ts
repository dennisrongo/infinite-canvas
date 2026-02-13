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

export function useReorderCanvases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ canvasId: string; folderId: string | null; order: number }>) =>
      canvasApi.reorder({ updates }),

    onMutate: async (updates) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: folderKeys.all });
      await queryClient.cancelQueries({ queryKey: canvasKeys.all });

      // Snapshot the previous values
      const previousFolders = queryClient.getQueryData(folderKeys.all);
      const previousCanvases = queryClient.getQueryData(canvasKeys.all);

      // Create a map of canvas updates for quick lookup
      const updateMap = new Map(updates.map(u => [u.canvasId, { folderId: u.folderId, order: u.order }]));

      // Optimistically update folders
      queryClient.setQueryData(folderKeys.all, (old: any) => {
        if (!old?.folders) return old;

        const newFolders = old.folders.map((folder: any) => {
          // Get canvases that should be in this folder after the update
          const updatedCanvases = folder.canvases
            .map((canvas: any) => {
              const update = updateMap.get(canvas.id);
              if (update) {
                return { ...canvas, order: update.order };
              }
              return canvas;
            })
            .filter((canvas: any) => {
              const update = updateMap.get(canvas.id);
              // Keep canvas if it wasn't moved, or if it was moved to this folder
              if (!update) return true;
              return update.folderId === folder.id;
            });

          // Add canvases that were moved TO this folder
          updates.forEach((update) => {
            if (update.folderId === folder.id) {
              const existingCanvas = old.folders
                .flatMap((f: any) => f.canvases)
                .find((c: any) => c.id === update.canvasId);
              const rootCanvas = (previousCanvases as any)?.canvases?.find((c: any) => c.id === update.canvasId);

              if (existingCanvas && !updatedCanvases.find((c: any) => c.id === update.canvasId)) {
                updatedCanvases.push({ ...existingCanvas, order: update.order, folderId: folder.id });
              } else if (rootCanvas && !updatedCanvases.find((c: any) => c.id === update.canvasId)) {
                updatedCanvases.push({ ...rootCanvas, order: update.order, folderId: folder.id });
              }
            }
          });

          // Sort by order
          updatedCanvases.sort((a: any, b: any) => a.order - b.order);

          return { ...folder, canvases: updatedCanvases };
        });

        return { ...old, folders: newFolders };
      });

      // Optimistically update canvases list
      queryClient.setQueryData(canvasKeys.all, (old: any) => {
        if (!old?.canvases) return old;

        const newCanvases = old.canvases.map((canvas: any) => {
          const update = updateMap.get(canvas.id);
          if (update) {
            return { ...canvas, folderId: update.folderId, order: update.order };
          }
          return canvas;
        });

        // Sort by order
        newCanvases.sort((a: any, b: any) => a.order - b.order);

        return { ...old, canvases: newCanvases };
      });

      // Return context for rollback
      return { previousFolders, previousCanvases };
    },

    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousFolders) {
        queryClient.setQueryData(folderKeys.all, context.previousFolders);
      }
      if (context?.previousCanvases) {
        queryClient.setQueryData(canvasKeys.all, context.previousCanvases);
      }
    },

    onSettled: () => {
      // Refetch to ensure data is in sync with server
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
      queryClient.invalidateQueries({ queryKey: canvasKeys.all });
    },
  });
}
