/**
 * API Route Tests: DELETE /api/user/delete-account
 *
 * Tests account deletion functionality including:
 * - Authentication validation
 * - Password confirmation
 * - Account deletion with cascade
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

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
  passwordHash: '$2a$12$hashedpassword',
}

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Mock bcrypt
const mockBcryptCompare = vi.fn()

vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
  },
}))

// Helper to create mock request
function createDeleteAccountRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'DELETE',
    headers: {
      get: vi.fn(() => null),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('DELETE /api/user/delete-account', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockBcryptCompare.mockResolvedValue(true)
    mockPrisma.user.delete.mockResolvedValue(mockUser)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: 'TestPassword123!',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when password is missing', async () => {
      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({})
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password is required to confirm account deletion')
    })

    it('should return 400 when password is empty string', async () => {
      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: '',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password is required to confirm account deletion')
    })
  })

  describe('Password verification', () => {
    it('should return 401 when password is incorrect', async () => {
      mockBcryptCompare.mockResolvedValue(false)

      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: 'WrongPassword123!',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Incorrect password. Account deletion cancelled.')
    })
  })

  describe('Account deletion', () => {
    it('should delete user account when password is correct', async () => {
      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: 'CorrectPassword123!',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Account and all associated data have been permanently deleted')
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      })
    })

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: 'TestPassword123!',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error during user lookup', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: 'TestPassword123!',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete account. Please try again or contact support.')
    })

    it('should return 500 on database error during user deletion', async () => {
      mockPrisma.user.delete.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('../user/delete-account/route')
      const request = createDeleteAccountRequest({
        password: 'TestPassword123!',
      })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete account. Please try again or contact support.')
    })
  })
})
