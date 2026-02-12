/**
 * Unit tests for ThemeContext
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

// Mock fetch to prevent API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    json: async () => ({}),
  } as Response)
)

// Mock window.matchMedia to return an object with matches property
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query) => ({
    matches: query.includes('dark') ? false : true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Test component that uses the theme context
function TestThemeComponent() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage before each test
    localStorage.getItem.mockClear()
    localStorage.setItem.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Cleanup localStorage after each test
    localStorage.getItem.mockClear()
    localStorage.setItem.mockClear()
  })

  it('should render children without errors', () => {
    render(<ThemeProvider>Test Content</ThemeProvider>)

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should provide theme context to children', async () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const themeDisplay = screen.getByTestId('current-theme')
    await waitFor(() => {
      expect(themeDisplay).toBeInTheDocument()
    })
  })

  it('should initialize with light theme as default', async () => {
    // Clear any previous theme setting
    localStorage.getItem.mockReturnValue(null)

    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const themeDisplay = screen.getByTestId('current-theme')
    await waitFor(() => {
      expect(themeDisplay).toBeInTheDocument()
    })
  })

  it('should initialize with dark theme from localStorage', async () => {
    // Mock localStorage to return 'dark'
    localStorage.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const themeDisplay = screen.getByTestId('current-theme')
    await waitFor(() => {
      expect(themeDisplay).toBeInTheDocument()
    })
  })

  it('should toggle theme from light to dark', async () => {
    localStorage.getItem.mockReturnValue(null)

    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByTestId('toggle-btn')
    const themeDisplay = screen.getByTestId('current-theme')

    await waitFor(() => {
      expect(themeDisplay).toHaveTextContent('light')
    })

    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(themeDisplay).toHaveTextContent('dark')
    })
  })

  it('should toggle theme from dark to light', async () => {
    localStorage.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByTestId('toggle-btn')
    const themeDisplay = screen.getByTestId('current-theme')

    await waitFor(() => {
      expect(themeDisplay).toHaveTextContent('dark')
    })

    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(themeDisplay).toHaveTextContent('light')
    })
  })

  it('should save theme preference to localStorage', async () => {
    localStorage.getItem.mockReturnValue(null)

    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const toggleBtn = screen.getByTestId('toggle-btn')
    await waitFor(() => {
      expect(toggleBtn).toBeInTheDocument()
    })

    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
    })
  })

  it('should load saved theme preference on mount', async () => {
    localStorage.getItem.mockReturnValue('dark')

    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    )

    const themeDisplay = screen.getByTestId('current-theme')

    await waitFor(() => {
      expect(themeDisplay).toHaveTextContent('dark')
    })
  })
})

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return current theme', async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => (
        <ThemeProvider>{children}</ThemeProvider>
      ),
    })

    await waitFor(() => {
      expect(result.current.theme).toBe('light')
    })
  })

  it('should throw error when used outside provider', () => {
    // Suppress console error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useTheme())
    }).toThrow('useTheme must be used within a ThemeProvider')

    consoleError.mockRestore()
  })
})
