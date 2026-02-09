'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ReactFlowCanvas = dynamic(
  () => import('@/components/canvas/ReactFlowCanvas').then(mod => mod.default),
  { ssr: false }
);

interface Note {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
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

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
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

  // Save expanded folders to localStorage whenever they change
  useEffect(() => {
    if (expandedFolders.size > 0 || localStorage.getItem('expandedFolders')) {
      localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
    }
  }, [expandedFolders]);

  const fetchCanvas = async () => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Canvas not found');
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
      const res = await fetch(`/api/canvases/${canvasId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Note',
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
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  }, [canvasId]);

  const handleNoteUpdate = useCallback(async (noteId: string, newPosition: { x: number; y: number }, newSize?: { width: number; height: number }) => {
    try {
      const body: any = {
        positionX: Math.round(newPosition.x),
        positionY: Math.round(newPosition.y),
      };

      if (newSize) {
        body.width = Math.round(newSize.width);
        body.height = Math.round(newSize.height);
      }

      await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Update note in state
      setNotes(prev => prev.map(note =>
        note.id === noteId
          ? {
              ...note,
              positionX: Math.round(newPosition.x),
              positionY: Math.round(newPosition.y),
              ...(newSize && { width: Math.round(newSize.width), height: Math.round(newSize.height) })
            }
          : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  }, []);

  const handleViewportChange = useCallback(async (newViewport: { x: number; y: number; zoom: number }) => {
    try {
      await fetch(`/api/canvases/${canvasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewportX: newViewport.x,
          viewportY: newViewport.y,
          zoom: newViewport.zoom,
        }),
      });
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
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }, []);

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
      }
    } catch (error) {
      console.error('Error restoring note:', error);
    }
  }, [canvasId]);

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
      }
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  }, [canvasId]);

  const handleConnectionDelete = useCallback(async (connectionId: string) => {
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove connection from state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading canvas...</div>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Canvas not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#F8FAFC] dark:bg-[#1E293B]">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} transition-all duration-300 border-r border-[#E2E8F0] dark:border-[#475569] bg-white dark:bg-[#0F172A] overflow-hidden`}>
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#475569] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
              >
                {sidebarCollapsed ? '☰' : '«'}
              </button>
              <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                {canvas.name}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/settings"
                className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
              >
                Settings
              </a>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </header>

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
              onNoteCreate={handleNoteCreate}
              onNoteUpdate={handleNoteUpdate}
              onNoteDelete={handleNoteDelete}
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
