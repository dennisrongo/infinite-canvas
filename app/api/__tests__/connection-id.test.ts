/**
 * API Route Tests: DELETE /api/connections/[id]
 *
 * Tests connection deletion functionality including:
 * - Authentication validation
 * - UUID format validation
 * - Connection existence verification
 * - Connection ownership verification
 * - Connection deletion
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const INVALID_UUID = 'invalid-uuid'
const USER_ID = 'user-123'
const OTHER_USER_ID = 'user-456'

// Mock session
const mockSession = {
  userId: USER_ID,
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock prisma
const mockPrisma = {
  noteConnection: {
    findFirst: vi.fn(),
    delete: vi.fn(),
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

// Helper to create mock DELETE request
function createDeleteRequest(connectionId: string): NextRequest {
  return {
    method: 'DELETE',
    headers: {
      get: vi.fn(() => null),
    },
    url: `http://localhost:3000/api/connections/${connectionId}`,
  } as unknown as NextRequest
}

describe('DELETE /api/connections/[id]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.noteConnection.findFirst.mockResolvedValue({
      id: VALID_UUID,
      canvasId: 'canvas-1',
      sourceNoteId: 'note-1',
      targetNoteId: 'note-2',
      createdAt: new Date(),
      canvas: {
        id: 'canvas-1',
        userId: USER_ID,
      },
    })
    mockPrisma.noteConnection.delete.mockResolvedValue({
      id: VALID_UUID,
      canvasId: 'canvas-1',
      sourceNoteId: 'note-1',
      targetNoteId: 'note-2',
      createdAt: new Date(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(VALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('UUID validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(INVALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: INVALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid connection ID format')
    })
  })

  describe('Connection existence', () => {
    it('should return 404 for non-existent connection', async () => {
      mockPrisma.noteConnection.findFirst.mockResolvedValue(null)

      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(VALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Connection not found')
    })
  })

  describe('Connection ownership', () => {
    it('should return 403 for connections owned by other users', async () => {
      mockPrisma.noteConnection.findFirst.mockResolvedValue({
        id: VALID_UUID,
        canvasId: 'canvas-1',
        sourceNoteId: 'note-1',
        targetNoteId: 'note-2',
        createdAt: new Date(),
        canvas: {
          id: 'canvas-1',
          userId: OTHER_USER_ID, // Different user
        },
      })

      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(VALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('Connection deletion', () => {
    it('should delete connection successfully', async () => {
      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(VALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.noteConnection.delete).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
      })
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.noteConnection.findFirst.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(VALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connection')
    })

    it('should return 500 on delete error', async () => {
      mockPrisma.noteConnection.delete.mockRejectedValue(new Error('Delete error'))

      const { DELETE } = await import('../connections/[id]/route')
      const request = createDeleteRequest(VALID_UUID)
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connection')
    })
  })
})
