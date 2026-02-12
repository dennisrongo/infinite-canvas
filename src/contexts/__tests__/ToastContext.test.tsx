/**
 * Unit tests for ToastContext
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react'
import { ToastProvider, useToast } from '../ToastContext'

// Test component that uses the toast context
function TestToastComponent() {
  const { toasts, showToast, clearToasts } = useToast()
  return (
    <div>
      <button data-testid="show-toast-btn" onClick={() => showToast('Test toast', 'success')}>
        Show Toast
      </button>
      <button data-testid="clear-toasts-btn" onClick={clearToasts}>
        Clear Toasts
      </button>
      <span data-testid="toast-count">{toasts.length}</span>
      {toasts.map(toast => (
        <div key={toast.id} data-testid={`toast-${toast.id}`} data-toast-type={toast.type}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

// Wrapper component for testing hook
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup() // Clear DOM between tests
  })

  it('should render children without errors', () => {
    render(<ToastProvider>Test Content</ToastProvider>)

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should provide toast context to children', () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    )

    const toastCount = screen.getByTestId('toast-count')
    expect(toastCount).toBeInTheDocument()
    expect(toastCount).toHaveTextContent('0')
  })

  it('should add a new toast when showToast is called', () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    )

    const showBtn = within(container!).getByTestId('show-toast-btn')

    act(() => {
      fireEvent.click(showBtn)
    })

    // Check immediately after click (toast should be added)
    const toastCount = within(container!).getByTestId('toast-count')
    expect(toastCount).toHaveTextContent('1')

    // Toast elements should exist - query by data-toast-type to avoid matching button/count
    const toastElements = container!.querySelectorAll('[data-toast-type]')
    expect(toastElements.length).toBe(1)
    expect(toastElements[0]?.getAttribute('data-toast-type')).toEqual('success')
  })

  it('should queue multiple toasts', () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    )

    const showBtn = within(container!).getByTestId('show-toast-btn')

    // Click 3 times
    act(() => {
      fireEvent.click(showBtn)
      fireEvent.click(showBtn)
      fireEvent.click(showBtn)
    })

    // After 3 clicks, there should be 3 toasts
    const toastCount = within(container!).getByTestId('toast-count')
    expect(toastCount).toHaveTextContent('3')

    // Verify 3 toast elements exist - query by data-toast-type
    const toastElements = container!.querySelectorAll('[data-toast-type]')
    expect(toastElements.length).toBe(3)
  })

  it('should clear all toasts when clearToasts is called', () => {
    const { container } = render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    )

    const showBtn = within(container!).getByTestId('show-toast-btn')
    const clearBtn = within(container!).getByTestId('clear-toasts-btn')

    // Add some toasts first
    act(() => {
      fireEvent.click(showBtn)
      fireEvent.click(showBtn)
    })

    // Should have 2 toasts
    let toastCount = within(container!).getByTestId('toast-count')
    expect(toastCount).toHaveTextContent('2')

    // Clear all toasts
    act(() => {
      fireEvent.click(clearBtn)
    })

    // Should have 0 toasts
    toastCount = within(container!).getByTestId('toast-count')
    expect(toastCount).toHaveTextContent('0')

    // Toast elements should be removed - query by data-toast-type
    const toastElements = container!.querySelectorAll('[data-toast-type]')
    expect(toastElements.length).toBe(0)
  })

  it('should apply success type styling', () => {
    render(
      <ToastProvider>
        <TestToastComponent />
      </ToastProvider>
    )

    const showBtn = screen.getByTestId('show-toast-btn')

    act(() => {
      fireEvent.click(showBtn)
    })

    // Toast should exist - find by message content
    const toastElement = screen.queryByText('Test toast')
    expect(toastElement).toBeInTheDocument()
    expect(toastElement?.closest('[data-toast-type]')?.getAttribute('data-toast-type')).toEqual('success')
  })
})

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should work correctly within provider', () => {
    // Test the hook by rendering a component that uses it
    render(
      <TestWrapper>
        <TestToastComponent />
      </TestWrapper>
    )

    // Check that the component rendered successfully
    expect(screen.getByTestId('show-toast-btn')).toBeInTheDocument()
    expect(screen.getByTestId('toast-count')).toBeInTheDocument()
  })

  it('should throw error when used outside provider', () => {
    // Suppress console error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create a component that uses the hook outside provider
    function ComponentWithoutProvider() {
      try {
        const toast = useToast()
        return <div>{toast.toasts.length}</div>
      } catch {
        return <div>Error caught</div>
      }
    }

    const { container } = render(<ComponentWithoutProvider />)

    // Should render with error message
    expect(container?.textContent).toBe('Error caught')

    consoleError.mockRestore()
  })
})
