/**
 * Unit tests for useNotes hooks
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCanvasNotes, useCreateNote, useUpdateNote, useDeleteNote, useDuplicateNote, useRestoreNote } from '../useNotes'

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

describe('useCanvasNotes', () => {
  it('should fetch notes for a canvas', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ notes: [{ id: 'n1', title: 'Note 1' }] }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvasNotes('c1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.notes).toHaveLength(1)
  })

  it('should not fetch when canvasId is empty', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCanvasNotes(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateNote', () => {
  it('should call POST and invalidate notes cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: { id: 'n2', title: 'New Note' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        canvasId: 'c1',
        body: { title: 'New Note', content: '', positionX: 0, positionY: 0, width: 300, height: 200 },
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/notes', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useUpdateNote', () => {
  it('should call PUT with body', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: { id: 'n1', title: 'Updated' } }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUpdateNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ noteId: 'n1', body: { title: 'Updated' } })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/notes/n1', expect.objectContaining({ method: 'PUT' }))
  })
})

describe('useDeleteNote', () => {
  it('should call DELETE and invalidate cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ noteId: 'n1', canvasId: 'c1' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/notes/n1', expect.objectContaining({ method: 'DELETE' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useDuplicateNote', () => {
  it('should call POST duplicate and invalidate cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: { id: 'n3', title: 'Copy of Note' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDuplicateNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ noteId: 'n1', canvasId: 'c1' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/notes/n1/duplicate', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useRestoreNote', () => {
  it('should call POST to create note and invalidate cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: { id: 'n1' } }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useRestoreNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        canvasId: 'c1',
        body: { id: 'n1', title: 'Restored', content: '', positionX: 0, positionY: 0, width: 300, height: 200 },
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/notes', expect.objectContaining({ method: 'POST' }))
    expect(invalidateSpy).toHaveBeenCalled()
  })
})
