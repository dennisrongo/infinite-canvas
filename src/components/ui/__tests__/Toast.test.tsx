import React, { useEffect } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ToastContainer from '../Toast'
import { ToastProvider, useToast } from '@/contexts/ToastContext'

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ToastProvider', () => {
    it('should provide toast context to children', () => {
      const TestComponent = () => {
        const { toasts, showToast, removeToast } = useToast()
        expect(toasts).toEqual([])
        expect(showToast).toBeDefined()
        expect(removeToast).toBeDefined()
        return null
      }
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      )
    })

    it('should add toast when showToast is called', () => {
      const TestComponent = () => {
        const { showToast } = useToast()
        
        // Call showToast in useEffect to avoid setState during render
        useEffect(() => {
          showToast('Test message', 'success')
        }, [showToast])
        
        return null
      }
      
      const { container } = render(
        <ToastProvider>
          <TestComponent />
          <ToastContainer />
        </ToastProvider>
      )
      
      // Verify toast is rendered
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })
  })

  describe('ToastContainer rendering', () => {
    // Component that adds toast in useEffect to avoid setState in render
    function ShowToastTestComponent({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
      const { showToast } = useToast()
      
      useEffect(() => {
        showToast(message, type)
      }, [message, type, showToast])
      
      return null
    }

    it('should not render when there are no toasts', () => {
      const { container } = render(
        <ToastProvider>
          <ToastContainer />
        </ToastProvider>
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render toast message when toast is added', () => {
      render(
        <ToastProvider>
          <ShowToastTestComponent message="Test success message" type="success" />
          <ToastContainer />
        </ToastProvider>
      )
      
      expect(screen.getByText('Test success message')).toBeInTheDocument()
    })

    it('should render success toast correctly', () => {
      render(
        <ToastProvider>
          <ShowToastTestComponent message="Success message" type="success" />
          <ToastContainer />
        </ToastProvider>
      )
      
      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    it('should render error toast correctly', () => {
      render(
        <ToastProvider>
          <ShowToastTestComponent message="Error message" type="error" />
          <ToastContainer />
        </ToastProvider>
      )
      
      expect(screen.getByText('Error message')).toBeInTheDocument()
    })

    it('should render info toast correctly', () => {
      render(
        <ToastProvider>
          <ShowToastTestComponent message="Info message" type="info" />
          <ToastContainer />
        </ToastProvider>
      )
      
      expect(screen.getByText('Info message')).toBeInTheDocument()
    })
  })

  describe('Toast close button', () => {
    function ShowToastForCloseTest({ message }: { message: string }) {
      const { showToast } = useToast()
      
      useEffect(() => {
        showToast(message, 'success')
      }, [message, showToast])
      
      return null
    }

    it('should call removeToast when close button is clicked', () => {
      render(
        <ToastProvider>
          <ShowToastForCloseTest message="Toast with close button" />
          <ToastContainer />
        </ToastProvider>
      )
      
      const closeButton = screen.getByRole('button', { name: /close notification/i })
      fireEvent.click(closeButton)
      
      // After clicking close, the toast should be removed
      expect(screen.queryByText('Toast with close button')).not.toBeInTheDocument()
    })
  })

  describe('Multiple toasts', () => {
    function ShowMultipleToastsComponent() {
      const { showToast } = useToast()
      
      useEffect(() => {
        showToast('First toast', 'success')
        showToast('Second toast', 'error')
        showToast('Third toast', 'info')
      }, [showToast])
      
      return null
    }

    it('should handle multiple toasts', () => {
      render(
        <ToastProvider>
          <ShowMultipleToastsComponent />
          <ToastContainer />
        </ToastProvider>
      )
      
      expect(screen.getByText('First toast')).toBeInTheDocument()
      expect(screen.getByText('Second toast')).toBeInTheDocument()
      expect(screen.getByText('Third toast')).toBeInTheDocument()
    })
  })
})
