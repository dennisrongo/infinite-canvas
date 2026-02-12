/**
 * Unit tests for useSearch hook
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearch } from '../useSearch'

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

describe('useSearch', () => {
  it('should be disabled when query is empty', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSearch(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should be disabled when query is whitespace only', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSearch('   '), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should fetch when query is non-empty', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ results: [{ id: 'n1', title: 'Match' }] }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSearch('hello'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.results).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/search', expect.objectContaining({ method: 'POST' }))
  })

  it('should pass filters to API', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ results: [] }))
    const { wrapper } = createWrapper()
    const filters = { sortBy: 'title', dateFilter: 'week' }
    const { result } = renderHook(() => useSearch('test', filters), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.query).toBe('test')
    expect(callBody.sortBy).toBe('title')
    expect(callBody.dateFilter).toBe('week')
  })

  it('should handle error state', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Search failed' }, 500))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSearch('test'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
