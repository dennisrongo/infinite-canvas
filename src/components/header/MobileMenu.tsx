'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Settings, Upload, Download } from 'lucide-react';

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
      {/* Three-dot trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 rounded-xl hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 active:scale-95 transition-all duration-150 text-light-text/80 dark:text-dark-text/80 hover:text-light-text dark:hover:text-dark-text"
        aria-label="Open menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVertical className="w-[18px] h-[18px]" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-xl border border-light-note-border/60 dark:border-dark-note-border/60 rounded-2xl shadow-xl z-50 animate-scale-in overflow-hidden"
          role="menu"
          aria-label="Mobile menu"
        >
          {/* Settings link */}
          <a
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-primary/8 dark:hover:bg-dark-primary/8 transition-colors"
            role="menuitem"
          >
            <Settings className="w-4 h-4 text-light-text/60 dark:text-dark-text/60" />
            Settings
          </a>

          {/* Export/Import section - only show on canvas page */}
          {currentCanvasId && (onExportClick || onImportClick) && (
            <>
              {/* Divider */}
              <div className="mx-3 border-t border-light-note-border/40 dark:border-dark-note-border/40" />

              {onExportClick && (
                <button
                  onClick={() => {
                    onExportClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-primary/8 dark:hover:bg-dark-primary/8 transition-colors"
                  role="menuitem"
                >
                  <Upload className="w-4 h-4 text-light-text/60 dark:text-dark-text/60" />
                  Export Canvas
                </button>
              )}

              {onImportClick && (
                <button
                  onClick={() => {
                    onImportClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-light-text dark:text-dark-text hover:bg-light-primary/8 dark:hover:bg-dark-primary/8 transition-colors"
                  role="menuitem"
                >
                  <Download className="w-4 h-4 text-light-text/60 dark:text-dark-text/60" />
                  Import Canvas
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
