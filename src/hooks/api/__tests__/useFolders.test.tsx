/**
 * Unit tests for useFolders hooks
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFolders, useCreateFolder, useDeleteFolder, useRenameFolder } from '../useFolders'

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

describe('useFolders', () => {
  it('should fetch folders list', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ folders: [{ id: 'f1', name: 'Folder 1', canvases: [] }] }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useFolders(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.folders).toHaveLength(1)
  })

  it('should set isLoading while fetching', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useFolders(), { wrapper })

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle error', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Failed' }, 500))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useFolders(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateFolder', () => {
  it('should call POST and invalidate folder cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ folder: { id: 'f2', name: 'New Folder' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateFolder(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ name: 'New Folder' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/folders', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useDeleteFolder', () => {
  it('should call DELETE and invalidate cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteFolder(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'f1' })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/folders/f1'),
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('should pass moveCanvasesToRoot query param', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useDeleteFolder(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'f1', moveCanvasesToRoot: false })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/folders/f1?moveCanvasesToRoot=false',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})

describe('useRenameFolder', () => {
  it('should call PUT and invalidate folder cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ folder: { id: 'f1', name: 'Renamed' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRenameFolder(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: 'f1', name: 'Renamed' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/folders/f1', expect.objectContaining({ method: 'PUT' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})
