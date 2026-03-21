'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Layers, FolderOpen } from 'lucide-react';

interface SearchScopeDropdownProps {
  value: 'all' | 'current';
  onChange: (value: 'all' | 'current') => void;
  disabled?: boolean;
}

/**
 * SearchScopeDropdown - Compact custom dropdown for search scope selection
 * 
 * Designed to integrate seamlessly within the search input bar.
 * Shows "All Canvases" or "This Canvas" with a dropdown menu.
 */
export default function SearchScopeDropdown({
  value,
  onChange,
  disabled = false,
}: SearchScopeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => (prev + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
        } else {
          setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const options = [
    { value: 'all' as const, label: 'All Canvases', icon: Layers },
    { value: 'current' as const, label: 'This Canvas', icon: FolderOpen },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Dropdown trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          h-full px-3 flex items-center gap-1.5 text-sm
          text-light-text dark:text-dark-text
          bg-transparent
          hover:bg-light-hover dark:hover:bg-dark-hover
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={`Search scope: ${selectedOption?.label}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Icon based on selection */}
        {selectedOption && (
          <selectedOption.icon className="w-3.5 h-3.5 text-light-text-secondary dark:text-dark-text-secondary" />
        )}
        <span className="whitespace-nowrap">{selectedOption?.label}</span>
        <ChevronDown 
          className={`w-3.5 h-3.5 text-light-text-tertiary dark:text-dark-text-tertiary transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          role="listbox"
          aria-label="Select search scope"
          className="
            absolute top-full right-0 mt-1
            min-w-[160px]
            bg-white dark:bg-dark-bg
            border border-light-note-border dark:border-dark-note-border
            rounded-lg shadow-lg
            py-1 z-50
            overflow-hidden
          "
        >
          {options.map((option, index) => {
            const Icon = option.icon;
            const isFocused = focusedIndex === index;
            return (
              <button
                key={option.value}
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setFocusedIndex(-1);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`
                  w-full px-3 py-2 flex items-center gap-2 text-sm
                  text-left
                  transition-colors duration-150
                  ${isFocused ? 'bg-light-hover dark:bg-dark-hover' : ''}
                  ${value === option.value 
                    ? 'bg-light-primary/10 dark:bg-dark-primary/10 text-light-primary dark:text-dark-primary' 
                    : 'text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 text-light-text-secondary dark:text-dark-text-secondary" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
