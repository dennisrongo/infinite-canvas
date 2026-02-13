'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/api/useAuth';
import { useReorderCanvases } from '@/hooks/api/useCanvases';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  FilePlus,
  Download,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Settings,
  Moon,
  Sun,
  LogOut,
  LayoutGrid,
  PanelLeftClose,
  X,
  GripVertical,
} from 'lucide-react';

interface Canvas {
  id: string;
  name: string;
  updatedAt?: string;
  order?: number;
}

interface FolderType {
  id: string;
  name: string;
  canvases: Canvas[];
}

interface AppSidebarProps {
  readonly variant: 'dashboard' | 'canvas';
  readonly folders: FolderType[];
  readonly rootCanvases: Canvas[];
  readonly currentCanvasId?: string;
  readonly sidebarOpen: boolean;
  readonly onSidebarClose: () => void;
  readonly onCreateFolder?: () => void;
  readonly onCreateCanvas?: (folderId?: string) => void;
  readonly onImport?: () => void;
  readonly onRenameFolder?: (folder: FolderType) => void;
  readonly onDeleteFolder?: (folder: FolderType) => void;
  readonly onRenameCanvas?: (canvas: Canvas, folderId?: string) => void;
  readonly onDeleteCanvas?: (canvas: Canvas, folderId?: string) => void;
  readonly onMoveCanvas?: (canvas: Canvas, folderId?: string) => void;
  readonly sortOrder?: 'updated' | 'alphabetical' | 'created';
  readonly onSortChange?: (sort: 'updated' | 'alphabetical' | 'created') => void;
  readonly isUpdatingSortOrder?: boolean;
  readonly isCreatingFolder?: boolean;
  readonly isCreatingCanvas?: boolean;
  readonly sidebarCollapsed?: boolean;
  readonly onCollapseToggle?: () => void;
}

// Draggable canvas item component
interface DraggableCanvasItemProps {
  canvas: Canvas;
  currentCanvasId?: string;
  folderId?: string;
  onSidebarClose: () => void;
  onRenameCanvas?: (canvas: Canvas, folderId?: string) => void;
  onMoveCanvas?: (canvas: Canvas, folderId?: string) => void;
  onDeleteCanvas?: (canvas: Canvas, folderId?: string) => void;
}

