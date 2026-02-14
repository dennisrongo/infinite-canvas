/**
 * Test utilities for API route testing
 *
 * Provides mock factories and helpers for testing Next.js API routes
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Types for mock data
interface MockUser {
  id: string
  email: string
  passwordHash: string
  displayName: string
  passwordVersion: number
  lastLogin?: Date | null
  createdAt: Date
  updatedAt: Date
}

interface MockCanvas {
  id: string
  userId: string
  name: string
  folderId: string | null
  viewportX?: number
  viewportY?: number
  zoom?: number
  order: number
  createdAt: Date
  updatedAt: Date
}

interface MockNote {
  id: string
  canvasId: string
  title: string
  content: string
  positionX: number
  positionY: number
  width: number
  height: number
  fontFamily?: string
  fontSize?: number
  createdAt: Date
  updatedAt: Date
}

interface MockFolder {
  id: string
  userId: string
  name: string
  order: number
  collapsed: boolean
  createdAt: Date
  updatedAt: Date
}

// Helper to generate UUID-like strings
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Create a mock NextRequest with optional body and headers
export function createMockRequest(
  options: {
    method?: string
    body?: Record<string, unknown>
    headers?: Record<string, string>
    url?: string
    cookies?: Record<string, string>
  } = {}
): NextRequest {
  const {
    method = 'GET',
    body,
    headers = {},
    url = 'http://localhost:3000/api/test',
    cookies = {},
  } = options

  const req = {
    method,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
      ...headers,
    },
    url,
    json: async () => body ?? {},
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  } as unknown as NextRequest

  return req
}

// Create a mock user
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: generateUUID(),
    email: 'test@example.com',
    passwordHash: '$2a$12$mockhashedpassword',
    displayName: 'Test User',
    passwordVersion: 0,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Create a mock canvas
export function createMockCanvas(overrides: Partial<MockCanvas> = {}): MockCanvas {
  return {
    id: generateUUID(),
    userId: generateUUID(),
    name: 'Test Canvas',
    folderId: null,
    viewportX: 0,
    viewportY: 0,
    zoom: 1,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Create a mock note
export function createMockNote(overrides: Partial<MockNote> = {}): MockNote {
  return {
    id: generateUUID(),
    canvasId: generateUUID(),
    title: 'Test Note',
    content: 'Test content',
    positionX: 0,
    positionY: 0,
    width: 300,
    height: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Create a mock folder
export function createMockFolder(overrides: Partial<MockFolder> = {}): MockFolder {
  return {
    id: generateUUID(),
    userId: generateUUID(),
    name: 'Test Folder',
    order: 0,
    collapsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// Mock cookie store
export function createMockCookieStore(cookies: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) => (cookies[name] ? { value: cookies[name] } : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn((name: string) => !!cookies[name]),
  }
}

/**
 * NOTE: setupApiMocks has been removed.
 *
 * Vitest's vi.mock() must be called at module scope due to hoisting.
 * It cannot be called inside a function. Instead, set up mocks directly
 * in your test file at the top level:
 *
 * @example
 * ```typescript
 * // At module scope (top of file):
 * vi.mock('next/headers', () => ({
 *   cookies: vi.fn(async () => createMockCookieStore({ auth_token: 'token' })),
 * }))
 * ```
 *
 * Use createMockCookieStore() to create the cookie store object.
 */

// Helper to parse JSON response
export async function getResponseJson(response: Response): Promise<Record<string, unknown>> {
  return JSON.parse(await response.text())
}

// Helper to create mock rate limit result
export function createMockRateLimitResult(success: boolean = true) {
  return {
    success,
    limit: 5,
    remaining: success ? 4 : 0,
    resetTime: Date.now() + 60000,
    blocked: !success,
  }
}

// Reset all mocks between tests
export function resetApiMocks() {
  vi.clearAllMocks()
  vi.resetModules()
}
