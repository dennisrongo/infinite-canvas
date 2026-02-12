'use client';

import Link from 'next/link';
import SearchBar from '@/components/header/SearchBar';
import UserActions from '@/components/header/UserActions';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
    <header className="bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-light-note-border/60 dark:border-dark-note-border/60 px-3 md:px-5 py-2.5 sticky top-0 z-40 transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 md:gap-3 flex-1">
          {/* Hamburger menu button - visible on mobile */}
          {showMenuButton && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden min-w-[40px] min-h-[40px] p-2 rounded-xl hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 active:scale-95 transition-all duration-150 flex-shrink-0 text-light-text dark:text-dark-text"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Collapse sidebar button - for canvas page */}
          {showCollapseButton && onCollapseClick && (
            <button
              onClick={onCollapseClick}
              className="hidden md:flex min-w-[40px] min-h-[40px] items-center justify-center p-2 rounded-xl hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 active:scale-95 transition-all duration-150 flex-shrink-0 text-light-text/70 dark:text-dark-text/70 hover:text-light-text dark:hover:text-dark-text"
              aria-label="Toggle sidebar"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Logo or Title - truncate on small screens */}
          {title ? (
            <h1 className="text-base md:text-xl font-semibold text-light-text dark:text-dark-text truncate">
              {title}
            </h1>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-1.5 flex-shrink-0 group">
              <h1 className="text-base md:text-xl font-semibold text-light-text dark:text-dark-text group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors">
                Infinite Canvas
              </h1>
            </Link>
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
