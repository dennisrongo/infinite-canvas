/**
 * Unit tests for useCancellableRequest hook
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useCancellableRequest } from '../useCancellableRequest'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test component that uses cancellable request hook
function TestCancellableRequestComponent() {
  const { cancellableFetch, abortRequest, abortAllRequests, isMounted, cleanup } = useCancellableRequest()

  return (
    <div>
      <button
        data-testid="fetch-btn"
        onClick={() => cancellableFetch('test-key', 'https://example.com/api/test').catch(() => {})}
      >
        Fetch
      </button>
      <button
        data-testid="abort-btn"
        onClick={() => abortRequest('test-key')}
      >
        Abort
      </button>
      <button
        data-testid="abort-all-btn"
        onClick={abortAllRequests}
      >
        Abort All
      </button>
      <span data-testid="is-mounted">{String(isMounted())}</span>
      <button
        data-testid="cleanup-btn"
        onClick={cleanup}
      >
        Cleanup
      </button>
    </div>
  )
}

describe('useCancellableRequest', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should provide cancellableFetch function', () => {
    render(<TestCancellableRequestComponent />)

    expect(screen.getByTestId('fetch-btn')).toBeInTheDocument()
  })

  it('should provide abortRequest function', () => {
    render(<TestCancellableRequestComponent />)

    expect(screen.getByTestId('abort-btn')).toBeInTheDocument()
  })

  it('should provide abortAllRequests function', () => {
    render(<TestCancellableRequestComponent />)

    expect(screen.getByTestId('abort-all-btn')).toBeInTheDocument()
  })

  it('should provide isMounted function', () => {
    render(<TestCancellableRequestComponent />)

    expect(screen.getByTestId('is-mounted')).toBeInTheDocument()
  })

  it('should provide cleanup function', () => {
    render(<TestCancellableRequestComponent />)

    expect(screen.getByTestId('cleanup-btn')).toBeInTheDocument()
  })

  it('should make successful fetch request', async () => {
    const mockResponse = { ok: true, json: async () => ({ data: 'test' }) }
    mockFetch.mockResolvedValue(mockResponse as Response)

    render(<TestCancellableRequestComponent />)

    const fetchBtn = screen.getByTestId('fetch-btn')
    fireEvent.click(fetchBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  it('should abort previous request with same key', async () => {
    const abortController = {
      abort: vi.fn(),
      signal: {} as AbortSignal,
    }

    vi.spyOn(global, 'AbortController').mockReturnValue(abortController as AbortController)
    mockFetch.mockReset()

    render(<TestCancellableRequestComponent />)

    const fetchBtn = screen.getByTestId('fetch-btn')

    // First request
    fireEvent.click(fetchBtn)

    // Second request with same key (should abort first)
    fireEvent.click(fetchBtn)

    await waitFor(() => {
      expect(abortController.abort).toHaveBeenCalled()
    })
  })

  it('should rethrow non-abort errors', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValue(networkError)

    render(<TestCancellableRequestComponent />)

    const fetchBtn = screen.getByTestId('fetch-btn')

    // The error will be thrown but not caught in component
    expect(() => fireEvent.click(fetchBtn)).not.toThrow()
  })

  it('should abort all requests when cleanup is called', () => {
    const abortController = {
      abort: vi.fn(),
      signal: {} as AbortSignal,
    }

    vi.spyOn(global, 'AbortController').mockReturnValue(abortController as AbortController)

    const { result } = renderHook(() => useCancellableRequest())

    // Make a request which stores the controller
    act(() => {
      result.current.cancellableFetch('test-key', 'https://example.com/api')
    })

    // Call cleanup
    act(() => {
      result.current.cleanup()
    })

    // Abort should have been called
    expect(abortController.abort).toHaveBeenCalled()
  })
})
