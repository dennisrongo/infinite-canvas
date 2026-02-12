'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import ImportModal from '@/components/canvas/ImportModal';
import { useToast } from '@/contexts/ToastContext';
import { useFolders, useCreateFolder, useDeleteFolder, useRenameFolder } from '@/hooks/api/useFolders';
import { useCanvases, useCreateCanvas, useDeleteCanvas, useRenameCanvas, useMoveCanvas, useImportCanvas } from '@/hooks/api/useCanvases';
import { useCsrfToken } from '@/hooks/api/useAuth';
import { useUpdateSettings } from '@/hooks/api/useUser';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoader';
import { FolderPlus, FilePlus, Download, ChevronDown, ChevronRight, Pencil, Trash2, ArrowRightLeft, Folder } from 'lucide-react';

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

  // TanStack Query hooks for data fetching
  const { data: foldersData, isLoading: foldersLoading } = useFolders();
  const { data: canvasesData, isLoading: canvasesLoading } = useCanvases();
  const { data: csrfData } = useCsrfToken();
  const csrfToken = csrfData?.csrfToken || null;

  // Derive folders and root canvases from query data
  const folders: Folder[] = foldersData?.folders || [];
  const rootCanvases: Canvas[] = useMemo(() => {
    const allCanvases: Canvas[] = canvasesData?.canvases || [];
    const folderCanvasIds = new Set(
      folders.flatMap((f: Folder) => f.canvases.map((c: Canvas) => c.id))
    );
    return allCanvases.filter((c: Canvas) => !folderCanvasIds.has(c.id));
  }, [canvasesData, folders]);

  const loading = foldersLoading || canvasesLoading;

  // Sort order from API response
  const [sortOrder, setSortOrder] = useState<'updated' | 'alphabetical' | 'created'>('updated');

  // Sync sort order from folders API response
  useEffect(() => {
    if (foldersData?.sortOrder) {
      setSortOrder(foldersData.sortOrder);
    }
  }, [foldersData]);

  // Mutation hooks
  const createFolderMutation = useCreateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const renameFolderMutation = useRenameFolder();
  const createCanvasMutation = useCreateCanvas();
  const deleteCanvasMutation = useDeleteCanvas();
  const renameCanvasMutation = useRenameCanvas();
  const moveCanvasMutation = useMoveCanvas();
  const importCanvasMutation = useImportCanvas();
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

  // UI state
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasFolderId, setNewCanvasFolderId] = useState<string | undefined>(undefined);

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
  }, []);

  // Save expanded folders to localStorage whenever they change
  useEffect(() => {
    if (expandedFolders.size > 0 || localStorage.getItem('expandedFolders')) {
      localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
    }
  }, [expandedFolders]);

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

  const handleImport = async (importData: any, folderId?: string) => {
    try {
      const data = await importCanvasMutation.mutateAsync({ importData, folderId });
      showToast('Canvas imported successfully', 'success');
      setShowImportModal(false);
      router.push(`/canvas/${data.canvas.id}`);
    } catch (error: any) {
      console.error('Error importing canvas:', error);
      showToast(error?.message || 'Failed to import canvas', 'error');
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

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-light-canvas dark:bg-dark-canvas overflow-x-hidden">
      <Header
        showMenuButton={true}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="flex">
          {/* Sidebar - responsive */}
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-xl border-r border-light-note-border/60 dark:border-dark-note-border/60 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="p-5 border-b border-light-note-border/60 dark:border-dark-note-border/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
                  My Canvases
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => {
                    setShowNewFolderModal(true);
                    setSidebarOpen(false);
                  }}
                  disabled={isCreatingFolder}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-light-primary text-white rounded-xl hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover transition-all duration-150 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isCreatingFolder ? (
                    <><LoadingSpinner size="sm" /> Folder</>
                  ) : (
                    <><FolderPlus className="w-4 h-4" /> Folder</>
                  )}
                </button>
                <button
                  onClick={() => {
                    createCanvas();
                    setSidebarOpen(false);
                  }}
                  disabled={isCreatingCanvas}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-light-primary text-white rounded-xl hover:bg-light-primary-hover dark:bg-dark-primary dark:hover:bg-dark-primary-hover transition-all duration-150 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {isCreatingCanvas ? (
                    <><LoadingSpinner size="sm" /> Canvas</>
                  ) : (
                    <><FilePlus className="w-4 h-4" /> Canvas</>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setSidebarOpen(false);
                  }}
                  className="px-3 py-2 border border-light-note-border/60 dark:border-dark-note-border/60 rounded-xl hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-all duration-150 text-sm font-medium text-light-text dark:text-dark-text flex items-center justify-center gap-1.5 active:scale-95"
                  title="Import canvas"
                >
                  <Download className="w-4 h-4" />
                  Import
                </button>
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="sortOrder" className="text-sm font-medium text-light-text/60 dark:text-dark-text/60">
                  Sort by:
                </label>
                <select
                  id="sortOrder"
                  name="sortOrder"
                  value={sortOrder}
                  onChange={(e) => updateSortOrder(e.target.value as 'updated' | 'alphabetical' | 'created')}
                  disabled={isUpdatingSortOrder}
                  className="flex-1 px-3 py-2 text-sm border border-light-note-border/60 dark:border-dark-note-border/60 rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="created">Recently Created</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            <div className="p-5">
              {folders.length === 0 && rootCanvases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-text dark:text-dark-text mb-4">
                    No canvases yet. Create your first canvas or folder to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {folders.map((folder) => (
                    <div key={folder.id} className="border border-light-note-border/60 dark:border-dark-note-border/60 rounded-xl overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 bg-light-canvas dark:bg-dark-canvas cursor-pointer hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 transition-colors"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {expandedFolders.has(folder.id) ? (
                            <ChevronDown className="w-4 h-4 text-light-text/50 dark:text-dark-text/50 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-light-text/50 dark:text-dark-text/50 flex-shrink-0" />
                          )}
                          <Folder className="w-4 h-4 text-light-primary dark:text-dark-primary flex-shrink-0" />
                          <span className="font-medium text-sm text-light-text dark:text-dark-text truncate">
                            {folder.name}
                          </span>
                          <span className="text-xs text-light-text/50 dark:text-dark-text/50 flex-shrink-0">
                            ({folder.canvases.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); createCanvas(folder.id); }}
                            disabled={isCreatingCanvas}
                            className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all disabled:opacity-50"
                            title="Add canvas"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openRenameModal(folder); }}
                            className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all"
                            title="Rename folder"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmDeleteFolder(folder); }}
                            className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 rounded-lg transition-all"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {expandedFolders.has(folder.id) && (
                        <div className="px-3 pb-3 border-t border-light-note-border/40 dark:border-dark-note-border/40">
                          {folder.canvases.length === 0 ? (
                            <p className="text-sm text-light-text/50 dark:text-dark-text/50 py-3 pl-6">No canvases in this folder</p>
                          ) : (
                            <div className="space-y-1 pt-2">
                              {folder.canvases.map((canvas) => (
                                <div
                                  key={canvas.id}
                                  className="flex items-center justify-between p-2.5 pl-7 rounded-lg hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 transition-colors group"
                                >
                                  <Link
                                    href={`/canvas/${canvas.id}`}
                                    className="text-sm text-light-primary dark:text-dark-primary hover:underline font-medium truncate"
                                  >
                                    {canvas.name}
                                  </Link>
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                      onClick={() => openCanvasRenameModal(canvas, folder.id)}
                                      className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all"
                                      title="Rename"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => openMoveModal(canvas, folder.id)}
                                      className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all"
                                      title="Move"
                                    >
                                      <ArrowRightLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => confirmDeleteCanvas(canvas, folder.id)}
                                      className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 rounded-lg transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
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
                    <div className="border border-light-note-border/60 dark:border-dark-note-border/60 rounded-xl overflow-hidden">
                      <div className="p-3 bg-light-canvas dark:bg-dark-canvas">
                        <span className="font-medium text-sm text-light-text dark:text-dark-text">
                          Root (No Folder)
                        </span>
                        <span className="text-xs text-light-text/50 dark:text-dark-text/50 ml-2">
                          ({rootCanvases.length})
                        </span>
                      </div>
                      <div className="px-3 pb-3 space-y-1">
                        {rootCanvases.map((canvas) => (
                          <div
                            key={canvas.id}
                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-light-primary/5 dark:hover:bg-dark-primary/5 transition-colors group"
                          >
                            <Link
                              href={`/canvas/${canvas.id}`}
                              className="text-sm text-light-primary dark:text-dark-primary hover:underline font-medium truncate"
                            >
                              {canvas.name}
                            </Link>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={() => openCanvasRenameModal(canvas)}
                                className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all"
                                title="Rename"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => openMoveModal(canvas, undefined)}
                                className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 rounded-lg transition-all"
                                title="Move"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => confirmDeleteCanvas(canvas)}
                                className="p-1.5 text-light-text/60 dark:text-dark-text/60 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
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
              <div className="bg-white dark:bg-dark-bg rounded-xl shadow-sm border border-light-note-border/60 dark:border-dark-note-border/60 p-6">
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-4">
                  Welcome to Infinite Canvas
                </h2>
                <p className="text-light-text/60 dark:text-dark-text/60 mb-4">
                  Select a canvas from the sidebar to view and edit it, or create a new canvas to get started.
                </p>
                {folders.length === 0 && rootCanvases.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-light-text dark:text-dark-text mb-4">
                      No canvases yet. Open the sidebar (click the menu button) and create your first canvas or folder to get started!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

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
