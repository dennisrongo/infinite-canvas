/**
 * Unit tests for useConnections hooks
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCanvasConnections, useCreateConnection, useDeleteConnection } from '../useConnections'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function mockJsonResponse(data: any, status = 200) {
  const body = JSON.stringify(data)
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  } as Response)
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('useCanvasConnections', () => {
  it('should fetch connections for a canvas', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ connections: [{ id: 'conn1' }] }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvasConnections('c1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.connections).toHaveLength(1)
  })

  it('should not fetch when canvasId is empty', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvasConnections(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateConnection', () => {
  it('should call POST and invalidate connections cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ connection: { id: 'conn2' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateConnection(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ canvasId: 'c1', sourceNoteId: 'n1', targetNoteId: 'n2' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/connections', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useDeleteConnection', () => {
  it('should call DELETE and invalidate connections cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteConnection(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ connectionId: 'conn1', canvasId: 'c1' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/connections/conn1', expect.objectContaining({ method: 'DELETE' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})
