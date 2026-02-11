/**
 * Design Tokens - Colors
 *
 * Centralized color system for consistent theming across the application.
 * Use these semantic color names instead of hardcoded hex values.
 *
 * Usage:
 *   import { colors } from '@/constants/colors';
 *   <div className={colors.bg.primary} />
 */

// Light theme colors
export const light = {
  bg: '#FFFFFF',
  canvas: '#F8FAFC',
  grid: '#CBD5E1',
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    inverse: '#F1F5F9',
  },
  background: {
    default: '#FFFFFF',
    muted: '#F8FAFC',
    sidebar: '#F1F5F9',
    hover: '#F1F5F9',
    input: '#FFFFFF',
  },
  border: {
    default: '#E2E8F0',
    muted: '#F1F5F9',
    focus: '#3B82F6',
  },
  note: {
    bg: '#FFFFFF',
    border: '#E2E8F0',
  },
  sidebar: '#F1F5F9',
} as const;

// Dark theme colors
export const dark = {
  bg: '#0F172A',
  canvas: '#1E293B',
  grid: '#475569',
  primary: '#60A5FA',
  primaryHover: '#3B82F6',
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    tertiary: '#64748B',
    inverse: '#1E293B',
  },
  background: {
    default: '#0F172A',
    muted: '#1E293B',
    sidebar: '#1E293B',
    hover: '#1E293B',
    input: '#1E293B',
  },
  border: {
    default: '#475569',
    muted: '#1E293B',
    focus: '#3B82F6',
  },
  note: {
    bg: '#1E293B',
    border: '#475569',
  },
  sidebar: '#1E293B',
} as const;

// Semantic color names that map to theme values
export const semantic = {
  // Status colors - work in both themes
  success: '#22C55E',
  successHover: '#16A34A',
  warning: '#F59E0B',
  warningHover: '#D97706',
  error: '#EF4444',
  errorHover: '#DC2626',
  info: '#3B82F6',

  // Search highlight (yellow that works on both themes)
  highlight: '#FEF08A',
  highlightText: '#1E293B',

  // Focus ring color
  focusRing: '#3B82F6',
} as const;

// Tailwind class equivalents for common patterns
export const tailwind = {
  // Background patterns
  bg: {
    primary: 'bg-white dark:bg-[#0F172A]',
    muted: 'bg-[#F8FAFC] dark:bg-[#1E293B]',
    sidebar: 'bg-white dark:bg-[#0F172A]',
    note: 'bg-white dark:bg-[#1E293B]',
    input: 'bg-white dark:bg-[#1E293B]',
  },

  // Text patterns
  text: {
    primary: 'text-[#1E293B] dark:text-[#F1F5F9]',
    secondary: 'text-[#64748B] dark:text-[#94A3B8]',
    tertiary: 'text-[#94A3B8] dark:text-[#64748B]',
    inverse: 'text-[#F1F5F9] dark:text-[#1E293B]',
  },

  // Border patterns
  border: {
    default: 'border-[#E2E8F0] dark:border-[#475569]',
    muted: 'border-[#F1F5F9] dark:border-[#1E293B]',
    focus: 'focus:ring-[#3B82F6]',
  },

  // Hover patterns
  hover: {
    default: 'hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]',
  },

  // Primary button
  primaryButton: 'bg-[#3B82F6] hover:bg-[#2563EB] dark:bg-[#60A5FA] dark:hover:bg-[#3B82F6]',

  // Focus ring
  focusRing: 'focus:ring-2 focus:ring-[#3B82F6]',
} as const;

// Export all colors together
export const colors = {
  light,
  dark,
  semantic,
  tailwind,
} as const;

// Type exports for TypeScript
export type ColorTheme = typeof light;
export type SemanticColors = typeof semantic;
