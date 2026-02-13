'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSidebar } from '@/contexts/SidebarContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { CanvasSkeleton } from '@/components/ui/SkeletonLoader';
import { useCancellableRequest } from '@/hooks/useCancellableRequest';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvas, useConnections, useRenameCanvas } from '@/hooks/api/useCanvases';
import { canvasKeys } from '@/lib/queryKeys';

// Dynamically import ReactFlowCanvas with SSR disabled
const ReactFlowCanvas = dynamic(
  () => import('@/components/canvas/ReactFlowCanvas'),
  {
    ssr: false,
    loading: () => <CanvasSkeleton />
  }
);

interface Note {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  fontFamily?: string | null;
  fontSize?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface Connection {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
}

interface Canvas {
  id: string;
  name: string;
  notes: Note[];
}

function CanvasPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { setCanvasHeader } = useSidebar();
  const canvasId = params.id as string;
  const queryClient = useQueryClient();

  // ── TanStack Query hooks for cached data fetching ──
  const { data: canvasData, isLoading: canvasLoading, isError: canvasIsError, error: canvasQueryError, refetch: refetchCanvas } = useCanvas(canvasId);
  const { data: connectionsData } = useConnections(canvasId);
  const renameCanvasMutation = useRenameCanvas();

  // ── Local state for mutable data (notes, connections, viewport) ──
  const [notes, setNotes] = useState<Note[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasDeleted, setCanvasDeleted] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  // Track whether we've seeded local state from query data for this canvasId
  const [seededCanvasId, setSeededCanvasId] = useState<string | null>(null);

  // Feature #175: Hook for cancellable requests to handle late API responses
  const { cancellableFetch, abortAllRequests, isMounted, cleanup } = useCancellableRequest();
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  // Get note ID from URL query parameter for deep linking
  const noteIdParam = searchParams?.get('note');

  // Feature #175: Clean up on unmount
  useEffect(() => {
    return () => {
      abortAllRequests();
    };
  }, [abortAllRequests]);

  // Seed local state from TanStack Query canvas data
  useEffect(() => {
    if (canvasData?.canvas && seededCanvasId !== canvasId) {
      const c = canvasData.canvas;
      setCanvas(c);
      setNotes(c.notes || []);
      setCanvasDeleted(false);
      setError(null);
      if (c.viewportX !== null && c.viewportY !== null && c.zoom !== null) {
        setViewport({ x: c.viewportX, y: c.viewportY, zoom: c.zoom });
      }
      setSeededCanvasId(canvasId);
    }
  }, [canvasData, canvasId, seededCanvasId]);

