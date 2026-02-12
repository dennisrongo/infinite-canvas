/**
 * Unit tests for useNetworkStatus hook
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '../useNetworkStatus'

// Mock window.matchMedia to return an object with matches property
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Test component that uses the network status hook
function TestNetworkComponent() {
  const { isOnline, wasOffline } = useNetworkStatus()

  return (
    <div>
      <span data-testid="online-status">{String(isOnline)}</span>
      <span data-testid="offline-status">{String(wasOffline)}</span>
    </div>
  )
}

describe('useNetworkStatus', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore matchMedia
    window.matchMedia = originalMatchMedia
  })

  it('should return true when online', () => {
    // Mock navigator.onLine as true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true,
    })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(true)
    expect(result.current.wasOffline).toBe(false)
  })

  it('should return false when offline', () => {
    // Mock navigator.onLine as false
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
      configurable: true,
    })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(false)
    // wasOffline is false initially, only set to true after coming back online
    expect(result.current.wasOffline).toBe(false)
  })

  it('should return true when navigator is undefined (SSR)', () => {
    // Mock navigator as undefined - in SSR, default to online
    const originalNavigator = global.navigator
    // @ts-expect-error - testing undefined navigator
    delete (global as any).navigator

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(true)
    expect(result.current.wasOffline).toBe(false)

    // Restore navigator
    global.navigator = originalNavigator
  })

  it('should add online and offline event listeners on mount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useNetworkStatus())

    expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))

    addEventListener.mockRestore()
    removeEventListener.mockRestore()
  })

  it('should update isOnline when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
      configurable: true,
    })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
      // Update navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
        configurable: true,
      })
    })

    expect(result.current.isOnline).toBe(true)
  })

  it('should update isOnline when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true,
    })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
      // Update navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
        configurable: true,
      })
    })

    expect(result.current.isOnline).toBe(false)
  })

  it('should set wasOffline to true after coming back online', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true,
    })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.wasOffline).toBe(false)

    act(() => {
      // First go offline
      window.dispatchEvent(new Event('offline'))
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
        configurable: true,
      })
    })

    // Then come back online - this triggers wasOffline
    act(() => {
      window.dispatchEvent(new Event('online'))
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
        configurable: true,
      })
    })

    expect(result.current.wasOffline).toBe(true)
  })
})
