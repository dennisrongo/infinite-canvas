/**
 * API Route Tests: /api/notes/[noteId]
 *
 * Tests note CRUD operations including:
 * - PUT: Update note
 * - DELETE: Delete note
 * - Authorization checks (ownership through canvas)
 * - Input validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Generate valid UUIDs for testing
const NOTE_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const CANVAS_UUID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
const OTHER_UUID = 'c3d4e5f6-a7b8-9012-cdef-345678901234'

// Mock session
const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

const mockNote = {
  id: NOTE_UUID,
  canvasId: CANVAS_UUID,
  title: 'Test Note',
  content: 'Test content',
  positionX: 0,
  positionY: 0,
  width: 300,
  height: 200,
  fontFamily: 'Inter',
  fontSize: 14,
  createdAt: new Date(),
  updatedAt: new Date(),
  canvas: {
    id: CANVAS_UUID,
    userId: 'user-123',
  },
}

const mockPrisma = {
  note: {
    findFirst: vi.fn(),
    update: vi.fn(),
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

// Mock validation - noteUpdateSchema needs to properly parse and return data
vi.mock('@/lib/validation', () => ({
  isValidUUID: vi.fn((id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }),
  noteUpdateSchema: {
    parse: (data: unknown) => {
      // Default behavior: just return the data as-is
      return data
    },
  },
  noteTitleSchema: {
    parse: (title: string) => title.trim(),
  },
}))

// Helper to create mock request
function createNoteRequest(
  method: string = 'PUT',
  body?: Record<string, unknown>
): NextRequest {
  return {
    method,
    headers: {
      get: vi.fn(() => null),
    },
    json: async () => body ?? {},
  } as unknown as NextRequest
}

// Helper to create params
function createParams(noteId: string) {
  return Promise.resolve({ noteId })
}

describe('PUT /api/notes/[noteId]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    mockPrisma.note.findFirst.mockResolvedValue(mockNote)
    mockPrisma.note.update.mockResolvedValue(mockNote)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { title: 'Updated' })
      const response = await PUT(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when note does not exist', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { title: 'Updated' })
      const response = await PUT(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Note not found')
    })

    it('should return 404 when note belongs to another user', async () => {
      // Note exists but belongs to different user's canvas
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { title: 'Updated' })
      const response = await PUT(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Note not found')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { title: 'Updated' })
      const response = await PUT(request, { params: createParams('invalid') })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid note ID format')
    })
  })

  describe('Successful updates', () => {
    it('should update note title', async () => {
      // First call finds the note, second call checks for duplicates (returns null = no duplicate)
      mockPrisma.note.findFirst
        .mockResolvedValueOnce(mockNote)  // Find note to update
        .mockResolvedValueOnce(null)      // No duplicate title found

      mockPrisma.note.update.mockResolvedValue({
        ...mockNote,
        title: 'Updated Title',
      })

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { title: 'Updated Title' })
      const response = await PUT(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.note.title).toBe('Updated Title')
    })

    it('should update note content', async () => {
      // Content updates don't check for duplicates
      mockPrisma.note.findFirst.mockResolvedValueOnce(mockNote)

      mockPrisma.note.update.mockResolvedValue({
        ...mockNote,
        content: 'Updated content',
      })

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { content: 'Updated content' })
      const response = await PUT(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.note.content).toBe('Updated content')
    })

    it('should update note position', async () => {
      // Position updates don't check for duplicates
      mockPrisma.note.findFirst.mockResolvedValueOnce(mockNote)

      mockPrisma.note.update.mockResolvedValue({
        ...mockNote,
        positionX: 100,
        positionY: 200,
      })

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { positionX: 100, positionY: 200 })
      const response = await PUT(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.note.positionX).toBe(100)
      expect(data.note.positionY).toBe(200)
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      // First call finds the note, second call checks for duplicates (returns null)
      mockPrisma.note.findFirst
        .mockResolvedValueOnce(mockNote)  // Find note to update
        .mockResolvedValueOnce(null)      // No duplicate title found

      mockPrisma.note.update.mockRejectedValue(new Error('Database error'))

      const { PUT } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('PUT', { title: 'Updated' })
      const response = await PUT(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update note')
    })
  })
})

describe('DELETE /api/notes/[noteId]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)
    mockPrisma.note.findFirst.mockResolvedValue(mockNote)
    mockPrisma.note.delete.mockResolvedValue(mockNote)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth')
      vi.mocked(getSession).mockResolvedValue(null)

      const { DELETE } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('DELETE')
      const response = await DELETE(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when note does not exist', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(null)

      const { DELETE } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('DELETE')
      const response = await DELETE(request, { params: createParams(OTHER_UUID) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Note not found')
    })
  })

  describe('Input validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const { DELETE } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('DELETE')
      const response = await DELETE(request, { params: createParams('invalid') })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid note ID format')
    })
  })

  describe('Successful deletion', () => {
    it('should delete note successfully', async () => {
      const { DELETE } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('DELETE')
      const response = await DELETE(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Note deleted successfully')
      expect(data.noteId).toBe(NOTE_UUID)
    })

    it('should call delete with correct ID', async () => {
      const { DELETE } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('DELETE')
      await DELETE(request, { params: createParams(NOTE_UUID) })

      expect(mockPrisma.note.delete).toHaveBeenCalledWith({
        where: { id: NOTE_UUID },
      })
    })
  })

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      mockPrisma.note.findFirst.mockResolvedValue(mockNote)
      mockPrisma.note.delete.mockRejectedValue(new Error('Database error'))

      const { DELETE } = await import('../notes/[noteId]/route')
      const request = createNoteRequest('DELETE')
      const response = await DELETE(request, { params: createParams(NOTE_UUID) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete note')
    })
  })
})
