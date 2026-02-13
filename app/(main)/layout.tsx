'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import AppSidebar from '@/components/layout/AppSidebar';
import ImportModal from '@/components/canvas/ImportModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { useFolders, useCreateFolder, useDeleteFolder, useRenameFolder } from '@/hooks/api/useFolders';
import { useCanvases, useCreateCanvas, useDeleteCanvas, useRenameCanvas, useMoveCanvas, useImportCanvas } from '@/hooks/api/useCanvases';
import { useUpdateSettings } from '@/hooks/api/useUser';
import { useCsrfToken } from '@/hooks/api/useAuth';

// Types
interface Canvas {
  id: string;
  name: string;
  updatedAt?: string;
}

interface Folder {
  id: string;
  name: string;
  canvases: Canvas[];
}

// The inner layout that uses the sidebar context
function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const sidebar = useSidebar();

  // Derive currentCanvasId from pathname
  const currentCanvasId = useMemo(() => {
    const match = pathname.match(/\/canvas\/([^/]+)/);
    return match ? match[1] : undefined;
  }, [pathname]);

  // Determine if we're on canvas page
  const isCanvasPage = pathname.startsWith('/canvas/');

  // TanStack Query hooks for data fetching
  const { data: foldersData } = useFolders();
  const { data: canvasesData } = useCanvases();
  const { data: csrfData } = useCsrfToken();
  const csrfToken = csrfData?.csrfToken || null;

  // Derive folders and root canvases from query data
  const folders: Folder[] = foldersData?.folders || [];
  const allCanvases: Canvas[] = canvasesData?.canvases || [];
  const folderCanvasIds = new Set(
    folders.flatMap((f: Folder) => f.canvases.map((c: Canvas) => c.id))
  );
  const rootCanvases: Canvas[] = allCanvases.filter((c: Canvas) => !folderCanvasIds.has(c.id));

  // Sync sort order from folders API response
  useEffect(() => {
    if (foldersData?.sortOrder) {
      sidebar.setSortOrder(foldersData.sortOrder);
    }
  }, [foldersData, sidebar]);

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

  // ── Action Handlers ──

  const updateSortOrder = async (newSortOrder: 'updated' | 'alphabetical' | 'created') => {
    if (isUpdatingSortOrder) return;
    try {
      await updateSettingsMutation.mutateAsync({ canvasSortOrder: newSortOrder });
      sidebar.setSortOrder(newSortOrder);
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
      sidebar.closeImportModal();
      router.push(`/canvas/${data.canvas.id}`);
    } catch (error: any) {
      console.error('Error importing canvas:', error);
      showToast(error?.message || 'Failed to import canvas', 'error');
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebar.newFolderName.trim() || isCreatingFolder) return;
    try {
      const data = await createFolderMutation.mutateAsync({ name: sidebar.newFolderName.trim() });
      sidebar.closeNewFolderModal();
      showToast(`Folder "${data.folder.name}" created successfully`, 'success');
    } catch (error: any) {
      console.error('Error creating folder:', error);
      showToast(error?.message || 'Failed to create folder', 'error');
    }
  };

  const deleteFolder = async () => {
    if (!sidebar.folderToDelete || isDeletingFolder) return;
    try {
      await deleteFolderMutation.mutateAsync({
        id: sidebar.folderToDelete.id,
        moveCanvasesToRoot: sidebar.deleteMoveToRoot
      });
      sidebar.closeDeleteFolderModal();
      showToast('Folder deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      showToast(error?.message || 'Failed to delete folder', 'error');
    }
  };

  const renameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebar.folderToRename || !sidebar.renameName.trim() || isRenamingFolder) return;
    try {
      await renameFolderMutation.mutateAsync({
        id: sidebar.folderToRename.id,
        name: sidebar.renameName.trim()
      });
      sidebar.closeRenameFolderModal();
      showToast('Folder renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming folder:', error);
      showToast(error?.message || 'Failed to rename folder', 'error');
    }
  };

  const submitCreateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebar.newCanvasName.trim() || isCreatingCanvas) return;
    try {
      const data = await createCanvasMutation.mutateAsync({
        name: sidebar.newCanvasName.trim(),
        folderId: sidebar.newCanvasFolderId,
        csrfToken: csrfToken || undefined,
      });
      sidebar.closeNewCanvasModal();
      showToast(`Canvas "${data.canvas.name}" created successfully`, 'success');
      // Navigate to the new canvas
      router.push(`/canvas/${data.canvas.id}`);
    } catch (error) {
      console.error('Error creating canvas:', error);
      showToast('Failed to create canvas', 'error');
    }
  };

  const deleteCanvasConfirmed = async () => {
    if (!sidebar.canvasToDelete || isDeletingCanvas) return;
    try {
      await deleteCanvasMutation.mutateAsync(sidebar.canvasToDelete.canvas.id);
      sidebar.closeDeleteCanvasModal();
      showToast('Canvas deleted successfully', 'success');
      // If we deleted the current canvas, navigate to dashboard
      if (sidebar.canvasToDelete?.canvas.id === currentCanvasId) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error deleting canvas:', error);
      showToast('Failed to delete canvas', 'error');
    }
  };

  const renameCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebar.canvasToRename || !sidebar.canvasRenameName.trim() || isRenamingCanvas) return;
    try {
      await renameCanvasMutation.mutateAsync({
        id: sidebar.canvasToRename.canvas.id,
        name: sidebar.canvasRenameName.trim()
      });
      sidebar.closeRenameCanvasModal();
      showToast('Canvas renamed successfully', 'success');
    } catch (error: any) {
      console.error('Error renaming canvas:', error);
      showToast(error?.message || 'Failed to rename canvas', 'error');
    }
  };

  const moveCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sidebar.canvasToMove || isMovingCanvas) return;
    try {
      await moveCanvasMutation.mutateAsync({
        id: sidebar.canvasToMove.id,
        folderId: sidebar.moveTargetFolderId
      });
      const targetName = sidebar.moveTargetFolderId
        ? folders.find(f => f.id === sidebar.moveTargetFolderId)?.name || 'folder'
        : 'root';
      sidebar.closeMoveCanvasModal();
      showToast(`Canvas moved to ${targetName}`, 'success');
    } catch (error: any) {
      console.error('Error moving canvas:', error);
      showToast(error?.message || 'Failed to move canvas', 'error');
    }
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-[#0a0f1a] overflow-hidden">
      {/* Persistent Sidebar */}
      <AppSidebar
        variant={isCanvasPage ? 'canvas' : 'dashboard'}
        folders={folders}
        rootCanvases={rootCanvases}
        currentCanvasId={currentCanvasId}
        sidebarOpen={sidebar.sidebarOpen}
        onSidebarClose={() => sidebar.setSidebarOpen(false)}
        sidebarCollapsed={sidebar.sidebarCollapsed}
        onCollapseToggle={sidebar.toggleSidebarCollapsed}
        onCreateFolder={sidebar.openNewFolderModal}
        onCreateCanvas={sidebar.openNewCanvasModal}
        onImport={sidebar.openImportModal}
        onRenameFolder={sidebar.openRenameFolderModal}
        onDeleteFolder={sidebar.openDeleteFolderModal}
        onRenameCanvas={sidebar.openRenameCanvasModal}
        onDeleteCanvas={sidebar.openDeleteCanvasModal}
        onMoveCanvas={sidebar.openMoveCanvasModal}
        sortOrder={sidebar.sortOrder}
        onSortChange={updateSortOrder}
        isUpdatingSortOrder={isUpdatingSortOrder}
        isCreatingFolder={isCreatingFolder}
        isCreatingCanvas={isCreatingCanvas}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentCanvasId={currentCanvasId}
          showMenuButton={true}
          onMenuClick={sidebar.toggleSidebar}
          sidebarCollapsed={sidebar.sidebarCollapsed}
          title={sidebar.canvasTitle || undefined}
          onTitleChange={sidebar.onTitleChange || undefined}
          onExportClick={sidebar.onExportClick || undefined}
          onImportClick={isCanvasPage ? sidebar.openImportModal : undefined}
        />
        {children}
      </div>

      {/* ── Modals (rendered once at layout level) ── */}

      {/* New Folder Modal */}
      {sidebar.showNewFolderModal && (
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
                  value={sidebar.newFolderName}
                  onChange={(e) => sidebar.setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => sidebar.setNewFolderName('')}
                  disabled={isCreatingFolder}
                  className="px-4 py-2 border border-light-text/30 dark:border-dark-text/30 text-light-text/60 dark:text-dark-text/60 rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={sidebar.closeNewFolderModal}
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
      {sidebar.showDeleteModal && sidebar.folderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 id="delete-folder-heading" className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Delete Folder
            </h3>
            {sidebar.folderToDelete.canvases.length > 0 ? (
              <>
                <p className="text-light-text dark:text-dark-text mb-4">
                  This folder contains {sidebar.folderToDelete.canvases.length} canvas(es). What would you like to do?
                </p>
                <div className="space-y-3 mb-4" role="radiogroup" aria-labelledby="delete-folder-heading">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="deleteMoveToRoot"
                      name="deleteAction"
                      type="radio"
                      checked={sidebar.deleteMoveToRoot}
                      onChange={() => sidebar.setDeleteMoveToRoot(true)}
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
                      checked={!sidebar.deleteMoveToRoot}
                      onChange={() => sidebar.setDeleteMoveToRoot(false)}
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
                Are you sure you want to delete the folder &ldquo;{sidebar.folderToDelete.name}&rdquo;?
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={sidebar.closeDeleteFolderModal}
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
      {sidebar.showRenameModal && sidebar.folderToRename && (
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
                  value={sidebar.renameName}
                  onChange={(e) => sidebar.setRenameName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => sidebar.folderToRename && sidebar.setRenameName(sidebar.folderToRename.name)}
                  disabled={isRenamingFolder}
                  className="px-4 py-2 border border-light-text/30 dark:border-dark-text/30 text-light-text/60 dark:text-dark-text/60 rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={sidebar.closeRenameFolderModal}
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
      {sidebar.showMoveModal && sidebar.canvasToMove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 id="move-canvas-heading" className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Move Canvas
            </h3>
            <p className="text-light-text dark:text-dark-text mb-4">
              Select destination for &ldquo;{sidebar.canvasToMove.name}&rdquo;:
            </p>
            <form onSubmit={moveCanvas}>
              <div className="space-y-2 mb-4" role="radiogroup" aria-labelledby="move-canvas-heading">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="moveToRoot"
                    name="moveDestination"
                    type="radio"
                    checked={sidebar.moveTargetFolderId === null}
                    onChange={() => sidebar.setMoveTargetFolderId(null)}
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
                      checked={sidebar.moveTargetFolderId === folder.id}
                      onChange={() => sidebar.setMoveTargetFolderId(folder.id)}
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
                  onClick={sidebar.closeMoveCanvasModal}
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
      {sidebar.showCanvasDeleteModal && sidebar.canvasToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Delete Canvas
            </h3>
            <div className="space-y-3 mb-4">
              <p className="text-light-text dark:text-dark-text">
                Are you sure you want to delete the canvas <strong>&ldquo;{sidebar.canvasToDelete.canvas.name}&rdquo;</strong>?
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> This action will permanently delete the canvas and <strong>all notes within it</strong>. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={sidebar.closeDeleteCanvasModal}
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
      {sidebar.showCanvasRenameModal && sidebar.canvasToRename && (
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
                  value={sidebar.canvasRenameName}
                  onChange={(e) => sidebar.setCanvasRenameName(e.target.value)}
                  placeholder="Canvas name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => sidebar.canvasToRename && sidebar.setCanvasRenameName(sidebar.canvasToRename.canvas.name)}
                  disabled={isRenamingCanvas}
                  className="px-4 py-2 border border-light-text/30 dark:border-dark-text/30 text-light-text/60 dark:text-dark-text/60 rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={sidebar.closeRenameCanvasModal}
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
      {sidebar.showNewCanvasModal && (
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
                  value={sidebar.newCanvasName}
                  onChange={(e) => sidebar.setNewCanvasName(e.target.value)}
                  placeholder="Canvas name"
                  className="w-full px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl bg-white dark:bg-dark-canvas text-light-text dark:text-dark-text mb-4 focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={sidebar.closeNewCanvasModal}
                  disabled={isCreatingCanvas}
                  className="px-4 py-2 border border-light-note-border dark:border-dark-note-border rounded-xl hover:bg-light-canvas dark:hover:bg-dark-canvas transition disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-dark-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCanvas || !sidebar.newCanvasName.trim()}
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
        isOpen={sidebar.showImportModal}
        onClose={sidebar.closeImportModal}
        onImport={handleImport}
        folders={folders}
      />
    </div>
  );
}

// Main layout wrapper with SidebarProvider
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