function DraggableCanvasItem({
  canvas,
  currentCanvasId,
  folderId,
  onSidebarClose,
  onRenameCanvas,
  onMoveCanvas,
  onDeleteCanvas,
}: DraggableCanvasItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: canvas.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group/canvas cursor-grab active:cursor-grabbing ${
        canvas.id === currentCanvasId
          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
      } ${isDragging ? 'shadow-lg ring-2 ring-blue-400/50 bg-white dark:bg-gray-900 z-50' : ''}`}
    >
      {/* Drag handle indicator */}
      <GripVertical className="w-3 h-3 mr-1 text-gray-300 dark:text-gray-600 group-hover/canvas:text-gray-400 dark:group-hover/canvas:text-gray-500 flex-shrink-0" />

      <Link
        href={`/canvas/${canvas.id}`}
        onClick={onSidebarClose}
        className={`type-nav truncate flex-1 ${
          canvas.id === currentCanvasId
            ? 'font-medium text-blue-700 dark:text-blue-300'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        {canvas.name}
      </Link>

      {/* Canvas actions */}
      <div
        className="flex gap-0.5 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {onRenameCanvas && (
          <button
            onClick={() => onRenameCanvas(canvas, folderId)}
            className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
            title="Rename"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
        )}
        {onMoveCanvas && (
          <button
            onClick={() => onMoveCanvas(canvas, folderId)}
            className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
            title="Move"
          >
            <ArrowRightLeft className="w-2.5 h-2.5" />
          </button>
        )}
        {onDeleteCanvas && (
          <button
            onClick={() => onDeleteCanvas(canvas, folderId)}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
            title="Delete"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Droppable folder wrapper
interface DroppableFolderProps {
  folder: FolderType;
  isExpanded: boolean;
  onToggle: () => void;
  currentCanvasId?: string;
  onSidebarClose: () => void;
  onCreateCanvas?: (folderId: string) => void;
  onRenameFolder?: (folder: FolderType) => void;
  onDeleteFolder?: (folder: FolderType) => void;
  onRenameCanvas?: (canvas: Canvas, folderId?: string) => void;
  onMoveCanvas?: (canvas: Canvas, folderId?: string) => void;
  onDeleteCanvas?: (canvas: Canvas, folderId?: string) => void;
  isCreatingCanvas?: boolean;
  isOverFolder: boolean;
}

function DroppableFolder({
  folder,
  isExpanded,
  onToggle,
  currentCanvasId,
  onSidebarClose,
  onCreateCanvas,
  onRenameFolder,
  onDeleteFolder,
  onRenameCanvas,
  onMoveCanvas,
  onDeleteCanvas,
  isCreatingCanvas,
  isOverFolder,
}: DroppableFolderProps) {
  const { setNodeRef } = useSortable({ id: `folder-${folder.id}` });

  return (
    <div ref={setNodeRef}>
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
          isOverFolder
            ? 'bg-blue-100 dark:bg-blue-500/20 ring-2 ring-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
          <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${isOverFolder ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500 dark:text-blue-400'}`} />
          <span className={`type-nav truncate ${isOverFolder ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
            {folder.name}
          </span>
          <span className="type-meta text-gray-400 dark:text-gray-500 flex-shrink-0 tabular-nums">
            {folder.canvases.length}
          </span>
        </div>

        {/* Folder actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onCreateCanvas && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateCanvas(folder.id); }}
              disabled={isCreatingCanvas}
              className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
              title="Add canvas"
            >
              <FilePlus className="w-3 h-3" />
            </button>
          )}
          {onRenameFolder && (
            <button
              onClick={(e) => { e.stopPropagation(); onRenameFolder(folder); }}
              className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
              title="Rename folder"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onDeleteFolder && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder); }}
              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Folder contents */}
      {isExpanded && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-800 pl-3">
          {folder.canvases.length === 0 ? (
            <p className={`type-meta py-2 px-2 ${isOverFolder ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {isOverFolder ? 'Drop here to add' : 'Empty folder'}
            </p>
          ) : (
            <SortableContext items={folder.canvases.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {folder.canvases.map((canvas) => (
                <DraggableCanvasItem
                  key={canvas.id}
                  canvas={canvas}
                  currentCanvasId={currentCanvasId}
                  folderId={folder.id}
                  onSidebarClose={onSidebarClose}
                  onRenameCanvas={onRenameCanvas}
                  onMoveCanvas={onMoveCanvas}
                  onDeleteCanvas={onDeleteCanvas}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

// Droppable root area
interface DroppableRootAreaProps {
  rootCanvases: Canvas[];
  currentCanvasId?: string;
  onSidebarClose: () => void;
  onRenameCanvas?: (canvas: Canvas, folderId?: string) => void;
  onMoveCanvas?: (canvas: Canvas, folderId?: string) => void;
  onDeleteCanvas?: (canvas: Canvas, folderId?: string) => void;
  hasFolders: boolean;
  isOverRoot: boolean;
}

function DroppableRootArea({
  rootCanvases,
  currentCanvasId,
  onSidebarClose,
  onRenameCanvas,
  onMoveCanvas,
  onDeleteCanvas,
  hasFolders,
  isOverRoot,
}: DroppableRootAreaProps) {
  const { setNodeRef } = useSortable({ id: 'root-area' });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOverRoot ? 'bg-blue-50 dark:bg-blue-500/10 ring-2 ring-blue-400 ring-inset' : ''}`}
    >
      {hasFolders && <div className="my-2 border-t border-gray-100 dark:border-gray-800/60" />}
      {rootCanvases.length === 0 ? (
        <p className={`type-meta py-2 px-2 ${isOverRoot ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {isOverRoot ? 'Drop here to move to root' : 'No canvases in root'}
        </p>
      ) : (
        <SortableContext items={rootCanvases.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {rootCanvases.map((canvas) => (
            <DraggableCanvasItem
              key={canvas.id}
              canvas={canvas}
              currentCanvasId={currentCanvasId}
              onSidebarClose={onSidebarClose}
              onRenameCanvas={onRenameCanvas}
              onMoveCanvas={onMoveCanvas}
              onDeleteCanvas={onDeleteCanvas}
            />
          ))}
        </SortableContext>
      )}
    </div>
  );
}

export default function AppSidebar({
  variant,
  folders,
  rootCanvases,
  currentCanvasId,
  sidebarOpen,
  onSidebarClose,
  onCreateFolder,
  onCreateCanvas,
  onImport,
  onRenameFolder,
  onDeleteFolder,
  onRenameCanvas,
  onDeleteCanvas,
  onMoveCanvas,
  sortOrder,
  onSortChange,
  isUpdatingSortOrder,
  isCreatingFolder,
  isCreatingCanvas,
  sidebarCollapsed,
  onCollapseToggle,
}: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: userData } = useCurrentUser();
  const user = userData?.user;
  const reorderMutation = useReorderCanvases();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const autoExpandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get all canvas IDs for sortable context
  const allCanvasIds = [
    ...rootCanvases.map(c => c.id),
    ...folders.flatMap(f => f.canvases.map(c => c.id)),
  ];

  useEffect(() => {
    const saved = localStorage.getItem('expandedFolders');
    if (saved) {
      try {
        setExpandedFolders(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Error loading expanded folders:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (expandedFolders.size > 0 || localStorage.getItem('expandedFolders')) {
      localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
    }
  }, [expandedFolders]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Auto-expand folder when dragging over it
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id || null);

    if (over && typeof over.id === 'string' && over.id.startsWith('folder-')) {
      const folderId = over.id.replace('folder-', '');
      if (!expandedFolders.has(folderId)) {
        // Clear any existing timeout
        if (autoExpandTimeoutRef.current) {
          clearTimeout(autoExpandTimeoutRef.current);
        }
        // Auto-expand after 500ms
        autoExpandTimeoutRef.current = setTimeout(() => {
          setExpandedFolders(prev => new Set([...prev, folderId]));
        }, 500);
      }
    } else {
      // Clear timeout if not over a folder
      if (autoExpandTimeoutRef.current) {
        clearTimeout(autoExpandTimeoutRef.current);
        autoExpandTimeoutRef.current = null;
      }
    }
  }, [expandedFolders]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear auto-expand timeout
    if (autoExpandTimeoutRef.current) {
      clearTimeout(autoExpandTimeoutRef.current);
      autoExpandTimeoutRef.current = null;
    }

    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const canvasId = active.id as string;
    const overIdStr = over.id as string;

    // Determine if dropped on a folder, root area, or another canvas
    let targetFolderId: string | null = null;
    let targetIndex = 0;

    if (overIdStr === 'root-area') {
      // Dropped on root area
      targetFolderId = null;
      targetIndex = rootCanvases.length;
    } else if (overIdStr.startsWith('folder-')) {
      // Dropped on a folder
      targetFolderId = overIdStr.replace('folder-', '');
      const targetFolder = folders.find(f => f.id === targetFolderId);
      targetIndex = targetFolder ? targetFolder.canvases.length : 0;
    } else {
      // Dropped on another canvas - determine position and folder
      const sourceFolder = folders.find(f => f.canvases.some(c => c.id === canvasId));
      const sourceIndex = sourceFolder
        ? sourceFolder.canvases.findIndex(c => c.id === canvasId)
        : rootCanvases.findIndex(c => c.id === canvasId);

      // Find target canvas and its folder
      let targetCanvas: Canvas | undefined;
      let targetFolder: FolderType | undefined;

      for (const folder of folders) {
        targetCanvas = folder.canvases.find(c => c.id === overIdStr);
        if (targetCanvas) {
          targetFolder = folder;
          break;
        }
      }

      if (!targetCanvas) {
        targetCanvas = rootCanvases.find(c => c.id === overIdStr);
        targetFolderId = null;
      } else if (targetFolder) {
        targetFolderId = targetFolder.id;
      }

      if (targetCanvas) {
        if (targetFolder) {
          targetIndex = targetFolder.canvases.findIndex(c => c.id === overIdStr);
        } else {
          targetIndex = rootCanvases.findIndex(c => c.id === overIdStr);
        }
      }
    }

    // Build the reorder updates
    // We need to update all canvases in the target location
    const updates: Array<{ canvasId: string; folderId: string | null; order: number }> = [];

    if (targetFolderId === null) {
      // Moving to root
      const reorderedCanvases = rootCanvases.filter(c => c.id !== canvasId);
      reorderedCanvases.splice(targetIndex, 0, { id: canvasId, name: '' } as Canvas);
      reorderedCanvases.forEach((c, idx) => {
        updates.push({ canvasId: c.id, folderId: null, order: idx });
      });
    } else {
      // Moving to a folder
      const targetFolder = folders.find(f => f.id === targetFolderId);
      if (targetFolder) {
        const reorderedCanvases = targetFolder.canvases.filter(c => c.id !== canvasId);
        reorderedCanvases.splice(targetIndex, 0, { id: canvasId, name: '' } as Canvas);
        reorderedCanvases.forEach((c, idx) => {
          updates.push({ canvasId: c.id, folderId: targetFolderId, order: idx });
        });
      }
    }

    if (updates.length > 0) {
      reorderMutation.mutate(updates);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Find the active canvas for drag overlay
  const activeCanvas = activeId
    ? [...rootCanvases, ...folders.flatMap(f => f.canvases)].find(c => c.id === activeId)
    : null;

  // Determine what we're currently over
  const isOverFolder = overId && typeof overId === 'string' && overId.startsWith('folder-');
  const isOverRoot = overId === 'root-area';
  const overFolderId = isOverFolder ? (overId as string).replace('folder-', '') : null;
  const isSettingsPage = pathname === '/settings';

  const sidebarWidth = sidebarCollapsed ? 'w-0' : 'w-72';

  return (
    <>
      {/* Floating expand button when sidebar is collapsed on desktop */}
      {sidebarCollapsed && onCollapseToggle && (
        <button
          onClick={onCollapseToggle}
          className="hidden lg:flex fixed left-2 top-3 z-50 w-8 h-8 items-center justify-center rounded-lg bg-white dark:bg-[#1a2236] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftClose className="w-4 h-4 rotate-180" />
        </button>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onSidebarClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${sidebarWidth} transition-all duration-300 ease-in-out flex-shrink-0 fixed lg:static inset-y-0 left-0 z-50 transform ${
          sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden' : 'lg:w-72'}`}
      >
        <div className="h-full flex flex-col bg-white dark:bg-[#0c1222] border-r border-gray-200/60 dark:border-gray-800/60">
          {/* Header: Logo + Close/Collapse */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800/60">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group"
              onClick={() => onSidebarClose()}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Infinite Canvas
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {/* Collapse button - desktop only */}
              {onCollapseToggle && (
                <button
                  onClick={onCollapseToggle}
                  className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
              {/* Close button - mobile only */}
              <button
                onClick={onSidebarClose}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/60">
            <div className="flex gap-2">
              {onCreateCanvas && (
                <button
                  onClick={() => { onCreateCanvas(); onSidebarClose(); }}
                  disabled={isCreatingCanvas}
                  className="type-button flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  Canvas
                </button>
              )}
              {onCreateFolder && (
                <button
                  onClick={() => { onCreateFolder(); onSidebarClose(); }}
                  disabled={isCreatingFolder}
                  className="type-button flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}
              {onImport && (
                <button
                  onClick={() => { onImport(); onSidebarClose(); }}
                  className="type-button flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 active:scale-[0.98]"
                  title="Import canvas"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Order */}
            {onSortChange && (
              <div className="flex items-center gap-2 mt-3">
                <label className="type-label text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Sort:
                </label>
                <select
                  value={sortOrder || 'updated'}
                  onChange={(e) => onSortChange(e.target.value as 'updated' | 'alphabetical' | 'created')}
                  disabled={isUpdatingSortOrder}
                  className="type-button flex-1 px-2.5 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0c1222] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="created">Recently Created</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            )}
          </div>

          {/* Canvas Navigation with DnD */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-2 px-2">
              <span className="type-meta font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                My Canvases
              </span>
            </div>

            {folders.length === 0 && rootCanvases.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="type-nav text-gray-400 dark:text-gray-500">
                  No canvases yet. Create your first canvas to get started.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="space-y-1">
                  {/* Folders */}
                  <SortableContext items={[...folders.map(f => `folder-${f.id}`), ...allCanvasIds]} strategy={verticalListSortingStrategy}>
                    {folders.map((folder) => (
                      <DroppableFolder
                        key={folder.id}
                        folder={folder}
                        isExpanded={expandedFolders.has(folder.id)}
                        onToggle={() => toggleFolder(folder.id)}
                        currentCanvasId={currentCanvasId}
                        onSidebarClose={onSidebarClose}
                        onCreateCanvas={onCreateCanvas}
                        onRenameFolder={onRenameFolder}
                        onDeleteFolder={onDeleteFolder}
                        onRenameCanvas={onRenameCanvas}
                        onMoveCanvas={onMoveCanvas}
                        onDeleteCanvas={onDeleteCanvas}
                        isCreatingCanvas={isCreatingCanvas}
                        isOverFolder={overFolderId === folder.id}
                      />
                    ))}

                    {/* Root canvases */}
                    {rootCanvases.length > 0 && (
                      <DroppableRootArea
                        rootCanvases={rootCanvases}
                        currentCanvasId={currentCanvasId}
                        onSidebarClose={onSidebarClose}
                        onRenameCanvas={onRenameCanvas}
                        onMoveCanvas={onMoveCanvas}
                        onDeleteCanvas={onDeleteCanvas}
                        hasFolders={folders.length > 0}
                        isOverRoot={isOverRoot}
                      />
                    )}
                  </SortableContext>
                </div>

                {/* Drag overlay - shows the item being dragged */}
                <DragOverlay>
                  {activeCanvas ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg ring-2 ring-blue-400">
                      <GripVertical className="w-3 h-3 text-gray-400" />
                      <span className="type-nav text-gray-700 dark:text-gray-200">
                        {activeCanvas.name}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>

          {/* Bottom: User Profile + Actions */}
          <div className="border-t border-gray-100 dark:border-gray-800/60 px-4 py-3">
            {/* User info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="type-nav text-gray-900 dark:text-white truncate">
                  {user?.displayName || user?.email || 'User'}
                </p>
                {user?.displayName && user?.email && (
                  <p className="type-meta text-gray-400 dark:text-gray-500 truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Quick actions row */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="type-button flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>

              <button
                onClick={() => {
                  onSidebarClose();
                  if (!isSettingsPage) {
                    router.push('/settings');
                  }
                }}
                className={`type-button flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg transition-all ${
                  isSettingsPage
                    ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Settings"
                aria-current={isSettingsPage ? 'page' : undefined}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/auth/login');
                }}
                className="type-button flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
