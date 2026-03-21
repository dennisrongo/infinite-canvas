/**
 * API Route Tests: /api/notes/[noteId]/duplicate
 *
 * Regression coverage for encrypted note duplication behavior:
 * - Uses decrypted values for response/indexing
 * - Re-encrypts duplicated note in DB
 * - Fails closed on missing DEK / inconsistent encryption / decryption failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const NOTE_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const CANVAS_UUID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'

const mockSession = {
  userId: 'user-123',
  email: 'test@example.com',
  passwordVersion: 0,
}

const baseNote = {
  id: NOTE_UUID,
  canvasId: CANVAS_UUID,
  title: 'Original Title',
  content: 'Original content',
  positionX: 10,
  positionY: 20,
  width: 300,
  height: 200,
  fontFamily: 'Inter',
  fontSize: 14,
  isEncrypted: false,
  encryptionVersion: null,
}

const mockPrisma = {
  note: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}

const mockEncryption = {
  isEncryptedData: vi.fn(),
  decryptNote: vi.fn(),
  encryptNote: vi.fn(),
}

const mockDek = {
  getOrRestoreDEK: vi.fn(),
}

const mockIndexNote = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/validation', () => ({
  isValidUUID: vi.fn((id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }),
}))

vi.mock('@/lib/search-index', () => ({
  indexNote: mockIndexNote,
}))

vi.mock('@/lib/encryption', () => mockEncryption)

vi.mock('@/lib/dek', () => mockDek)

function createRequest(): NextRequest {
  return {
    method: 'POST',
    headers: {
      get: vi.fn(() => null),
    },
  } as unknown as NextRequest
}

function createParams(noteId: string) {
  return Promise.resolve({ noteId })
}

describe('POST /api/notes/[noteId]/duplicate', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    const { getSession } = await import('@/lib/auth')
    vi.mocked(getSession).mockResolvedValue(mockSession)

    mockIndexNote.mockResolvedValue(undefined)

    mockEncryption.isEncryptedData.mockReturnValue(false)
    mockEncryption.decryptNote.mockImplementation(() => ({ title: '', content: '' }))
    mockEncryption.encryptNote.mockImplementation(() => ({ encryptedTitle: '', encryptedContent: '' }))

    mockDek.getOrRestoreDEK.mockResolvedValue(Buffer.from('a'.repeat(32)))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('duplicates encrypted note using decrypted values for response/indexing and encrypted values for DB', async () => {
    const originalEncryptedNote = {
      ...baseNote,
      title: '{"ciphertext":"a","iv":"b","authTag":"c"}',
      content: '{"ciphertext":"d","iv":"e","authTag":"f"}',
      isEncrypted: true,
      encryptionVersion: 1,
    }

    const createdEncryptedDuplicate = {
      ...originalEncryptedNote,
      id: 'dup-note-id',
      title: 'encrypted-copy-title',
      content: 'encrypted-copy-content',
      positionX: originalEncryptedNote.positionX + 50,
      positionY: originalEncryptedNote.positionY + 50,
    }

    mockPrisma.note.findFirst.mockResolvedValue(originalEncryptedNote)
    mockPrisma.note.create.mockResolvedValue(createdEncryptedDuplicate)

    mockEncryption.isEncryptedData.mockReturnValue(true)
    mockEncryption.decryptNote.mockReturnValue({
      title: 'Secret Note',
      content: 'Secret body',
    })
    mockEncryption.encryptNote.mockReturnValue({
      encryptedTitle: 'encrypted-copy-title',
      encryptedContent: 'encrypted-copy-content',
    })

    const { POST } = await import('../notes/[noteId]/duplicate/route')
    const response = await POST(createRequest(), { params: createParams(NOTE_UUID) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.note.title).toBe('Secret Note - Copy')
    expect(data.note.content).toBe('Secret body')

    expect(mockPrisma.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'encrypted-copy-title',
        content: 'encrypted-copy-content',
        isEncrypted: true,
        encryptionVersion: 1,
      }),
    })

    expect(mockEncryption.encryptNote).toHaveBeenCalledWith(
      'Secret Note - Copy',
      'Secret body',
      expect.any(Buffer)
    )

    expect(mockIndexNote).toHaveBeenCalledWith(
      'dup-note-id',
      mockSession.userId,
      CANVAS_UUID,
      'Secret Note - Copy',
      'Secret body'
    )
  })

  it('returns duplicate title (with - Copy) and indexes duplicate title for non-encrypted note', async () => {
    const originalPlainNote = {
      ...baseNote,
      title: 'Plain title',
      content: 'Plain content',
      isEncrypted: false,
      encryptionVersion: null,
    }

    const createdPlainDuplicate = {
      ...originalPlainNote,
      id: 'dup-plain-id',
      title: 'Plain title - Copy',
      content: 'Plain content',
      positionX: originalPlainNote.positionX + 50,
      positionY: originalPlainNote.positionY + 50,
    }

    mockPrisma.note.findFirst.mockResolvedValue(originalPlainNote)
    mockPrisma.note.create.mockResolvedValue(createdPlainDuplicate)

    const { POST } = await import('../notes/[noteId]/duplicate/route')
    const response = await POST(createRequest(), { params: createParams(NOTE_UUID) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.note.title).toBe('Plain title - Copy')
    expect(data.note.content).toBe('Plain content')

    expect(mockIndexNote).toHaveBeenCalledWith(
      'dup-plain-id',
      mockSession.userId,
      CANVAS_UUID,
      'Plain title - Copy',
      'Plain content'
    )
  })

  it('returns 500 when encrypted note has no available DEK', async () => {
    mockPrisma.note.findFirst.mockResolvedValue({
      ...baseNote,
      isEncrypted: true,
      title: '{"ciphertext":"a","iv":"b","authTag":"c"}',
      content: '{"ciphertext":"d","iv":"e","authTag":"f"}',
      encryptionVersion: 1,
    })

    mockDek.getOrRestoreDEK.mockResolvedValue(null)

    const { POST } = await import('../notes/[noteId]/duplicate/route')
    const response = await POST(createRequest(), { params: createParams(NOTE_UUID) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to access encryption key for note duplication')
    expect(mockPrisma.note.create).not.toHaveBeenCalled()
    expect(mockIndexNote).not.toHaveBeenCalled()
  })

  it('returns 500 when encrypted note data is inconsistent', async () => {
    mockPrisma.note.findFirst.mockResolvedValue({
      ...baseNote,
      isEncrypted: true,
      title: '{"ciphertext":"a","iv":"b","authTag":"c"}',
      content: 'not encrypted',
      encryptionVersion: 1,
    })

    mockEncryption.isEncryptedData
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)

    const { POST } = await import('../notes/[noteId]/duplicate/route')
    const response = await POST(createRequest(), { params: createParams(NOTE_UUID) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Note encryption data is inconsistent')
    expect(mockPrisma.note.create).not.toHaveBeenCalled()
    expect(mockIndexNote).not.toHaveBeenCalled()
  })

  it('returns 500 when note is marked encrypted but both fields are not encrypted', async () => {
    mockPrisma.note.findFirst.mockResolvedValue({
      ...baseNote,
      isEncrypted: true,
      title: 'plain title',
      content: 'plain content',
      encryptionVersion: 1,
    })

    mockEncryption.isEncryptedData
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)

    const { POST } = await import('../notes/[noteId]/duplicate/route')
    const response = await POST(createRequest(), { params: createParams(NOTE_UUID) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Note encryption data is inconsistent')
    expect(mockPrisma.note.create).not.toHaveBeenCalled()
    expect(mockIndexNote).not.toHaveBeenCalled()
  })

  it('returns 500 when decrypting an encrypted note fails', async () => {
    mockPrisma.note.findFirst.mockResolvedValue({
      ...baseNote,
      isEncrypted: true,
      title: '{"ciphertext":"a","iv":"b","authTag":"c"}',
      content: '{"ciphertext":"d","iv":"e","authTag":"f"}',
      encryptionVersion: 1,
    })

    mockEncryption.isEncryptedData.mockReturnValue(true)
    mockEncryption.decryptNote.mockImplementation(() => {
      throw new Error('bad decrypt')
    })

    const { POST } = await import('../notes/[noteId]/duplicate/route')
    const response = await POST(createRequest(), { params: createParams(NOTE_UUID) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to decrypt note for duplication')
    expect(mockPrisma.note.create).not.toHaveBeenCalled()
    expect(mockIndexNote).not.toHaveBeenCalled()
  })
})
