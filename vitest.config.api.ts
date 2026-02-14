import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Vitest configuration for API route tests
 *
 * API tests run in Node environment without jsdom since they don't need
 * browser APIs like window, document, etc.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'app/**/api/**/__tests__/**/*.test.{ts,tsx}',
      'app/**/api/**/__tests__/**/*.spec.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next', 'dist', 'coverage'],
    // Mock Next.js server modules
    deps: {
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
