/**
 * General test utilities
 */

import { ReactElement } from 'react'

/**
 * Creates a mock function with TypeScript typing
 */
export function createMockFn<T extends (...args: any[]) => any>(
  implementation?: T
): ReturnType<typeof vi.fn<T>> {
  return vi.fn(implementation) as ReturnType<typeof vi.fn<T>>
}

/**
 * Wraps a promise in a timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

/**
 * Waits for a specified amount of time
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Flushes all pending promises
 */
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Creates a mock partial object
 */
export function createMockPartial<T>(obj: Partial<T>): T {
  return obj as T
}

/**
 * Creates a mock component
 */
export function createMockComponent(displayName: string): React.FC {
  const Component = ({ children }: { children?: React.ReactNode }) => {
    return <>{children}</>
  }
  Component.displayName = displayName
  return Component
}

/**
 * Mock window.location
 */
export function mockWindowLocation(properties: Partial<Location>) {
  delete (window as any).location
  window.location = { ...window.location, ...properties } as any
}

/**
 * Reset window.location mock
 */
export function resetWindowLocation() {
  delete (window as any).location
  window.location = new URL('http://localhost') as any
}

/**
 * Create a mock file object
 */
export function createMockFile(
  name: string,
  content: string,
  type: string = 'text/plain'
): File {
  const blob = new Blob([content], { type })
  const file = blob as File
  Object.defineProperty(file, 'name', { value: name, writable: false })
  return file
}

/**
 * Creates a mock DragEvent
 */
export function createMockDragEvent(
  data: Record<string, any>,
  eventType: 'dragstart' | 'dragover' | 'drop' = 'drop'
): DragEvent {
  return {
    type: eventType,
    dataTransfer: {
      dropEffect: 'none',
      effectAllowed: 'all',
      files: [],
      items: [],
      types: ['text/plain'],
      setData: vi.fn(),
      getData: vi.fn((format) => JSON.stringify(data)),
      clearData: vi.fn(),
      setDragImage: vi.fn(),
    },
    bubbles: true,
    cancelable: true,
    composed: true,
    currentTarget: null,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    preventDefault: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    stopPropagation: vi.fn(),
    target: null,
    timeStamp: Date.now(),
  } as any
}

/**
 * Creates a mock KeyboardEvent
 */
export function createMockKeyboardEvent(
  key: string,
  options: Partial<KeyboardEvent> = {}
): KeyboardEvent {
  return {
    key,
    code: key,
    keyCode: key.charCodeAt(0),
    which: key.charCodeAt(0),
    bubbles: true,
    cancelable: true,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...options,
  } as any
}

/**
 * Creates a mock MouseEvent
 */
export function createMockMouseEvent(
  type: string,
  options: Partial<MouseEvent> = {}
): MouseEvent {
  return {
    type,
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 0,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...options,
  } as any
}

/**
 * Mock console methods
 */
export const mockConsole = {
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
}

/**
 * Restore console mocks
 */
export function restoreConsoleMocks() {
  mockConsole.error.mockRestore()
  mockConsole.warn.mockRestore()
  mockConsole.info.mockRestore()
  mockConsole.log.mockRestore()
}

/**
 * Suppress console output during a test
 */
export function suppressConsoleError(fn: () => void | Promise<void>) {
  const originalError = console.error
  console.error = () => {}
  try {
    const result = fn()
    if (result instanceof Promise) {
      return result.finally(() => {
        console.error = originalError
      })
    }
    console.error = originalError
    return result
  } catch (error) {
    console.error = originalError
    throw error
  }
}

/**
 * Assert a component throws an error when used without required provider
 */
export async function assertThrowsWithoutProvider(
  Component: () => ReactElement,
  expectedMessage: string | RegExp
) {
  const { render } = await import('@testing-library/react')
  expect(() => render(Component())).toThrow(expectedMessage)
}

/**
 * Generate a random test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a mock UUID
 */
export function mockUUID(): string {
  return '00000000-0000-4000-8000-000000000000'
}

/**
 * Render a hook for testing
 * This is a replacement for the removed renderHook from @testing-library/react v14+
 */
export function renderHook<T>(
  hook: () => T,
  options?: { wrapper?: ({ children }: { children: React.ReactNode }) => React.ReactElement }
): {
  result: { current: T }
  rerender: () => void
  unmount: () => void
} {
  const { useState, useEffect } = require('react')
  const { render, unmount: unmountComponent } = require('@testing-library/react')

  let result: T
  let updateCounter = 0

  function TestComponent() {
    const [_, forceUpdate] = useState(0)
    result = hook()

    useEffect(() => {
      // Subscribe to updates
    }, [updateCounter])

    return null
  }

  const Wrapper = options?.wrapper

  let renderedComponent: any
  if (Wrapper) {
    renderedComponent = render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    )
  } else {
    renderedComponent = render(<TestComponent />)
  }

  return {
    get result() {
      return { current: result }
    },
    rerender: () => {
      updateCounter++
    },
    unmount: () => {
      unmountComponent()
    },
  }
}
