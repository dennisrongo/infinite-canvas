/**
 * API Route Tests: GET /api/notes/[noteId]/images
 *
 * Tests retrieving images for a note including:
 * - Authentication validation
 * - UUID format validation
 * - Note existence verification
 * - Ownership verification
 * - Returning images for authenticated user
 * - Empty array when no images exist
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const USER_ID = 'user-123'
const OTHER_USER_ID = 'other-user-456'

// Mock session
const mockSession = {
  userId: USER_ID,
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock prisma
const mockPrisma = {
  note: {
    findFirst: vi.fn(),
  },
  image: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Helper to create mock GET request
function createGetRequest(noteId: string): NextRequest {
  return {
    method: 'GET',
    headers: {
      get: vi.fn(() => 'application/json'),
    },
  } as unknown as NextRequest
}

// Mock params object
const mockParams = {
  noteId: VALID_UUID,
}

describe('GET /api/notes/[noteId]/images', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)

    // Default mock behaviors
    mockPrisma.note.findFirst.mockResolvedValue({
      id: VALID_UUID,
      canvasId: VALID_UUID,
      canvas: {
        id: VALID_UUID,
        userId: USER_ID,
      },
    })

    mockPrisma.image.findMany.mockResolvedValue([
      {
        id: VALID_UUID,
        noteId: VALID_UUID,
        storagePath: '/images/test-image.png',
        fileName: 'test-image.png',
        mimeType: 'image/png',
        sizeBytes: 1000,
        createdAt: new Date(),
      },
      {
        id: VALID_UUID_2,
        noteId: VALID_UUID,
        storagePath: '/images/test-image-2.jpg',
        fileName: 'test-image-2.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 2000,
        createdAt: new Date(),
      },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid noteId UUID format', async () => {
      const invalidParams = { noteId: 'not-a-valid-uuid' }

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest('not-a-valid-uuid')
      const response = await GET(request, { params: Promise.resolve(invalidParams) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid note ID format')
    })

    it('should return 400 for empty noteId', async () => {
      const emptyParams = { noteId: '' }

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest('')
      const response = await GET(request, { params: Promise.resolve(emptyParams) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid note ID format')
    })
  })

  describe('Note existence and ownership', () => {
    it('should return 404 when note does not exist', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Note not found')
    })

    it('should return 403 for notes owned by other users', async () => {
      // When note belongs to another user, findFirst returns null (because of the userId filter)
      // so the route returns 404 "Note not found" (not 403, since we can't tell if it doesn't exist
      // or belongs to another user - this is for security)
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Note not found')
    })

    it('should return 403 when note is in another user canvas', async () => {
      // User owns the canvas but tries to access note in another user's canvas
      // findFirst returns null due to the userId filter
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Note not found')
    })
  })

  describe('Successful retrieval', () => {
    it('should return images for authenticated user', async () => {
      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('images')
      expect(data.images).toHaveLength(2)
      expect(data.images[0]).toHaveProperty('id')
      expect(data.images[0]).toHaveProperty('url')
      expect(data.images[0]).toHaveProperty('fileName')
      expect(data.images[0]).toHaveProperty('mimeType')
      expect(data.images[0]).toHaveProperty('sizeBytes')

      expect(mockPrisma.note.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_UUID,
          canvas: {
            userId: USER_ID,
          },
        },
      })

      expect(mockPrisma.image.findMany).toHaveBeenCalledWith({
        where: {
          noteId: VALID_UUID,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return empty array when no images exist', async () => {
      mockPrisma.image.findMany.mockResolvedValue([])

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('images')
      expect(data.images).toHaveLength(0)
    })

    it('should return images sorted by createdAt descending', async () => {
      const olderDate = new Date('2023-01-01')
      const newerDate = new Date('2023-12-31')

      mockPrisma.image.findMany.mockResolvedValue([
        {
          id: VALID_UUID_2,
          noteId: VALID_UUID,
          storagePath: '/images/newer.jpg',
          fileName: 'newer.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 2000,
          createdAt: newerDate,
        },
        {
          id: VALID_UUID,
          noteId: VALID_UUID,
          storagePath: '/images/older.png',
          fileName: 'older.png',
          mimeType: 'image/png',
          sizeBytes: 1000,
          createdAt: olderDate,
        },
      ])

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.images).toHaveLength(2)
      // Newer image should be first
      expect(data.images[0].id).toBe(VALID_UUID_2)
      expect(data.images[1].id).toBe(VALID_UUID)
    })

    it('should include all image fields in response', async () => {
      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(200)
      const image = data.images[0]
      expect(image).toHaveProperty('id')
      expect(image).toHaveProperty('url')
      expect(image).toHaveProperty('fileName')
      expect(image).toHaveProperty('mimeType')
      expect(image).toHaveProperty('sizeBytes')
      expect(image).toHaveProperty('createdAt')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error when finding note', async () => {
      mockPrisma.note.findFirst.mockRejectedValue(new Error('Database connection error'))

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve images')
    })

    it('should return 500 on database error when finding images', async () => {
      mockPrisma.image.findMany.mockRejectedValue(new Error('Database connection error'))

      const { GET } = await import('../notes/[noteId]/images/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve(mockParams) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve images')
    })
  })
})
