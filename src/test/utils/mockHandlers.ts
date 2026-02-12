/**
 * MSW (Mock Service Worker) request handlers for API mocking
 * Use these to mock API responses in tests
 */

import { http, HttpResponse, delay } from 'msw'

// Base URL for API routes
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Mock user data
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
}

// Mock canvas data
export const mockCanvas = {
  id: 'canvas-1',
  userId: '1',
  folderId: null,
  name: 'Test Canvas',
  viewportX: 0,
  viewportY: 0,
  zoom: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Mock note data
export const mockNote = {
  id: 'note-1',
  canvasId: 'canvas-1',
  title: 'Test Note',
  content: 'This is test content',
  positionX: 100,
  positionY: 100,
  width: 200,
  height: 150,
  fontFamily: 'inter',
  fontSize: 16,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Auth handlers
export const authHandlers = [
  // Login
  http.post(`${BASE_URL}/api/auth/login`, async () => {
    await delay(100)
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    })
  }),

  // Register
  http.post(`${BASE_URL}/api/auth/register`, async () => {
    await delay(100)
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    })
  }),

  // Logout
  http.post(`${BASE_URL}/api/auth/logout`, async () => {
    await delay(50)
    return HttpResponse.json({ success: true })
  }),

  // Get current user
  http.get(`${BASE_URL}/api/auth/me`, async ({ request }) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await delay(50)
    return HttpResponse.json({ user: mockUser })
  }),

  // CSRF token
  http.get(`${BASE_URL}/api/auth/csrf`, async () => {
    await delay(50)
    return HttpResponse.json({ csrfToken: 'mock-csrf-token' })
  }),
]

// Canvas handlers
export const canvasHandlers = [
  // Get all canvases
  http.get(`${BASE_URL}/api/canvases`, async () => {
    await delay(100)
    return HttpResponse.json({ canvases: [mockCanvas] })
  }),

  // Get single canvas
  http.get(`${BASE_URL}/api/canvases/:id`, async ({ params }) => {
    await delay(100)
    if (params.id === 'canvas-1') {
      return HttpResponse.json({ canvas: mockCanvas })
    }
    return HttpResponse.json({ error: 'Canvas not found' }, { status: 404 })
  }),

  // Create canvas
  http.post(`${BASE_URL}/api/canvases`, async () => {
    await delay(100)
    return HttpResponse.json({ canvas: mockCanvas })
  }),

  // Update canvas
  http.put(`${BASE_URL}/api/canvases/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ canvas: { ...mockCanvas, name: 'Updated Canvas' } })
  }),

  // Delete canvas
  http.delete(`${BASE_URL}/api/canvases/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ success: true })
  }),
]

// Note handlers
export const noteHandlers = [
  // Get notes for canvas
  http.get(`${BASE_URL}/api/canvases/:canvasId/notes`, async () => {
    await delay(100)
    return HttpResponse.json({ notes: [mockNote] })
  }),

  // Get single note
  http.get(`${BASE_URL}/api/notes/:noteId`, async ({ params }) => {
    await delay(100)
    if (params.noteId === 'note-1') {
      return HttpResponse.json({ note: mockNote })
    }
    return HttpResponse.json({ error: 'Note not found' }, { status: 404 })
  }),

  // Create note
  http.post(`${BASE_URL}/api/canvases/:canvasId/notes`, async () => {
    await delay(100)
    return HttpResponse.json({ note: mockNote })
  }),

  // Update note
  http.put(`${BASE_URL}/api/notes/:noteId`, async () => {
    await delay(100)
    return HttpResponse.json({ note: { ...mockNote, title: 'Updated Note' } })
  }),

  // Delete note
  http.delete(`${BASE_URL}/api/notes/:noteId`, async () => {
    await delay(100)
    return HttpResponse.json({ success: true })
  }),

  // Duplicate note
  http.post(`${BASE_URL}/api/notes/:noteId/duplicate`, async () => {
    await delay(100)
    return HttpResponse.json({
      note: { ...mockNote, id: 'note-2', title: 'Copy of Test Note' },
    })
  }),
]

// Folder handlers
export const folderHandlers = [
  // Get all folders
  http.get(`${BASE_URL}/api/folders`, async () => {
    await delay(100)
    return HttpResponse.json({ folders: [] })
  }),

  // Create folder
  http.post(`${BASE_URL}/api/folders`, async () => {
    await delay(100)
    return HttpResponse.json({
      folder: {
        id: 'folder-1',
        userId: '1',
        name: 'Test Folder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  }),

  // Update folder
  http.put(`${BASE_URL}/api/folders/:id`, async () => {
    await delay(100)
    return HttpResponse.json({
      folder: {
        id: 'folder-1',
        userId: '1',
        name: 'Updated Folder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  }),

  // Delete folder
  http.delete(`${BASE_URL}/api/folders/:id`, async () => {
    await delay(100)
    return HttpResponse.json({ success: true })
  }),
]

// Search handler
export const searchHandlers = [
  http.get(`${BASE_URL}/api/search`, async ({ request }) => {
    await delay(100)
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    return HttpResponse.json({
      results: query ? [mockNote] : [],
    })
  }),
]

// User settings handlers
export const userHandlers = [
  // Get settings
  http.get(`${BASE_URL}/api/user/settings`, async () => {
    await delay(100)
    return HttpResponse.json({
      settings: {
        theme: 'light',
        canvasSortOrder: 'newest',
      },
    })
  }),

  // Update settings
  http.put(`${BASE_URL}/api/user/settings`, async () => {
    await delay(100)
    return HttpResponse.json({
      settings: {
        theme: 'dark',
        canvasSortOrder: 'oldest',
      },
    })
  }),
]

// Health check handler
export const healthHandlers = [
  http.get(`${BASE_URL}/api/health`, async () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  }),
]

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...canvasHandlers,
  ...noteHandlers,
  ...folderHandlers,
  ...searchHandlers,
  ...userHandlers,
  ...healthHandlers,
]

// Error handlers for testing error states
export const errorHandlers = {
  unauthorized: http.get(`${BASE_URL}/api/auth/me`, () => {
    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }),

  notFound: http.get(`${BASE_URL}/api/canvases/:id`, () => {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 })
  }),

  serverError: http.get(`${BASE_URL}/api/canvases`, () => {
    return HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
  }),

  networkError: http.get(`${BASE_URL}/api/canvases`, () => {
    // Simulate network error by never resolving
    return HttpResponse.error()
  }),
}
