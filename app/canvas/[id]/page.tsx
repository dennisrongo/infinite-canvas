'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Dynamically import ReactFlowCanvas with SSR disabled
const ReactFlowCanvas = dynamic(
  () => import('@/components/canvas/ReactFlowCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading canvas...</div>
      </div>
    )
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

  // Get note ID from URL query parameter for deep linking
  const noteIdParam = searchParams?.get('note');

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
    try {
      const res = await fetch(`/api/canvases/${canvasId}`);
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
      console.error('Error fetching canvas:', err);
      setError('Failed to load canvas');
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
    try {
      const res = await fetch(`/api/canvases/${id}/connections`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch (err) {
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
    try {
      // Generate a unique title for "Untitled Note"
      const existingUntitledNotes = notes.filter(n => n.title.startsWith('Untitled Note'));
      let newTitle = 'Untitled Note';
      if (existingUntitledNotes.length > 0) {
        newTitle = `Untitled Note ${existingUntitledNotes.length + 1}`;
      }

      const res = await fetch(`/api/canvases/${canvasId}/notes`, {
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

      if (res.ok) {
        const data = await res.json();
        // Add new note to state
        setNotes(prev => [...prev, data.note]);
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
      console.error('Error creating note:', error);
      showToast('Failed to create note. Please try again.', 'error');
    }
  }, [canvasId, notes, showToast]);

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

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

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
      console.error('Error updating note:', error);
    }
  }, [showToast]);

  const handleViewportChange = useCallback(async (newViewport: { x: number; y: number; zoom: number }) => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewportX: newViewport.x,
          viewportY: newViewport.y,
          zoom: newViewport.zoom,
        }),
      });
      // Feature #174: Handle canvas deleted case - silently fail for viewport updates
      if (!res.ok && res.status === 404) {
        // Canvas was deleted, will be caught by next fetchCanvas call
        console.warn('Canvas was deleted while updating viewport');
      }
    } catch (error) {
      console.error('Error saving viewport state:', error);
    }
  }, [canvasId]);

  const handleNoteDelete = useCallback(async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

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
      console.error('Error deleting note:', error);
    }
  }, [showToast]);

  const handleNoteDuplicate = useCallback(async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/duplicate`, {
        method: 'POST',
      });

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
      console.error('Error duplicating note:', error);
    }
  }, [showToast]);

  const handleNoteRestore = useCallback(async (note: Note) => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}/notes`, {
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
      console.error('Error restoring note:', error);
    }
  }, [canvasId, showToast]);

  const handleConnectionCreate = useCallback(async (sourceNoteId: string, targetNoteId: string) => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceNoteId, targetNoteId }),
      });

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
      console.error('Error creating connection:', error);
    }
  }, [canvasId, showToast]);

  const handleConnectionDelete = useCallback(async (connectionId: string) => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove connection from state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      } else if (res.status === 404) {
        // Feature #174: Connection was already deleted in another session
        // Just remove from local state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center overflow-hidden">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading canvas...</div>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center overflow-x-hidden px-4">
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
              <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-2">
                Canvas No Longer Available
              </h2>
              <p className="text-[#64748B] dark:text-[#94A3B8] mb-6">
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
              <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-2">
                Canvas Not Found
              </h2>
              <p className="text-[#64748B] dark:text-[#94A3B8] mb-6">
                {error || 'The canvas you are looking for does not exist.'}
              </p>
            </>
          )}
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#F8FAFC] dark:bg-[#1E293B] overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} transition-all duration-300 border-r border-[#E2E8F0] dark:border-[#475569] bg-white dark:bg-[#0F172A] overflow-hidden flex-shrink-0`}>
        {!sidebarCollapsed && (
          <div className="p-4 h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                Canvases
              </h2>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xs text-[#3B82F6] hover:underline"
              >
                Dashboard
              </button>
            </div>

            <div className="space-y-4">
              {folders.map((folder) => (
                <div key={folder.id}>
                  <div
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] rounded"
                    onClick={() => toggleFolder(folder.id)}
                  >
                    <span className="text-xs text-[#64748B]">
                      {expandedFolders.has(folder.id) ? '▼' : '▶'}
                    </span>
                    <span className="text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                      {folder.name}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      ({folder.canvases.length})
                    </span>
                  </div>

                  {expandedFolders.has(folder.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {folder.canvases.map((c) => (
                        <a
                          key={c.id}
                          href={`/canvas/${c.id}`}
                          className={`block p-2 rounded text-sm transition ${
                            c.id === canvasId
                              ? 'bg-[#3B82F6] text-white font-medium'
                              : 'text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]'
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
                    <span className="text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                      Root
                    </span>
                    <span className="text-xs text-[#64748B]">
                      ({rootCanvases.length})
                    </span>
                  </div>
                  <div className="ml-4 mt-1 space-y-1">
                    {rootCanvases.map((c) => (
                      <a
                        key={c.id}
                        href={`/canvas/${c.id}`}
                        className={`block p-2 rounded text-sm transition ${
                          c.id === canvasId
                            ? 'bg-[#3B82F6] text-white font-medium'
                            : 'text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]'
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          currentCanvasId={canvasId}
          title={canvas?.name || 'Canvas'}
          showCollapseButton={true}
          onCollapseClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed}
        />

        {/* Canvas Area */}
        <main className="flex-1 relative overflow-hidden bg-[#F8FAFC] dark:bg-[#1E293B]">
          {canvas.notes.length === 0 && notes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-[#1E293B] dark:text-[#F1F5F9] text-lg mb-2">
                  No notes yet
                </p>
                <p className="text-[#64748B] mb-4">
                  Double-click anywhere to create your first note
                </p>
              </div>
            </div>
          ) : (
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
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <CanvasPageContent />
    </Suspense>
  );
}
