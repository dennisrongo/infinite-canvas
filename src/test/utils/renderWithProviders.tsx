/**
 * Custom render function with providers for testing
 * Wraps components with ThemeProvider and ToastProvider
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'

// Mock theme for consistent testing
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark'
  withToastProvider?: boolean
}

function AllTheProviders({
  children,
  theme = 'light',
  withToastProvider = true,
}: {
  children: React.ReactNode
  theme?: 'light' | 'dark'
  withToastProvider?: boolean
}) {
  // Mock localStorage for theme
  const mockGetItem = vi.fn()
  const mockSetItem = vi.fn()

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    },
    writable: true,
  })

  // Return default theme from mock
  mockGetItem.mockReturnValue(theme)

  const content = <ThemeProvider>{children}</ThemeProvider>

  if (withToastProvider) {
    return <ToastProvider>{content}</ToastProvider>
  }

  return content
}

export function renderWithProviders(
  ui: ReactElement,
  {
    theme = 'light',
    withToastProvider = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AllTheProviders theme={theme}>{children}</AllTheProviders>
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'
export { renderWithProviders as render }
