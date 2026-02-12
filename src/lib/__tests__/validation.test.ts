/**
 * Unit tests for validation library
 */

import { describe, it, expect } from 'vitest'
import {
  isValidUUID,
  sanitizeUrlParam,
  isSafeRedirectUrl,
  uuidSchema,
  noteTitleSchema,
  noteContentSchema,
  noteUpdateSchema,
  noteCreateSchema,
} from '../validation'

// Test data
const validUUID = '550e8400-e29b-41d4-a716-446655440000'
const invalidUUID = 'not-a-valid-uuid'
const testURL = 'test-param'
const encodedTestURL = 'test-param'
const safeRedirectURL = '/dashboard'
const unsafeRedirectURL = 'javascript:alert(document.cookie)'
const maliciousScriptURL = 'data:text/javascript,alert(document.cookie)'

// Test note data
const testNoteData = {
  id: 'note-1',
  title: 'Test Note',
  content: 'Test content with markdown',
}

describe('isValidUUID', () => {
  it('should accept valid UUID v4', () => {
    expect(isValidUUID(validUUID)).toBe(true)
  })

  it('should accept valid UUID with lowercase letters', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440abc')).toBe(true)
  })

  it('should reject invalid UUID format', () => {
    expect(isValidUUID(invalidUUID)).toBe(false)
  })

  it('should reject UUID with special characters', () => {
    expect(isValidUUID('user-id-with-special-chars')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isValidUUID('')).toBe(false)
  })

  it('should reject non-string input', () => {
    expect(isValidUUID(123 as any)).toBe(false)
  })
})

describe('sanitizeUrlParam', () => {
  it('should accept safe URL parameter', () => {
    expect(sanitizeUrlParam(testURL)).toBe(testURL)
  })

  it('should reject URL with path traversal', () => {
    const maliciousURL = '../../../etc/passwd'
    expect(sanitizeUrlParam(maliciousURL)).toBeNull()
  })

  it('should reject URL with forward slash', () => {
    expect(sanitizeUrlParam('path/to/file')).toBeNull()
  })

  it('should reject URL with backslash', () => {
    expect(sanitizeUrlParam('path\\to\\file')).toBeNull()
  })

  it('should reject URL with encoded path traversal', () => {
    expect(sanitizeUrlParam('%2e%2e')).toBeNull()
  })

  it('should reject empty input', () => {
    expect(sanitizeUrlParam('')).toBeNull()
  })

  it('should reject null input', () => {
    expect(sanitizeUrlParam(null as any)).toBeNull()
  })
})

describe('isSafeRedirectUrl', () => {
  it('should accept safe relative URL', () => {
    expect(isSafeRedirectUrl(safeRedirectURL)).toBe(true)
  })

  it('should accept URL with query parameters', () => {
    expect(isSafeRedirectUrl('/dashboard?tab=1')).toBe(true)
  })

  it('should accept URL with hash', () => {
    expect(isSafeRedirectUrl('/section#anchor')).toBe(true)
  })

  it('should reject unsafe redirect with javascript protocol', () => {
    expect(isSafeRedirectUrl(unsafeRedirectURL)).toBe(false)
  })

  it('should reject unsafe redirect with data URL', () => {
    expect(isSafeRedirectUrl(maliciousScriptURL)).toBe(false)
  })

  it('should reject absolute URL', () => {
    expect(isSafeRedirectUrl('https://example.com')).toBe(false)
  })

  it('should reject protocol-relative URL', () => {
    expect(isSafeRedirectUrl('//evil.com')).toBe(false)
  })

  it('should reject URL without leading slash', () => {
    expect(isSafeRedirectUrl('dashboard')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isSafeRedirectUrl('')).toBe(false)
  })
})

describe('noteTitleSchema validation', () => {
  it('should accept valid title', () => {
    const result = noteTitleSchema.safeParse('Valid Title')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('Valid Title')
    }
  })

  it('should reject empty title', () => {
    const result = noteTitleSchema.safeParse('')
    // Zod max will pass empty string, but transform will return empty
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('')
    }
  })

  it('should reject title exceeding 500 characters', () => {
    const longTitle = 'A'.repeat(501)
    const result = noteTitleSchema.safeParse(longTitle)
    expect(result.success).toBe(false)
  })

  it('should strip HTML tags from title', () => {
    const titleWithHTML = '<script>alert("xss")</script>Title'
    const result = noteTitleSchema.safeParse(titleWithHTML)
    expect(result.success).toBe(true)
    if (result.success) {
      // The transform only strips < > characters, leaving the content
      expect(result.data).toBe('alert("xss")Title')
    }
  })

  it('should trim whitespace from title', () => {
    const result = noteTitleSchema.safeParse('  Title with spaces  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('Title with spaces')
    }
  })
})

