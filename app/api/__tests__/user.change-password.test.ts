/**
 * API Route Tests: POST /api/user/change-password
 *
 * Tests password change functionality including:
 * - Authentication validation
 * - Input validation (currentPassword, newPassword, confirmNewPassword)
 * - Password verification
 * - Password strength validation
 * - Password update with encryption re-wrapping
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
  passwordVersion: 0,
  encryptionSalt: null,
  wrappedDek: null,
  kdfIterations: null,
  kdfMemoryCost: null,
  kdfParallelism: null,
}

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  note: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  validatePassword: vi.fn(),
  createDEKToken: vi.fn(),
  getDEKCookieOptions: vi.fn(),
}))

// Mock encryption functions
vi.mock('@/lib/dek-cache', () => ({
  cacheDEK: vi.fn(),
}))

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  deriveKEK: vi.fn(),
  unwrapDEK: vi.fn(),
  wrapDEK: vi.fn(),
  decryptNote: vi.fn(),
  encryptNote: vi.fn(),
  generateSalt: vi.fn(() => 'newsalt'),
  getDefaultKDFParams: vi.fn(() => ({ iterations: 100000, memoryCost: 65536, parallelism: 1 })),
}))

// Helper to create mock request
function createChangePasswordRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => null),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/user/change-password', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    const { verifyPassword } = await import('@/lib/auth')
    const { hashPassword } = await import('@/lib/auth')
    const { validatePassword } = await import('@/lib/auth')
    const { getDEKCookieOptions } = await import('@/lib/auth')
    
    vi.mocked(getSession).mockResolvedValue(mockSession)
    vi.mocked(verifyPassword).mockResolvedValue(true)
    vi.mocked(hashPassword).mockResolvedValue('$2a$12$newhashedpassword')
    vi.mocked(validatePassword).mockReturnValue({ valid: true, errors: [] })
    vi.mocked(getDEKCookieOptions).mockReturnValue({ httpOnly: true, secure: true, sameSite: 'strict' as const, maxAge: 86400, path: '/', priority: 'high' as const })
    
    // Default mock behaviors
    mockPrisma.user.findUnique.mockResolvedValue({
      passwordHash: mockUser.passwordHash,
      passwordVersion: mockUser.passwordVersion,
      encryptionSalt: null,
      wrappedDek: null,
      kdfIterations: null,
      kdfMemoryCost: null,
      kdfParallelism: null,
    })
    mockPrisma.user.update.mockResolvedValue({
      id: mockUser.id,
      passwordHash: '$2a$12$newhashedpassword',
      passwordVersion: 1,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when currentPassword is missing', async () => {
      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Current password is required')
    })

    it('should return 400 when newPassword is missing', async () => {
      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('New password is required')
    })

    it('should return 400 when confirmNewPassword does not match', async () => {
      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'DifferentPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('New passwords do not match')
    })

    it('should return 400 when newPassword fails validation', async () => {
      const { validatePassword } = await import('@/lib/auth')
      vi.mocked(validatePassword).mockReturnValue({
        valid: false,
        errors: ['Password must be at least 8 characters'],
      })

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'short',
        confirmNewPassword: 'short',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 8 characters')
    })

    it('should return 400 when newPassword is too short', async () => {
      const { validatePassword } = await import('@/lib/auth')
      vi.mocked(validatePassword).mockReturnValue({
        valid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'abc123',
        confirmNewPassword: 'abc123',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('Password verification', () => {
    it('should return 400 when currentPassword is incorrect', async () => {
      const { verifyPassword } = await import('@/lib/auth')
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Current password is incorrect')
    })

    it('should return 400 when new password is same as current password', async () => {
      const { verifyPassword } = await import('@/lib/auth')
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
        confirmNewPassword: 'SamePassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('New password must be different from current password')
    })
  })

  describe('Password change', () => {
    it('should successfully change password when authenticated', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordHash: mockUser.passwordHash,
        passwordVersion: 0,
        encryptionSalt: null,
        wrappedDek: null,
        kdfIterations: null,
        kdfMemoryCost: null,
        kdfParallelism: null,
      })
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordVersion: 0,
      })
      mockPrisma.user.update.mockResolvedValue({
        id: mockUser.id,
        passwordHash: '$2a$12$newhashedpassword',
        passwordVersion: 1,
      })

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password changed successfully')
      expect(data.passwordVersion).toBe(1)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSession.userId },
          data: expect.objectContaining({
            passwordVersion: 1,
          }),
        })
      )
    })

    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error during user find', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred while changing your password')
    })

    it('should return 500 on database error during password update', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordHash: mockUser.passwordHash,
        passwordVersion: 0,
      })
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        passwordVersion: 0,
      })
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../user/change-password/route')
      const request = createChangePasswordRequest({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred while changing your password')
    })
  })
})
