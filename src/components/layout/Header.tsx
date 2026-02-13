'use client';

import { useState } from 'react';
import SearchBar from '@/components/header/SearchBar';
import { Menu, Upload, Download } from 'lucide-react';

interface HeaderProps {
  currentCanvasId?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  onTitleChange?: (newTitle: string) => Promise<void>;
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
  onTitleChange,
  onExportClick,
  onImportClick,
  sidebarCollapsed,
}: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const handleDoubleClick = () => {
    if (!onTitleChange || !title) return;
    setEditTitle(title);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!onTitleChange || !title) return;
    const trimmedTitle = editTitle.trim();

    // Revert to original if empty
    if (!trimmedTitle) {
      setIsEditing(false);
      return;
    }

    // Only save if changed
    if (trimmedTitle !== title) {
      await onTitleChange(trimmedTitle);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <header className={`bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 py-2 sticky top-0 z-30 transition-[padding] duration-150 ease-out px-3 md:px-5 ${sidebarCollapsed ? 'lg:pl-12' : ''}`}>
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
            isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="type-nav bg-transparent border-b border-purple-500 dark:border-purple-400 outline-none px-1 text-gray-700 dark:text-gray-200"
              />
            ) : (
              <h1
                className={`type-nav text-gray-700 dark:text-gray-200 truncate ${onTitleChange ? 'cursor-pointer hover:text-purple-600 dark:hover:text-purple-400' : ''}`}
                onDoubleClick={handleDoubleClick}
                title={onTitleChange ? 'Double-click to rename' : undefined}
              >
                {title}
              </h1>
            )
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
                className="type-button flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
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
                className="type-button flex items-center gap-1.5 px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
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
