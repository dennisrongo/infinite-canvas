'use client';

import { useTheme } from '@/contexts/ThemeContext';

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
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden md:inline">Export</span>
          </button>
          <button
            onClick={onImportClick}
            className="min-w-[44px] min-h-[44px] px-2 md:px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text flex items-center gap-1"
            title="Import canvas"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden md:inline">Import</span>
          </button>
        </>
      )}

      {/* Settings link */}
      <a
        href="/settings"
        className="hidden md:inline-flex min-w-[44px] min-h-[44px] items-center justify-center px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text"
      >
        Settings
      </a>

      {/* Theme Toggle Button - icon only on mobile */}
      <button
        onClick={toggleTheme}
        className="min-w-[44px] min-h-[44px] px-2 md:px-4 py-2 text-sm border border-light-note-border dark:border-dark-note-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text flex items-center gap-1 md:gap-2"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <>
            {/* Moon icon for dark mode */}
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span className="hidden md:inline">Dark</span>
          </>
        ) : (
          <>
            {/* Sun icon for light mode */}
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
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
