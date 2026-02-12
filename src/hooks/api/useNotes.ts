'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteApi } from '@/lib/api';
import { canvasKeys } from '@/lib/queryKeys';

export function useCanvasNotes(canvasId: string) {
  return useQuery({
    queryKey: canvasKeys.notes(canvasId),
    queryFn: () => noteApi.listByCanvas(canvasId),
    enabled: !!canvasId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ canvasId, body }: {
      canvasId: string;
      body: {
        title: string;
        content: string;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
        id?: string;
      };
    }) => noteApi.create(canvasId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.notes(variables.canvasId) });
      queryClient.invalidateQueries({ queryKey: canvasKeys.detail(variables.canvasId) });
    },
  });
}

export function useUpdateNote() {
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: string; body: Record<string, unknown> }) =>
      noteApi.update(noteId, body),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, canvasId }: { noteId: string; canvasId: string }) =>
      noteApi.delete(noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.notes(variables.canvasId) });
      queryClient.invalidateQueries({ queryKey: canvasKeys.detail(variables.canvasId) });
    },
  });
}

export function useDuplicateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, canvasId }: { noteId: string; canvasId: string }) =>
      noteApi.duplicate(noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.notes(variables.canvasId) });
      queryClient.invalidateQueries({ queryKey: canvasKeys.detail(variables.canvasId) });
    },
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ canvasId, body }: {
      canvasId: string;
      body: {
        id: string;
        title: string;
        content: string;
        positionX: number;
        positionY: number;
        width: number;
        height: number;
      };
    }) => noteApi.create(canvasId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: canvasKeys.notes(variables.canvasId) });
      queryClient.invalidateQueries({ queryKey: canvasKeys.detail(variables.canvasId) });
    },
  });
}
