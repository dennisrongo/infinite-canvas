export const canvasKeys = {
  all: ['canvases'] as const,
  detail: (id: string) => ['canvases', id] as const,
  notes: (canvasId: string) => ['canvases', canvasId, 'notes'] as const,
  connections: (canvasId: string) => ['canvases', canvasId, 'connections'] as const,
};

export const folderKeys = {
  all: ['folders'] as const,
};

export const userKeys = {
  me: ['user', 'me'] as const,
  settings: ['user', 'settings'] as const,
};

export const searchKeys = {
  results: (query: string, filters?: Record<string, unknown>) =>
    ['search', query, filters] as const,
};

export const authKeys = {
  csrf: ['auth', 'csrf'] as const,
};
