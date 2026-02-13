'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import ImportModal from '@/components/canvas/ImportModal';
import { useToast } from '@/contexts/ToastContext';
import { useFolders, useCreateFolder, useDeleteFolder, useRenameFolder } from '@/hooks/api/useFolders';
import { useCanvases, useCreateCanvas, useDeleteCanvas, useRenameCanvas, useMoveCanvas, useImportCanvas } from '@/hooks/api/useCanvases';
import { useCsrfToken } from '@/hooks/api/useAuth';
import { useUpdateSettings } from '@/hooks/api/useUser';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoader';
import { Clock, FileText, Pencil, Trash2, Plus } from 'lucide-react';

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
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [canvasToMove, setCanvasToMove] = useState<Canvas & { currentFolderId?: string } | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [showCanvasDeleteModal, setShowCanvasDeleteModal] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [showCanvasRenameModal, setShowCanvasRenameModal] = useState(false);
  const [canvasToRename, setCanvasToRename] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [canvasRenameName, setCanvasRenameName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasFolderId, setNewCanvasFolderId] = useState<string | undefined>(undefined);

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

  // Collect all canvases for the card grid
  const allCanvasesForGrid: (Canvas & { folderName?: string })[] = useMemo(() => {
    const items: (Canvas & { folderName?: string })[] = [];
    folders.forEach((folder: Folder) => {
      folder.canvases.forEach((canvas: Canvas) => {
        items.push({ ...canvas, folderName: folder.name });
      });
    });
    rootCanvases.forEach((canvas: Canvas) => {
      items.push(canvas);
    });
    return items;
  }, [folders, rootCanvases]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Canvas card accent colors based on index
  const cardAccents = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-teal-500 to-teal-600',
    'from-pink-500 to-pink-600',
    'from-orange-500 to-orange-600',
    'from-indigo-500 to-indigo-600',
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-[#0a0f1a] overflow-hidden">
      {/* Shared Sidebar */}
      <AppSidebar
        variant="dashboard"
        folders={folders}
        rootCanvases={rootCanvases}
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
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
        sidebarCollapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          showMenuButton={true}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Recent Canvases
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {allCanvasesForGrid.length} canvas{allCanvasesForGrid.length !== 1 ? 'es' : ''} across {folders.length} folder{folders.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => createCanvas()}
                disabled={isCreatingCanvas}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                New Canvas
              </button>
            </div>

            {/* Canvas Cards Grid */}
            {allCanvasesForGrid.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No canvases yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Create your first canvas to start organizing your ideas on an infinite workspace.
                </p>
                <button
                  onClick={() => createCanvas()}
                  disabled={isCreatingCanvas}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Canvas
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allCanvasesForGrid.map((canvas, index) => (
                  <Link
                    key={canvas.id}
                    href={`/canvas/${canvas.id}`}
                    className="group relative bg-white dark:bg-[#111827] rounded-xl border border-gray-200/80 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 overflow-hidden"
                  >
                    {/* Card accent bar */}
                    <div className={`h-1.5 bg-gradient-to-r ${cardAccents[index % cardAccents.length]}`} />

                    {/* Card content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {canvas.name}
                          </h3>
                          {canvas.folderName && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                              in {canvas.folderName}
                            </p>
                          )}
                        </div>

                        {/* Canvas actions menu */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openCanvasRenameModal(canvas);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-all"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              confirmDeleteCanvas(canvas);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(canvas.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

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
