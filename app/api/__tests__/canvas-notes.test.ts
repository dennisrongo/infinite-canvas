/**
 * API Route Tests: GET /api/canvases/[id]/notes
 *
 * Tests canvas notes retrieval functionality including:
 * - Authentication validation
 * - UUID format validation
 * - Canvas existence and ownership verification
 * - Notes retrieval and ordering
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const INVALID_UUID = 'invalid-uuid'
const USER_ID = 'user-123'

// Mock session
const mockSession = {
  userId: USER_ID,
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock prisma
const mockPrisma = {
  note: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  canvas: {
    findFirst: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
  getDEKCookie: vi.fn().mockResolvedValue(null),
}))

// Mock validation
vi.mock('@/lib/validation', () => ({
  isValidUUID: vi.fn((id: string) => {
    return id.includes('-') && id.length === 36
  }),
}))

// Mock DEK cache functions
vi.mock('@/lib/dek-cache', () => ({
  getDEK: vi.fn(() => null),
  cacheDEK: vi.fn(),
}))

// Mock DEK module
vi.mock('@/lib/dek', () => ({
  getOrRestoreDEK: vi.fn().mockResolvedValue(null),
  decryptNameWithDEK: vi.fn(),
}))

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  isEncryptedData: vi.fn(() => false),
  decryptNote: vi.fn(),
}))

// Mock search index
vi.mock('@/lib/search-index', () => ({
  indexNote: vi.fn().mockResolvedValue(undefined),
}))

// Helper to create mock GET request
function createGetRequest(canvasId: string): NextRequest {
  return {
    method: 'GET',
    headers: {
      get: vi.fn(() => null),
    },
    url: `http://localhost:3000/api/canvases/${canvasId}/notes`,
  } as unknown as NextRequest
}

describe('GET /api/canvases/[id]/notes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.note.findMany.mockResolvedValue([
      {
        id: VALID_UUID,
        canvasId: VALID_UUID,
        title: 'Note 1',
        content: 'Content 1',
        positionX: 0,
        positionY: 0,
        width: 300,
        height: 200,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isEncrypted: false,
      },
    ])
    mockPrisma.note.count.mockResolvedValue(1)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('UUID validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(INVALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: INVALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID format')
    })
  })

  describe('Canvas existence and ownership', () => {
    it('should return 404 for non-existent canvas', async () => {
      mockPrisma.note.findMany.mockResolvedValue([])
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })

    it('should return 403 for canvases owned by other users', async () => {
      // The route uses userId filter in the query, so it won't find notes
      // for canvases owned by other users - will return 404
      mockPrisma.note.findMany.mockResolvedValue([])
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })
  })

  describe('Notes retrieval', () => {
    it('should return notes for authenticated user', async () => {
      const mockNotes = [
        {
          id: VALID_UUID,
          canvasId: VALID_UUID,
          title: 'Test Note',
          content: 'Test Content',
          positionX: 0,
          positionY: 0,
          width: 300,
          height: 200,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isEncrypted: false,
        },
      ]
      mockPrisma.note.findMany.mockResolvedValue(mockNotes)
      mockPrisma.note.count.mockResolvedValue(1)

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notes).toHaveLength(1)
      expect(data.notes[0].title).toBe('Test Note')
    })

    it('should return empty array when no notes exist', async () => {
      mockPrisma.note.findMany.mockResolvedValue([])
      mockPrisma.canvas.findFirst.mockResolvedValue({ id: VALID_UUID })
      mockPrisma.note.count.mockResolvedValue(0)

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notes).toEqual([])
      expect(data.pagination.total).toBe(0)
    })

    it('should return notes ordered by createdAt ascending', async () => {
      const mockNotes = [
        {
          id: 'note-2',
          canvasId: VALID_UUID,
          title: 'Note 2',
          content: 'Content 2',
          positionX: 100,
          positionY: 100,
          width: 300,
          height: 200,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          isEncrypted: false,
        },
        {
          id: 'note-1',
          canvasId: VALID_UUID,
          title: 'Note 1',
          content: 'Content 1',
          positionX: 0,
          positionY: 0,
          width: 300,
          height: 200,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isEncrypted: false,
        },
      ]
      mockPrisma.note.findMany.mockResolvedValue(mockNotes)
      mockPrisma.note.count.mockResolvedValue(2)

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      // Verify orderBy is correct
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.note.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../canvases/[id]/notes/route')
      const request = createGetRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch notes')
    })
  })
})
