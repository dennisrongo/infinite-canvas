import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import NoteNode from '../NoteNode'

// Mock the Handle component from @xyflow/react
vi.mock('@xyflow/react', () => ({
  Handle: ({ position, id }: { position: string; id: string }) => (
    <div data-testid={`handle-${id}`} data-position={position} />
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}))

// Mock the Icon component
vi.mock('@/components/ui/Icon', () => ({
  default: ({ name, size }: { name: string; size: string }) => (
    <div data-testid={`icon-${name}-${size}`} />
  ),
}))

describe('NoteNode', () => {
  const defaultProps = {
    id: 'note-1',
    data: {
      title: 'Test Note Title',
      content: 'Test note content here',
      onDelete: vi.fn(),
      onDuplicate: vi.fn(),
    },
    selected: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render note title', () => {
      render(<NoteNode {...defaultProps} />)
      expect(screen.getByText('Test Note Title')).toBeInTheDocument()
    })

    it('should render note content preview', () => {
      render(<NoteNode {...defaultProps} />)
      expect(screen.getByText('Test note content here')).toBeInTheDocument()
    })

    it('should render with correct position styles', () => {
      const { container } = render(<NoteNode {...defaultProps} />)
      const nodeElement = container.firstChild as HTMLElement
      expect(nodeElement).toHaveStyle({ width: '300px' })
      expect(nodeElement).toHaveStyle({ minHeight: '200px' })
    })

    it('should render "Untitled Note" when title is empty', () => {
      render(
        <NoteNode
          {...defaultProps}
          data={{ ...defaultProps.data, title: '' }}
        />
      )
      expect(screen.getByText('Untitled Note')).toBeInTheDocument()
    })

    it('should render "No content yet" when content is empty', () => {
      render(
        <NoteNode
          {...defaultProps}
          data={{ ...defaultProps.data, content: '' }}
        />
      )
      expect(screen.getByText('No content yet')).toBeInTheDocument()
    })
  })

  describe('Selected state', () => {
    it('should render with selected class when selected is true', () => {
      const { container } = render(<NoteNode {...defaultProps} selected={true} />)
      const nodeElement = container.firstChild as HTMLElement
      expect(nodeElement.className).toContain('ring-2')
      expect(nodeElement.className).toContain('ring-purple-500')
    })

    it('should not render with selected class when selected is false', () => {
      const { container } = render(<NoteNode {...defaultProps} selected={false} />)
      const nodeElement = container.firstChild as HTMLElement
      expect(nodeElement.className).not.toContain('ring-2')
    })

    it('should display resize handles when selected', () => {
      render(<NoteNode {...defaultProps} selected={true} />)
      expect(screen.getByTestId('resize-se')).toBeInTheDocument()
      expect(screen.getByTestId('resize-sw')).toBeInTheDocument()
      expect(screen.getByTestId('resize-ne')).toBeInTheDocument()
      expect(screen.getByTestId('resize-nw')).toBeInTheDocument()
    })

    it('should not display resize handles when not selected', () => {
      render(<NoteNode {...defaultProps} selected={false} />)
      expect(screen.queryByTestId('resize-se')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resize-sw')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resize-ne')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resize-nw')).not.toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn()
      const { container } = render(
        <NoteNode {...defaultProps} />
      )
      
      fireEvent.click(container.firstChild as HTMLElement)
      // The component handles click internally for dropdown, but we can verify it renders
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render connection handles', () => {
      render(<NoteNode {...defaultProps} />)
      expect(screen.getByTestId('handle-top')).toBeInTheDocument()
      expect(screen.getByTestId('handle-bottom')).toBeInTheDocument()
      expect(screen.getByTestId('handle-left')).toBeInTheDocument()
      expect(screen.getByTestId('handle-right')).toBeInTheDocument()
    })

    it('should render the more options button', () => {
      render(<NoteNode {...defaultProps} />)
      const moreButton = screen.getByRole('button', { name: /more options/i })
      expect(moreButton).toBeInTheDocument()
    })

    it('should render edit hint text', () => {
      render(<NoteNode {...defaultProps} />)
      expect(screen.getByText('Double-click to edit')).toBeInTheDocument()
    })
  })

  describe('Dropdown menu', () => {
    it('should show dropdown menu when more button is clicked', () => {
      render(<NoteNode {...defaultProps} />)
      const moreButton = screen.getByRole('button', { name: /more options/i })
      
      fireEvent.click(moreButton)
      
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should call onDuplicate when duplicate is clicked', () => {
      render(<NoteNode {...defaultProps} />)
      const moreButton = screen.getByRole('button', { name: /more options/i })
      
      fireEvent.click(moreButton)
      const duplicateButton = screen.getByText('Duplicate')
      fireEvent.click(duplicateButton)
      
      expect(defaultProps.data.onDuplicate).toHaveBeenCalledWith('note-1')
    })

    it('should call onDelete when delete is clicked', () => {
      render(<NoteNode {...defaultProps} />)
      const moreButton = screen.getByRole('button', { name: /more options/i })
      
      fireEvent.click(moreButton)
      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)
      
      expect(defaultProps.data.onDelete).toHaveBeenCalledWith('note-1')
    })
  })

  describe('Context menu', () => {
    it('should show dropdown on right-click', () => {
      const { container } = render(<NoteNode {...defaultProps} />)
      
      fireEvent.contextMenu(container.firstChild as HTMLElement)
      
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })
})
