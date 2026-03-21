/**
 * API Route Tests: POST /api/canvases/reorder
 *
 * Tests canvas reorder functionality including:
 * - Authentication validation
 * - Input validation (updates array, canvasId, folderId, order)
 * - Canvas ownership verification
 * - Folder ownership verification
 * - Transactional batch updates
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-9012-cdef-123456789012'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock prisma
const mockPrisma = {
  canvas: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  folder: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(async (promises: unknown) => {
    return Promise.all(promises as Promise<unknown>[])
  }),
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

// Helper to create mock request
function createReorderRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => null),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/canvases/reorder', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.canvas.findMany.mockResolvedValue([
      { id: VALID_UUID },
      { id: VALID_UUID_2 },
    ])
    mockPrisma.folder.findMany.mockResolvedValue([
      { id: VALID_UUID_3 },
    ])
    mockPrisma.canvas.update.mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when updates array is missing', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Updates array is required')
    })

    it('should return 400 when updates array is empty', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Updates array is required')
    })

    it('should return 400 when canvasId is invalid', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: 'invalid-uuid', folderId: null, order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid canvas ID in updates')
    })

    it('should return 400 when folderId is invalid', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: 'invalid-folder-id', order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder ID in updates')
    })

    it('should return 400 when order is negative', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: -1 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid order value in updates')
    })

    it('should return 400 when order is not a number', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 'not-a-number' },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid order value in updates')
    })
  })

  describe('Ownership verification', () => {
    it('should return 404 when canvas not found or not owned by user', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue([])

      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('One or more canvases not found or not owned by user')
    })

    it('should return 404 when folder not found or not owned by user', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue([
        { id: VALID_UUID },
      ])
      mockPrisma.folder.findMany.mockResolvedValue([])

      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: VALID_UUID_3, order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('One or more folders not found or not owned by user')
    })
  })

  describe('Canvas reordering', () => {
    it('should reorder canvases successfully', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
          { canvasId: VALID_UUID_2, folderId: null, order: 1 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Canvases reordered successfully')
      expect(data.count).toBe(2)
    })

    it('should use transaction for batch updates', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
          { canvasId: VALID_UUID_2, folderId: null, order: 1 },
        ],
      })
      const response = await POST(request)

      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should update canvas with folderId and order', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: VALID_UUID_3, order: 5 },
        ],
      })
      const response = await POST(request)

      expect(mockPrisma.canvas.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: {
          folderId: VALID_UUID_3,
          order: 5,
        },
      })
    })

    it('should allow null folderId to move canvas to root', async () => {
      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
        ],
      })
      const response = await POST(request)

      expect(mockPrisma.canvas.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: {
          folderId: null,
          order: 0,
        },
      })
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error during canvas lookup', async () => {
      mockPrisma.canvas.findMany.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reorder canvases')
    })

    it('should return 500 on database error during transaction', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction error'))

      const { POST } = await import('../canvases/reorder/route')
      const request = createReorderRequest({
        updates: [
          { canvasId: VALID_UUID, folderId: null, order: 0 },
        ],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reorder canvases')
    })
  })
})
