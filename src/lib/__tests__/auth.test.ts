/**
 * Unit tests for auth library
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  validatePassword,
  validateEmail,
  generateResetToken,
  getTokenExpiration,
} from '../auth'

// Mock cookies and jsonwebtoken modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock jsonwebtoken functions before mocking the module
const mockSign = vi.fn(() => 'mock-jwt-token')
const mockVerify = vi.fn((token: string) => {
  if (token === 'valid-token') {
    return { userId: 'user-123', email: 'test@example.com' }
  }
  if (token === 'expired-token') {
    const error: any = new Error('Token expired')
    error.name = 'TokenExpiredError'
    throw error
  }
  const error: any = new Error('Invalid token')
  error.name = 'JsonWebTokenError'
  throw error
})

vi.mock('jsonwebtoken', () => ({
  sign: () => mockSign,
  verify: mockVerify,
  default: {
    sign: () => mockSign,
    verify: mockVerify,
  },
}))

describe('hashPassword', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jwt'
    mockSign.mockClear()
    mockVerify.mockClear()
  })

  it('should hash password successfully', async () => {
    const password = 'TestPassword123!'
    const hash = await hashPassword(password)

    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(50)
    expect(hash).not.toBe(password)
  })

  it('should generate different hashes for same password', async () => {
    const password = 'TestPassword123!'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2)
  })

  it('should include bcrypt hash format', async () => {
    const hash = await hashPassword('TestPassword123!')

    expect(hash).toMatch(/^\$2[aby]\$/)
  })
})

describe('verifyPassword', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jwt'
  })

  it('should verify correct password', async () => {
    const password = 'TestPassword123!'
    const hash = await hashPassword(password)

    const result = await verifyPassword(password, hash)

    expect(result).toBe(true)
  })

  it('should reject incorrect password', async () => {
    const password1 = 'TestPassword123!'
    const password2 = 'WrongPassword'
    const hash1 = await hashPassword(password1)

    const result = await verifyPassword(password2, hash1)

    expect(result).toBe(false)
  })

  it('should reject password against different hash', async () => {
    const hash1 = await hashPassword('Password1')
    const hash2 = await hashPassword('Password2')

    const result = await verifyPassword('Password1', hash2)

    expect(result).toBe(false)
  })
})

describe('generateToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jwt'
    mockSign.mockClear()
  })

  it('should generate JWT token', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      passwordVersion: 1,
    }

    const result = generateToken(payload)

    expect(mockSign).toHaveBeenCalledWith(
      { userId: 'user-123', email: 'test@example.com', passwordVersion: 1 },
      'test-secret-for-jwt',
      { expiresIn: '7d' }
    )
    expect(result).toBe('mock-jwt-token')
  })

  it('should include payload in token', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      passwordVersion: 1,
    }

    generateToken(payload)

    expect(mockSign).toHaveBeenCalled()
  })
})

describe('verifyToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jwt'
    mockSign.mockClear()
    mockVerify.mockClear()
  })

  it('should verify valid token', () => {
    mockVerify.mockReturnValueOnce({ userId: 'user-123', email: 'test@example.com' })
    const result = verifyToken('valid-token')

    expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-secret-for-jwt')
    expect(result).toBeDefined()
    expect(result?.userId).toBe('user-123')
    expect(result?.email).toBe('test@example.com')
  })

  it('should reject expired token', () => {
    mockVerify.mockImplementationOnce((token: string) => {
      if (token === 'expired-token') {
        const error: any = new Error('Token expired')
        error.name = 'TokenExpiredError'
        throw error
      }
      throw new Error('Invalid token')
    })
    const result = verifyToken('expired-token')

    expect(result).toBeNull()
  })

  it('should reject invalid token', () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error('Invalid token')
    })
    const result = verifyToken('invalid-token')

    expect(result).toBeNull()
  })

  it('should reject malformed token', () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error('Invalid token')
    })
    const result = verifyToken('not-a-jwt')

    expect(result).toBeNull()
  })
})

describe('validatePassword', () => {
  it('should accept valid password', () => {
    const result = validatePassword('ValidP@ssw0rd!')

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Pass1!')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 8 characters long')
  })

  it('should reject password without uppercase letter', () => {
    const result = validatePassword('password123!')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('should reject password without lowercase letter', () => {
    const result = validatePassword('PASSWORD123!')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('should reject password without number', () => {
    const result = validatePassword('Password!')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('should reject password without special character', () => {
    const result = validatePassword('Password123')

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('should return all errors for password with multiple issues', () => {
    const result = validatePassword('pass')

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('validateEmail', () => {
  it('should accept valid email format', () => {
    const result = validateEmail('test@example.com')

    expect(result).toBe(true)
  })

  it('should accept email with subdomain', () => {
    const result = validateEmail('user@mail.example.com')

    expect(result).toBe(true)
  })

  it('should accept email with numbers', () => {
    const result = validateEmail('user123@example.com')

    expect(result).toBe(true)
  })

  it('should accept email with special characters', () => {
    const result = validateEmail('user.name+tag@example.com')

    expect(result).toBe(true)
  })

  it('should reject email without @', () => {
    const result = validateEmail('invalidemail')

    expect(result).toBe(false)
  })

  it('should reject email without domain', () => {
    const result = validateEmail('user@')

    expect(result).toBe(false)
  })

  it('should reject email without TLD', () => {
    const result = validateEmail('user@example')

    expect(result).toBe(false)
  })

  it('should reject email with spaces', () => {
    const result = validateEmail('user @example.com')

    expect(result).toBe(false)
  })
})

describe('generateResetToken', () => {
  it('should generate a 64-character hex token', () => {
    const result = generateResetToken()

    expect(result).toBeDefined()
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('should generate unique tokens', () => {
    const token1 = generateResetToken()
    const token2 = generateResetToken()

    expect(token1).not.toBe(token2)
  })
})

describe('getTokenExpiration', () => {
  it('should return date 1 hour in the future', () => {
    const now = Date.now()
    const result = getTokenExpiration()

    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBeGreaterThan(now + 59 * 60 * 1000)
    expect(result.getTime()).toBeLessThan(now + 61 * 60 * 1000)
  })

  it('should return future date', () => {
    const now = new Date()
    const result = getTokenExpiration()

    expect(result.getTime()).toBeGreaterThan(now.getTime())
  })
})
