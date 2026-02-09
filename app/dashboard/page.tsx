'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { useToast } from '@/contexts/ToastContext';

interface Canvas {
  id: string;
  name: string;
  updatedAt: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootCanvases, setRootCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteMoveToRoot, setDeleteMoveToRoot] = useState(true);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [renameName, setRenameName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [canvasToMove, setCanvasToMove] = useState<Canvas & { currentFolderId?: string } | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [showCanvasDeleteModal, setShowCanvasDeleteModal] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [showCanvasRenameModal, setShowCanvasRenameModal] = useState(false);
  const [canvasToRename, setCanvasToRename] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [canvasRenameName, setCanvasRenameName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'updated' | 'alphabetical' | 'created'>('updated');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [isRenamingFolder, setIsRenamingFolder] = useState(false);
  const [isCreatingCanvas, setIsCreatingCanvas] = useState(false);
  const [isDeletingCanvas, setIsDeletingCanvas] = useState(false);
  const [isRenamingCanvas, setIsRenamingCanvas] = useState(false);
  const [isMovingCanvas, setIsMovingCanvas] = useState(false);
  const [isUpdatingSortOrder, setIsUpdatingSortOrder] = useState(false);

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
    // Fetch CSRF token for state-changing operations
    fetch('/api/auth/csrf')
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(e => console.error('Failed to fetch CSRF token:', e));
    fetchFolders();
  }, []);

  // Save expanded folders to localStorage whenever they change
  useEffect(() => {
    if (expandedFolders.size > 0 || localStorage.getItem('expandedFolders')) {
      localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
    }
  }, [expandedFolders]);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) throw new Error('Failed to fetch folders');
      const data = await res.json();
      setFolders(data.folders || []);

      // Update sort order from API response
      if (data.sortOrder) {
        setSortOrder(data.sortOrder);
      }

      const canvasesRes = await fetch('/api/canvases');
      if (!canvasesRes.ok) throw new Error('Failed to fetch canvases');
      const canvasesData: CanvasesResponse = await canvasesRes.json();
      setRootCanvases((canvasesData.canvases || []).filter((c: Canvas) => {
        return !data.folders?.some((f: Folder) => f.canvases.some((fc: Canvas) => fc.id === c.id));
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load folders and canvases', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSortOrder = async (newSortOrder: 'updated' | 'alphabetical' | 'created') => {
    if (isUpdatingSortOrder) return; // Prevent double-click
    setIsUpdatingSortOrder(true);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasSortOrder: newSortOrder }),
      });

      if (!res.ok) {
        throw new Error('Failed to update sort order');
      }

      setSortOrder(newSortOrder);
      await fetchFolders(); // Refresh the canvas list with new sort order
      showToast(`Sort order changed to ${newSortOrder}`, 'success');
    } catch (error) {
      console.error('Error updating sort order:', error);
      showToast('Failed to update sort order', 'error');
    } finally {
      setIsUpdatingSortOrder(false);
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || isCreatingFolder) return; // Prevent double-click

    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const data = await res.json();
      setFolders([...folders, data.folder]);
      setNewFolderName('');
      setShowNewFolderModal(false);
      showToast(`Folder "${data.folder.name}" created successfully`, 'success');
    } catch (error: any) {
      console.error('Error creating folder:', error);
      showToast(error.message || 'Failed to create folder', 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const confirmDeleteFolder = (folder: Folder) => {
    setFolderToDelete(folder);
    setDeleteMoveToRoot(folder.canvases.length > 0);
    setShowDeleteModal(true);
  };

  const deleteFolder = async () => {
    if (!folderToDelete || isDeletingFolder) return; // Prevent double-click

    setIsDeletingFolder(true);
    try {
      const url = `/api/folders/${folderToDelete.id}?moveCanvasesToRoot=${deleteMoveToRoot}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      setFolders(folders.filter(f => f.id !== folderToDelete.id));

      if (deleteMoveToRoot && folderToDelete.canvases.length > 0) {
        setRootCanvases([...rootCanvases, ...folderToDelete.canvases]);
      }

      setShowDeleteModal(false);
      setFolderToDelete(null);
      showToast('Folder deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      showToast(error.message || 'Failed to delete folder', 'error');
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const openRenameModal = (folder: Folder) => {
    setFolderToRename(folder);
    setRenameName(folder.name);
    setShowRenameModal(true);
  };

  const renameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameName.trim() || isRenamingFolder) return; // Prevent double-click

    setIsRenamingFolder(true);
    try {
      const res = await fetch(`/api/folders/${folderToRename.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rename folder');
      }

      const data = await res.json();
      setFolders(folders.map(f => f.id === folderToRename.id ? data.folder : f));
      setShowRenameModal(false);
      setFolderToRename(null);
      setRenameName('');
      showToast('Folder renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming folder:', error);
      showToast(error.message || 'Failed to rename folder', 'error');
    } finally {
      setIsRenamingFolder(false);
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

  const createCanvas = async (folderId?: string) => {
    if (isCreatingCanvas) return; // Prevent double-click

    const canvasName = prompt(folderId ? 'Enter canvas name:' : 'Enter canvas name for root:');
    if (!canvasName || !canvasName.trim()) return;

    setIsCreatingCanvas(true);
    try {
      const body: any = { name: canvasName.trim() };
      if (folderId) body.folderId = folderId;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const res = await fetch('/api/canvases', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create canvas');

      const data = await res.json();
      if (folderId) {
        setFolders(folders.map(f => {
          if (f.id === folderId) {
            return { ...f, canvases: [...f.canvases, data.canvas] };
          }
          return f;
        }));
      } else {
        setRootCanvases([...rootCanvases, data.canvas]);
      }

      showToast(`Canvas "${data.canvas.name}" created successfully`, 'success');
    } catch (error) {
      console.error('Error creating canvas:', error);
      showToast('Failed to create canvas', 'error');
    } finally {
      setIsCreatingCanvas(false);
    }
  };

  const confirmDeleteCanvas = (canvas: Canvas, folderId?: string) => {
    setCanvasToDelete({ canvas, folderId });
    setShowCanvasDeleteModal(true);
  };

  const deleteCanvasConfirmed = async () => {
    if (!canvasToDelete || isDeletingCanvas) return; // Prevent double-click

    setIsDeletingCanvas(true);
    try {
      const res = await fetch(`/api/canvases/${canvasToDelete.canvas.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete canvas');

      if (canvasToDelete.folderId) {
        setFolders(folders.map(f => {
          if (f.id === canvasToDelete.folderId) {
            return { ...f, canvases: f.canvases.filter(c => c.id !== canvasToDelete.canvas.id) };
          }
          return f;
        }));
      } else {
        setRootCanvases(rootCanvases.filter(c => c.id !== canvasToDelete.canvas.id));
      }

      setShowCanvasDeleteModal(false);
      setCanvasToDelete(null);
      showToast('Canvas deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting canvas:', error);
      showToast('Failed to delete canvas', 'error');
    } finally {
      setIsDeletingCanvas(false);
    }
  };

  const openCanvasRenameModal = (canvas: Canvas, folderId?: string) => {
    setCanvasToRename({ canvas, folderId });
    setCanvasRenameName(canvas.name);
    setShowCanvasRenameModal(true);
  };

  const renameCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasToRename || !canvasRenameName.trim() || isRenamingCanvas) return; // Prevent double-click

    setIsRenamingCanvas(true);
    try {
      const res = await fetch(`/api/canvases/${canvasToRename.canvas.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: canvasRenameName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rename canvas');
      }

      const data = await res.json();
      const updatedCanvas = data.canvas;

      // Update the canvas in the appropriate list
      if (canvasToRename.folderId) {
        setFolders(folders.map(f => {
          if (f.id === canvasToRename.folderId) {
            return {
              ...f,
              canvases: f.canvases.map(c => c.id === updatedCanvas.id ? updatedCanvas : c)
            };
          }
          return f;
        }));
      } else {
        setRootCanvases(rootCanvases.map(c => c.id === updatedCanvas.id ? updatedCanvas : c));
      }

      setShowCanvasRenameModal(false);
      setCanvasToRename(null);
      setCanvasRenameName('');
      showToast('Canvas renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming canvas:', error);
      showToast(error.message || 'Failed to rename canvas', 'error');
    } finally {
      setIsRenamingCanvas(false);
    }
  };

  const openMoveModal = (canvas: Canvas, currentFolderId?: string) => {
    setCanvasToMove({ ...canvas, currentFolderId });
    setMoveTargetFolderId(currentFolderId || null);
    setShowMoveModal(true);
  };

  const moveCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasToMove || isMovingCanvas) return; // Prevent double-click

    setIsMovingCanvas(true);
    try {
      const body: any = { folderId: moveTargetFolderId };
      const res = await fetch(`/api/canvases/${canvasToMove.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to move canvas');
      }

      const data = await res.json();
      const canvas = data.canvas;

      // Remove canvas from its current location
      if (canvasToMove.currentFolderId) {
        setFolders(folders.map(f => {
          if (f.id === canvasToMove.currentFolderId) {
            return { ...f, canvases: f.canvases.filter(c => c.id !== canvas.id) };
          }
          return f;
        }));
      } else {
        setRootCanvases(rootCanvases.filter(c => c.id !== canvas.id));
      }

      // Add canvas to new location
      if (moveTargetFolderId) {
        setFolders(folders.map(f => {
          if (f.id === moveTargetFolderId) {
            return { ...f, canvases: [...f.canvases, canvas] };
          }
          return f;
        }));
      } else {
        setRootCanvases([...rootCanvases, canvas]);
      }

      setShowMoveModal(false);
      setCanvasToMove(null);
      setMoveTargetFolderId(null);

      const targetName = moveTargetFolderId
        ? folders.find(f => f.id === moveTargetFolderId)?.name || 'folder'
        : 'root';
      showToast(`Canvas moved to ${targetName}`, 'success');
    } catch (error: any) {
      console.error('Error moving canvas:', error);
      showToast(error.message || 'Failed to move canvas', 'error');
    } finally {
      setIsMovingCanvas(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B]">
      <Header
        showMenuButton={true}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="flex">
          {/* Sidebar - responsive */}
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-[#475569] transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="p-6 border-b border-[#E2E8F0] dark:border-[#475569]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                  My Canvases
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewFolderModal(true);
                      setSidebarOpen(false);
                    }}
                    disabled={isCreatingFolder}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isCreatingFolder ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        New Folder
                      </>
                    ) : '+ New Folder'}
                  </button>
                  <button
                    onClick={() => {
                      createCanvas();
                      setSidebarOpen(false);
                    }}
                    disabled={isCreatingCanvas}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isCreatingCanvas ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        New Canvas
                      </>
                    ) : '+ New Canvas'}
                  </button>
                </div>
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
                  Sort by:
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => updateSortOrder(e.target.value as 'updated' | 'alphabetical' | 'created')}
                  disabled={isUpdatingSortOrder}
                  className="flex-1 px-3 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="created">Recently Created</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {folders.length === 0 && rootCanvases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                    No canvases yet. Create your first canvas or folder to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.map((folder) => (
                    <div key={folder.id} className="border border-[#E2E8F0] dark:border-[#475569] rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-[#1E293B] cursor-pointer"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                            {expandedFolders.has(folder.id) ? '▼' : '▶'}
                          </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                            {folder.name}
                          </span>
                          <span className="text-sm text-[#64748B]">
                            ({folder.canvases.length} canvases)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); createCanvas(folder.id); }}
                            disabled={isCreatingCanvas}
                            className="px-3 py-1 text-xs bg-[#3B82F6] text-white rounded hover:bg-[#2563EB] transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCreatingCanvas ? '...' : '+ Canvas'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openRenameModal(folder); }}
                            className="px-3 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmDeleteFolder(folder); }}
                            className="px-3 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {expandedFolders.has(folder.id) && (
                        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#475569]">
                          {folder.canvases.length === 0 ? (
                            <p className="text-sm text-[#64748B]">No canvases in this folder</p>
                          ) : (
                            <div className="space-y-2">
                              {folder.canvases.map((canvas) => (
                                <div
                                  key={canvas.id}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded"
                                >
                                  <a
                                    href={`/canvas/${canvas.id}`}
                                    className="text-[#3B82F6] hover:underline font-medium"
                                  >
                                    {canvas.name}
                                  </a>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openCanvasRenameModal(canvas, folder.id)}
                                      className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      onClick={() => openMoveModal(canvas, folder.id)}
                                      className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                                    >
                                      Move
                                    </button>
                                    <button
                                      onClick={() => confirmDeleteCanvas(canvas, folder.id)}
                                      className="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {rootCanvases.length > 0 && (
                    <div className="border border-[#E2E8F0] dark:border-[#475569] rounded-lg">
                      <div className="p-4 bg-[#F8FAFC] dark:bg-[#1E293B]">
                        <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                          Root (No Folder)
                        </span>
                        <span className="text-sm text-[#64748B] ml-2">
                          ({rootCanvases.length} canvases)
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {rootCanvases.map((canvas) => (
                          <div
                            key={canvas.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded"
                          >
                            <a
                              href={`/canvas/${canvas.id}`}
                              className="text-[#3B82F6] hover:underline font-medium"
                            >
                              {canvas.name}
                            </a>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openCanvasRenameModal(canvas)}
                                className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => openMoveModal(canvas, undefined)}
                                className="px-2 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                              >
                                Move
                              </button>
                              <button
                                onClick={() => confirmDeleteCanvas(canvas)}
                                className="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Close sidebar content */}
              </div>
            </aside>

            {/* Main content area */}
            <div className="flex-1 p-6">
              <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                  Welcome to Infinite Canvas
                </h2>
                <p className="text-[#64748B] mb-4">
                  Select a canvas from the sidebar to view and edit it, or create a new canvas to get started.
                </p>
                {folders.length === 0 && rootCanvases.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                      No canvases yet. Open the sidebar (click the menu button) and create your first canvas or folder to get started!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Create New Folder
            </h3>
            <form onSubmit={createFolder}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                  disabled={isCreatingFolder}
                  className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingFolder ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && folderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Delete Folder
            </h3>
            {folderToDelete.canvases.length > 0 ? (
              <>
                <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                  This folder contains {folderToDelete.canvases.length} canvas(es). What would you like to do?
                </p>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={deleteMoveToRoot}
                      onChange={() => setDeleteMoveToRoot(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                      Move canvases to root (recommended)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!deleteMoveToRoot}
                      onChange={() => setDeleteMoveToRoot(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                      Delete folder and all canvases inside
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                Are you sure you want to delete the folder "{folderToDelete.name}"?
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setFolderToDelete(null); }}
                disabled={isDeletingFolder}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={deleteFolder}
                disabled={isDeletingFolder}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingFolder ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && folderToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Rename Folder
            </h3>
            <form onSubmit={renameFolder}>
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowRenameModal(false); setFolderToRename(null); setRenameName(''); }}
                  disabled={isRenamingFolder}
                  className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenamingFolder}
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRenamingFolder ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMoveModal && canvasToMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Move Canvas
            </h3>
            <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Select destination for "{canvasToMove.name}":
            </p>
            <form onSubmit={moveCanvas}>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={moveTargetFolderId === null}
                    onChange={() => setMoveTargetFolderId(null)}
                    className="w-4 h-4"
                  />
                  <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                    Root (No Folder)
                  </span>
                </label>
                {folders.map((folder) => (
                  <label key={folder.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={moveTargetFolderId === folder.id}
                      onChange={() => setMoveTargetFolderId(folder.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1E293B] dark:text-[#F1F5F9]">
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
                  className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMovingCanvas}
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isMovingCanvas ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Moving...
                    </>
                  ) : 'Move'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCanvasDeleteModal && canvasToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Delete Canvas
            </h3>
            <div className="space-y-3 mb-4">
              <p className="text-[#1E293B] dark:text-[#F1F5F9]">
                Are you sure you want to delete the canvas <strong>"{canvasToDelete.canvas.name}"</strong>?
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ <strong>Warning:</strong> This action will permanently delete the canvas and <strong>all notes within it</strong>. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowCanvasDeleteModal(false); setCanvasToDelete(null); }}
                disabled={isDeletingCanvas}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={deleteCanvasConfirmed}
                disabled={isDeletingCanvas}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingCanvas ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : 'Delete Canvas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCanvasRenameModal && canvasToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Rename Canvas
            </h3>
            <form onSubmit={renameCanvas}>
              <input
                type="text"
                value={canvasRenameName}
                onChange={(e) => setCanvasRenameName(e.target.value)}
                placeholder="Canvas name"
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowCanvasRenameModal(false); setCanvasToRename(null); setCanvasRenameName(''); }}
                  disabled={isRenamingCanvas}
                  className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenamingCanvas}
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRenamingCanvas ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
