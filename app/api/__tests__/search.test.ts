/**
 * API Route Tests: POST /api/search
 *
 * Tests search functionality including:
 * - Search with valid query parameters
 * - Search with no results
 * - Search with unauthorized access (no session)
 * - Pagination parameters
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

// Mock search results
const mockSearchResults = [
  {
    id: 'note-1',
    canvasId: 'canvas-1',
    title: 'Test Note 1',
    content: 'Test content 1',
    canvasName: 'Test Canvas',
  },
  {
    id: 'note-2',
    canvasId: 'canvas-1',
    title: 'Test Note 2',
    content: 'Test content 2',
    canvasName: 'Test Canvas',
  },
]

// Mock search function
const mockSearch = vi.fn()
const mockRebuildIndex = vi.fn()
const mockGetCanvasNameForSearch = vi.fn()

vi.mock('@/lib/search-index', () => ({
  search: (...args: unknown[]) => mockSearch(...args),
  rebuildIndex: (...args: unknown[]) => mockRebuildIndex(...args),
  getCanvasNameForSearch: (...args: unknown[]) => mockGetCanvasNameForSearch(...args),
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Helper to create mock request
function createSearchRequest(body: Record<string, unknown>): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn((name: string) => null),
    },
    json: async () => body,
  } as unknown as NextRequest
}

describe('POST /api/search', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    
    // Default search mock
    mockSearch.mockResolvedValue({
      results: mockSearchResults,
      totalCount: 2,
      hasMore: false,
      searchTime: 10,
    })
    mockGetCanvasNameForSearch.mockResolvedValue('Test Canvas')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Valid query parameters', () => {
    it('should return search results with valid query', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toBeDefined()
      expect(data.results).toHaveLength(2)
      expect(data.totalCount).toBe(2)
    })

    it('should include hasMore in response', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.hasMore).toBeDefined()
      expect(typeof data.hasMore).toBe('boolean')
    })

    it('should include searchTime in response', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.searchTime).toBeDefined()
    })
  })

  describe('No results', () => {
    it('should return empty results when no matches found', async () => {
      mockSearch.mockResolvedValueOnce({
        results: [],
        totalCount: 0,
        hasMore: false,
        searchTime: 5,
      })

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'nonexistent' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toHaveLength(0)
      expect(data.totalCount).toBe(0)
    })

    it('should return empty results for empty query', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Query is required')
    })
  })

  describe('Pagination parameters', () => {
    it('should accept offset parameter', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', offset: 10 })
      await POST(request)

      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        'test',
        expect.objectContaining({ offset: 10 })
      )
    })

    it('should accept limit parameter', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', limit: 20 })
      await POST(request)

      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        'test',
        expect.objectContaining({ limit: 20 })
      )
    })

    it('should limit results to maximum', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', limit: 100 })
      await POST(request)

      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        'test',
        expect.objectContaining({ limit: 50 }) // MAX_RESULTS is 50
      )
    })
  })

  describe('Query validation', () => {
    it('should return 400 when query is missing', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Query is required')
    })

    it('should truncate very long queries', async () => {
      const longQuery = 'a'.repeat(2000)

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: longQuery })
      const response = await POST(request)
      const data = await response.json()

      // The query should be truncated to 1000 characters
      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
        expect.any(Object)
      )
      // Should include warning about truncation
      expect(data.warning).toContain('truncated')
    })
  })

  describe('Sort parameters', () => {
    it('should accept sortBy parameter', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', sortBy: 'title' })
      await POST(request)

      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        'test',
        expect.objectContaining({ sortBy: 'title' })
      )
    })

    it('should accept sortOrder parameter', async () => {
      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', sortOrder: 'asc' })
      await POST(request)

      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        'test',
        expect.objectContaining({ sortOrder: 'asc' })
      )
    })
  })

  describe('Canvas filtering', () => {
    it('should accept canvasId parameter', async () => {
      const canvasId = 'canvas-123'

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', canvasId })
      await POST(request)

      expect(mockSearch).toHaveBeenCalledWith(
        'user-123',
        'test',
        expect.objectContaining({ canvasId })
      )
    })
  })

  describe('Rebuild index', () => {
    it('should rebuild index when requested', async () => {
      mockRebuildIndex.mockResolvedValueOnce({ indexed: 10, failed: 0 })

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', rebuildIndex: true })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Index rebuilt successfully')
      expect(data.indexed).toBe(10)
    })

    it('should return 500 when rebuild fails', async () => {
      mockRebuildIndex.mockRejectedValueOnce(new Error('Rebuild failed'))

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test', rebuildIndex: true })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to rebuild search index')
    })
  })

  describe('Error handling', () => {
    it('should return 500 on search error', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Search failed'))

      const { POST } = await import('../search/route')
      const request = createSearchRequest({ query: 'test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Search failed')
    })
  })
})

describe('GET /api/search', () => {
  it('should return status ok for GET request', async () => {
    const { GET } = await import('../search/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.message).toBe('Search API is running. Use POST to search.')
  })
})
