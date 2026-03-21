import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByText('Test Modal')).toBeInTheDocument()
    })

    it('should render children correctly', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div data-testid="modal-child">Child Content</div>
        </Modal>
      )
      expect(screen.getByTestId('modal-child')).toBeInTheDocument()
      expect(screen.getByText('Child Content')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      )
      
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      fireEvent.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when clicking backdrop', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      // Find the backdrop div by its class and click it
      // The backdrop has class "absolute inset-0 bg-black/50"
      const backdrop = document.body.querySelector('.bg-black\\/50') as HTMLElement
      fireEvent.click(backdrop)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when clicking backdrop if closeOnBackdropClick is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnBackdropClick={false}>
          <p>Modal content</p>
        </Modal>
      )
      
      const backdrop = document.body.querySelector('.bg-black\\/50') as HTMLElement
      fireEvent.click(backdrop)
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should call onClose when clicking backdrop when closeOnBackdropClick is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnBackdropClick={true}>
          <p>Modal content</p>
        </Modal>
      )
      
      const backdrop = document.body.querySelector('.bg-black\\/50') as HTMLElement
      fireEvent.click(backdrop)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Size variants', () => {
    it('should render with small size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="sm">
          <p>Small modal</p>
        </Modal>
      )
      const modal = document.body.querySelector('.max-w-sm')
      expect(modal).toBeInTheDocument()
    })

    it('should render with medium size (default)', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="md">
          <p>Medium modal</p>
        </Modal>
      )
      const modal = document.body.querySelector('.max-w-md')
      expect(modal).toBeInTheDocument()
    })

    it('should render with large size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="lg">
          <p>Large modal</p>
        </Modal>
      )
      const modal = document.body.querySelector('.max-w-lg')
      expect(modal).toBeInTheDocument()
    })

    it('should render with extra large size', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} size="xl">
          <p>Extra large modal</p>
        </Modal>
      )
      const modal = document.body.querySelector('.max-w-xl')
      expect(modal).toBeInTheDocument()
    })
  })

  describe('closeOnBackdropClick prop', () => {
    it('should call onClose when clicking backdrop (default behavior)', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      )
      
      const backdrop = document.body.querySelector('.bg-black\\/50') as HTMLElement
      fireEvent.click(backdrop)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when clicking backdrop when closeOnBackdropClick is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} closeOnBackdropClick={false}>
          <p>Modal content</p>
        </Modal>
      )
      
      const backdrop = document.body.querySelector('.bg-black\\/50') as HTMLElement
      fireEvent.click(backdrop)
      
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper dialog role', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal set to true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })
  })
})
