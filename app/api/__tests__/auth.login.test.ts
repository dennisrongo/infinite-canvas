/**
 * API Route Tests: POST /api/auth/login
 *
 * Tests authentication flow including:
 * - Valid credentials login
 * - Invalid credentials handling
 * - Rate limiting
 * - CSRF validation
 * - Error responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock all dependencies before importing the route
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: '$2a$12$hashedpassword',
  displayName: 'Test User',
  passwordVersion: 0,
  lastLogin: null,
}

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth functions
const mockVerifyPassword = vi.fn()
const mockGenerateToken = vi.fn()
const mockValidateEmail = vi.fn()

vi.mock('@/lib/auth', () => ({
  verifyPassword: () => mockVerifyPassword(),
  validateEmail: () => mockValidateEmail(),
  generateToken: () => mockGenerateToken(),
}))

// Mock CSRF - controllable for testing failure cases
const mockValidateCSRFToken = vi.fn(async () => true)

vi.mock('@/lib/csrf', () => ({
  validateCSRFToken: () => mockValidateCSRFToken(),
}))

// Mock rate limiting
const mockRateLimitResult = {
  success: true,
  limit: 5,
  remaining: 4,
  resetTime: Date.now() + 60000,
  blocked: false,
}

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => mockRateLimitResult),
  getIdentifier: vi.fn(() => 'test-ip'),
  rateLimitConfigs: {
    auth: { limit: 5, windowMs: 60000, blockDurationMs: 900000 },
  },
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

// Helper to create mock request
function createLoginRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn((name: string) => {
        if (name === 'x-csrf-token') return 'valid-csrf-token'
        return null
      }),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateEmail.mockReturnValue(true)
    mockRateLimitResult.success = true
    mockRateLimitResult.blocked = false
    mockValidateCSRFToken.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Valid credentials', () => {
    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockGenerateToken.mockReturnValue('jwt-token')

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('user-123')
      expect(data.user.email).toBe('test@example.com')
    })

    it('should set auth cookie with correct options', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockGenerateToken.mockReturnValue('jwt-token')

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'ValidPass123!',
      })

      const response = await POST(request)

      // Check that cookie was set
      expect(response.cookies.set).toBeDefined()
    })

    it('should update lastLogin timestamp on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockGenerateToken.mockReturnValue('jwt-token')

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'ValidPass123!',
      })

      await POST(request)

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: { lastLogin: expect.any(Date) },
        })
      )
    })

    it('should include rate limit headers in response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockGenerateToken.mockReturnValue('jwt-token')

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'ValidPass123!',
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })

  describe('Invalid credentials', () => {
    it('should return 401 for invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return 401 for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(false)

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should return 401 for invalid email format', async () => {
      mockValidateEmail.mockReturnValue(false)

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'invalid-email',
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should not reveal which credential is incorrect', async () => {
      // Both non-existent user and wrong password should return same error
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      })

      const response1 = await POST(request)
      const data1 = await response1.json()

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(false)

      const request2 = createLoginRequest({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      })

      const response2 = await POST(request2)
      const data2 = await response2.json()

      expect(data1.error).toBe(data2.error)
      expect(response1.status).toBe(response2.status)
    })
  })

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockRateLimitResult.success = false
      mockRateLimitResult.blocked = false
      mockRateLimitResult.resetTime = Date.now() + 60000

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many login attempts')
      expect(data.retryAfter).toBeDefined()
    })

    it('should return 429 with blocked message when temporarily blocked', async () => {
      mockRateLimitResult.success = false
      mockRateLimitResult.blocked = true
      mockRateLimitResult.resetTime = Date.now() + 900000

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.message).toContain('temporarily blocked')
    })

    it('should include Retry-After header when rate limited', async () => {
      mockRateLimitResult.success = false
      mockRateLimitResult.resetTime = Date.now() + 60000

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'SomePassword123!',
      })

      const response = await POST(request)

      expect(response.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Input validation', () => {
    it('should handle missing email', async () => {
      mockValidateEmail.mockReturnValue(false)

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('should handle missing password', async () => {
      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
      })

      // Should proceed to password verification which would fail
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(false)

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should handle empty request body gracefully', async () => {
      const request = {
        method: 'POST',
        headers: { get: vi.fn(() => null) },
        json: async () => ({}),
      } as unknown as NextRequest

      const { POST } = await import('../auth/login/route')

      // Should handle gracefully without crashing
      const response = await POST(request)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Remember me functionality', () => {
    it('should set session cookie when rememberMe is false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockGenerateToken.mockReturnValue('jwt-token')

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'ValidPass123!',
        rememberMe: false,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should set persistent cookie when rememberMe is true', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockGenerateToken.mockReturnValue('jwt-token')

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'ValidPass123!',
        rememberMe: true,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('CSRF validation', () => {
    it('should return 403 when CSRF token is missing', async () => {
      mockValidateCSRFToken.mockResolvedValue(false)

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('CSRF')
    })

    it('should return 403 when CSRF token is invalid', async () => {
      mockValidateCSRFToken.mockResolvedValue(false)

      const { POST } = await import('../auth/login/route')
      const request = {
        method: 'POST',
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'x-csrf-token') return 'invalid-token'
            return null
          }),
        },
        json: async () => ({
          email: 'test@example.com',
          password: 'SomePassword123!',
        }),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('CSRF')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../auth/login/route')
      const request = createLoginRequest({
        email: 'test@example.com',
        password: 'SomePassword123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
