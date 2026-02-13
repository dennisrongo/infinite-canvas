'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSidebar } from '@/contexts/SidebarContext';
import { useFolders } from '@/hooks/api/useFolders';
import { useCanvases } from '@/hooks/api/useCanvases';
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

export default function DashboardPage() {
  const sidebar = useSidebar();

  // TanStack Query hooks for data fetching
  const { data: foldersData, isLoading: foldersLoading } = useFolders();
  const { data: canvasesData, isLoading: canvasesLoading } = useCanvases();

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
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Recent Canvases
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {allCanvasesForGrid.length} canvas{allCanvasesForGrid.length !== 1 ? 'es' : ''} across {folders.length} folder{folders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => sidebar.openNewCanvasModal()}
            disabled={false}
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
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No canvases yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Create your first canvas to start organizing your ideas on an infinite workspace.
            </p>
            <button
              onClick={() => sidebar.openNewCanvasModal()}
              disabled={false}
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
                          sidebar.openRenameCanvasModal(canvas);
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
                          sidebar.openDeleteCanvasModal(canvas);
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
  );
}
