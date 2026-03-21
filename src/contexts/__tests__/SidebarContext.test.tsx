/**
 * Unit tests for SidebarContext
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, cleanup } from '@testing-library/react'
import { SidebarProvider, useSidebar } from '../SidebarContext'

// Mock usePathname hook
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock useMediaQuery hook
const mockUseMediaQuery = vi.fn()
vi.mock('@/hooks/useMediaQuery', () => ({
  default: () => mockUseMediaQuery(),
}))

// Test component that uses the sidebar context
function TestSidebarComponent() {
  const { 
    sidebarOpen, 
    toggleSidebar, 
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed
  } = useSidebar()
  
  return (
    <div>
      <span data-testid="sidebar-open">{String(sidebarOpen)}</span>
      <span data-testid="sidebar-collapsed">{String(sidebarCollapsed)}</span>
      <button data-testid="toggle-sidebar-btn" onClick={toggleSidebar}>
        Toggle Sidebar
      </button>
      <button data-testid="set-sidebar-open-btn" onClick={() => setSidebarOpen(true)}>
        Set Open
      </button>
      <button data-testid="set-sidebar-closed-btn" onClick={() => setSidebarOpen(false)}>
        Set Closed
      </button>
      <button data-testid="toggle-collapsed-btn" onClick={toggleSidebarCollapsed}>
        Toggle Collapsed
      </button>
    </div>
  )
}

// Wrapper component for testing hook
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>
}

describe('SidebarProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    mockUsePathname.mockReturnValue('/canvas/test')
    mockUseMediaQuery.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('should render children without errors', () => {
    render(<SidebarProvider>Test Content</SidebarProvider>)

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should provide sidebar context to children', () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    expect(screen.getByTestId('sidebar-open')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-collapsed')).toBeInTheDocument()
  })

  it('should initialize with sidebar closed by default', () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const sidebarOpenDisplay = screen.getByTestId('sidebar-open')
    expect(sidebarOpenDisplay).toHaveTextContent('false')
  })

  it('should initialize with sidebarCollapsed as false', () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const sidebarCollapsedDisplay = screen.getByTestId('sidebar-collapsed')
    expect(sidebarCollapsedDisplay).toHaveTextContent('false')
  })

  it('should toggle sidebar state from closed to open', async () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const toggleBtn = screen.getByTestId('toggle-sidebar-btn')
    const sidebarOpenDisplay = screen.getByTestId('sidebar-open')

    // Initially should be closed
    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('false')
    })

    // Click toggle button
    fireEvent.click(toggleBtn)

    // Should now be open
    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('true')
    })
  })

  it('should toggle sidebar state from open to closed', async () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const toggleBtn = screen.getByTestId('toggle-sidebar-btn')
    const setOpenBtn = screen.getByTestId('set-sidebar-open-btn')
    const sidebarOpenDisplay = screen.getByTestId('sidebar-open')

    // First set to open
    fireEvent.click(setOpenBtn)

    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('true')
    })

    // Then toggle
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('false')
    })
  })

  it('should set sidebar open to true using setSidebarOpen', async () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const setOpenBtn = screen.getByTestId('set-sidebar-open-btn')
    const sidebarOpenDisplay = screen.getByTestId('sidebar-open')

    fireEvent.click(setOpenBtn)

    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('true')
    })
  })

  it('should set sidebar closed to false using setSidebarOpen', async () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const setOpenBtn = screen.getByTestId('set-sidebar-open-btn')
    const setClosedBtn = screen.getByTestId('set-sidebar-closed-btn')
    const sidebarOpenDisplay = screen.getByTestId('sidebar-open')

    // First set to open
    fireEvent.click(setOpenBtn)

    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('true')
    })

    // Then set to closed
    fireEvent.click(setClosedBtn)

    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('false')
    })
  })

  it('should return current sidebar state via sidebarOpen', async () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const sidebarOpenDisplay = screen.getByTestId('sidebar-open')

    // Should return false initially
    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('false')
    })

    // Toggle sidebar
    fireEvent.click(screen.getByTestId('toggle-sidebar-btn'))

    // Should now return true
    await waitFor(() => {
      expect(sidebarOpenDisplay).toHaveTextContent('true')
    })
  })

  it('should toggle sidebarCollapsed state', async () => {
    render(
      <SidebarProvider>
        <TestSidebarComponent />
      </SidebarProvider>
    )

    const toggleCollapsedBtn = screen.getByTestId('toggle-collapsed-btn')
    const sidebarCollapsedDisplay = screen.getByTestId('sidebar-collapsed')

    // Initially should be false
    await waitFor(() => {
      expect(sidebarCollapsedDisplay).toHaveTextContent('false')
    })

    // Click toggle
    fireEvent.click(toggleCollapsedBtn)

    // Should now be true
    await waitFor(() => {
      expect(sidebarCollapsedDisplay).toHaveTextContent('true')
    })
  })
})

describe('useSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/canvas/test')
    mockUseMediaQuery.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('should return sidebar context values', async () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: TestWrapper,
    })

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(false)
    })
    
    expect(result.current.sidebarCollapsed).toBe(false)
    expect(typeof result.current.toggleSidebar).toBe('function')
    expect(typeof result.current.setSidebarOpen).toBe('function')
  })

  it('should toggle sidebar via hook', async () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: TestWrapper,
    })

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(false)
    })

    // Toggle
    result.current.toggleSidebar()

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true)
    })
  })

  it('should set sidebar open via hook', async () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: TestWrapper,
    })

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(false)
    })

    // Set to true
    result.current.setSidebarOpen(true)

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true)
    })
  })

  it('should set sidebar closed via hook', async () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: TestWrapper,
    })

    // Set to true first
    result.current.setSidebarOpen(true)

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(true)
    })

    // Set to false
    result.current.setSidebarOpen(false)

    await waitFor(() => {
      expect(result.current.sidebarOpen).toBe(false)
    })
  })

  it('should throw error when used outside provider', () => {
    // Suppress console error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useSidebar())
    }).toThrow('useSidebar must be used within a SidebarProvider')

    consoleError.mockRestore()
  })
})
