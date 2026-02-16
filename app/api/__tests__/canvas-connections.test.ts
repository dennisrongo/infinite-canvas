/**
 * API Route Tests: GET /api/canvases/[id]/connections
 *
 * Tests canvas connections retrieval including:
 * - Authentication validation
 * - UUID format validation
 * - Canvas ownership verification
 * - Connections retrieval
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUID for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock canvas data
const mockCanvas = {
  id: VALID_UUID,
  userId: 'user-123',
  name: 'Test Canvas',
}

// Mock connections data
const mockConnections = [
  {
    id: 'connection-1',
    canvasId: VALID_UUID,
    sourceNoteId: 'note-1',
    targetNoteId: 'note-2',
    createdAt: new Date(),
  },
  {
    id: 'connection-2',
    canvasId: VALID_UUID,
    sourceNoteId: 'note-2',
    targetNoteId: 'note-3',
    createdAt: new Date(),
  },
]

// Mock prisma
const mockPrisma = {
  canvas: {
    findFirst: vi.fn(),
  },
  noteConnection: {
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

// Mock validation
vi.mock('@/lib/validation', () => ({
  isValidUUID: vi.fn((id: string) => {
    return id.includes('-') && id.length === 36
  }),
}))

// Helper to create mock request with params
function createConnectionsRequest(
  canvasId: string = VALID_UUID
): { request: NextRequest; params: Promise<{ id: string }> } {
  const url = `http://localhost:3000/api/canvases/${canvasId}/connections`
  return {
    request: {
      method: 'GET',
      url,
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as NextRequest,
    params: Promise.resolve({ id: canvasId }),
  }
}

describe('GET /api/canvases/[id]/connections', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
    mockPrisma.noteConnection.findMany.mockResolvedValue(mockConnections)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest('invalid-uuid')
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID format')
    })
  })

  describe('Canvas retrieval', () => {
    it('should return 404 for non-existent canvas', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Canvas not found')
    })

    it('should return 404 for canvases owned by other users', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(null)

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      // The route returns 404 for both non-existent and unauthorized access
      expect(response.status).toBe(404)
    })
  })

  describe('Connections retrieval', () => {
    it('should return connections for authenticated user', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
      mockPrisma.noteConnection.findMany.mockResolvedValue(mockConnections)

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toBeDefined()
      expect(data.connections).toHaveLength(2)
      expect(data.connections[0].id).toBe('connection-1')
    })

    it('should return empty array when no connections exist', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
      mockPrisma.noteConnection.findMany.mockResolvedValue([])

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toBeDefined()
      expect(data.connections).toHaveLength(0)
    })

    it('should return connections ordered by createdAt ascending', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
      
      const orderedConnections = [...mockConnections].reverse()
      mockPrisma.noteConnection.findMany.mockResolvedValue(orderedConnections)

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })

      expect(mockPrisma.noteConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error during canvas lookup', async () => {
      mockPrisma.canvas.findFirst.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })

    it('should return 500 on database error during connections retrieval', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue(mockCanvas)
      mockPrisma.noteConnection.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../canvases/[id]/connections/route')
      const { request, params } = createConnectionsRequest()
      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })
  })
})
