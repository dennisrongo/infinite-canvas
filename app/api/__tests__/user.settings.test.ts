/**
 * API Route Tests: GET /api/user/settings
 *
 * Tests user settings retrieval including:
 * - Authorization checks
 * - Settings retrieval
 * - Default settings creation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock user settings
const mockSettings = {
  id: 'settings-1',
  userId: 'user-123',
  theme: 'light',
  canvasSortOrder: 'updated',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock prisma
const mockPrisma = {
  userSettings: {
    findUnique: vi.fn(),
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

// Helper to create mock request
function createSettingsRequest(): Request {
  return {
    method: 'GET',
    headers: {
      get: () => null,
    },
  } as unknown as Request
}

describe('GET /api/user/settings', () => {
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

      const { GET } = await import('../user/settings/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Settings retrieval', () => {
    it('should return user settings for authenticated user', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings)

      const { GET } = await import('../user/settings/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings).toBeDefined()
      expect(data.settings.theme).toBe('light')
      expect(data.settings.canvasSortOrder).toBe('updated')
    })

    it('should create default settings when none exist', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null)
      mockPrisma.userSettings.create.mockResolvedValue({
        ...mockSettings,
        theme: 'light',
        canvasSortOrder: 'updated',
      })

      const { GET } = await import('../user/settings/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockPrisma.userSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          theme: 'light',
          canvasSortOrder: 'updated',
        },
      })
    })

    it('should include all required settings fields', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings)

      const { GET } = await import('../user/settings/route')
      const response = await GET()
      const data = await response.json()

      expect(data.settings).toHaveProperty('id')
      expect(data.settings).toHaveProperty('userId')
      expect(data.settings).toHaveProperty('theme')
      expect(data.settings).toHaveProperty('canvasSortOrder')
      expect(data.settings).toHaveProperty('createdAt')
      expect(data.settings).toHaveProperty('updatedAt')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.userSettings.findUnique.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('../user/settings/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch settings')
    })
  })
})
