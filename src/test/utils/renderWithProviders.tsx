/**
 * Custom render function with providers for testing
 * Wraps components with ThemeProvider, ToastProvider, and QueryClientProvider
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'

// Create a fresh QueryClient for each test to avoid shared state
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Mock theme for consistent testing
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark'
  withToastProvider?: boolean
  queryClient?: QueryClient
}

function AllTheProviders({
  children,
  theme = 'light',
  withToastProvider = true,
  queryClient,
}: {
  children: React.ReactNode
  theme?: 'light' | 'dark'
  withToastProvider?: boolean
  queryClient?: QueryClient
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

  const client = queryClient || createTestQueryClient()

  const content = (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )

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
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <AllTheProviders theme={theme} queryClient={queryClient}>{children}</AllTheProviders>
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'
export { renderWithProviders as render }
