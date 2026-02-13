'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import ImportModal from '@/components/canvas/ImportModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { CanvasSkeleton } from '@/components/ui/SkeletonLoader';
import { useCancellableRequest } from '@/hooks/useCancellableRequest';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvas, useCanvases, useConnections, useCreateCanvas, useDeleteCanvas, useRenameCanvas, useMoveCanvas } from '@/hooks/api/useCanvases';
import { canvasKeys } from '@/lib/queryKeys';
import { useFolders, useCreateFolder, useDeleteFolder, useRenameFolder } from '@/hooks/api/useFolders';
import { useUpdateSettings } from '@/hooks/api/useUser';
import { useCsrfToken } from '@/hooks/api/useAuth';

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

interface Folder {
  id: string;
  name: string;
  canvases: Canvas[];
}

interface CanvasesResponse {
  folders: Folder[];
  canvases: Canvas[];
}

function CanvasPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const canvasId = params.id as string;
  const queryClient = useQueryClient();

  // ── TanStack Query hooks for cached data fetching ──
  const { data: canvasData, isLoading: canvasLoading, isError: canvasIsError, error: canvasQueryError, refetch: refetchCanvas } = useCanvas(canvasId);
  const { data: connectionsData } = useConnections(canvasId);
  const { data: foldersData } = useFolders();
  const { data: canvasesData } = useCanvases();

  // Derive sidebar data from cached queries
  const folders: Folder[] = foldersData?.folders || [];
  const allCanvases: Canvas[] = canvasesData?.canvases || [];
  const folderCanvasIds = new Set(
    folders.flatMap((f: Folder) => f.canvases.map((c: Canvas) => c.id))
  );
  const rootCanvases: Canvas[] = allCanvases.filter((c: Canvas) => !folderCanvasIds.has(c.id));

  // ── CSRF Token ──
  const { data: csrfData } = useCsrfToken();
  const csrfToken = csrfData?.csrfToken || null;

  // ── Mutation hooks for management actions ──
  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const renameFolderMutation = useRenameFolder();
  const createCanvasMutation = useCreateCanvas();
  const deleteCanvasMutation = useDeleteCanvas();
  const renameCanvasMutation = useRenameCanvas();
  const moveCanvasMutation = useMoveCanvas();
  const updateSettingsMutation = useUpdateSettings();

  // Derive loading states from mutations
  const isCreatingFolder = createFolderMutation.isPending;
  const isDeletingFolder = deleteFolderMutation.isPending;
  const isRenamingFolder = renameFolderMutation.isPending;
  const isCreatingCanvas = createCanvasMutation.isPending;
  const isDeletingCanvas = deleteCanvasMutation.isPending;
  const isRenamingCanvas = renameCanvasMutation.isPending;
  const isMovingCanvas = moveCanvasMutation.isPending;
  const isUpdatingSortOrder = updateSettingsMutation.isPending;

  // Sort order state
  const [sortOrder, setSortOrder] = useState<'updated' | 'alphabetical' | 'created'>('updated');

  // Sync sort order from folders API response
  useEffect(() => {
    if (foldersData?.sortOrder) {
      setSortOrder(foldersData.sortOrder);
    }
  }, [foldersData]);

  // ── Modal state for management actions ──
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteMoveToRoot, setDeleteMoveToRoot] = useState(true);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [renameName, setRenameName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [canvasToMove, setCanvasToMove] = useState<Canvas & { currentFolderId?: string } | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [showCanvasDeleteModal, setShowCanvasDeleteModal] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [showCanvasRenameModal, setShowCanvasRenameModal] = useState(false);
  const [canvasToRename, setCanvasToRename] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [canvasRenameName, setCanvasRenameName] = useState('');
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasFolderId, setNewCanvasFolderId] = useState<string | undefined>(undefined);

  // ── Local state for mutable data (notes, connections, viewport) ──
  const [notes, setNotes] = useState<Note[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canvasDeleted, setCanvasDeleted] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Track whether we've seeded local state from query data for this canvasId
  const [seededCanvasId, setSeededCanvasId] = useState<string | null>(null);

  // Feature #175: Hook for cancellable requests to handle late API responses
  const { cancellableFetch, abortRequest, abortAllRequests, isMounted, cleanup } = useCancellableRequest();
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
        console.log('[handleNoteCreate] Note created from API:', data.note);
        // Add new note to state
        setNotes(prev => {
          const newNotes = [...prev, data.note];
          console.log('[handleNoteCreate] Updating notes state, new count:', newNotes.length);
          return newNotes;
        });
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
        console.log('Note creation cancelled (user navigated away)');
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
        console.log('Note update cancelled (user navigated away)');
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
        console.log('Note deletion cancelled (user navigated away)');
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
        console.log('Note duplication cancelled (user navigated away)');
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
        console.log('Note restore cancelled (user navigated away)');
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
        console.log('Connection creation cancelled (user navigated away)');
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
        console.log('Connection deletion cancelled (user navigated away)');
        return;
      }
      console.error('Error deleting connection:', error);
    }
  }, [cancellableFetch, cleanup]);

  // Export canvas handler
  const handleExport = useCallback(async () => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}/export`);
      if (res.ok) {
        // Download the file
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${canvas?.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
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
  }, [canvasId, canvas?.name, showToast]);

  // Import canvas handler
  const handleImport = useCallback(async (importData: any, folderId?: string) => {
    try {
      const res = await fetch('/api/canvases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importData, folderId }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Canvas imported successfully', 'success');
        queryClient.invalidateQueries({ queryKey: canvasKeys.all });
        // Navigate to the imported canvas
        router.push(`/canvas/${data.canvas.id}`);
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Failed to import canvas', 'error');
      }
    } catch (error) {
      console.error('Error importing canvas:', error);
      showToast('Failed to import canvas', 'error');
    }
  }, [router, showToast]);

  // ── Management action handlers ──
  const updateSortOrder = async (newSortOrder: 'updated' | 'alphabetical' | 'created') => {
    if (isUpdatingSortOrder) return;
    try {
      await updateSettingsMutation.mutateAsync({ canvasSortOrder: newSortOrder });
      setSortOrder(newSortOrder);
      showToast(`Sort order changed to ${newSortOrder}`, 'success');
    } catch (error) {
      console.error('Error updating sort order:', error);
      showToast('Failed to update sort order', 'error');
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || isCreatingFolder) return;
    try {
      const data = await createFolderMutation.mutateAsync({ name: newFolderName.trim() });
      setNewFolderName('');
      setShowNewFolderModal(false);
      showToast(`Folder "${data.folder.name}" created successfully`, 'success');
    } catch (error: any) {
      console.error('Error creating folder:', error);
      showToast(error?.message || 'Failed to create folder', 'error');
    }
  };

  const confirmDeleteFolder = (folder: Folder) => {
    setFolderToDelete(folder);
    setDeleteMoveToRoot(folder.canvases.length > 0);
    setShowDeleteModal(true);
  };

  const deleteFolder = async () => {
    if (!folderToDelete || isDeletingFolder) return;
    try {
      await deleteFolderMutation.mutateAsync({ id: folderToDelete.id, moveCanvasesToRoot: deleteMoveToRoot });
      setShowDeleteModal(false);
      setFolderToDelete(null);
      showToast('Folder deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      showToast(error?.message || 'Failed to delete folder', 'error');
    }
  };

  const openRenameModal = (folder: Folder) => {
    setFolderToRename(folder);
    setRenameName(folder.name);
    setShowRenameModal(true);
  };

  const renameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameName.trim() || isRenamingFolder) return;
    try {
      await renameFolderMutation.mutateAsync({ id: folderToRename.id, name: renameName.trim() });
      setShowRenameModal(false);
      setFolderToRename(null);
      setRenameName('');
      showToast('Folder renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming folder:', error);
      showToast(error?.message || 'Failed to rename folder', 'error');
    }
  };

  const createCanvas = (folderId?: string) => {
    if (isCreatingCanvas) return;
    setNewCanvasFolderId(folderId);
    setNewCanvasName('');
    setShowNewCanvasModal(true);
  };

  const submitCreateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanvasName.trim() || isCreatingCanvas) return;
    try {
      const data = await createCanvasMutation.mutateAsync({
        name: newCanvasName.trim(),
        folderId: newCanvasFolderId,
        csrfToken: csrfToken || undefined,
      });
      setShowNewCanvasModal(false);
      setNewCanvasName('');
      setNewCanvasFolderId(undefined);
      showToast(`Canvas "${data.canvas.name}" created successfully`, 'success');
      // Navigate to the new canvas
      router.push(`/canvas/${data.canvas.id}`);
    } catch (error) {
      console.error('Error creating canvas:', error);
      showToast('Failed to create canvas', 'error');
    }
  };

  const confirmDeleteCanvas = (canvas: Canvas, folderId?: string) => {
    setCanvasToDelete({ canvas, folderId });
    setShowCanvasDeleteModal(true);
  };

  const deleteCanvasConfirmed = async () => {
    if (!canvasToDelete || isDeletingCanvas) return;
    try {
      await deleteCanvasMutation.mutateAsync(canvasToDelete.canvas.id);
      setShowCanvasDeleteModal(false);
      setCanvasToDelete(null);
      showToast('Canvas deleted successfully', 'success');
      // If we deleted the current canvas, navigate to dashboard
      if (canvasToDelete.canvas.id === canvasId) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error deleting canvas:', error);
      showToast('Failed to delete canvas', 'error');
    }
  };

  const openCanvasRenameModal = (canvas: Canvas, folderId?: string) => {
    setCanvasToRename({ canvas, folderId });
    setCanvasRenameName(canvas.name);
    setShowCanvasRenameModal(true);
  };

  const renameCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasToRename || !canvasRenameName.trim() || isRenamingCanvas) return;
    try {
      await renameCanvasMutation.mutateAsync({ id: canvasToRename.canvas.id, name: canvasRenameName.trim() });
      setShowCanvasRenameModal(false);
      setCanvasToRename(null);
      setCanvasRenameName('');
      showToast('Canvas renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming canvas:', error);
      showToast(error?.message || 'Failed to rename canvas', 'error');
    }
  };

  const openMoveModal = (canvas: Canvas, currentFolderId?: string) => {
    setCanvasToMove({ ...canvas, currentFolderId });
    setMoveTargetFolderId(currentFolderId || null);
    setShowMoveModal(true);
  };

  const moveCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasToMove || isMovingCanvas) return;
    try {
      await moveCanvasMutation.mutateAsync({ id: canvasToMove.id, folderId: moveTargetFolderId });
      setShowMoveModal(false);
      setCanvasToMove(null);
      const targetName = moveTargetFolderId
        ? folders.find(f => f.id === moveTargetFolderId)?.name || 'folder'
        : 'root';
      setMoveTargetFolderId(null);
      showToast(`Canvas moved to ${targetName}`, 'success');
    } catch (error: any) {
      console.error('Error moving canvas:', error);
      showToast(error?.message || 'Failed to move canvas', 'error');
    }
  };

  if (canvasLoading || (!canvas && !error)) {
    return <CanvasSkeleton />;
  }

  if (error || !canvas) {
    return (
      <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas flex items-center justify-center overflow-x-hidden px-4">
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
    <div className="h-screen flex bg-gray-50 dark:bg-[#0a0f1a] overflow-hidden">
      {/* Shared Sidebar */}
      <AppSidebar
        variant="canvas"
        folders={folders}
        rootCanvases={rootCanvases}
        currentCanvasId={canvasId}
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
        sidebarCollapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCreateFolder={() => setShowNewFolderModal(true)}
        onCreateCanvas={(folderId) => createCanvas(folderId)}
        onImport={() => setShowImportModal(true)}
        onRenameFolder={(folder) => openRenameModal(folder as Folder)}
        onDeleteFolder={(folder) => confirmDeleteFolder(folder as Folder)}
        onRenameCanvas={(canvas, folderId) => openCanvasRenameModal(canvas as Canvas, folderId)}
        onDeleteCanvas={(canvas, folderId) => confirmDeleteCanvas(canvas as Canvas, folderId)}
        onMoveCanvas={(canvas, folderId) => openMoveModal(canvas as Canvas, folderId)}
        sortOrder={sortOrder}
        onSortChange={updateSortOrder}
        isUpdatingSortOrder={isUpdatingSortOrder}
        isCreatingFolder={isCreatingFolder}
        isCreatingCanvas={isCreatingCanvas}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          currentCanvasId={canvasId}
          title={canvas?.name || 'Canvas'}
          showMenuButton={true}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onExportClick={handleExport}
          onImportClick={() => setShowImportModal(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Canvas Area */}
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
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Create New Folder
            </h3>
            <form onSubmit={createFolder}>
              <div>
                <label htmlFor="newFolderName" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Folder Name
                </label>
                <input
                  id="newFolderName"
                  name="newFolderName"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setNewFolderName('')}
                  disabled={isCreatingFolder}
                  className="px-4 py-2 border border-light-text/30 dark:border-dark-text/30 text-light-text/60 dark:text-dark-text/60 rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                  disabled={isCreatingFolder}
                  className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingFolder ? (
                    <><LoadingSpinner size="sm" /> Creating...</>
                  ) : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {showDeleteModal && folderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 id="delete-folder-heading" className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Delete Folder
            </h3>
            {folderToDelete.canvases.length > 0 ? (
              <>
                <p className="text-light-text dark:text-dark-text mb-4">
                  This folder contains {folderToDelete.canvases.length} canvas(es). What would you like to do?
                </p>
                <div className="space-y-3 mb-4" role="radiogroup" aria-labelledby="delete-folder-heading">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="deleteMoveToRoot"
                      name="deleteAction"
                      type="radio"
                      checked={deleteMoveToRoot}
                      onChange={() => setDeleteMoveToRoot(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-light-text dark:text-dark-text">
                      Move canvases to root (recommended)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="deleteAllCanvases"
                      name="deleteAction"
                      type="radio"
                      checked={!deleteMoveToRoot}
                      onChange={() => setDeleteMoveToRoot(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-light-text dark:text-dark-text">
                      Delete folder and all canvases inside
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <p className="text-light-text dark:text-dark-text mb-4">
                Are you sure you want to delete the folder &ldquo;{folderToDelete.name}&rdquo;?
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setFolderToDelete(null); }}
                disabled={isDeletingFolder}
                className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
              >
                Cancel
              </button>
              <button
                onClick={deleteFolder}
                disabled={isDeletingFolder}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingFolder ? (
                  <><LoadingSpinner size="sm" /> Deleting...</>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameModal && folderToRename && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Rename Folder
            </h3>
            <form onSubmit={renameFolder}>
              <div>
                <label htmlFor="renameFolderName" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Folder Name
                </label>
                <input
                  id="renameFolderName"
                  name="renameFolderName"
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (folderToRename) {
                      setRenameName(folderToRename.name);
                    }
                  }}
                  disabled={isRenamingFolder}
                  className="px-4 py-2 border border-light-text/30 dark:border-dark-text/30 text-light-text/60 dark:text-dark-text/60 rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRenameModal(false); setFolderToRename(null); setRenameName(''); }}
                  disabled={isRenamingFolder}
                  className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenamingFolder}
                  className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRenamingFolder ? (
                    <><LoadingSpinner size="sm" /> Saving...</>
                  ) : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Canvas Modal */}
      {showMoveModal && canvasToMove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 id="move-canvas-heading" className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Move Canvas
            </h3>
            <p className="text-light-text dark:text-dark-text mb-4">
              Select destination for &ldquo;{canvasToMove.name}&rdquo;:
            </p>
            <form onSubmit={moveCanvas}>
              <div className="space-y-2 mb-4" role="radiogroup" aria-labelledby="move-canvas-heading">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="moveToRoot"
                    name="moveDestination"
                    type="radio"
                    checked={moveTargetFolderId === null}
                    onChange={() => setMoveTargetFolderId(null)}
                    className="w-4 h-4"
                  />
                  <span className="text-light-text dark:text-dark-text">
                    Root (No Folder)
                  </span>
                </label>
                {folders.map((folder) => (
                  <label key={folder.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      id={`moveToFolder-${folder.id}`}
                      name="moveDestination"
                      type="radio"
                      checked={moveTargetFolderId === folder.id}
                      onChange={() => setMoveTargetFolderId(folder.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-light-text dark:text-dark-text">
                      {folder.name}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowMoveModal(false); setCanvasToMove(null); setMoveTargetFolderId(null); }}
                  disabled={isMovingCanvas}
                  className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMovingCanvas}
                  className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMovingCanvas ? (
                    <><LoadingSpinner size="sm" /> Moving...</>
                  ) : 'Move'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Canvas Modal */}
      {showCanvasDeleteModal && canvasToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Delete Canvas
            </h3>
            <div className="space-y-3 mb-4">
              <p className="text-light-text dark:text-dark-text">
                Are you sure you want to delete the canvas <strong>&ldquo;{canvasToDelete.canvas.name}&rdquo;</strong>?
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> This action will permanently delete the canvas and <strong>all notes within it</strong>. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowCanvasDeleteModal(false); setCanvasToDelete(null); }}
                disabled={isDeletingCanvas}
                className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
              >
                Cancel
              </button>
              <button
                onClick={deleteCanvasConfirmed}
                disabled={isDeletingCanvas}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingCanvas ? (
                  <><LoadingSpinner size="sm" /> Deleting...</>
                ) : 'Delete Canvas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Canvas Modal */}
      {showCanvasRenameModal && canvasToRename && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Rename Canvas
            </h3>
            <form onSubmit={renameCanvas}>
              <div>
                <label htmlFor="renameCanvasName" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Canvas Name
                </label>
                <input
                  id="renameCanvasName"
                  name="renameCanvasName"
                  type="text"
                  value={canvasRenameName}
                  onChange={(e) => setCanvasRenameName(e.target.value)}
                  placeholder="Canvas name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (canvasToRename) {
                      setCanvasRenameName(canvasToRename.canvas.name);
                    }
                  }}
                  disabled={isRenamingCanvas}
                  className="px-4 py-2 border border-light-text/30 dark:border-dark-text/30 text-light-text/60 dark:text-dark-text/60 rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCanvasRenameModal(false); setCanvasToRename(null); setCanvasRenameName(''); }}
                  disabled={isRenamingCanvas}
                  className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenamingCanvas}
                  className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRenamingCanvas ? (
                    <><LoadingSpinner size="sm" /> Saving...</>
                  ) : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Canvas Modal */}
      {showNewCanvasModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Create New Canvas
            </h3>
            <form onSubmit={submitCreateCanvas}>
              <div>
                <label htmlFor="newCanvasName" className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Canvas Name
                </label>
                <input
                  id="newCanvasName"
                  name="newCanvasName"
                  type="text"
                  value={newCanvasName}
                  onChange={(e) => setNewCanvasName(e.target.value)}
                  placeholder="Canvas name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowNewCanvasModal(false); setNewCanvasName(''); setNewCanvasFolderId(undefined); }}
                  disabled={isCreatingCanvas}
                  className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCanvas || !newCanvasName.trim()}
                  className="px-4 py-2 bg-light-primary dark:bg-dark-primary text-white rounded-xl hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingCanvas ? (
                    <><LoadingSpinner size="sm" /> Creating...</>
                  ) : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        folders={folders}
      />
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={<CanvasSkeleton />}>
      <CanvasPageContent />
    </Suspense>
  );
}
