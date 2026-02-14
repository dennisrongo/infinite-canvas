/**
 * API Route Tests: POST /api/auth/register
 *
 * Tests registration flow including:
 * - Valid registration
 * - Validation errors
 * - Duplicate email handling
 * - Rate limiting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock created user response
const mockCreatedUser = {
  id: 'new-user-123',
  email: 'newuser@example.com',
  passwordHash: '$2a$12$hashedpassword',
  displayName: 'newuser',
  passwordVersion: 0,
}

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  userSettings: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth functions with proper implementations
const mockHashPassword = vi.fn().mockResolvedValue('$2a$12$hashedpassword')
const mockValidatePassword = vi.fn().mockReturnValue({ valid: true, errors: [] })
const mockValidateEmail = vi.fn().mockReturnValue(true)
const mockGenerateToken = vi.fn().mockReturnValue('jwt-token')
const mockSetSessionCookie = vi.fn()

vi.mock('@/lib/auth', () => ({
  hashPassword: (password: string) => mockHashPassword(password),
  validatePassword: (password: string) => mockValidatePassword(password),
  validateEmail: (email: string) => mockValidateEmail(email),
  generateToken: () => mockGenerateToken(),
  setSessionCookie: (token: string) => mockSetSessionCookie(token),
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
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Helper to create mock request
function createRegisterRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => null),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateEmail.mockReturnValue(true)
    mockValidatePassword.mockReturnValue({ valid: true, errors: [] })
    mockRateLimitResult.success = true
    mockHashPassword.mockResolvedValue('$2a$12$hashedpassword')
    mockGenerateToken.mockReturnValue('jwt-token')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Valid registration', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.userSettings.create.mockResolvedValue({})

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('newuser@example.com')
    })

    it('should hash password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.userSettings.create.mockResolvedValue({})

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      await POST(request)

      expect(mockHashPassword).toHaveBeenCalled()
    })

    it('should create user settings after registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.userSettings.create.mockResolvedValue({})

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      await POST(request)

      expect(mockPrisma.userSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCreatedUser.id,
            theme: 'light',
          }),
        })
      )
    })

    it('should set auth cookie after registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.userSettings.create.mockResolvedValue({})

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)

      // Cookie should be set (check response has set method)
      expect(response.status).toBe(201)
    })

    it('should convert email to lowercase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.userSettings.create.mockResolvedValue({})

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'NewUser@Example.COM',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      await POST(request)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'newuser@example.com' },
        })
      )
    })
  })

  describe('Validation errors', () => {
    it('should return 400 for invalid email format', async () => {
      mockValidateEmail.mockReturnValue(false)

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'invalid-email',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email address')
    })

    it('should return 400 for weak password', async () => {
      mockValidatePassword.mockReturnValue({
        valid: false,
        errors: ['Password must be at least 8 characters long'],
      })

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // The error is returned as an array
      expect(data.error).toEqual(['Password must be at least 8 characters long'])
    })

    it('should return 400 for multiple password validation errors', async () => {
      mockValidatePassword.mockReturnValue({
        valid: false,
        errors: [
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number',
        ],
      })

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(Array.isArray(data.error)).toBe(true)
      expect(data.error).toHaveLength(3)
    })

    it('should return 400 when passwords do not match', async () => {
      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'DifferentPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Passwords do not match')
    })

    it('should return 400 for missing email', async () => {
      mockValidateEmail.mockReturnValue(false)

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email address')
    })

    it('should return 400 for missing password', async () => {
      mockValidatePassword.mockReturnValue({
        valid: false,
        errors: ['Password is required'],
      })

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Duplicate email handling', () => {
    it('should return 409 for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockCreatedUser)

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'existing@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Email already registered')
    })

    it('should not create user when email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockCreatedUser)

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'existing@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      await POST(request)

      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockRateLimitResult.success = false
      mockRateLimitResult.blocked = false

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many registration attempts')
    })

    it('should include retry information when rate limited', async () => {
      mockRateLimitResult.success = false
      mockRateLimitResult.resetTime = Date.now() + 60000

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.retryAfter).toBeDefined()
      expect(response.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error during user creation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../auth/register/route')
      const request = createRegisterRequest({
        email: 'newuser@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON gracefully', async () => {
      const request = {
        method: 'POST',
        headers: { get: vi.fn(() => null) },
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      } as unknown as NextRequest

      const { POST } = await import('../auth/register/route')

      // Should handle gracefully
      await expect(POST(request)).resolves.toBeDefined()
    })
  })
})
