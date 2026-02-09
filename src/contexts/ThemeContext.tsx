'use client';

import React, { createContext, useContext, useEffect, useState } from 'next';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from database, localStorage, or system preference on mount
  useEffect(() => {
    const initializeTheme = async () => {
      setMounted(true);

      // Try to fetch from database first
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.settings?.theme) {
            setTheme(data.settings.theme);
            localStorage.setItem('theme', data.settings.theme);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to fetch theme from database:', error);
      }

      // Fallback to localStorage
      const storedTheme = localStorage.getItem('theme') as Theme | null;
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    };

    initializeTheme();
  }, []);

  // Apply theme to HTML element and save to database
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

    // Save to database (async, best effort)
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
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

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
