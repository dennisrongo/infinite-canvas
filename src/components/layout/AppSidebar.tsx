'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrentUser } from '@/hooks/api/useAuth';
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
} from 'lucide-react';

interface Canvas {
  id: string;
  name: string;
  updatedAt?: string;
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

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  Canvas
                </button>
              )}
              {onCreateFolder && (
                <button
                  onClick={() => { onCreateFolder(); onSidebarClose(); }}
                  disabled={isCreatingFolder}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}
              {onImport && (
                <button
                  onClick={() => { onImport(); onSidebarClose(); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 active:scale-[0.98]"
                  title="Import canvas"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Order */}
            {onSortChange && (
              <div className="flex items-center gap-2 mt-3">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  Sort:
                </label>
                <select
                  value={sortOrder || 'updated'}
                  onChange={(e) => onSortChange(e.target.value as 'updated' | 'alphabetical' | 'created')}
                  disabled={isUpdatingSortOrder}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0c1222] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="updated">Recently Updated</option>
                  <option value="created">Recently Created</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </div>
            )}
          </div>

          {/* Canvas Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="mb-2 px-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                My Canvases
              </span>
            </div>

            {folders.length === 0 && rootCanvases.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No canvases yet. Create your first canvas to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Folders */}
                {folders.map((folder) => (
                  <div key={folder.id}>
                    <div
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors group"
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {expandedFolders.has(folder.id) ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        )}
                        <Folder className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 tabular-nums">
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
                    {expandedFolders.has(folder.id) && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-100 dark:border-gray-800 pl-3">
                        {folder.canvases.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 py-2 px-2">
                            Empty folder
                          </p>
                        ) : (
                          folder.canvases.map((canvas) => (
                            <div
                              key={canvas.id}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group/canvas ${
                                canvas.id === currentCanvasId
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                              }`}
                            >
                              <Link
                                href={`/canvas/${canvas.id}`}
                                onClick={onSidebarClose}
                                className={`text-sm truncate flex-1 ${
                                  canvas.id === currentCanvasId
                                    ? 'font-medium text-blue-700 dark:text-blue-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                              >
                                {canvas.name}
                              </Link>
                              {/* Canvas actions */}
                              <div className="flex gap-0.5 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex-shrink-0">
                                {onRenameCanvas && (
                                  <button
                                    onClick={() => onRenameCanvas(canvas, folder.id)}
                                    className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                                    title="Rename"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                {onMoveCanvas && (
                                  <button
                                    onClick={() => onMoveCanvas(canvas, folder.id)}
                                    className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                                    title="Move"
                                  >
                                    <ArrowRightLeft className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                {onDeleteCanvas && (
                                  <button
                                    onClick={() => onDeleteCanvas(canvas, folder.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Root canvases */}
                {rootCanvases.length > 0 && (
                  <div>
                    {folders.length > 0 && (
                      <div className="my-2 border-t border-gray-100 dark:border-gray-800/60" />
                    )}
                    {rootCanvases.map((canvas) => (
                      <div
                        key={canvas.id}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors group/canvas ${
                          canvas.id === currentCanvasId
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <Link
                          href={`/canvas/${canvas.id}`}
                          onClick={onSidebarClose}
                          className={`text-sm truncate flex-1 ${
                            canvas.id === currentCanvasId
                              ? 'font-medium text-blue-700 dark:text-blue-300'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          {canvas.name}
                        </Link>
                        {/* Canvas actions */}
                        <div className="flex gap-0.5 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex-shrink-0">
                          {onRenameCanvas && (
                            <button
                              onClick={() => onRenameCanvas(canvas)}
                              className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                              title="Rename"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {onMoveCanvas && (
                            <button
                              onClick={() => onMoveCanvas(canvas, undefined)}
                              className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                              title="Move"
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {onDeleteCanvas && (
                            <button
                              onClick={() => onDeleteCanvas(canvas)}
                              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.displayName || user?.email || 'User'}
                </p>
                {user?.displayName && user?.email && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Quick actions row */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : (
                  <Sun className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
              </button>

              <Link
                href="/settings"
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/auth/login');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
