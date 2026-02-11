'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import ImportModal from '@/components/canvas/ImportModal';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CanvasSkeleton } from '@/components/ui/SkeletonLoader';
import { useCancellableRequest } from '@/hooks/useCancellableRequest';
import { ChevronDown, ChevronRight, Folder, LayoutDashboard } from 'lucide-react';

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
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootCanvases, setRootCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Note[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [viewport, setViewport] = useState<{ x: number; y: number; zoom: number } | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [canvasDeleted, setCanvasDeleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    // Load expanded folders from localStorage
    const saved = localStorage.getItem('expandedFolders');
    if (saved) {
      try {
        setExpandedFolders(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error loading expanded folders:', e);
      }
    }
    fetchCanvas();
    fetchFoldersAndCanvases();
  }, [canvasId]);

  // Handle deep linking to specific note
  useEffect(() => {
    if (noteIdParam && notes.length > 0) {
      const targetNote = notes.find(n => n.id === noteIdParam);
      if (targetNote) {
        setSelectedNoteId(noteIdParam);
        showToast(`Opened note: ${targetNote.title}`, 'success');
      } else {
        showToast('Note not found', 'error');
        // Remove the invalid note parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [noteIdParam, notes, showToast]);

  // Save expanded folders to localStorage whenever they change
  useEffect(() => {
    if (expandedFolders.size > 0 || localStorage.getItem('expandedFolders')) {
      localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
    }
  }, [expandedFolders]);

  // Handle visibility change - check if canvas still exists when returning to tab
  // Feature #174: Detect when canvas was deleted in another tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && canvas && !canvasDeleted) {
        // Page became visible again, check if canvas still exists
        fetchCanvas(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [canvas, canvasDeleted]);

  const fetchCanvas = async (showErrorToast = false) => {
    const requestKey = `fetchCanvas-${canvasId}`;
    try {
      // Feature #175: Use cancellable fetch for late response handling
      const res = await cancellableFetch(requestKey, `/api/canvases/${canvasId}`);

      // Check if component is still mounted
      if (!isMounted()) return;

      if (!res.ok) {
        if (res.status === 404) {
          setError('This canvas no longer exists');
          setCanvasDeleted(true);
          if (showErrorToast) {
            showToast('This canvas was deleted in another session', 'error');
          }
        } else if (res.status === 403) {
          setError('You do not have access to this canvas');
        } else {
          throw new Error('Failed to fetch canvas');
        }
        return;
      }
      const data = await res.json();

      // Feature #175: Check if component is still mounted before state update
      if (!isMounted()) return;

      setCanvas(data.canvas);
      setNotes(data.canvas.notes || []);
      setCanvasDeleted(false);

      // Fetch connections for this canvas
      fetchConnections(canvasId);

      // Load viewport state
      if (data.canvas.viewportX !== null && data.canvas.viewportY !== null && data.canvas.zoom !== null) {
        setViewport({
          x: data.canvas.viewportX,
          y: data.canvas.viewportY,
          zoom: data.canvas.zoom,
        });
      }
    } catch (err) {
      // Feature #175: Handle cancelled requests silently
      if (err instanceof Error && err.message === 'Request cancelled') {
        console.log('Canvas fetch cancelled (user navigated away)');
        return;
      }
      console.error('Error fetching canvas:', err);
      if (isMounted()) {
        setError('Failed to load canvas');
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  };

  const fetchFoldersAndCanvases = async () => {
    try {
      const foldersRes = await fetch('/api/folders');
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(foldersData.folders || []);
      }

      const canvasesRes = await fetch('/api/canvases');
      if (canvasesRes.ok) {
        const canvasesData: CanvasesResponse = await canvasesRes.json();
        setRootCanvases((canvasesData.canvases || []).filter((c: Canvas) => {
          return !folders.some((f: Folder) => f.canvases.some((fc: Canvas) => fc.id === c.id));
        }));
      }
    } catch (err) {
      console.error('Error fetching folders and canvases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async (id: string) => {
    const requestKey = `fetchConnections-${id}`;
    try {
      // Feature #175: Use cancellable fetch
      const res = await cancellableFetch(requestKey, `/api/canvases/${id}/connections`);

      // Feature #175: Check if component is still mounted
      if (!isMounted()) return;

      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
      // Feature #175: Handle cancelled requests silently
      if (err instanceof Error && err.message === 'Request cancelled') {
        console.log('Connections fetch cancelled (user navigated away)');
        return;
      }
      console.error('Error fetching connections:', err);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

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
          fetchCanvas(true);
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
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        console.log('Note update cancelled (user navigated away)');
        return;
      }
      console.error('Error updating note:', error);
    }
  }, [showToast, cancellableFetch, cleanup, fetchCanvas]);

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
        // Canvas was deleted, will be caught by next fetchCanvas call
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
      } else if (res.status === 404) {
        // Feature #174: Note was already deleted in another session
        showToast('This note was already deleted', 'info');
        // Remove from local state anyway
        setNotes(prev => prev.filter(note => note.id !== noteId));
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
      } else if (res.status === 404) {
        // Feature #174: Note or canvas was deleted in another session
        showToast('This note or canvas was deleted in another session', 'error');
        fetchCanvas(true);
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        console.log('Note duplication cancelled (user navigated away)');
        return;
      }
      console.error('Error duplicating note:', error);
    }
  }, [showToast, cancellableFetch, cleanup, fetchCanvas]);

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
      } else if (res.status === 404) {
        // Feature #174: Canvas or note was deleted in another session
        showToast('This canvas or note was deleted in another session', 'error');
        fetchCanvas(true);
      }
    } catch (error) {
      // Feature #175: Handle cancelled requests silently
      if (error instanceof Error && error.message === 'Request cancelled') {
        console.log('Connection creation cancelled (user navigated away)');
        return;
      }
      console.error('Error creating connection:', error);
    }
  }, [canvasId, showToast, cancellableFetch, cleanup, fetchCanvas]);

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
      } else if (res.status === 404) {
        // Feature #174: Connection was already deleted in another session
        // Just remove from local state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
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
        // Refresh the folders and canvases list
        fetchFoldersAndCanvases();
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

  if (loading) {
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
    <div className="h-screen flex bg-light-canvas dark:bg-dark-canvas overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} transition-all duration-300 border-r border-light-note-border/60 dark:border-dark-note-border/60 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-xl overflow-hidden flex-shrink-0 fixed lg:static inset-y-0 left-0 z-50 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {!sidebarCollapsed && (
          <div className="p-4 h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
                Canvases
              </h2>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
            </div>

            <div className="space-y-3">
              {folders.map((folder) => (
                <div key={folder.id}>
                  <div
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 rounded-lg transition-colors"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    {expandedFolders.has(folder.id) ? (
                      <ChevronDown className="w-3.5 h-3.5 text-light-text/50 dark:text-dark-text/50 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-light-text/50 dark:text-dark-text/50 flex-shrink-0" />
                    )}
                    <Folder className="w-3.5 h-3.5 text-light-primary dark:text-dark-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-light-text dark:text-dark-text truncate">
                      {folder.name}
                    </span>
                    <span className="text-xs text-light-text/50 dark:text-dark-text/50 flex-shrink-0">
                      ({folder.canvases.length})
                    </span>
                  </div>

                  {expandedFolders.has(folder.id) && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {folder.canvases.map((c) => (
                        <a
                          key={c.id}
                          href={`/canvas/${c.id}`}
                          onClick={() => setSidebarOpen(false)}
                          className={`block p-2 rounded-lg text-sm transition-colors ${
                            c.id === canvasId
                              ? 'bg-light-primary dark:bg-dark-primary text-white font-medium'
                              : 'text-light-text/60 dark:text-dark-text/60 hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 hover:text-light-text dark:hover:text-dark-text'
                          }`}
                        >
                          {c.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {rootCanvases.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 p-2">
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">
                      Root
                    </span>
                    <span className="text-xs text-light-text/50 dark:text-dark-text/50">
                      ({rootCanvases.length})
                    </span>
                  </div>
                  <div className="ml-4 mt-1 space-y-0.5">
                    {rootCanvases.map((c) => (
                      <a
                        key={c.id}
                        href={`/canvas/${c.id}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`block p-2 rounded-lg text-sm transition-colors ${
                          c.id === canvasId
                            ? 'bg-light-primary dark:bg-dark-primary text-white font-medium'
                            : 'text-light-text/60 dark:text-dark-text/60 hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 hover:text-light-text dark:hover:text-dark-text'
                        }`}
                      >
                        {c.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          currentCanvasId={canvasId}
          title={canvas?.name || 'Canvas'}
          showMenuButton={true}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showCollapseButton={true}
          onCollapseClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed}
          onExportClick={handleExport}
          onImportClick={() => setShowImportModal(true)}
        />

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden bg-light-canvas dark:bg-dark-canvas">
          <ReactFlowCanvas
            canvasId={canvasId}
            initialNotes={notes}
            initialConnections={connections}
            initialViewport={viewport || undefined}
            selectedNoteId={selectedNoteId || undefined}
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
