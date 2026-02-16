/**
 * API Route Tests: POST /api/folders/reorder
 *
 * Tests folder reordering including:
 * - Authorization checks
 * - Input validation
 * - Successful reordering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Generate valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-9012-cdef-345678901234'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock prisma
const mockPrisma = {
  folder: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((promises) => Promise.all(promises)),
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
    // Simple validation that accepts UUIDs with our test format
    return id.includes('-') && id.length === 36;
  }),
}))

// Helper to create mock request
function createReorderRequest(
  body: Record<string, unknown>
): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') return 'application/json'
        return null
      },
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/folders/reorder', () => {
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

      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: 0 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when updates array is missing', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Updates array is required')
    })

    it('should return 400 when updates array is empty', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({ updates: [] }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Updates array is required')
    })

    it('should return 400 when updates is not an array', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({ updates: 'not-an-array' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Updates array is required')
    })

    it('should return 400 for invalid folder ID in updates', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: 'not-a-valid-uuid', order: 0 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder ID in updates')
    })

    it('should return 400 for negative order value', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: -1 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid order value in updates')
    })

    it('should return 400 when folderId is missing in update', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { order: 0 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder ID in updates')
    })

    it('should return 400 when order is missing in update', async () => {
      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid order value in updates')
    })
  })

  describe('Folder ownership verification', () => {
    it('should return 404 when one or more folders not found or not owned by user', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([
        { id: VALID_UUID },
        // Missing second folder
      ])

      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: 0 },
          { folderId: VALID_UUID_2, order: 1 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('One or more folders not found or not owned by user')
    })
  })

  describe('Successful reordering', () => {
    it('should reorder folders for authenticated user', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([
        { id: VALID_UUID },
        { id: VALID_UUID_2 },
        { id: VALID_UUID_3 },
      ])
      mockPrisma.folder.update.mockResolvedValue({})

      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: 2 },
          { folderId: VALID_UUID_2, order: 0 },
          { folderId: VALID_UUID_3, order: 1 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Folders reordered successfully')
      expect(data.count).toBe(3)
    })

    it('should call update for each folder in transaction', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([
        { id: VALID_UUID },
        { id: VALID_UUID_2 },
      ])

      const { POST } = await import('../folders/reorder/route')
      await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: 0 },
          { folderId: VALID_UUID_2, order: 1 },
        ],
      }))

      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should handle single folder reorder', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([
        { id: VALID_UUID },
      ])
      mockPrisma.folder.update.mockResolvedValue({})

      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: 5 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(1)
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.folder.findMany.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../folders/reorder/route')
      const response = await POST(createReorderRequest({
        updates: [
          { folderId: VALID_UUID, order: 0 },
        ],
      }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reorder folders')
    })
  })
})
