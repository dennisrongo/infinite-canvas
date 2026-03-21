/**
 * API Route Tests: GET /api/health
 *
 * Tests health check endpoint including:
 * - Healthy status when database is accessible
 * - Unhealthy status when database is unavailable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock prisma
const mockPrisma = {
  $queryRaw: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Database accessible', () => {
    it('should return 200 OK with healthy status when database is accessible', async () => {
      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValueOnce([])

      const { GET } = await import('../health/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.database).toBe('connected')
      expect(data.timestamp).toBeDefined()
    })

    it('should call database to check connection', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([])

      const { GET } = await import('../health/route')
      await GET()

      expect(mockPrisma.$queryRaw).toHaveBeenCalled()
    })
  })

  describe('Database unavailable', () => {
    it('should return 503 when database is unavailable', async () => {
      // Mock database error
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database connection failed'))

      const { GET } = await import('../health/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.database).toBe('disconnected')
    })

    it('should return error message when database fails', async () => {
      const errorMessage = 'Database connection failed'
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error(errorMessage))

      const { GET } = await import('../health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.error).toBe(errorMessage)
    })

    it('should include timestamp in unhealthy response', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Database error'))

      const { GET } = await import('../health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
    })
  })
})
