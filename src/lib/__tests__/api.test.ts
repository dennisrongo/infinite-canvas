/**
 * Unit tests for typed API functions (src/lib/api.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authApi, canvasApi, folderApi, noteApi, connectionApi, userApi, searchApi } from '../api'

// global.fetch is already mocked in setup.ts
const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function mockJsonResponse(data: any, status = 200) {
  const body = JSON.stringify(data)
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  } as Response)
}

function mockErrorResponse(error: string, status: number) {
  const data = { error }
  const body = JSON.stringify(data)
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(body),
  } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

// ─── Auth API ───────────────────────────────────────────────

describe('authApi', () => {
  it('login calls POST /api/auth/login', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ user: {}, token: 'tok' }))
    await authApi.login({ email: 'a@b.com', password: 'pw' })
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
  })

  it('register calls POST /api/auth/register', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ user: {} }))
    await authApi.register({ email: 'a@b.com', password: 'pw', confirmPassword: 'pw' })
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST' }))
  })

  it('logout calls POST /api/auth/logout', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await authApi.logout()
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
  })

  it('me calls GET /api/auth/me', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ user: { id: '1' } }))
    const result = await authApi.me()
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ headers: expect.any(Object) }))
    expect(result.user.id).toBe('1')
  })

  it('csrf calls GET /api/auth/csrf', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ csrfToken: 'tok' }))
    const result = await authApi.csrf()
    expect(result.csrfToken).toBe('tok')
  })

  it('forgotPassword calls POST /api/auth/reset-password-request', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await authApi.forgotPassword({ email: 'a@b.com' })
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password-request', expect.objectContaining({ method: 'POST' }))
  })

  it('resetPassword calls POST /api/auth/reset-password', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await authApi.resetPassword({ token: 't', password: 'pw', confirmPassword: 'pw' })
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({ method: 'POST' }))
  })
})

// ─── Canvas API ─────────────────────────────────────────────

describe('canvasApi', () => {
  it('list calls GET /api/canvases', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvases: [] }))
    await canvasApi.list()
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('get calls GET /api/canvases/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c1' } }))
    const result = await canvasApi.get('c1')
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.any(Object))
    expect(result.canvas.id).toBe('c1')
  })

  it('create calls POST /api/canvases', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c1' } }))
    await canvasApi.create({ name: 'Test' })
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases', expect.objectContaining({ method: 'POST' }))
  })

  it('create includes csrf token header when provided', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: { id: 'c1' } }))
    await canvasApi.create({ name: 'Test' }, 'my-csrf')
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases', expect.objectContaining({
      headers: expect.objectContaining({ 'x-csrf-token': 'my-csrf' }),
    }))
  })

  it('update calls PUT /api/canvases/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: {} }))
    await canvasApi.update('c1', { name: 'New' })
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.objectContaining({ method: 'PUT' }))
  })

  it('delete calls DELETE /api/canvases/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await canvasApi.delete('c1')
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('import calls POST /api/canvases/import', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ canvas: {} }))
    await canvasApi.import({ importData: {}, folderId: 'f1' })
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/import', expect.objectContaining({ method: 'POST' }))
  })

  it('throws on error response', async () => {
    mockFetch.mockReturnValue(mockErrorResponse('Not found', 404))
    await expect(canvasApi.get('bad')).rejects.toThrow('Not found')
  })
})

// ─── Folder API ─────────────────────────────────────────────

describe('folderApi', () => {
  it('list calls GET /api/folders', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ folders: [] }))
    await folderApi.list()
    expect(mockFetch).toHaveBeenCalledWith('/api/folders', expect.any(Object))
  })

  it('create calls POST /api/folders', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ folder: {} }))
    await folderApi.create({ name: 'F1' })
    expect(mockFetch).toHaveBeenCalledWith('/api/folders', expect.objectContaining({ method: 'POST' }))
  })

  it('update calls PUT /api/folders/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ folder: {} }))
    await folderApi.update('f1', { name: 'New' })
    expect(mockFetch).toHaveBeenCalledWith('/api/folders/f1', expect.objectContaining({ method: 'PUT' }))
  })

  it('delete calls DELETE /api/folders/:id with query param', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await folderApi.delete('f1', true)
    expect(mockFetch).toHaveBeenCalledWith('/api/folders/f1?moveCanvasesToRoot=true', expect.objectContaining({ method: 'DELETE' }))
  })
})

// ─── Note API ───────────────────────────────────────────────

describe('noteApi', () => {
  it('listByCanvas calls GET /api/canvases/:id/notes', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ notes: [] }))
    await noteApi.listByCanvas('c1')
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/notes', expect.any(Object))
  })

  it('create calls POST /api/canvases/:id/notes', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: {} }))
    await noteApi.create('c1', { title: 'T', content: '', positionX: 0, positionY: 0, width: 300, height: 200 })
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/notes', expect.objectContaining({ method: 'POST' }))
  })

  it('update calls PUT /api/notes/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: {} }))
    await noteApi.update('n1', { title: 'New' })
    expect(mockFetch).toHaveBeenCalledWith('/api/notes/n1', expect.objectContaining({ method: 'PUT' }))
  })

  it('delete calls DELETE /api/notes/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await noteApi.delete('n1')
    expect(mockFetch).toHaveBeenCalledWith('/api/notes/n1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('duplicate calls POST /api/notes/:id/duplicate', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ note: {} }))
    await noteApi.duplicate('n1')
    expect(mockFetch).toHaveBeenCalledWith('/api/notes/n1/duplicate', expect.objectContaining({ method: 'POST' }))
  })
})

// ─── Connection API ─────────────────────────────────────────

describe('connectionApi', () => {
  it('listByCanvas calls GET /api/canvases/:id/connections', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ connections: [] }))
    await connectionApi.listByCanvas('c1')
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/connections', expect.any(Object))
  })

  it('create calls POST /api/canvases/:id/connections', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ connection: {} }))
    await connectionApi.create('c1', { sourceNoteId: 'n1', targetNoteId: 'n2' })
    expect(mockFetch).toHaveBeenCalledWith('/api/canvases/c1/connections', expect.objectContaining({ method: 'POST' }))
  })

  it('delete calls DELETE /api/connections/:id', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await connectionApi.delete('conn1')
    expect(mockFetch).toHaveBeenCalledWith('/api/connections/conn1', expect.objectContaining({ method: 'DELETE' }))
  })
})

// ─── User API ───────────────────────────────────────────────

describe('userApi', () => {
  it('updateProfile calls PUT /api/user/update-profile', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await userApi.updateProfile({ displayName: 'Test' })
    expect(mockFetch).toHaveBeenCalledWith('/api/user/update-profile', expect.objectContaining({ method: 'PUT' }))
  })

  it('changePassword calls POST /api/user/change-password', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await userApi.changePassword({ currentPassword: 'old', newPassword: 'new', confirmNewPassword: 'new' })
    expect(mockFetch).toHaveBeenCalledWith('/api/user/change-password', expect.objectContaining({ method: 'POST' }))
  })

  it('deleteAccount calls DELETE /api/user/delete-account', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ success: true }))
    await userApi.deleteAccount({ password: 'pw' })
    expect(mockFetch).toHaveBeenCalledWith('/api/user/delete-account', expect.objectContaining({ method: 'DELETE' }))
  })

  it('updateSettings calls PUT /api/user/settings', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ settings: {} }))
    await userApi.updateSettings({ canvasSortOrder: 'updated' })
    expect(mockFetch).toHaveBeenCalledWith('/api/user/settings', expect.objectContaining({ method: 'PUT' }))
  })
})

// ─── Search API ─────────────────────────────────────────────

describe('searchApi', () => {
  it('search calls POST /api/search', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ results: [] }))
    await searchApi.search({ query: 'hello' })
    expect(mockFetch).toHaveBeenCalledWith('/api/search', expect.objectContaining({ method: 'POST' }))
  })

  it('search sends body with filters', async () => {
    mockFetch.mockReturnValue(mockJsonResponse({ results: [] }))
    await searchApi.search({ query: 'hello', sortBy: 'title', dateFilter: 'week' })
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.query).toBe('hello')
    expect(callBody.sortBy).toBe('title')
    expect(callBody.dateFilter).toBe('week')
  })
})
