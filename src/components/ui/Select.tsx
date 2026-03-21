'use client';

import React from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  /** Unique identifier for the select element */
  id: string;
  /** Label text displayed above the select */
  label?: string;
  /** Array of options to display */
  options: SelectOption[];
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Whether to show the label */
  showLabel?: boolean;
}

/**
 * Modern Select component with consistent styling across the application
 * 
 * Features:
 * - Consistent border and focus states matching input components
 * - Dark mode support
 * - Custom dropdown arrow
 * - Proper focus ring
 */
export default function Select({
  id,
  label,
  options,
  value,
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select an option',
  showLabel = true,
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="
            w-full px-3.5 py-2.5 
            appearance-none
            bg-white dark:bg-dark-input
            border border-light-note-border dark:border-dark-note-border
            rounded-lg
            text-light-text dark:text-dark-text
            text-sm
            focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary
            focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:bg-light-bg dark:disabled:bg-dark-bg
            transition-colors duration-200
            cursor-pointer
            pr-10
          "
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg 
            className="w-4 h-4 text-light-text-tertiary dark:text-dark-text-tertiary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
