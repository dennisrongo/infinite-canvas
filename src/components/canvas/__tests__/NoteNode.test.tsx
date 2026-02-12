/**
 * Comprehensive unit tests for NoteNode component
 * Tests note display, interactions, selection, and accessibility
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NoteNode from '../NoteNode'
import { ReactFlowProvider } from '@/test/__mocks__/@xyflow/react'

// Mock window CustomEvent for nodeResize
const mockDispatchEvent = vi.fn()
global.dispatchEvent = mockDispatchEvent

// Mock CustomEvent constructor
global.CustomEvent = class CustomEvent {
  type: string
  detail: any

  constructor(type: string, options: { detail?: any } = {}) {
    this.type = type
    this.detail = options.detail || {}
  }
} as any

describe('NoteNode', () => {
  const mockNoteData = {
    title: 'Test Note',
    content: 'This is test content',
    onDuplicate: vi.fn(),
  }

  const defaultProps = {
    id: 'note-1',
    data: mockNoteData,
    selected: false,
  }

  // Wrapper with ReactFlowProvider for canvas components
  function wrapper({ children }: { children: React.ReactNode }) {
    return <ReactFlowProvider>{children}</ReactFlowProvider>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockDispatchEvent.mockClear()
  })

  describe('Rendering', () => {
    it('renders note with title', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      expect(screen.getByText('Test Note')).toBeInTheDocument()
    })

    it('renders "Untitled Note" when title is empty', () => {
      render(<NoteNode {...defaultProps} data={{ ...mockNoteData, title: '' }} />, { wrapper })

      expect(screen.getByText('Untitled Note')).toBeInTheDocument()
    })

    it('renders content preview for markdown content', () => {
      const content = '# Header\n\n**Bold text** and *italic*'
      render(<NoteNode {...defaultProps} data={{ ...mockNoteData, content }} />, { wrapper })

      // Content preview strips markdown and shows plain text
      expect(screen.getByText(/Header/i)).toBeInTheDocument()
      expect(screen.getByText(/Bold text/i)).toBeInTheDocument()
    })

    it('renders "No content yet" when content is empty', () => {
      render(<NoteNode {...defaultProps} data={{ ...mockNoteData, content: '' }} />, { wrapper })

      expect(screen.getByText('No content yet')).toBeInTheDocument()
    })

    it('renders edit hint text', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      expect(screen.getByText('Double-click to edit')).toBeInTheDocument()
    })

    it('truncates long content with ellipsis', () => {
      const longContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
      render(<NoteNode {...defaultProps} data={{ ...mockNoteData, content: longContent }} />, { wrapper })

      const preview = screen.getByText(/Line 1.*Line 2.*Line 3/s)
      expect(preview).toBeInTheDocument()
      // Should have ellipsis for truncated content
      expect(preview.textContent).toContain('...')
    })
  })

  describe('Selection State', () => {
    it('applies selected styling when selected prop is true', () => {
      const { container } = render(<NoteNode {...defaultProps} selected={true} />, { wrapper })
      const node = container.firstChild as HTMLElement

      expect(node.className).toContain('border-light-primary')
      expect(node.className).toContain('shadow-[0_0_0_3px_rgba(59,130,246,0.15)]')
    })

    it('shows selected indicator badge when selected', () => {
      render(<NoteNode {...defaultProps} selected={true} />, { wrapper })

      expect(screen.getByTestId('selected-indicator')).toBeInTheDocument()
    })

    it('hides selected indicator when not selected', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      expect(screen.queryByTestId('selected-indicator')).not.toBeInTheDocument()
    })

    it('applies default border styling when not selected', () => {
      const { container } = render(<NoteNode {...defaultProps} />, { wrapper })
      const node = container.firstChild as HTMLElement

      expect(node.className).toContain('border-transparent')
      expect(node.className).toContain('hover:border-light-primary')
    })
  })

  describe('Resize Handles', () => {
    it('shows resize handles only when selected', () => {
      render(<NoteNode {...defaultProps} selected={true} />, { wrapper })

      expect(screen.getByTestId('resize-se')).toBeInTheDocument()
      expect(screen.getByTestId('resize-ne')).toBeInTheDocument()
      expect(screen.getByTestId('resize-nw')).toBeInTheDocument()
    })

    it('hides resize handles when not selected', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      expect(screen.queryByTestId('resize-se')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resize-ne')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resize-nw')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resize-nw')).not.toBeInTheDocument()
    })

    it('shows all four corner handles when selected', () => {
      render(<NoteNode {...defaultProps} selected={true} />, { wrapper })

      expect(screen.getByTestId('resize-se')).toBeInTheDocument()
      expect(screen.getByTestId('resize-ne')).toBeInTheDocument()
      expect(screen.getByTestId('resize-nw')).toBeInTheDocument()
      expect(screen.getByTestId('resize-sw')).toBeInTheDocument()
    })

    it('has southeast resize handle', () => {
      render(<NoteNode {...defaultProps} selected={true} />, { wrapper })

      const seHandle = screen.getByTestId('resize-se')
      expect(seHandle).toHaveClass('cursor-se-resize')
    })

    it('hides resize handles when not selected', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      expect(screen.queryByTestId('resize-se')).not.toBeInTheDocument()
    })
  })

  describe('Duplicate Button', () => {
    it('renders duplicate button when onDuplicate is provided', () => {
      render(<NoteNode {...defaultProps} onDuplicate={vi.fn()} />, { wrapper })

      const duplicateBtn = screen.getByTestId('duplicate-btn')
      expect(duplicateBtn).toBeInTheDocument()
    })

    it('does not render duplicate button when onDuplicate is not provided', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      expect(screen.queryByTestId('duplicate-btn')).not.toBeInTheDocument()
    })

    it('calls onDuplicate with note ID when clicked', async () => {
      const onDuplicate = vi.fn()
      render(<NoteNode {...defaultProps} onDuplicate={onDuplicate} />, { wrapper })

      const duplicateBtn = screen.getByTestId('duplicate-btn')
      await userEvent.click(duplicateBtn)

      expect(onDuplicate).toHaveBeenCalledWith('note-1')
    })

    it('shows button on hover when not selected', () => {
      render(<NoteNode {...defaultProps} />, { wrapper })

      const button = screen.getByTestId('duplicate-btn')
      expect(button).toHaveClass('opacity-0')
      fireEvent.mouseEnter(button)
      await waitFor(() => {
        expect(button).toHaveClass('opacity-100')
      })
    })

    it('keeps button visible when selected', () => {
      render(<NoteNode {...defaultProps} selected={true} />, { wrapper })

      const button = screen.getByTestId('duplicate-btn')
      expect(button).toHaveClass('opacity-100')
    })
  })
})
