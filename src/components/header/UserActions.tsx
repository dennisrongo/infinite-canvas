'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Icon from '@/components/ui/Icon';
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

  return (
    <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
      {/* Export/Import buttons - only show on canvas page */}
      {currentCanvasId && (
        <>
          <button
            onClick={onExportClick}
            className="min-w-[44px] min-h-[44px] px-2 md:px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text flex items-center gap-1"
            title="Export canvas"
          >
            <Icon name="upload" size="sm" ariaLabel="Export canvas" />
            <span className="hidden md:inline">Export</span>
          </button>
          <button
            onClick={onImportClick}
            className="min-w-[44px] min-h-[44px] px-2 md:px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text flex items-center gap-1"
            title="Import canvas"
          >
            <Icon name="download" size="sm" ariaLabel="Import canvas" />
            <span className="hidden md:inline">Import</span>
          </button>
        </>
      )}

      {/* Settings link - desktop only */}
      <a
        href="/settings"
        className="hidden md:inline-flex min-w-[44px] min-h-[44px] items-center justify-center px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text"
      >
        Settings
      </a>

      {/* Mobile Menu - mobile only */}
      <MobileMenu
        currentCanvasId={currentCanvasId}
        onExportClick={onExportClick}
        onImportClick={onImportClick}
      />

      {/* Theme Toggle Button - icon only on mobile */}
      <button
        onClick={toggleTheme}
        className="min-w-[44px] min-h-[44px] px-2 md:px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text flex items-center gap-1 md:gap-2"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <>
            <Icon name="moon" size="sm" ariaLabel="Switch to dark mode" />
            <span className="hidden md:inline">Dark</span>
          </>
        ) : (
          <>
            <Icon name="sun" size="sm" ariaLabel="Switch to light mode" />
            <span className="hidden md:inline">Light</span>
          </>
        )}
      </button>

      {/* Logout form */}
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="min-w-[44px] min-h-[44px] px-2 md:px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
