'use client';

/**
 * Typed API functions for use with TanStack Query hooks.
 * These are plain async functions that use the global fetch.
 * Each function corresponds to a specific API endpoint.
 */

// ─── Helpers ────────────────────────────────────────────────

async function jsonFetch(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(errorData.error || 'Request failed') as Error & { status: number; errorData: any };
    err.status = res.status;
    err.errorData = errorData;
    throw err;
  }

  // Some endpoints (DELETE) may return empty body
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── Auth ───────────────────────────────────────────────────

export const authApi = {
  login: (body: { email: string; password: string; rememberMe?: boolean }) =>
    jsonFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  register: (body: { email: string; password: string; confirmPassword: string }) =>
    jsonFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    jsonFetch('/api/auth/logout', { method: 'POST' }),

  me: () =>
    jsonFetch('/api/auth/me'),

  csrf: () =>
    jsonFetch('/api/auth/csrf'),

  forgotPassword: (body: { email: string }) =>
    jsonFetch('/api/auth/reset-password-request', { method: 'POST', body: JSON.stringify(body) }),

  resetPassword: (body: { token: string; password: string; confirmPassword: string }) =>
    jsonFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Canvases ───────────────────────────────────────────────

export const canvasApi = {
  list: () =>
    jsonFetch('/api/canvases'),

  get: (id: string) =>
    jsonFetch(`/api/canvases/${id}`),

  create: (body: { name: string; folderId?: string }, csrfToken?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    return jsonFetch('/api/canvases', { method: 'POST', headers, body: JSON.stringify(body) });
  },

  update: (id: string, body: Record<string, unknown>) =>
    jsonFetch(`/api/canvases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string) =>
    jsonFetch(`/api/canvases/${id}`, { method: 'DELETE' }),

  export: (id: string) =>
    fetch(`/api/canvases/${id}/export`),

  import: (body: { importData: any; folderId?: string }) =>
    jsonFetch('/api/canvases/import', { method: 'POST', body: JSON.stringify(body) }),

  reorder: (body: { updates: Array<{ canvasId: string; folderId: string | null; order: number }> }) =>
    jsonFetch('/api/canvases/reorder', { method: 'POST', body: JSON.stringify(body) }),
};

// ─── Folders ────────────────────────────────────────────────

export const folderApi = {
  list: () =>
    jsonFetch('/api/folders'),

  create: (body: { name: string }) =>
    jsonFetch('/api/folders', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: { name: string }) =>
    jsonFetch(`/api/folders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (id: string, moveCanvasesToRoot: boolean = true) =>
    jsonFetch(`/api/folders/${id}?moveCanvasesToRoot=${moveCanvasesToRoot}`, { method: 'DELETE' }),
};

// ─── Notes ──────────────────────────────────────────────────

export const noteApi = {
  listByCanvas: (canvasId: string) =>
    jsonFetch(`/api/canvases/${canvasId}/notes`),

  create: (canvasId: string, body: {
    title: string;
    content: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    id?: string;
  }) =>
    jsonFetch(`/api/canvases/${canvasId}/notes`, { method: 'POST', body: JSON.stringify(body) }),

  update: (noteId: string, body: Record<string, unknown>) =>
    jsonFetch(`/api/notes/${noteId}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (noteId: string) =>
    jsonFetch(`/api/notes/${noteId}`, { method: 'DELETE' }),

  duplicate: (noteId: string) =>
    jsonFetch(`/api/notes/${noteId}/duplicate`, { method: 'POST' }),
};

// ─── Connections ────────────────────────────────────────────

export const connectionApi = {
  listByCanvas: (canvasId: string) =>
    jsonFetch(`/api/canvases/${canvasId}/connections`),

  create: (canvasId: string, body: { sourceNoteId: string; targetNoteId: string }) =>
    jsonFetch(`/api/canvases/${canvasId}/connections`, { method: 'POST', body: JSON.stringify(body) }),

  delete: (connectionId: string) =>
    jsonFetch(`/api/connections/${connectionId}`, { method: 'DELETE' }),
};

// ─── User ───────────────────────────────────────────────────

export const userApi = {
  updateProfile: (body: { displayName: string }) =>
    jsonFetch('/api/user/update-profile', { method: 'PUT', body: JSON.stringify(body) }),

  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    jsonFetch('/api/user/change-password', { method: 'POST', body: JSON.stringify(body) }),

  deleteAccount: (body: { password: string }) =>
    jsonFetch('/api/user/delete-account', { method: 'DELETE', body: JSON.stringify(body) }),

  updateSettings: (body: Record<string, unknown>) =>
    jsonFetch('/api/user/settings', { method: 'PUT', body: JSON.stringify(body) }),
};

// ─── Search ─────────────────────────────────────────────────

export const searchApi = {
  search: (body: {
    query: string;
    canvasId?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFilter?: string;
  }) =>
    jsonFetch('/api/search', { method: 'POST', body: JSON.stringify(body) }),
};
