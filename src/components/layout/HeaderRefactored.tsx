'use client';

import SearchBar from '@/components/header/SearchBar';
import UserActions from '@/components/header/UserActions';

interface HeaderProps {
  currentCanvasId?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  title?: string;
  showCollapseButton?: boolean;
  onCollapseClick?: () => void;
  isCollapsed?: boolean;
  onExportClick?: () => void;
  onImportClick?: () => void;
}

/**
 * Header - Main application header
 *
 * Refactored to use smaller, focused components:
 * - SearchBar for global search functionality
 * - UserActions for theme toggle, settings, and logout
 *
 * Features:
 * - Responsive design with mobile menu button
 * - Touch-friendly buttons (44px minimum)
 * - Design token color classes
 */
export default function Header({
  currentCanvasId,
  onMenuClick,
  showMenuButton,
  title,
  showCollapseButton,
  onCollapseClick,
  isCollapsed,
  onExportClick,
  onImportClick,
}: HeaderProps) {
  return (
    <header className="bg-white dark:bg-dark-bg border-b border-light-note-border dark:border-dark-note-border px-4 md:px-6 py-4 sticky top-0 z-40 transition-colors duration-300 overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 overflow-x-hidden">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0 overflow-x-hidden">
          {/* Hamburger menu button - visible on mobile */}
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition flex-shrink-0"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-light-text dark:text-dark-text-inverse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Collapse sidebar button - for canvas page */}
          {showCollapseButton && onCollapseClick && (
            <button
              onClick={onCollapseClick}
              className="hidden md:block min-w-[44px] min-h-[44px] px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? '☰' : '«'}
            </button>
          )}

          {/* Logo or Title - truncate on small screens */}
          {title ? (
            <h1 className="text-lg md:text-2xl font-bold text-light-text dark:text-dark-text truncate">
              {title}
            </h1>
          ) : (
            <a href="/dashboard" className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <h1 className="text-lg md:text-2xl font-bold text-light-text dark:text-dark-text">
                Infinite Canvas
              </h1>
            </a>
          )}

          {/* Search Bar */}
          <SearchBar currentCanvasId={currentCanvasId} />
        </div>

        {/* User Actions */}
        <UserActions
          currentCanvasId={currentCanvasId}
          onExportClick={onExportClick}
          onImportClick={onImportClick}
        />
      </div>
    </header>
  );
}