  // ── Header callbacks (stable references) ──
  const handleExport = useCallback(async () => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${canvas?.name?.replace(/[^a-z0-9]/gi, '_') || 'canvas'}_export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Canvas exported successfully', 'success');
      } else {
        showToast('Failed to export canvas', 'error');
      }
    } catch (error) {
      console.error('Error exporting canvas:', error);
      showToast('Failed to export canvas', 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, showToast]);

  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!newTitle?.trim()) return;
    try {
      await renameCanvasMutation.mutateAsync({
        id: canvasId,
        name: newTitle.trim()
      });
      setCanvas(prev => prev ? { ...prev, name: newTitle.trim() } : null);
      showToast('Canvas renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming canvas:', error);
      showToast(error?.message || 'Failed to rename canvas', 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId, renameCanvasMutation.mutateAsync, showToast]);

  // Set canvas header - runs once when canvas is seeded and on name changes
  useEffect(() => {
    if (canvas) {
      setCanvasHeader(canvas.name, handleExport, handleTitleChange);
    }
    return () => {
      setCanvasHeader(null, null, null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas?.name, setCanvasHeader]);

  // Seed connections from TanStack Query data
  useEffect(() => {
    if (connectionsData?.connections) {
      setConnections(connectionsData.connections);
    }
  }, [connectionsData]);

  // Handle query errors (404, 403, etc.)
  useEffect(() => {
    if (canvasIsError && canvasQueryError) {
      const err = canvasQueryError as any;
      if (err.status === 404) {
        setError('This canvas no longer exists');
        setCanvasDeleted(true);
      } else if (err.status === 403) {
        setError('You do not have access to this canvas');
      } else {
        setError('Failed to load canvas');
      }
    }
  }, [canvasIsError, canvasQueryError]);

  // Reset state when navigating to a new canvas
  useEffect(() => {
    if (seededCanvasId !== canvasId) {
      setError(null);
      setCanvasDeleted(false);
      setSelectedNoteId(null);
    }
  }, [canvasId, seededCanvasId]);

  // Handle deep linking to specific note
  useEffect(() => {
    if (noteIdParam && notes.length > 0) {
      const targetNote = notes.find(n => n.id === noteIdParam);
      if (targetNote) {
        setSelectedNoteId(noteIdParam);
        showToast(`Opened note: ${targetNote.title}`, 'success');
      } else {
        showToast('Note not found', 'error');
      }
      // Clear the ?note= param from URL after handling so re-clicking
      // the same search result will trigger the deep link again
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [noteIdParam, notes, showToast]);

  // Handle visibility change - check if canvas still exists when returning to tab
  // Feature #174: Detect when canvas was deleted in another tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && canvas && !canvasDeleted) {
        // Page became visible again, refetch via TanStack Query
        refetchCanvas();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [canvas, canvasDeleted, refetchCanvas]);

  const handleNoteCreate = useCallback(async (position: { x: number; y: number }) => {
    const requestKey = `createNote-${Date.now()}`;
    try {
      // Generate a unique title for "Untitled Note"
      const existingUntitledNotes = notes.filter(n => n.title.startsWith('Untitled Note'));
      let newTitle = 'Untitled Note';
      if (existingUntitledNotes.length > 0) {
        newTitle = `Untitled Note ${existingUntitledNotes.length + 1}`;
      }

      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/canvases/${canvasId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: '',
          positionX: Math.round(position.x),
          positionY: Math.round(position.y),
          width: 300,
          height: 200,
        }),
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        const data = await res.json();
        // Add new note to state
        setNotes(prev => [...prev, data.note]);
        queryClient.invalidateQueries({ queryKey: canvasKeys.detail(canvasId) });
        showToast('Note created successfully', 'success');
      } else {
        // Feature #174: Handle canvas deleted case
        if (res.status === 404) {
          setError('This canvas no longer exists');
          setCanvasDeleted(true);
          showToast('This canvas was deleted in another session', 'error');
          return;
        }
        const errorData = await res.json();
        if (res.status === 409 && errorData.field === 'title') {
          // Duplicate title - this shouldn't happen with our unique naming, but handle it
          console.error('Duplicate title error:', errorData.error);
          showToast(errorData.error || 'Failed to create note: duplicate title', 'error');
        } else {
          throw new Error(errorData.error || 'Failed to create note');
        }
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error creating note:', error);
      if (isMounted()) {
        showToast('Failed to create note. Please try again.', 'error');
      }
    }
  }, [canvasId, notes, showToast, cancellableFetch, cleanup]);

  const handleNoteUpdate = useCallback(async (noteId: string, newPosition: { x: number; y: number }, newSize?: { width: number; height: number }, newTitle?: string, newContent?: string, newFontFamily?: string, newFontSize?: number) => {
    try {
      const body: any = {
        positionX: Math.round(newPosition.x),
        positionY: Math.round(newPosition.y),
      };

      if (newSize) {
        body.width = Math.round(newSize.width);
        body.height = Math.round(newSize.height);
      }

      if (newTitle !== undefined) {
        body.title = newTitle;
      }

      if (newContent !== undefined) {
        body.content = newContent;
      }

      if (newFontFamily !== undefined) {
        body.fontFamily = newFontFamily;
      }

      if (newFontSize !== undefined) {
        body.fontSize = newFontSize;
      }

      const requestKey = `updateNote-${noteId}`;
      // Feature #175: Use cancellable fetch
      const response = await cancellableFetch(requestKey, `/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (!response.ok) {
        // Feature #174: Handle canvas/note deleted case
        if (response.status === 404) {
          showToast('This note or canvas was deleted in another session', 'error');
          // Refresh canvas to get updated state
          refetchCanvas();
          return;
        }
        const errorData = await response.json();
        if (response.status === 409 && errorData.field === 'title') {
          // Duplicate title error
          alert(errorData.error || 'A note with this title already exists in this canvas.');
          return; // Don't update state
        }
        throw new Error(errorData.error || 'Failed to update note');
      }

      // Update note in state
      setNotes(prev => prev.map(note =>
        note.id === noteId
          ? {
              ...note,
              positionX: Math.round(newPosition.x),
              positionY: Math.round(newPosition.y),
              ...(newSize && { width: Math.round(newSize.width), height: Math.round(newSize.height) }),
              ...(newTitle !== undefined && { title: newTitle }),
              ...(newContent !== undefined && { content: newContent }),
              ...(newFontFamily !== undefined && { fontFamily: newFontFamily }),
              ...(newFontSize !== undefined && { fontSize: newFontSize })
            }
          : note
      ));
      queryClient.invalidateQueries({ queryKey: canvasKeys.detail(canvasId) });
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error updating note:', error);
    }
  }, [showToast, cancellableFetch, cleanup, refetchCanvas]);

  const handleViewportChange = useCallback(async (newViewport: { x: number; y: number; zoom: number }) => {
    const requestKey = `updateViewport-${canvasId}`;
    try {
      // Feature #175: Use cancellable fetch - viewport changes are frequent
      const res = await cancellableFetch(requestKey, `/api/canvases/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewportX: newViewport.x,
          viewportY: newViewport.y,
          zoom: newViewport.zoom,
        }),
      });
      // Feature #174: Handle canvas deleted case - silently fail for viewport updates
      if (res && !res.ok && res.status === 404) {
        // Canvas was deleted, will be caught by next refetchCanvas call
        console.warn('Canvas was deleted while updating viewport');
      }
    } catch (error) {
      // Feature #175: Silently handle cancelled viewport updates (they happen frequently)
      if (error instanceof Error && error.message === 'Request cancelled') {
        // Expected - user panned/zoomed quickly
        return;
      }
      console.error('Error saving viewport state:', error);
    }
  }, [canvasId, cancellableFetch]);

  const handleNoteDelete = useCallback(async (noteId: string) => {
    const requestKey = `deleteNote-${noteId}`;
    try {
      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        // Remove note from state
        setNotes(prev => prev.filter(note => note.id !== noteId));
        queryClient.invalidateQueries({ queryKey: canvasKeys.detail(canvasId) });
      } else if (res.status === 404) {
        // Feature #174: Note was already deleted in another session
        showToast('This note was already deleted', 'info');
        // Remove from local state anyway
        setNotes(prev => prev.filter(note => note.id !== noteId));
        queryClient.invalidateQueries({ queryKey: canvasKeys.detail(canvasId) });
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error deleting note:', error);
    }
  }, [showToast, cancellableFetch, cleanup]);

  const handleNoteDuplicate = useCallback(async (noteId: string) => {
    const requestKey = `duplicateNote-${noteId}`;
    try {
      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/notes/${noteId}/duplicate`, {
        method: 'POST',
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        const data = await res.json();
        // Add duplicated note to state
        setNotes(prev => [...prev, data.note]);
        queryClient.invalidateQueries({ queryKey: canvasKeys.detail(canvasId) });
      } else if (res.status === 404) {
        // Feature #174: Note or canvas was deleted in another session
        showToast('This note or canvas was deleted in another session', 'error');
        refetchCanvas();
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error duplicating note:', error);
    }
  }, [showToast, cancellableFetch, cleanup, refetchCanvas]);

  const handleNoteRestore = useCallback(async (note: Note) => {
    const requestKey = `restoreNote-${note.id}`;
    try {
      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/canvases/${canvasId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id, // Use the original ID
          title: note.title,
          content: note.content,
          positionX: note.positionX,
          positionY: note.positionY,
          width: note.width,
          height: note.height,
        }),
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        // Add restored note to state
        setNotes(prev => [...prev, note]);
        queryClient.invalidateQueries({ queryKey: canvasKeys.detail(canvasId) });
      } else if (res.status === 404) {
        // Feature #174: Canvas was deleted
        showToast('This canvas was deleted in another session', 'error');
        setError('This canvas no longer exists');
        setCanvasDeleted(true);
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error restoring note:', error);
    }
  }, [canvasId, showToast, cancellableFetch, cleanup]);

  const handleConnectionCreate = useCallback(async (sourceNoteId: string, targetNoteId: string) => {
    const requestKey = `createConnection-${sourceNoteId}-${targetNoteId}`;
    try {
      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/canvases/${canvasId}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceNoteId, targetNoteId }),
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        const data = await res.json();
        // Add new connection to state
        setConnections(prev => [...prev, data.connection]);
        queryClient.invalidateQueries({ queryKey: canvasKeys.connections(canvasId) });
      } else if (res.status === 404) {
        // Feature #174: Canvas or note was deleted in another session
        showToast('This canvas or note was deleted in another session', 'error');
        refetchCanvas();
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error creating connection:', error);
    }
  }, [canvasId, showToast, cancellableFetch, cleanup, refetchCanvas]);

  const handleConnectionDelete = useCallback(async (connectionId: string) => {
    const requestKey = `deleteConnection-${connectionId}`;
    try {
      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/connections/${connectionId}`, {
        method: 'DELETE',
      });

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        // Remove connection from state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        queryClient.invalidateQueries({ queryKey: canvasKeys.connections(canvasId) });
      } else if (res.status === 404) {
        // Feature #174: Connection was already deleted in another session
        // Just remove from local state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        queryClient.invalidateQueries({ queryKey: canvasKeys.connections(canvasId) });
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }
      console.error('Error deleting connection:', error);
    }
  }, [cancellableFetch, cleanup]);

  if (canvasLoading || (!canvas && !error)) {
    return <CanvasSkeleton />;
  }

  if (error || !canvas) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-x-hidden px-4">
        <div className="text-center max-w-md">
          {/* Feature #174: Show appropriate icon and message for deleted canvas */}
          {canvasDeleted ? (
            <>
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
                Canvas No Longer Available
              </h2>
              <p className="text-light-text/60 dark:text-dark-text/60 mb-6">
                This canvas was deleted in another browser session or by another user.
              </p>
            </>
          ) : (
            <>
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
                Canvas Not Found
              </h2>
              <p className="text-light-text/60 dark:text-dark-text/60 mb-6">
                {error || 'The canvas you are looking for does not exist.'}
              </p>
            </>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 relative overflow-hidden bg-light-canvas dark:bg-dark-canvas">
      <ReactFlowCanvas
        canvasId={canvasId}
        initialNotes={notes}
        initialConnections={connections}
        initialViewport={viewport || undefined}
        selectedNoteId={selectedNoteId || undefined}
        openEditorOnLoad={!!noteIdParam}
        onNoteCreate={handleNoteCreate}
        onNoteUpdate={handleNoteUpdate}
        onNoteDelete={handleNoteDelete}
        onNoteDuplicate={handleNoteDuplicate}
        onViewportChange={handleViewportChange}
        onNoteRestore={handleNoteRestore}
        onConnectionCreate={handleConnectionCreate}
        onConnectionDelete={handleConnectionDelete}
        showEmptyState={notes.length === 0}
      />
    </main>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={<CanvasSkeleton />}>
      <CanvasPageContent />
    </Suspense>
  );
}
