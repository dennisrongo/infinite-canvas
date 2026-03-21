/**
 * API Route Tests: PUT /api/user/update-profile
 *
 * Tests user profile update including:
 * - Authorization checks
 * - Input validation
 * - Profile update
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
  displayName: 'Test User',
  createdAt: new Date(),
  lastLogin: new Date(),
}

// Mock prisma
const mockPrisma = {
  user: {
    update: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Helper to create mock request
function createUpdateProfileRequest(
  body: Record<string, unknown>
): NextRequest {
  return {
    method: 'PUT',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') return 'application/json'
        return null
      },
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('PUT /api/user/update-profile', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: 'New Name' }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when displayName is missing', async () => {
      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Display name is required')
    })

    it('should return 400 when displayName is null', async () => {
      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: null }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Display name is required')
    })

    it('should return 400 when displayName is undefined', async () => {
      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: undefined }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Display name is required')
    })

    it('should return 400 when displayName is empty string', async () => {
      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: '   ' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Display name cannot be empty')
    })

    it('should return 400 when displayName is too long', async () => {
      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({
        displayName: 'a'.repeat(101),
      }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Display name must be less than 100 characters')
    })

    it('should trim whitespace from displayName', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        displayName: 'Trimmed Name',
      })

      const { PUT } = await import('../user/update-profile/route')
      await PUT(createUpdateProfileRequest({ displayName: '  Trimmed Name  ' }))

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: { displayName: 'Trimmed Name' },
        })
      )
    })
  })

  describe('Profile update', () => {
    it('should update user profile', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        displayName: 'New Name',
      })

      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: 'New Name' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.user.displayName).toBe('New Name')
    })

    it('should return user with correct fields', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: 'Test' }))
      const data = await response.json()

      expect(data.user).toHaveProperty('id')
      expect(data.user).toHaveProperty('email')
      expect(data.user).toHaveProperty('displayName')
      expect(data.user).toHaveProperty('createdAt')
      expect(data.user).toHaveProperty('lastLogin')
    })

    it('should use correct user ID from session', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser)

      const { PUT } = await import('../user/update-profile/route')
      await PUT(createUpdateProfileRequest({ displayName: 'Test' }))

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))

      const { PUT } = await import('../user/update-profile/route')
      const response = await PUT(createUpdateProfileRequest({ displayName: 'New Name' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update profile')
    })
  })
})
