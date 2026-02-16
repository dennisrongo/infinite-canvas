/**
 * API Route Tests: /api/folders/[id]
 *
 * Tests folder CRUD operations for single folder including:
 * - PUT: Update folder
 * - DELETE: Delete folder
 * - Authorization checks
 * - Input validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Generate valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock folder data
const mockFolder = {
  id: VALID_UUID,
  userId: 'user-123',
  name: 'Work Folder',
  order: 0,
  collapsed: false,
  isEncrypted: false,
  encryptionVersion: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  canvases: [
    {
      id: 'canvas-1',
      name: 'Project A',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isEncrypted: false,
    },
  ],
}

// Mock prisma
const mockPrisma = {
  folder: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  canvas: {
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
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
    // Simple validation that accepts UUIDs with our test format
    return id.includes('-') && id.length === 36;
  }),
}))

// Mock DEK functions
vi.mock('@/lib/dek', () => ({
  getOrRestoreDEK: vi.fn(async () => null),
}))

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn(() => ({ encrypted: true })),
}))

// Helper to create mock request with params
function createFolderIdRequest(
  method: string = 'GET',
  body?: Record<string, unknown>,
  folderId: string = VALID_UUID
): { request: NextRequest; params: Promise<{ id: string }> } {
  const url = `http://localhost:3000/api/folders/${folderId}`
  return {
    request: {
      method,
      url,
      headers: {
        get: vi.fn(() => null),
      },
      json: async () => body ?? {},
    } as unknown as NextRequest,
    params: Promise.resolve({ id: folderId }),
  }
}

describe('PUT /api/folders/[id]', () => {
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

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when name is missing', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder)

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', {})
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name is required')
    })

    it('should return 400 when name is empty string', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder)

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: '   ' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name cannot be empty')
    })

    it('should return 400 when name is too long', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder)

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'a'.repeat(256) })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('too long')
    })

    it('should return 400 for invalid UUID format', async () => {
      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'Test' }, 'invalid-uuid')
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder ID format')
    })
  })

  describe('Folder update', () => {
    it('should update folder name', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder)
      mockPrisma.folder.update.mockResolvedValue({
        ...mockFolder,
        name: 'Updated Name',
      })

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folder).toBeDefined()
      expect(data.folder.name).toBe('Updated Name')
    })

    it('should return 404 for non-existent folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null)

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })

    it('should return 403 when folder belongs to different user', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        userId: 'different-user',
      })

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder)
      mockPrisma.folder.update.mockRejectedValue(new Error('Database error'))

      const { PUT } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('PUT', { name: 'Updated Name' })
      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update folder')
    })
  })
})

describe('DELETE /api/folders/[id]', () => {
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

      const { DELETE } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('DELETE')
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { DELETE } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('DELETE', {}, 'invalid-uuid')
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder ID format')
    })
  })

  describe('Folder deletion', () => {
    it('should delete folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        canvases: [],
      })
      mockPrisma.folder.delete.mockResolvedValue(mockFolder)

      const { DELETE } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('DELETE')
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 for non-existent folder', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(null)

      const { DELETE } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('DELETE')
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Folder not found')
    })

    it('should return 403 when folder belongs to different user', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        userId: 'different-user',
      })

      const { DELETE } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('DELETE')
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should move canvases to root when moveCanvasesToRoot is true', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue(mockFolder)
      mockPrisma.canvas.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.folder.delete.mockResolvedValue(mockFolder)

      const { DELETE } = await import('../folders/[id]/route')
      const request = {
        method: 'DELETE',
        url: `http://localhost:3000/api/folders/${VALID_UUID}?moveCanvasesToRoot=true`,
        headers: {
          get: () => null,
        },
      } as unknown as NextRequest
      const response = await DELETE(request, { params: Promise.resolve({ id: VALID_UUID }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('moved to root')
      expect(mockPrisma.canvas.updateMany).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        ...mockFolder,
        canvases: [],
      })
      mockPrisma.folder.delete.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('../folders/[id]/route')
      const { request, params } = createFolderIdRequest('DELETE')
      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete folder')
    })
  })
})
