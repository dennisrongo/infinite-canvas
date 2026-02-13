'use client';

import SearchBar from '@/components/header/SearchBar';
import { Menu, Upload, Download } from 'lucide-react';

interface HeaderProps {
  currentCanvasId?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  onExportClick?: () => void;
  onImportClick?: () => void;
  sidebarCollapsed?: boolean;
}

/**
 * Header - Slim top bar with search and canvas-specific actions
 *
 * Simplified after sidebar redesign:
 * - Branding, theme toggle, settings, logout moved to AppSidebar
 * - Header focuses on search + canvas-specific export/import
 */
export default function Header({
  currentCanvasId,
  onMenuClick,
  showMenuButton,
  title,
  onExportClick,
  onImportClick,
  sidebarCollapsed,
}: HeaderProps) {
  return (
    <header className={`bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 py-2 sticky top-0 z-30 transition-all duration-200 px-3 md:px-5 ${sidebarCollapsed ? 'lg:pl-12' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {/* Hamburger menu button - visible on mobile */}
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden min-w-[36px] min-h-[36px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all duration-150 flex-shrink-0 text-gray-500 dark:text-gray-400"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Title - only for canvas pages */}
          {title && (
            <h1 className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-200 truncate">
              {title}
            </h1>
          )}

          {/* Search Bar */}
          <SearchBar currentCanvasId={currentCanvasId} />
        </div>

        {/* Canvas-specific actions */}
        {currentCanvasId && (onExportClick || onImportClick) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onExportClick && (
              <button
                onClick={onExportClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Export canvas"
                aria-label="Export canvas"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export</span>
              </button>
            )}
            {onImportClick && (
              <button
                onClick={onImportClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Import canvas"
                aria-label="Import canvas"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Import</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
