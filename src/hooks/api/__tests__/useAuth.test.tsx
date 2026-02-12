/**
 * Unit tests for useAuth hooks
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCurrentUser, useCsrfToken, useLogin, useRegister, useLogout, useForgotPassword, useResetPassword } from '../useAuth'

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

describe('useCurrentUser', () => {
  it('should fetch current user from /api/auth/me', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ user: { id: '1', email: 'test@test.com' } }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.user.id).toBe('1')
  })

  it('should handle 401 error', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Unauthorized' }, 401))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCurrentUser(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCsrfToken', () => {
  it('should fetch csrf token', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ csrfToken: 'tok-123' }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCsrfToken(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.csrfToken).toBe('tok-123')
  })
})

describe('useLogin', () => {
  it('should call POST /api/auth/login', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ user: { id: '1' }, token: 'jwt' }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLogin(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.com', password: 'pw' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
  })

  it('should handle login error', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ error: 'Invalid credentials' }, 401))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLogin(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ email: 'a@b.com', password: 'wrong' })
      } catch (e) {
        // expected
      }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useRegister', () => {
  it('should call POST /api/auth/register', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ user: { id: '1' } }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useRegister(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.com', password: 'Pw1!aaaa', confirmPassword: 'Pw1!aaaa' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST' }))
  })
})

describe('useLogout', () => {
  it('should call POST /api/auth/logout and clear cache', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper, queryClient } = createWrapper()
    const clearSpy = vi.spyOn(queryClient, 'clear')

    const { result } = renderHook(() => useLogout(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(clearSpy).toHaveBeenCalled()
  })
})

describe('useForgotPassword', () => {
  it('should call POST /api/auth/reset-password-request', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useForgotPassword(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.com' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password-request', expect.objectContaining({ method: 'POST' }))
  })
})

describe('useResetPassword', () => {
  it('should call POST /api/auth/reset-password', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useResetPassword(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ token: 'tok', password: 'Pw1!aaaa', confirmPassword: 'Pw1!aaaa' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({ method: 'POST' }))
  })
})
