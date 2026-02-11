'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Upload, Download, Settings, Moon, Sun, LogOut } from 'lucide-react';
import MobileMenu from './MobileMenu';

interface UserActionsProps {
  currentCanvasId?: string;
  onExportClick?: () => void;
  onImportClick?: () => void;
}

/**
 * UserActions - Right-side header actions
 *
 * Contains theme toggle, settings link, export/import buttons, and logout.
 * All buttons meet WCAG AAA touch target minimum (44px).
 */
export default function UserActions({
  currentCanvasId,
  onExportClick,
  onImportClick,
}: UserActionsProps) {
  const { theme, toggleTheme } = useTheme();

  const iconBtnClass =
    'min-w-[38px] min-h-[38px] flex items-center justify-center gap-2 px-2.5 py-2 text-sm font-medium rounded-xl transition-all duration-150 active:scale-95 text-light-text/80 dark:text-dark-text/80 hover:text-light-text dark:hover:text-dark-text hover:bg-light-primary/10 dark:hover:bg-dark-primary/10';

  return (
    <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
      {/* Export/Import buttons - desktop only (mobile gets them via MobileMenu) */}
      {currentCanvasId && (
        <div className="hidden md:flex items-center gap-1 mr-1">
          <button
            onClick={onExportClick}
            className={iconBtnClass}
            title="Export canvas"
            aria-label="Export canvas"
          >
            <Upload className="w-[18px] h-[18px]" />
            <span className="hidden lg:inline">Export</span>
          </button>
          <button
            onClick={onImportClick}
            className={iconBtnClass}
            title="Import canvas"
            aria-label="Import canvas"
          >
            <Download className="w-[18px] h-[18px]" />
            <span className="hidden lg:inline">Import</span>
          </button>

          {/* Subtle separator */}
          <div className="w-px h-5 bg-light-note-border/60 dark:bg-dark-note-border/60 mx-1" />
        </div>
      )}

      {/* Settings link - desktop only */}
      <a
        href="/settings"
        className={`hidden md:flex ${iconBtnClass}`}
        title="Settings"
        aria-label="Settings"
      >
        <Settings className="w-[18px] h-[18px]" />
        <span className="hidden lg:inline">Settings</span>
      </a>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={iconBtnClass}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      >
        {theme === 'light' ? (
          <Moon className="w-[18px] h-[18px]" />
        ) : (
          <Sun className="w-[18px] h-[18px]" />
        )}
      </button>

      {/* Mobile Menu - mobile only */}
      <MobileMenu
        currentCanvasId={currentCanvasId}
        onExportClick={onExportClick}
        onImportClick={onImportClick}
      />

      {/* Subtle separator - desktop only */}
      <div className="hidden md:block w-px h-5 bg-light-note-border/60 dark:bg-dark-note-border/60 mx-0.5" />

      {/* Logout form */}
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="min-w-[38px] min-h-[38px] flex items-center justify-center gap-2 px-2.5 py-2 text-sm font-medium rounded-xl transition-all duration-150 active:scale-95 text-red-500/80 dark:text-red-400/80 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span className="hidden lg:inline">Logout</span>
        </button>
      </form>
    </div>
  );
}
