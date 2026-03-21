/**
 * API Route Tests: POST /api/auth/logout
 *
 * Tests logout functionality including:
 * - Successfully logout authenticated user
 * - Handle logout when not authenticated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock token payload
const mockTokenPayload = {
  userId: 'user-123',
  email: 'test@example.com',
}

// Mock prisma
const mockPrisma = {
  revokedToken: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth functions
const mockVerifyToken = vi.fn()
const mockClearDEK = vi.fn()

vi.mock('@/lib/auth', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
  clearDEKCookie: vi.fn(),
}))

// Mock DEK cache
vi.mock('@/lib/dek-cache', () => ({
  clearDEK: (...args: unknown[]) => mockClearDEK(...args),
}))

// Mock cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}))

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: has auth token
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'auth_token') return { value: 'valid-token' }
      return undefined
    })
    mockVerifyToken.mockReturnValue(mockTokenPayload)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authenticated user', () => {
    it('should successfully logout authenticated user', async () => {
      mockPrisma.revokedToken.create.mockResolvedValue({})

      const { POST } = await import('../auth/logout/route')
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should clear auth cookie on logout', async () => {
      mockPrisma.revokedToken.create.mockResolvedValue({})

      const { POST } = await import('../auth/logout/route')
      await POST()

      expect(mockCookieStore.delete).toHaveBeenCalledWith('auth_token')
    })

    it('should add token to revoked tokens', async () => {
      mockPrisma.revokedToken.create.mockResolvedValue({})

      const { POST } = await import('../auth/logout/route')
      await POST()

      expect(mockPrisma.revokedToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'valid-token',
          userId: 'user-123',
        }),
      })
    })

    it('should clear DEK cache on logout', async () => {
      mockPrisma.revokedToken.create.mockResolvedValue({})

      const { POST } = await import('../auth/logout/route')
      await POST()

      expect(mockClearDEK).toHaveBeenCalledWith('user-123')
    })

    it('should revoke token with future expiration date', async () => {
      mockPrisma.revokedToken.create.mockResolvedValue({})

      const { POST } = await import('../auth/logout/route')
      await POST()

      expect(mockPrisma.revokedToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      })
    })
  })

  describe('Not authenticated', () => {
    it('should handle logout when no token exists', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'auth_token') return undefined
        return undefined
      })

      const { POST } = await import('../auth/logout/route')
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should not create revoked token when no token exists', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'auth_token') return undefined
        return undefined
      })

      const { POST } = await import('../auth/logout/route')
      await POST()

      expect(mockPrisma.revokedToken.create).not.toHaveBeenCalled()
    })

    it('should handle invalid token gracefully', async () => {
      mockVerifyToken.mockReturnValue(null)

      const { POST } = await import('../auth/logout/route')
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error when creating revoked token', async () => {
      mockPrisma.revokedToken.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../auth/logout/route')
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return 500 on token verification error', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Token error')
      })

      const { POST } = await import('../auth/logout/route')
      const response = await POST()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
