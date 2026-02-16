import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import DeleteConfirmationModal from '../DeleteConfirmationModal'

describe('DeleteConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    noteTitle: 'Test Note',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render confirmation message', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      expect(screen.getByText(/Are you sure you want to delete this note?/i)).toBeInTheDocument()
    })

    it('should render the note title in the warning section', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      expect(screen.getByText(/Note: "Test Note"/i)).toBeInTheDocument()
    })

    it('should show cancel and delete buttons', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('should render "Untitled Note" when noteTitle is empty', () => {
      render(<DeleteConfirmationModal {...defaultProps} noteTitle="" />)
      expect(screen.getByText(/Note: "Untitled Note"/i)).toBeInTheDocument()
    })

    it('should render the modal header', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /delete note/i })).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onConfirm when delete button is clicked', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      
      fireEvent.click(deleteButton)
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    })

    it('should call onCancel when cancel button is clicked', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      fireEvent.click(cancelButton)
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Conditional rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <DeleteConfirmationModal {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      const { container } = render(
        <DeleteConfirmationModal {...defaultProps} isOpen={true} />
      )
      expect(container.firstChild).not.toBeNull()
    })

    it('should not render when isOpen is undefined', () => {
      const { container } = render(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <DeleteConfirmationModal {...defaultProps} isOpen={undefined as any} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should have a heading for the modal', () => {
      render(<DeleteConfirmationModal {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /delete note/i })).toBeInTheDocument()
    })
  })
})
