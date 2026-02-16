import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import NetworkStatusBanner from '../NetworkStatusBanner'

// Mock the useNetworkStatus hook
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}))

import { useNetworkStatus } from '@/hooks/useNetworkStatus'

describe('NetworkStatusBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render when offline', () => {
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: false,
        wasOffline: true,
      })

      render(<NetworkStatusBanner />)

      expect(screen.getByText(/You are offline/)).toBeInTheDocument()
    })

    it('should not render when online', () => {
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: true,
        wasOffline: false,
      })

      const { container } = render(<NetworkStatusBanner />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('offline message', () => {
    it('should display offline message', () => {
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: false,
        wasOffline: true,
      })

      render(<NetworkStatusBanner />)

      expect(
        screen.getByText('You are offline. Some features may not work correctly.')
      ).toBeInTheDocument()
    })

    it('should render offline icon', () => {
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: false,
        wasOffline: true,
      })

      render(<NetworkStatusBanner />)

      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('state transitions', () => {
    it('should handle transition from online to offline', () => {
      // First render as online
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: true,
        wasOffline: false,
      })

      const { rerender, container } = render(<NetworkStatusBanner />)
      expect(container.firstChild).toBeNull()

      // Then render as offline
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: false,
        wasOffline: true,
      })

      rerender(<NetworkStatusBanner />)
      expect(screen.getByText(/You are offline/)).toBeInTheDocument()
    })

    it('should handle transition from offline to online', () => {
      // First render as offline
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: false,
        wasOffline: true,
      })

      const { rerender, container } = render(<NetworkStatusBanner />)
      expect(screen.getByText(/You are offline/)).toBeInTheDocument()

      // Then render as online
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: true,
        wasOffline: false,
      })

      rerender(<NetworkStatusBanner />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('wasOffline flag', () => {
    it('should still render when isOnline is true but wasOffline is true', () => {
      vi.mocked(useNetworkStatus).mockReturnValue({
        isOnline: true,
        wasOffline: true,
      })

      render(<NetworkStatusBanner />)

      // Should not render when online even if wasOffline is true
      expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument()
    })
  })
})
