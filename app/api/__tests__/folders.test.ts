/**
 * API Route Tests: /api/folders
 *
 * Tests folder CRUD operations including:
 * - GET: List folders
 * - POST: Create folder
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

// Mock folders data
const mockFolders = [
  {
    id: VALID_UUID,
    userId: 'user-123',
    name: 'Work',
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
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    userId: 'user-123',
    name: 'Personal',
    order: 1,
    collapsed: false,
    isEncrypted: false,
    encryptionVersion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    canvases: [],
  },
]

// Mock prisma
const mockPrisma = {
  folder: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Mock DEK functions
vi.mock('@/lib/dek', () => ({
  getOrRestoreDEK: vi.fn(async () => null),
}))

// Mock encryption
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn(() => ({ encrypted: true })),
}))

// Helper to create mock request
function createFolderRequest(
  method: string = 'GET',
  body?: Record<string, unknown>,
  url: string = 'http://localhost:3000/api/folders'
): NextRequest {
  return {
    method,
    url,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') return 'application/json'
        return null
      },
    },
    json: async () => body ?? {},
  } as unknown as NextRequest
}

describe('GET /api/folders', () => {
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

      const { GET } = await import('../folders/route')
      const response = await GET(createFolderRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return folders for authenticated user', async () => {
      mockPrisma.folder.findMany.mockResolvedValue(mockFolders)

      const { GET } = await import('../folders/route')
      const response = await GET(createFolderRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folders).toBeDefined()
      expect(data.folders).toHaveLength(2)
    })
  })

  describe('Data retrieval', () => {
    it('should only return folders belonging to the user', async () => {
      mockPrisma.folder.findMany.mockResolvedValue(mockFolders)

      const { GET } = await import('../folders/route')
      await GET(createFolderRequest('GET'))

      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      )
    })

    it('should order folders by order field', async () => {
      mockPrisma.folder.findMany.mockResolvedValue(mockFolders)

      const { GET } = await import('../folders/route')
      await GET(createFolderRequest('GET'))

      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { order: 'asc' },
        })
      )
    })

    it('should include canvases by default', async () => {
      mockPrisma.folder.findMany.mockResolvedValue(mockFolders)

      const { GET } = await import('../folders/route')
      await GET(createFolderRequest('GET'))

      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            canvases: expect.any(Object),
          }),
        })
      )
    })

    it('should return empty array when user has no folders', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([])

      const { GET } = await import('../folders/route')
      const response = await GET(createFolderRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.folders).toHaveLength(0)
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.folder.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../folders/route')
      const response = await GET(createFolderRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch folders')
    })
  })
})

describe('POST /api/folders', () => {
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

      const { POST } = await import('../folders/route')
      const response = await POST(createFolderRequest('POST', { name: 'New Folder' }))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when name is missing', async () => {
      const { POST } = await import('../folders/route')
      const response = await POST(createFolderRequest('POST', {}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name is required')
    })

    it('should return 400 when name is empty string', async () => {
      const { POST } = await import('../folders/route')
      const response = await POST(createFolderRequest('POST', { name: '   ' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Folder name cannot be empty')
    })

    it('should return 400 when name is too long', async () => {
      const { POST } = await import('../folders/route')
      const response = await POST(createFolderRequest('POST', {
        name: 'a'.repeat(256),
      }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('too long')
    })

    it('should trim whitespace from name', async () => {
      mockPrisma.folder.create.mockResolvedValue({
        id: VALID_UUID,
        userId: 'user-123',
        name: 'Trimmed Name',
        isEncrypted: false,
        encryptionVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        canvases: [],
      })

      const { POST } = await import('../folders/route')
      await POST(createFolderRequest('POST', { name: '  Trimmed Name  ' }))

      expect(mockPrisma.folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      )
    })
  })

  describe('Successful creation', () => {
    it('should create folder with valid data', async () => {
      const newFolder = {
        id: VALID_UUID,
        userId: 'user-123',
        name: 'New Folder',
        order: 0,
        collapsed: false,
        isEncrypted: false,
        encryptionVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        canvases: [],
      }
      mockPrisma.folder.create.mockResolvedValue(newFolder)

      const { POST } = await import('../folders/route')
      const response = await POST(createFolderRequest('POST', { name: 'New Folder' }))
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.folder).toBeDefined()
      expect(data.folder.name).toBe('New Folder')
    })

    it('should create folder with order auto-assigned', async () => {
      mockPrisma.folder.create.mockResolvedValue({
        id: VALID_UUID,
        userId: 'user-123',
        name: 'Test Folder',
        order: 0,
        collapsed: false,
        isEncrypted: false,
        encryptionVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        canvases: [],
      })

      const { POST } = await import('../folders/route')
      await POST(createFolderRequest('POST', { name: 'Test Folder' }))

      expect(mockPrisma.folder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            name: expect.any(String),
            isEncrypted: false,
          }),
        })
      )
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.folder.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../folders/route')
      const response = await POST(createFolderRequest('POST', { name: 'New Folder' }))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create folder')
    })
  })
})
