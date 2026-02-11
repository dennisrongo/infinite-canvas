'use client';

import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';

interface MobileMenuProps {
  /**
   * Current canvas ID (for export/import functionality)
   */
  currentCanvasId?: string;
  /**
   * Callback when export is clicked
   */
  onExportClick?: () => void;
  /**
   * Callback when import is clicked
   */
  onImportClick?: () => void;
}

/**
 * MobileMenu - Dropdown menu for mobile devices
 *
 * Features:
 * - Only visible on mobile (< 768px)
 * - Gear icon trigger button
 * - Dropdown with Settings link and Export/Import (if on canvas)
 * - Click outside to close
 * - ESC key to close
 * - Smooth slide-down animation
 * - Accessible with ARIA attributes
 */
export default function MobileMenu({
  currentCanvasId,
  onExportClick,
  onImportClick,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.mobile-menu-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="mobile-menu-container relative md:hidden" ref={menuRef}>
      {/* Gear icon trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition text-light-text dark:text-dark-text"
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon name="settings" size="md" ariaLabel="Settings menu" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-bg border border-light-note-border dark:border-dark-note-border rounded-lg shadow-lg z-50 animate-slide-down"
          role="menu"
          aria-label="Mobile menu"
        >
          {/* Settings link */}
          <a
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition first:rounded-t-lg"
            role="menuitem"
          >
            Settings
          </a>

          {/* Export - only show on canvas page */}
          {currentCanvasId && onExportClick && (
            <button
              onClick={() => {
                onExportClick();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition flex items-center gap-2"
              role="menuitem"
            >
              <Icon name="upload" size="sm" />
              Export Canvas
            </button>
          )}

          {/* Import - only show on canvas page */}
          {currentCanvasId && onImportClick && (
            <button
              onClick={() => {
                onImportClick();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition flex items-center gap-2 last:rounded-b-lg"
              role="menuitem"
            >
              <Icon name="download" size="sm" />
              Import Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
