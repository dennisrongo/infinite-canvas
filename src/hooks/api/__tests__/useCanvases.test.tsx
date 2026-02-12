/**
 * Unit tests for useCanvases hooks
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCanvases, useCanvas, useCreateCanvas, useDeleteCanvas, useRenameCanvas, useMoveCanvas, useUpdateViewport, useImportCanvas } from '../useCanvases'

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

describe('useCanvases', () => {
  it('should fetch canvases list', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvases: [{ id: 'c1', name: 'Test' }] }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvases(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.canvases).toHaveLength(1)
    expect(result.current.data.canvases[0].id).toBe('c1')
  })

  it('should set isLoading while fetching', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvases(), { wrapper })

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle error', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Server error' }, 500))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvases(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCanvas', () => {
  it('should fetch a single canvas by id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c1', name: 'My Canvas' } }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvas('c1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.canvas.id).toBe('c1')
  })

  it('should handle 404 error', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Not found' }, 404))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvas('bad-id'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should not fetch when id is empty', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvas(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateCanvas', () => {
  it('should call POST and invalidate cache on success', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c2', name: 'New' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateCanvas(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: 'New' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useDeleteCanvas', () => {
  it('should call DELETE and invalidate cache on success', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteCanvas(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('c1')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.objectContaining({ method: 'DELETE' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useRenameCanvas', () => {
  it('should call PUT with name and invalidate cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c1', name: 'Renamed' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRenameCanvas(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', name: 'Renamed' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.objectContaining({ method: 'PUT' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useMoveCanvas', () => {
  it('should call PUT with folderId', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: {} }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useMoveCanvas(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', folderId: 'f1' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.objectContaining({ method: 'PUT' }))
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.folderId).toBe('f1')
  })
})

describe('useUpdateViewport', () => {
  it('should call PUT without invalidating cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: {} }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateViewport(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', viewport: { viewportX: 10, viewportY: 20, zoom: 1.5 } })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.objectContaining({ method: 'PUT' }))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})

describe('useImportCanvas', () => {
  it('should call POST /api/canvases/import and invalidate cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c3' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useImportCanvas(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ importData: { name: 'Imported' } })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/import', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})
