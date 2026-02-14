/**
 * API Route Tests: /api/canvases/[id]
 *
 * Tests individual canvas operations including:
 * - GET: Retrieve single canvas
 * - PUT: Update canvas
 * - DELETE: Delete canvas
 * - Authorization checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Generate valid UUIDs for testing
const CANVAS_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const FOLDER_UUID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
const OTHER_UUID = 'c3d4e5f6-a7b8-9012-cdef-345678901234'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

const mockCanvas = {
  id: CANVAS_UUID,
  userId: 'user-123',
  name: 'My Canvas',
  folderId: null,
  viewportX: 0,
  viewportY: 0,
  zoom: 1,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  folder: null,
  notes: [],
  connections: [],
}

const mockPrisma = {
  canvas: {
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  folder: {
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }),
  sanitizeUrlParam: vi.fn((param: string) => param),
}))

// Helper to create mock request
function createCanvasIdRequest(
  method: string = 'GET',
  body?: Record<string, unknown>
): NextRequest {
  return {
    method,
    headers: {
      get: vi.fn(() => null),
    },
    json: async () => body ?? {},
  } as unknown as NextRequest
}

// Helper to create params
function createParams(id: string) {
  return Promise.resolve({ id })
}

describe('GET /api/canvases/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should only return canvas belonging to authenticated user', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      // Should not find canvas from other user
      expect(mockPrisma.canvas.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      )
      expect(response.status).toBe(404)
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams('not-a-uuid') })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID format')
    })

    it('should return 404 for non-existent canvas', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })
  })

  describe('Data retrieval', () => {
    it('should return canvas with notes and connections', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue({
        ...mockCanvas,
        notes: [{ id: 'note-1', title: 'Note 1' }],
        connections: [{ id: 'conn-1' }],
      })

      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvas).toBeDefined()
      expect(data.canvas.notes).toBeDefined()
      expect(data.canvas.connections).toBeDefined()
    })

    it('should include folder information', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue({
        ...mockCanvas,
        folder: { id: FOLDER_UUID, name: 'Work' },
      })

      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvas.folder).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.findFirst.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('GET')
      const response = await GET(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch canvas')
    })
  })
})

describe('PUT /api/canvases/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
    mockPrisma.canvas.update.mockResolvedValue(mockCanvas)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when canvas does not belong to user', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: 'Updated' })
      const response = await PUT(request, { params: createParams('invalid') })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID format')
    })

    it('should return 400 for empty name', async () => {
      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: '   ' })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Canvas name cannot be empty')
    })

    it('should return 400 for name too long', async () => {
      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: 'a'.repeat(256) })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('too long')
    })

    it('should return 400 for invalid folder ID format', async () => {
      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { folderId: 'invalid' })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder ID format')
    })
  })

  describe('Successful updates', () => {
    it('should update canvas name', async () => {
      mockPrisma.canvas.update.mockResolvedValue({
        ...mockCanvas,
        name: 'Updated Name',
      })

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvas.name).toBe('Updated Name')
    })

    it('should update viewport position', async () => {
      mockPrisma.canvas.update.mockResolvedValue({
        ...mockCanvas,
        viewportX: 100,
        viewportY: 200,
      })

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { viewportX: 100, viewportY: 200 })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvas.viewportX).toBe(100)
      expect(data.canvas.viewportY).toBe(200)
    })

    it('should update zoom level', async () => {
      mockPrisma.canvas.update.mockResolvedValue({
        ...mockCanvas,
        zoom: 1.5,
      })

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { zoom: 1.5 })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvas.zoom).toBe(1.5)
    })

    it('should move canvas to folder', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue({
        id: FOLDER_UUID,
        userId: 'user-123',
      })
      mockPrisma.canvas.update.mockResolvedValue({
        ...mockCanvas,
        folderId: FOLDER_UUID,
      })

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { folderId: FOLDER_UUID })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvas.folderId).toBe(FOLDER_UUID)
    })

    it('should verify folder belongs to user', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue(null)

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { folderId: OTHER_UUID })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.update.mockRejectedValue(new Error('Database error'))

      const { PUT } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('PUT', { name: 'Updated' })
      const response = await PUT(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update canvas')
    })
  })
})

describe('DELETE /api/canvases/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
    mockPrisma.canvas.delete.mockResolvedValue(mockCanvas)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { DELETE } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('DELETE')
      const response = await DELETE(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when canvas does not belong to user', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { DELETE } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('DELETE')
      const response = await DELETE(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { DELETE } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('DELETE')
      const response = await DELETE(request, { params: createParams('invalid') })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID format')
    })
  })

  describe('Successful deletion', () => {
    it('should delete canvas successfully', async () => {
      const { DELETE } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('DELETE')
      const response = await DELETE(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Canvas deleted successfully')
      expect(data.canvasId).toBe(CANVAS_UUID)
    })

    it('should call delete with correct ID', async () => {
      const { DELETE } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('DELETE')
      await DELETE(request, { params: createParams(CANVAS_UUID) })

      expect(mockPrisma.canvas.delete).toHaveBeenCalledWith({
        where: { id: CANVAS_UUID },
      })
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.delete.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('../canvases/[id]/route')
      const request = createCanvasIdRequest('DELETE')
      const response = await DELETE(request, { params: createParams(CANVAS_UUID) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete canvas')
    })
  })
})
