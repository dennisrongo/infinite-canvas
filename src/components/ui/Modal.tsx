'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /**
   * Whether the modal is visible
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Modal title (for accessibility)
   */
  title?: string;

  /**
   * Modal content
   */
  children: React.ReactNode;

  /**
   * Maximum width of modal
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /**
   * Whether clicking outside closes the modal
   * @default true
   */
  closeOnBackdropClick?: boolean;

  /**
   * Whether ESC key closes the modal
   * @default true
   */
  closeOnEscape?: boolean;

  /**
   * Additional CSS classes for the modal content
   */
  className?: string;

  /**
   * ARIA label for the modal (if no title is provided)
   */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

/**
 * Modal - Accessible modal dialog component
 *
 * Features:
 * - Focus trap (keyboard navigation stays within modal)
 * - ESC key to close
 * - Click outside to close
 * - Smooth animations
 * - ARIA attributes for accessibility
 * - Body scroll lock when open
 *
 * @example
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="My Modal">
 *   <p>Modal content goes here</p>
 * </Modal>
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  ariaLabel,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap implementation
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, []);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen, trapFocus]);

  // Focus first element when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      firstElement?.focus();
    }
  }, [isOpen]);

  // Return focus to previous element when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-label={ariaLabel || title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative bg-white dark:bg-dark-bg rounded-lg shadow-xl
          ${sizeClasses[size]} w-full
          animate-scale-in
          ${className}
        `}
      >
        {/* Header (if title provided) */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-light-note-border dark:border-dark-note-border">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-light-text dark:text-dark-text"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] p-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className={title ? 'p-4' : 'p-4 pt-0'}>
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render outside the main DOM hierarchy
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

/**
 * ModalHeader - Header section for modal content
 */
export function ModalHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-light-note-border dark:border-dark-note-border ${className}`}>
      {children}
    </div>
  );
}

/**
 * ModalTitle - Title component for modal
 */
export function ModalTitle({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      id="modal-title"
      className={`text-lg font-semibold text-light-text dark:text-dark-text ${className}`}
    >
      {children}
    </h2>
  );
}

/**
 * ModalBody - Body section for modal content
 */
export function ModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

/**
 * ModalFooter - Footer section for modal actions
 */
export function ModalFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-end gap-2 p-4 border-t border-light-note-border dark:border-dark-note-border ${className}`}>
      {children}
    </div>
  );
}
