'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  // Track whether a theme change was triggered by the user (not initialization)
  const userToggledRef = React.useRef(false);

  // Initialize theme from localStorage (instant) or system preference on mount
  useEffect(() => {
    setMounted(true);

    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      setTheme(systemTheme);
      localStorage.setItem('theme', systemTheme);
    }
  }, []);

  // Apply theme to HTML element
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage (immediate)
    localStorage.setItem('theme', theme);

    // Only save to database when the user explicitly toggled the theme
    if (userToggledRef.current) {
      userToggledRef.current = false;
      const saveThemeToDatabase = async () => {
        try {
          await fetch('/api/user/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ theme }),
          });
        } catch (error) {
          console.error('Failed to save theme to database:', error);
        }
      };
      saveThemeToDatabase();
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    userToggledRef.current = true;
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Always provide context, even before mount
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
