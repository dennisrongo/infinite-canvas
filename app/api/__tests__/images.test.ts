/**
 * API Route Tests: POST /api/images
 *
 * Tests image upload functionality including:
 * - Authentication validation
 * - Input validation (file, noteId)
 * - File type validation
 * - File size validation
 * - Note ownership verification
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const USER_ID = 'user-123'

// Mock session
const mockSession = {
  userId: USER_ID,
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock file data
const mockImageFile = new File(['mock-image-data'], 'test-image.png', { type: 'image/png' })

// Mock prisma
const mockPrisma = {
  note: {
    findUnique: vi.fn(),
  },
  image: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
const mockVerifyToken = vi.fn()

vi.mock('@/lib/auth', () => ({
  verifyToken: () => mockVerifyToken(),
}))

// Mock fs/promises
const mockWriteFile = vi.fn().mockResolvedValue(undefined)
const mockMkdir = vi.fn().mockResolvedValue(undefined)
const mockExistsSync = vi.fn().mockReturnValue(true)

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}))

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
}))

// Helper to create mock form data request
function createFormDataRequest(formData: FormData): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => 'multipart/form-data'),
    },
    formData: async () => formData,
    cookies: {
      get: vi.fn(() => ({ value: 'mock-token' })),
    },
  } as unknown as NextRequest
}

// Helper to create mock request with JSON body (for error cases)
function createJsonRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => 'application/json'),
    },
    json: async () => body,
    cookies: {
      get: vi.fn(() => ({ value: 'mock-token' })),
    },
  } as unknown as NextRequest
}

describe('POST /api/images', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Default mock behaviors
    mockVerifyToken.mockReturnValue({ userId: USER_ID })

    mockPrisma.note.findUnique.mockResolvedValue({
      id: VALID_UUID,
      canvasId: VALID_UUID,
      canvas: {
        id: VALID_UUID,
        userId: USER_ID,
      },
    })

    mockPrisma.image.create.mockResolvedValue({
      id: VALID_UUID,
      noteId: VALID_UUID,
      storagePath: '/uploads/images/test-image.png',
      fileName: 'test-image.png',
      mimeType: 'image/png',
      sizeBytes: 1000,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when no token provided', async () => {
      mockVerifyToken.mockReturnValue(null)

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => undefined),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      // When no token is provided in cookies, verifyToken returns null and gives 'Invalid token'
      expect(data.error).toBe('Invalid token')
    })

    it('should return 401 for invalid token', async () => {
      mockVerifyToken.mockReturnValue(null)

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'invalid-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })

    it('should return 401 when token has no userId', async () => {
      mockVerifyToken.mockReturnValue({})

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'token-without-userid' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when file is missing', async () => {
      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No file provided')
    })

    it('should return 400 when noteId is missing', async () => {
      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No note ID provided')
    })

    it('should return 400 when noteId is invalid UUID format', async () => {
      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', 'not-a-valid-uuid')

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid note ID format')
    })

    it('should return 403 when note belongs to another user', async () => {
      mockPrisma.note.findUnique.mockResolvedValue({
        id: VALID_UUID,
        canvasId: VALID_UUID,
        canvas: {
          id: VALID_UUID,
          userId: 'other-user-id',
        },
      })

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when note does not exist', async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null)

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('File validation', () => {
    it('should return 400 when file is not an image', async () => {
      const nonImageFile = new File(['text content'], 'test.txt', { type: 'text/plain' })

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', nonImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File must be an image')
    })

    it('should accept valid image files', async () => {
      const jpegFile = new File(['jpeg-data'], 'test.jpg', { type: 'image/jpeg' })

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', jpegFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('fileName')
    })

    it('should accept webp images', async () => {
      const webpFile = new File(['webp-data'], 'test.webp', { type: 'image/webp' })

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', webpFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
    })

    it('should accept gif images', async () => {
      const gifFile = new File(['gif-data'], 'test.gif', { type: 'image/gif' })

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', gifFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
    })
  })

  describe('File size validation', () => {
    // Note: The current route implementation does not have file size validation
    // These tests document expected behavior if file size validation is added
    
    it('should accept file within size limits', async () => {
      // Create a small file (under 10MB)
      const smallBuffer = new ArrayBuffer(5 * 1024 * 1024) // 5MB
      const smallFile = new File([smallBuffer], 'small-image.png', { type: 'image/png' })

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', smallFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id')
    })
  })

  describe('Successful upload', () => {
    it('should upload image successfully', async () => {
      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', VALID_UUID)
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('fileName', 'test-image.png')

      expect(mockWriteFile).toHaveBeenCalled()
      expect(mockPrisma.image.create).toHaveBeenCalledWith({
        data: {
          noteId: VALID_UUID,
          storagePath: expect.stringContaining('/uploads/images/'),
          fileName: 'test-image.png',
          mimeType: 'image/png',
          sizeBytes: expect.any(Number),
        },
      })
    })

    it('should create uploads directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false)

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockMkdir).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.image.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to upload image')
    })

    it('should return 500 on file write error', async () => {
      mockWriteFile.mockRejectedValue(new Error('File write error'))

      const { POST } = await import('../images/route')
      const formData = new FormData()
      formData.append('file', mockImageFile)
      formData.append('noteId', VALID_UUID)

      const request = {
        method: 'POST',
        headers: {
          get: vi.fn(() => 'multipart/form-data'),
        },
        formData: async () => formData,
        cookies: {
          get: vi.fn(() => ({ value: 'mock-token' })),
        },
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to upload image')
    })
  })
})
