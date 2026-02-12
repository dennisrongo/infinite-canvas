/**
 * Unit tests for CSRF library
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateCSRFToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../csrf'

// Mock the cookies module from next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('generateCSRFToken', () => {
  it('should generate a 64-character hex token', () => {
    const result = generateCSRFToken()

    expect(result).toBeDefined()
    expect(result).toHaveLength(64) // Should be 64 hex characters (32 bytes)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('should generate unique tokens', () => {
    const token1 = generateCSRFToken()
    const token2 = generateCSRFToken()

    expect(token1).not.toBe(token2) // Tokens should be unique
    expect(token1).toHaveLength(64)
    expect(token2).toHaveLength(64)
  })

  it('should include only hexadecimal characters', () => {
    const result = generateCSRFToken()

    // Should only contain hex characters (0-9, a-f)
    const hexOnly = /^[0-9a-f]+$/

    expect(result).toMatch(hexOnly)
  })

  it('should be lowercase', () => {
    const result = generateCSRFToken()

    // Should not contain uppercase letters
    expect(result).toMatch(/^[0-9a-f]+$/)
    expect(result).not.toMatch(/[A-F]/)
  })
})

describe('CSRF Constants', () => {
  it('should export CSRF_COOKIE_NAME as csrf_token', () => {
    expect(CSRF_COOKIE_NAME).toBe('csrf_token')
  })

  it('should export CSRF_HEADER_NAME as lowercase x-csrf-token', () => {
    expect(CSRF_HEADER_NAME).toBe('x-csrf-token')
  })
})