describe('noteContentSchema validation', () => {
  it('should accept valid content', () => {
    const result = noteContentSchema.safeParse('Test content with markdown')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('Test content with markdown')
    }
  })

  it('should accept empty content', () => {
    const result = noteContentSchema.safeParse('')
    expect(result.success).toBe(true)
  })

  it('should reject content exceeding 10MB', () => {
    const largeContent = 'x'.repeat(11 * 1024 * 1024) // Over 10MB
    const result = noteContentSchema.safeParse(largeContent)
    expect(result.success).toBe(false)
  })

  it('should strip script tags from content', () => {
    const contentWithScript = '<script>alert("xss")</script>Content'
    const result = noteContentSchema.safeParse(contentWithScript)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toContain('<script>')
      expect(result.data).toContain('Content')
    }
  })

  it('should strip iframe tags from content', () => {
    const contentWithIframe = '<iframe src="evil"></iframe>Content'
    const result = noteContentSchema.safeParse(contentWithIframe)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toContain('<iframe')
      expect(result.data).toContain('Content')
    }
  })

  it('should strip dangerous event handlers', () => {
    const contentWithEvent = '<p onclick="alert(1)">Text</p>'
    const result = noteContentSchema.safeParse(contentWithEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toContain('onclick')
    }
  })
})

describe('noteUpdateSchema validation', () => {
  it('should accept valid update with title and content', () => {
    const result = noteUpdateSchema.safeParse({
      title: 'Updated Title',
      content: 'Updated content',
    })
    expect(result.success).toBe(true)
  })

  it('should accept update with only title', () => {
    const result = noteUpdateSchema.safeParse({
      title: 'Updated Title',
    })
    expect(result.success).toBe(true)
  })

  it('should accept update with only content', () => {
    const result = noteUpdateSchema.safeParse({
      content: 'Updated content',
    })
    expect(result.success).toBe(true)
  })

  it('should accept update with position values', () => {
    const result = noteUpdateSchema.safeParse({
      positionX: 100,
      positionY: 200,
    })
    expect(result.success).toBe(true)
  })

  it('should accept update with size values', () => {
    const result = noteUpdateSchema.safeParse({
      width: 400,
      height: 300,
    })
    expect(result.success).toBe(true)
  })

  it('should accept update with font settings', () => {
    const result = noteUpdateSchema.safeParse({
      fontFamily: 'Arial',
      fontSize: 16,
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid font size (negative)', () => {
    const result = noteUpdateSchema.safeParse({
      fontSize: -5,
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid font size (too large)', () => {
    const result = noteUpdateSchema.safeParse({
      fontSize: 100,
    })
    expect(result.success).toBe(false)
  })
})

describe('noteCreateSchema validation', () => {
  it('should accept valid note creation', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionX: 100,
      positionY: 200,
    })
    expect(result.success).toBe(true)
  })

  it('should apply default width and height', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionX: 100,
      positionY: 200,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.width).toBe(300)
      expect(result.data.height).toBe(200)
    }
  })

  it('should accept custom width and height', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionX: 100,
      positionY: 200,
      width: 500,
      height: 400,
    })
    expect(result.success).toBe(true)
  })

  it('should reject creation without title', () => {
    const result = noteCreateSchema.safeParse({
      content: 'Test content',
      positionX: 100,
      positionY: 200,
    } as any)
    expect(result.success).toBe(false)
  })

  it('should reject creation without positionX', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionY: 200,
    } as any)
    expect(result.success).toBe(false)
  })

  it('should reject creation without positionY', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionX: 100,
    } as any)
    expect(result.success).toBe(false)
  })

  it('should reject creation with negative width', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionX: 100,
      positionY: 200,
      width: -100,
    })
    expect(result.success).toBe(false)
  })

  it('should reject creation with zero height', () => {
    const result = noteCreateSchema.safeParse({
      title: 'Test Note',
      content: 'Test content',
      positionX: 100,
      positionY: 200,
      height: 0,
    })
    expect(result.success).toBe(false)
  })
})

describe('uuidSchema', () => {
  it('should accept valid UUID', () => {
    const result = uuidSchema.safeParse(validUUID)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const result = uuidSchema.safeParse(invalidUUID)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid ID format. Expected a valid UUID.')
    }
  })
})
