/**
 * API Route Tests: POST /api/auth/reset-password-request
 *
 * Tests password reset request flow including:
 * - Authentication handling (should work without auth)
 * - Email validation (required, format)
 * - Security: Return success even if email doesn't exist
 * - Token generation and storage
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Mock user data
const mockUser = {
  id: VALID_UUID,
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  displayName: 'Test User',
  passwordVersion: 0,
}

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  passwordResetToken: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth functions
const mockGenerateResetToken = vi.fn().mockReturnValue('reset-token-12345')
const mockGetTokenExpiration = vi.fn().mockReturnValue(new Date(Date.now() + 3600000))

vi.mock('@/lib/auth', () => ({
  generateResetToken: () => mockGenerateResetToken(),
  getTokenExpiration: () => mockGetTokenExpiration(),
}))

// Helper to create mock request with JSON body
function createJsonRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => 'application/json'),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/auth/reset-password-request', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Default mock behaviors
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.passwordResetToken.create.mockResolvedValue({
      id: VALID_UUID,
      userId: VALID_UUID,
      token: 'reset-token-12345',
      expiresAt: new Date(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should work without authentication (public endpoint)', async () => {
      // This endpoint should not require authentication
      // It's a public password reset request endpoint
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      // Should return success (not 401)
      expect(response.status).toBe(200)
      expect(data.message).toContain('If an account exists')
    })

    it('should work even when user is already authenticated', async () => {
      // Even if user is already logged in, this endpoint should work
      // (for cases where user wants to reset their password while logged in)
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
    })
  })

  describe('Input validation', () => {
    it('should return 400 when email is missing', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 when email is null', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: null })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 when email is undefined', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 when email is not a string', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 12345 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 when email is empty string', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should accept valid email format', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'user@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('If an account exists')
    })

    it('should accept email with subdomain', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'user@mail.example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
    })

    it('should accept email with plus sign', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'user+tag@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
    })
  })

  describe('Security - Email enumeration prevention', () => {
    it('should return success even if email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'nonexistent@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('If an account exists')
      
      // Should NOT try to create a reset token
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled()
    })

    it('should return same message for existing and non-existing emails', async () => {
      // Test with non-existing email
      mockPrisma.user.findUnique.mockResolvedValue(null)
      const { POST } = await import('../auth/reset-password-request/route')
      
      const requestNonexistent = createJsonRequest({ email: 'nonexistent@example.com' })
      const responseNonexistent = await POST(requestNonexistent)
      const dataNonexistent = await responseNonexistent.json()

      // Reset mock
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      
      const requestExisting = createJsonRequest({ email: 'test@example.com' })
      const responseExisting = await POST(requestExisting)
      const dataExisting = await responseExisting.json()

      // Both should return the same message
      expect(dataNonexistent.message).toBe(dataExisting.message)
    })
  })

  describe('Successful password reset request', () => {
    it('should send reset email successfully when user exists', async () => {
      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('If an account exists')

      // Should find the user
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })

      // Should delete existing tokens
      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: VALID_UUID },
      })

      // Should create new reset token
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: VALID_UUID,
          token: 'reset-token-12345',
          expiresAt: expect.any(Date),
        },
      })
    })

    it('should generate a new reset token for each request', async () => {
      mockGenerateResetToken.mockReturnValue('new-token-67890')

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: 'new-token-67890',
          }),
        })
      )
    })

    it('should delete existing tokens before creating new one', async () => {
      mockPrisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 5 })

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should delete old tokens first
      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: VALID_UUID },
      })
      // Then create new token
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled()
    })

    it('should set token expiration time', async () => {
      const expirationDate = new Date(Date.now() + 3600000) // 1 hour
      mockGetTokenExpiration.mockReturnValue(expirationDate)

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expirationDate,
          }),
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error when finding user', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection error'))

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred while processing your request')
    })

    it('should return 500 on database error when creating token', async () => {
      mockPrisma.passwordResetToken.create.mockRejectedValue(new Error('Database connection error'))

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred while processing your request')
    })

    it('should return 500 on database error when deleting tokens', async () => {
      mockPrisma.passwordResetToken.deleteMany.mockRejectedValue(new Error('Database connection error'))

      const { POST } = await import('../auth/reset-password-request/route')
      const request = createJsonRequest({ email: 'test@example.com' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred while processing your request')
    })

    it('should handle JSON parse errors gracefully', async () => {
      const malformedRequest = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'application/json'),
        },
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as unknown as NextRequest

      const { POST } = await import('../auth/reset-password-request/route')
      const response = await POST(malformedRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An error occurred while processing your request')
    })
  })
})
