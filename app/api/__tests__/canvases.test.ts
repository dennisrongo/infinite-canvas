/**
 * API Route Tests: /api/canvases
 *
 * Tests canvas CRUD operations including:
 * - GET: List canvases
 * - POST: Create canvas
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

const mockCanvases = [
  {
    id: VALID_UUID,
    userId: 'user-123',
    name: 'My Canvas',
    folderId: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    folder: null,
    _count: { notes: 5 },
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    userId: 'user-123',
    name: 'Another Canvas',
    folderId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    folder: { id: 'c3d4e5f6-a7b8-9012-cdef-345678901234', name: 'Work' },
    _count: { notes: 3 },
  },
]

const mockPrisma = {
  canvas: {
    findMany: vi.fn(),
    create: vi.fn(),
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

// Mock CSRF - return true by default for canvas tests
vi.mock('@/lib/csrf', () => ({
  validateCSRFToken: vi.fn(async () => true),
}))

// Mock rate limiting
const mockRateLimitResult = {
  success: true,
  limit: 10,
  remaining: 9,
  resetTime: Date.now() + 60000,
  blocked: false,
}

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => mockRateLimitResult),
  getIdentifier: vi.fn(() => 'test-ip'),
  rateLimitConfigs: {
    canvasCreation: { limit: 10, windowMs: 60000, blockDurationMs: 300000 },
  },
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === 'auth_token') return { value: 'valid-token' }
      if (name === 'csrf_token') return { value: 'csrf-token' }
      return undefined
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}))

// Helper to create mock request with CSRF token
function createCanvasRequest(
  method: string = 'GET',
  body?: Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  const defaultHeaders = {
    'x-csrf-token': 'valid-csrf-token',
    ...headers,
  }
  return {
    method,
    headers: {
      get: (name: string) => defaultHeaders[name.toLowerCase()] ?? null,
    },
    json: async () => body ?? {},
  } as unknown as NextRequest
}

describe('GET /api/canvases', () => {
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

      const { GET } = await import('../canvases/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return canvases for authenticated user', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue(mockCanvases)

      const { GET } = await import('../canvases/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvases).toHaveLength(2)
    })
  })

  describe('Data retrieval', () => {
    it('should only return canvases belonging to the user', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue(mockCanvases)

      const { GET } = await import('../canvases/route')
      await GET()

      expect(mockPrisma.canvas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      )
    })

    it('should include folder information', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue(mockCanvases)

      const { GET } = await import('../canvases/route')
      await GET()

      expect(mockPrisma.canvas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            folder: expect.any(Object),
          }),
        })
      )
    })

    it('should include note count', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue(mockCanvases)

      const { GET } = await import('../canvases/route')
      await GET()

      expect(mockPrisma.canvas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: expect.any(Object),
          }),
        })
      )
    })

    it('should order canvases by order field', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue(mockCanvases)

      const { GET } = await import('../canvases/route')
      await GET()

      expect(mockPrisma.canvas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { order: 'asc' },
        })
      )
    })

    it('should return empty array when user has no canvases', async () => {
      mockPrisma.canvas.findMany.mockResolvedValue([])

      const { GET } = await import('../canvases/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canvases).toHaveLength(0)
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../canvases/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch canvases')
    })
  })
})

describe('POST /api/canvases', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    mockRateLimitResult.success = true
    // Reset CSRF mock to return true
    vi.doMock('@/lib/csrf', () => ({
      validateCSRFToken: vi.fn(async () => true),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', { name: 'New Canvas' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should return 400 when name is missing', async () => {
      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Canvas name is required')
    })

    it('should return 400 when name is empty string', async () => {
      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', { name: '   ' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Canvas name cannot be empty')
    })

    it('should return 400 when name is too long', async () => {
      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {
        name: 'a'.repeat(256),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('too long')
    })

    it('should trim whitespace from name', async () => {
      mockPrisma.canvas.create.mockResolvedValue({
        id: VALID_UUID,
        userId: 'user-123',
        name: 'Trimmed Name',
        folderId: null,
        folder: null,
      })

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {
        name: '  Trimmed Name  ',
      })
      await POST(request)

      expect(mockPrisma.canvas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Trimmed Name',
          }),
        })
      )
    })

    it('should return 400 for invalid folder ID', async () => {
      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {
        name: 'New Canvas',
        folderId: 'not-a-uuid',
      })

      // Folder validation happens when folder is not found
      mockPrisma.folder.findFirst.mockResolvedValue(null)

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Successful creation', () => {
    it('should create canvas with valid data', async () => {
      const newCanvas = {
        id: VALID_UUID,
        userId: 'user-123',
        name: 'New Canvas',
        folderId: null,
        folder: null,
      }
      mockPrisma.canvas.create.mockResolvedValue(newCanvas)

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {
        name: 'New Canvas',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.canvas).toBeDefined()
      expect(data.canvas.name).toBe('New Canvas')
    })

    it('should create canvas in specified folder', async () => {
      const folderId = 'd4e5f6a7-b8c9-0123-def0-456789012345'
      mockPrisma.folder.findFirst.mockResolvedValue({
        id: folderId,
        userId: 'user-123',
        name: 'Work',
      })
      mockPrisma.canvas.create.mockResolvedValue({
        id: VALID_UUID,
        userId: 'user-123',
        name: 'New Canvas',
        folderId: folderId,
        folder: { id: folderId, name: 'Work' },
      })

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {
        name: 'New Canvas',
        folderId: folderId,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.canvas.folderId).toBe(folderId)
    })

    it('should verify folder belongs to user', async () => {
      mockPrisma.folder.findFirst.mockResolvedValue(null)

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', {
        name: 'New Canvas',
        folderId: VALID_UUID,
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid folder')
    })
  })

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockRateLimitResult.success = false
      mockRateLimitResult.blocked = false

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', { name: 'New Canvas' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many canvas creation attempts')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.canvas.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('../canvases/route')
      const request = createCanvasRequest('POST', { name: 'New Canvas' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create canvas')
    })
  })
})
