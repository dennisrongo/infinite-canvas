import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors
        light: {
          bg: "#FFFFFF",
          canvas: "#F8FAFC",
          grid: "#CBD5E1",
          primary: "#3B82F6",
          'primary-hover': "#2563EB",
          text: "#1E293B",
          'text-secondary': "#64748B",
          'text-tertiary': "#94A3B8",
          sidebar: "#F1F5F9",
          note: "#FFFFFF",
          'note-border': "#E2E8F0",
        },
        // Dark theme colors
        dark: {
          bg: "#0F172A",
          canvas: "#1E293B",
          grid: "#475569",
          primary: "#60A5FA",
          'primary-hover': "#3B82F6",
          text: "#F1F5F9",
          'text-secondary': "#94A3B8",
          'text-tertiary': "#64748B",
          sidebar: "#1E293B",
          note: "#1E293B",
          'note-border': "#475569",
        },
        // Landing page colors (from Stitch design)
        landing: {
          bg: "#ffffff",
          'bg-alt': "#f9fafb",
          'bg-footer': "#f9fafb",
          'primary-text': "#111827",
          'secondary-text': "#6b7280",
          accent: "#3b82f6",
          'accent-hover': "#2563eb",
          'accent-light': "#EBF8FF",
          border: "#E2E8F0",
          'footer-text': "#6b7280",
        },
        // Brand colors from Stitch design
        brand: {
          blue: '#2563EB',
          dark: '#111827',
          light: '#F9FAFB',
          gray: '#6B7280',
          accent: '#8B5CF6',
          neon: '#F472B6',
        },
        // Semantic colors
        semantic: {
          success: "#22C55E",
          'success-hover': "#16A34A",
          warning: "#F59E0B",
          'warning-hover': "#D97706",
          error: "#EF4444",
          'error-hover': "#DC2626",
          info: "#3B82F6",
          highlight: "#FEF08A",
          'highlight-text': "#1E293B",
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          "'Oxygen'",
          "'Ubuntu'",
          'Cantarell',
          "'Fira Sans'",
          "'Droid Sans'",
          "'Helvetica Neue'",
          'sans-serif',
        ],
      },
      letterSpacing: {
        'tighter-custom': '-0.02em',
      },
      fontSize: {
        // Consistent typography scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        // Touch target sizes (WCAG AAA)
        'touch': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      transitionProperty: {
        'colors': 'background-color, border-color, color, fill, stroke',
        'transform': 'transform, translate, scale, rotate',
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 250ms ease-out',
        'slide-down': 'slide-down 250ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'dot-pattern': 'radial-gradient(#CBD5E1 1px, transparent 1px)',
        'dot-grid-canvas': 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
