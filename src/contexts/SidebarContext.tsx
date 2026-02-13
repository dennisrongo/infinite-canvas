'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

// Modal state interface
interface SidebarModalState {
  // New Folder Modal
  showNewFolderModal: boolean;
  newFolderName: string;

  // Delete Folder Modal
  showDeleteModal: boolean;
  folderToDelete: Folder | null;
  deleteMoveToRoot: boolean;

  // Rename Folder Modal
  showRenameModal: boolean;
  folderToRename: Folder | null;
  renameName: string;

  // Move Canvas Modal
  showMoveModal: boolean;
  canvasToMove: (Canvas & { currentFolderId?: string }) | null;
  moveTargetFolderId: string | null;

  // Delete Canvas Modal
  showCanvasDeleteModal: boolean;
  canvasToDelete: { canvas: Canvas; folderId?: string } | null;

  // Rename Canvas Modal
  showCanvasRenameModal: boolean;
  canvasToRename: { canvas: Canvas; folderId?: string } | null;
  canvasRenameName: string;

  // New Canvas Modal
  showNewCanvasModal: boolean;
  newCanvasName: string;
  newCanvasFolderId: string | undefined;

  // Import Modal
  showImportModal: boolean;
}

// Context interface
interface SidebarContextType extends SidebarModalState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Canvas header state (set by canvas page, read by layout's Header)
  canvasTitle: string | null;
  onExportClick: (() => void) | null;
  onTitleChange: ((newTitle: string) => Promise<void>) | null;

  // Sidebar actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Canvas header actions
  setCanvasHeader: (title: string | null, onExport: (() => void) | null, onTitleChange?: ((newTitle: string) => Promise<void>) | null) => void;

  // Folder modal actions
  openNewFolderModal: () => void;
  closeNewFolderModal: () => void;
  setNewFolderName: (name: string) => void;

  openDeleteFolderModal: (folder: Folder) => void;
  closeDeleteFolderModal: () => void;
  setDeleteMoveToRoot: (move: boolean) => void;

  openRenameFolderModal: (folder: Folder) => void;
  closeRenameFolderModal: () => void;
  setRenameName: (name: string) => void;

  // Canvas modal actions
  openMoveCanvasModal: (canvas: Canvas, currentFolderId?: string) => void;
  closeMoveCanvasModal: () => void;
  setMoveTargetFolderId: (id: string | null) => void;

  openDeleteCanvasModal: (canvas: Canvas, folderId?: string) => void;
  closeDeleteCanvasModal: () => void;

  openRenameCanvasModal: (canvas: Canvas, folderId?: string) => void;
  closeRenameCanvasModal: () => void;
  setCanvasRenameName: (name: string) => void;

  openNewCanvasModal: (folderId?: string) => void;
  closeNewCanvasModal: () => void;
  setNewCanvasName: (name: string) => void;
  setNewCanvasFolderId: (id: string | undefined) => void;

  openImportModal: () => void;
  closeImportModal: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Canvas header state
  const [canvasTitle, setCanvasTitle] = useState<string | null>(null);
  const [onExportClick, setOnExportClick] = useState<(() => void) | null>(null);
  const [onTitleChange, setOnTitleChange] = useState<((newTitle: string) => Promise<void>) | null>(null);

  // Modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteMoveToRoot, setDeleteMoveToRoot] = useState(true);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [renameName, setRenameName] = useState('');

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [canvasToMove, setCanvasToMove] = useState<(Canvas & { currentFolderId?: string }) | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);

  const [showCanvasDeleteModal, setShowCanvasDeleteModal] = useState(false);
  const [canvasToDelete, setCanvasToDelete] = useState<{ canvas: Canvas; folderId?: string } | null>(null);

  const [showCanvasRenameModal, setShowCanvasRenameModal] = useState(false);
  const [canvasToRename, setCanvasToRename] = useState<{ canvas: Canvas; folderId?: string } | null>(null);
  const [canvasRenameName, setCanvasRenameName] = useState('');

  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [newCanvasFolderId, setNewCanvasFolderId] = useState<string | undefined>(undefined);

  const [showImportModal, setShowImportModal] = useState(false);

  // Sidebar actions
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Folder modal actions
  const openNewFolderModal = useCallback(() => {
    setShowNewFolderModal(true);
    setSidebarOpen(false);
  }, []);

  const closeNewFolderModal = useCallback(() => {
    setShowNewFolderModal(false);
    setNewFolderName('');
  }, []);

  const openDeleteFolderModal = useCallback((folder: Folder) => {
    setFolderToDelete(folder);
    setDeleteMoveToRoot(folder.canvases.length > 0);
    setShowDeleteModal(true);
  }, []);

  const closeDeleteFolderModal = useCallback(() => {
    setShowDeleteModal(false);
    setFolderToDelete(null);
  }, []);

  const openRenameFolderModal = useCallback((folder: Folder) => {
    setFolderToRename(folder);
    setRenameName(folder.name);
    setShowRenameModal(true);
  }, []);

  const closeRenameFolderModal = useCallback(() => {
    setShowRenameModal(false);
    setFolderToRename(null);
    setRenameName('');
  }, []);

  // Canvas modal actions
  const openMoveCanvasModal = useCallback((canvas: Canvas, currentFolderId?: string) => {
    setCanvasToMove({ ...canvas, currentFolderId });
    setMoveTargetFolderId(currentFolderId || null);
    setShowMoveModal(true);
  }, []);

  const closeMoveCanvasModal = useCallback(() => {
    setShowMoveModal(false);
    setCanvasToMove(null);
    setMoveTargetFolderId(null);
  }, []);

  const openDeleteCanvasModal = useCallback((canvas: Canvas, folderId?: string) => {
    setCanvasToDelete({ canvas, folderId });
    setShowCanvasDeleteModal(true);
  }, []);

  const closeDeleteCanvasModal = useCallback(() => {
    setShowCanvasDeleteModal(false);
    setCanvasToDelete(null);
  }, []);

  const openRenameCanvasModal = useCallback((canvas: Canvas, folderId?: string) => {
    setCanvasToRename({ canvas, folderId });
    setCanvasRenameName(canvas.name);
    setShowCanvasRenameModal(true);
  }, []);

  const closeRenameCanvasModal = useCallback(() => {
    setShowCanvasRenameModal(false);
    setCanvasToRename(null);
    setCanvasRenameName('');
  }, []);

  const openNewCanvasModal = useCallback((folderId?: string) => {
    setNewCanvasFolderId(folderId);
    setNewCanvasName('');
    setShowNewCanvasModal(true);
    setSidebarOpen(false);
  }, []);

  const closeNewCanvasModal = useCallback(() => {
    setShowNewCanvasModal(false);
    setNewCanvasName('');
    setNewCanvasFolderId(undefined);
  }, []);

  const openImportModal = useCallback(() => {
    setShowImportModal(true);
    setSidebarOpen(false);
  }, []);

  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
  }, []);

  // Canvas header actions
  const setCanvasHeader = useCallback((title: string | null, onExport: (() => void) | null, onTitleChangeCallback?: ((newTitle: string) => Promise<void>) | null) => {
    setCanvasTitle(title);
    setOnExportClick(() => onExport);
    setOnTitleChange(() => onTitleChangeCallback ?? null);
  }, []);

  const value: SidebarContextType = {
    // Sidebar state
    sidebarOpen,
    sidebarCollapsed,
    canvasTitle,
    onExportClick,
    onTitleChange,
    setSidebarOpen,
    toggleSidebar,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    setCanvasHeader,

    // Modal states
    showNewFolderModal,
    newFolderName,
    showDeleteModal,
    folderToDelete,
    deleteMoveToRoot,
    showRenameModal,
    folderToRename,
    renameName,
    showMoveModal,
    canvasToMove,
    moveTargetFolderId,
    showCanvasDeleteModal,
    canvasToDelete,
    showCanvasRenameModal,
    canvasToRename,
    canvasRenameName,
    showNewCanvasModal,
    newCanvasName,
    newCanvasFolderId,
    showImportModal,

    // Folder modal actions
    openNewFolderModal,
    closeNewFolderModal,
    setNewFolderName,
    openDeleteFolderModal,
    closeDeleteFolderModal,
    setDeleteMoveToRoot,
    openRenameFolderModal,
    closeRenameFolderModal,
    setRenameName,

    // Canvas modal actions
    openMoveCanvasModal,
    closeMoveCanvasModal,
    setMoveTargetFolderId,
    openDeleteCanvasModal,
    closeDeleteCanvasModal,
    openRenameCanvasModal,
    closeRenameCanvasModal,
    setCanvasRenameName,
    openNewCanvasModal,
    closeNewCanvasModal,
    setNewCanvasName,
    setNewCanvasFolderId,
    openImportModal,
    closeImportModal,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
