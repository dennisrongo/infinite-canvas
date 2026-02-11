/**
 * Design Tokens - Spacing
 *
 * Centralized spacing scale for consistent layout across the application.
 * Based on a 4px base unit system (Tailwind default).
 *
 * Scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
 * Each unit = 4px (e.g., spacing.md = 16px)
 */

export const spacing = {
  // Base spacing (4px unit)
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px

  // Component-specific spacing
  section: '2rem',      // 32px - Section spacing
  container: '1.5rem',  // 24px - Container padding
  card: '1.5rem',       // 24px - Card padding
  input: '0.75rem',     // 12px - Input padding (vertical)

  // Gap spacing
  gap: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },

  // Touch target sizes (WCAG minimum: 44px)
  touch: {
    min: '2.75rem',  // 44px - Minimum touch target
    comfortable: '3rem',  // 48px - Comfortable touch target
  },
} as const;

// Tailwind class equivalents
export const tailwindSpacing = {
  // Padding
  p: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  px: {
    xs: 'px-1',
    sm: 'px-2',
    md: 'px-4',
    lg: 'px-6',
    xl: 'px-8',
  },
  py: {
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6',
    xl: 'py-8',
  },

  // Margin
  m: {
    xs: 'm-1',
    sm: 'm-2',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
  },
  mb: {
    none: 'mb-0',
    xs: 'mb-1',
    sm: 'mb-2',
    md: 'mb-4',
    lg: 'mb-6',
    xl: 'mb-8',
  },

  // Gap
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },

  // Touch target sizing
  touch: {
    min: 'min-h-[44px] min-w-[44px]',  // WCAG 2.1 AAA minimum
    comfortable: 'min-h-[48px] min-w-[48px]',
  },
} as const;

// Layout-specific spacing constants
export const layout = {
  header: {
    height: '4rem',      // 64px
    paddingX: '1.5rem',  // 24px
    paddingY: '1rem',    // 16px
  },
  sidebar: {
    width: '20rem',      // 320px
    padding: '1.5rem',   // 24px
  },
  main: {
    padding: '1.5rem',   // 24px
    maxWidth: '128rem',  // 2048px
  },
  modal: {
    padding: '1.5rem',   // 24px
    maxWidth: '28rem',   // 448px
    gap: '1rem',         // 16px
  },
} as const;

export const spacingTokens = {
  spacing,
  tailwindSpacing,
  layout,
} as const;
