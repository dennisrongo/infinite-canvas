/**
 * API Route Tests: POST /api/canvases/import
 *
 * Tests canvas import functionality including:
 * - Authentication validation
 * - Input validation (importData, canvas fields, notes)
 * - Canvas and folder ownership verification
 * - Import with connections
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Valid UUIDs for testing
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
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
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  note: {
    create: vi.fn(),
  },
  folder: {
    findFirst: vi.fn(),
  },
  image: {
    create: vi.fn(),
  },
  noteConnection: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (callback) => {
    return callback(mockPrisma)
  }),
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Mock search index
vi.mock('@/lib/search-index', () => ({
  indexNote: vi.fn().mockResolvedValue(undefined),
}))

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  isEncryptedData: vi.fn(() => false),
  encryptNote: vi.fn(() => ({
    encryptedTitle: 'encrypted-title',
    encryptedContent: 'encrypted-content',
  })),
  decryptNote: vi.fn(() => ({
    title: 'decrypted-title',
    content: 'decrypted-content',
  })),
}))

// Mock DEK functions
vi.mock('@/lib/dek', () => ({
  getOrRestoreDEK: vi.fn().mockResolvedValue(null),
  decryptNameWithDEK: vi.fn(),
}))

// Helper to create mock POST request
function createImportRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => 'application/json'),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/canvases/import', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default mock behaviors
    mockPrisma.canvas.create.mockResolvedValue({
      id: VALID_UUID,
      userId: USER_ID,
      name: 'Imported Canvas',
      folderId: null,
      viewportX: 0,
      viewportY: 0,
      zoom: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockPrisma.note.create.mockResolvedValue({
      id: VALID_UUID_2,
      canvasId: VALID_UUID,
      title: 'Test Note',
      content: 'Test Content',
      positionX: 0,
      positionY: 0,
      width: 300,
      height: 200,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockPrisma.canvas.findFirst.mockResolvedValue({
      id: VALID_UUID,
      userId: USER_ID,
      name: 'Imported Canvas',
      folderId: null,
      viewportX: 0,
      viewportY: 0,
      zoom: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: [],
      connections: [],
      folder: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: { canvas: { name: 'Test' } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when canvasData is missing', async () => {
      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid import data format')
    })

    it('should return 400 when importData is not valid JSON', async () => {
      // The route expects JSON body, so this test is handled by Next.js automatically
      // We test the validation that happens after JSON parsing
      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: null,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid import data format')
    })

    it('should return 400 when canvas name is missing', async () => {
      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: { canvas: {} },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Canvas name is required')
    })

    it('should return 400 when canvas name is empty', async () => {
      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: { canvas: { name: '' } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      // Empty string triggers "required" check first before length check
      expect(data.error).toBe('Canvas name is required')
    })

    it('should validate notes array', async () => {
      // Notes are optional, so empty array should be fine
      mockPrisma.canvas.findFirst.mockResolvedValue({
        id: VALID_UUID,
        userId: USER_ID,
        name: 'Test Canvas',
        notes: [],
        connections: [],
        folder: null,
      })

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: { canvas: { name: 'Test Canvas', notes: [] } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
    })

    it('should skip invalid notes in the array', async () => {
      // The route skips notes without title
      mockPrisma.canvas.findFirst.mockResolvedValue({
        id: VALID_UUID,
        userId: USER_ID,
        name: 'Test Canvas',
        notes: [],
        connections: [],
        folder: null,
      })

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: {
          canvas: {
            name: 'Test Canvas',
            notes: [
              { title: 'Valid Note' },
              { content: 'No title' }, // This should be skipped
            ],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Only one note should be created (the valid one)
      expect(mockPrisma.note.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('Canvas creation', () => {
    it('should create canvas with notes successfully', async () => {
      mockPrisma.canvas.findFirst.mockResolvedValue({
        id: VALID_UUID,
        userId: USER_ID,
        name: 'Test Canvas',
        notes: [
          {
            id: VALID_UUID_2,
            title: 'Test Note',
            content: 'Test Content',
            positionX: 0,
            positionY: 0,
            width: 300,
            height: 200,
            createdAt: new Date(),
            updatedAt: new Date(),
            images: [],
          },
        ],
        connections: [],
        folder: null,
      })

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: {
          canvas: {
            name: 'Test Canvas',
            notes: [
              {
                title: 'Test Note',
                content: 'Test Content',
                positionX: 0,
                positionY: 0,
                width: 300,
                height: 200,
              },
            ],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Canvas imported successfully')
      expect(data.canvas).toBeDefined()
      expect(mockPrisma.canvas.create).toHaveBeenCalled()
    })

    it('should handle import with connections', async () => {
      // Mock notes to be created
      const noteId1 = 'note-1'
      const noteId2 = 'note-2'

      mockPrisma.note.create
        .mockResolvedValueOnce({
          id: noteId1,
          canvasId: VALID_UUID,
          title: 'Note 1',
          content: 'Content 1',
          positionX: 0,
          positionY: 0,
          width: 300,
          height: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: noteId2,
          canvasId: VALID_UUID,
          title: 'Note 2',
          content: 'Content 2',
          positionX: 100,
          positionY: 100,
          width: 300,
          height: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      mockPrisma.canvas.findFirst.mockResolvedValue({
        id: VALID_UUID,
        userId: USER_ID,
        name: 'Test Canvas',
        notes: [
          { id: noteId1, title: 'Note 1', content: 'Content 1', positionX: 0, positionY: 0, width: 300, height: 200, images: [], createdAt: new Date(), updatedAt: new Date() },
          { id: noteId2, title: 'Note 2', content: 'Content 2', positionX: 100, positionY: 100, width: 300, height: 200, images: [], createdAt: new Date(), updatedAt: new Date() },
        ],
        connections: [],
        folder: null,
      })

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: {
          canvas: {
            name: 'Test Canvas',
            notes: [
              { title: 'Note 1', content: 'Content 1', positionX: 0, positionY: 0, width: 300, height: 200 },
              { title: 'Note 2', content: 'Content 2', positionX: 100, positionY: 100, width: 300, height: 200 },
            ],
            connections: [
              { sourceIndex: 0, targetIndex: 1 },
            ],
          },
        },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.noteConnection.create).toHaveBeenCalledWith({
        data: {
          canvasId: VALID_UUID,
          sourceNoteId: noteId1,
          targetNoteId: noteId2,
        },
      })
    })

    it('should return 400 for invalid folder', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue(null)

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: { canvas: { name: 'Test Canvas' } },
        folderId: 'invalid-folder-id',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../canvases/import/route')
      const request = createImportRequest({
        importData: { canvas: { name: 'Test Canvas' } },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to import canvas')
    })
  })
})
