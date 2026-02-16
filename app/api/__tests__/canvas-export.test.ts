/**
 * API Route Tests: GET /api/canvases/[id]/export
 *
 * Tests canvas export functionality including:
 * - Authentication validation
 * - UUID format validation
 * - Canvas existence and ownership verification
 * - Export with notes and connections
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
}))

// Mock validation
vi.mock('@/lib/validation', () => ({
  isValidUUID: vi.fn((id: string) => {
    return id.includes('-') && id.length === 36
  }),
}))

// Helper to create mock GET request
function createExportRequest(canvasId: string): NextRequest {
  return {
    method: 'GET',
    headers: {
      get: vi.fn(() => null),
    },
    url: `http://localhost:3000/api/canvases/${canvasId}/export`,
  } as unknown as NextRequest
}

describe('GET /api/canvases/[id]/export', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.canvas.findFirst.mockResolvedValue({
      id: VALID_UUID,
      userId: USER_ID,
      name: 'Test Canvas',
      folderId: null,
      viewportX: 0,
      viewportY: 0,
      zoom: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      folder: null,
      notes: [
        {
          id: 'note-1',
          title: 'Note 1',
          content: 'Content 1',
          positionX: 0,
          positionY: 0,
          width: 300,
          height: 200,
          fontFamily: 'Inter',
          fontSize: 14,
          images: [],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ],
      connections: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('UUID validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(INVALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: INVALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID format')
    })
  })

  describe('Canvas existence and ownership', () => {
    it('should return 404 for non-existent canvas', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })

    it('should return 404 for canvases owned by other users', async () => {
      // The route filters by userId, so it returns 404 for other users' canvases
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })
  })

  describe('Canvas export', () => {
    it('should export canvas with notes and connections', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue({
        id: VALID_UUID,
        userId: USER_ID,
        name: 'Test Canvas',
        folderId: null,
        viewportX: 100,
        viewportY: 200,
        zoom: 1.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        folder: { id: 'folder-1', name: 'Test Folder' },
        notes: [
          {
            id: 'note-1',
            title: 'Note 1',
            content: 'Content 1',
            positionX: 0,
            positionY: 0,
            width: 300,
            height: 200,
            fontFamily: 'Inter',
            fontSize: 14,
            images: [
              {
                storagePath: 'images/test.png',
                fileName: 'test.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
              },
            ],
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
          {
            id: 'note-2',
            title: 'Note 2',
            content: 'Content 2',
            positionX: 100,
            positionY: 100,
            width: 300,
            height: 200,
            fontFamily: 'Inter',
            fontSize: 14,
            images: [],
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        ],
        connections: [
          { id: 'conn-1', sourceNoteId: 'note-1', targetNoteId: 'note-2' },
        ],
      })

      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Content-Disposition')).toContain('Test_Canvas_export.json')

      const data = JSON.parse(await response.text())
      expect(data.version).toBe('1.0')
      expect(data.canvas).toBeDefined()
      expect(data.canvas.name).toBe('Test Canvas')
      expect(data.canvas.viewportX).toBe(100)
      expect(data.canvas.viewportY).toBe(200)
      expect(data.canvas.zoom).toBe(1.5)
      expect(data.canvas.notes).toHaveLength(2)
      expect(data.canvas.notes[0].images).toHaveLength(1)
      expect(data.canvas.connections).toHaveLength(1)
    })

    it('should return empty notes and connections arrays when none exist', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue({
        id: VALID_UUID,
        userId: USER_ID,
        name: 'Empty Canvas',
        folderId: null,
        viewportX: 0,
        viewportY: 0,
        zoom: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        folder: null,
        notes: [],
        connections: [],
      })

      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })

      expect(response.status).toBe(200)

      const data = JSON.parse(await response.text())
      expect(data.canvas.notes).toEqual([])
      expect(data.canvas.connections).toEqual([])
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.findFirst.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../canvases/[id]/export/route')
      const request = createExportRequest(VALID_UUID)
      const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to export canvas')
    })
  })
})
