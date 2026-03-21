/**
 * API Route Tests: GET /api/auth/me
 *
 * Tests current user retrieval including:
 * - Return current user when authenticated
 * - Return 401 when not authenticated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: new Date('2024-01-01'),
  lastLogin: new Date('2024-06-01'),
}

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

describe('GET /api/auth/me', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authenticated user', () => {
    it('should return current user when authenticated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('user-123')
      expect(data.user.email).toBe('test@example.com')
    })

    it('should return user with correct fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(data.user).toHaveProperty('id')
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('displayName')
      expect(data.user).toHaveProperty('createdAt')
      expect(data.user).toHaveProperty('lastLogin')
    })

    it('should not return sensitive fields like password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(data.user).not.toHaveProperty('passwordHash')
      expect(data.user).not.toHaveProperty('passwordVersion')
    })

    it('should query database with correct user ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      await GET(request)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.objectContaining({
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
          lastLogin: true,
        }),
      })
    })
  })

  describe('Not authenticated', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should not query database when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      await GET(request)

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('User not found', () => {
    it('should return 404 when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../auth/me/route')
      const request = {} as import('next/server').NextRequest
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
