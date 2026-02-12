/**
 * Unit tests for useUser hooks
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateProfile, useChangePassword, useDeleteAccount, useUpdateSettings } from '../useUser'

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

describe('useUpdateProfile', () => {
  it('should call PUT /api/user/update-profile', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ displayName: 'New Name' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/user/update-profile', expect.objectContaining({ method: 'PUT' }))
  })

  it('should invalidate user cache on success', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ displayName: 'New Name' })
    })

    expect(invalidateSpy).toHaveBeenCalled()
  })
})

describe('useChangePassword', () => {
  it('should call POST /api/user/change-password', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useChangePassword(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        currentPassword: 'old',
        newPassword: 'New1!aaa',
        confirmNewPassword: 'New1!aaa',
      })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/user/change-password', expect.objectContaining({ method: 'POST' }))
  })

  it('should handle error response', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Current password is incorrect' }, 400))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useChangePassword(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          currentPassword: 'wrong',
          newPassword: 'New1!aaa',
          confirmNewPassword: 'New1!aaa',
        })
      } catch (e) {
        // expected
      }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDeleteAccount', () => {
  it('should call DELETE /api/user/delete-account', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteAccount(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ password: 'mypassword' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/user/delete-account', expect.objectContaining({ method: 'DELETE' }))
  })
})

describe('useUpdateSettings', () => {
  it('should call PUT /api/user/settings', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ settings: { canvasSortOrder: 'updated' } }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateSettings(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ canvasSortOrder: 'updated' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/user/settings', expect.objectContaining({ method: 'PUT' }))
  })
})
