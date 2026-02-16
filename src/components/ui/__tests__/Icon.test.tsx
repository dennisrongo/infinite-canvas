import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Icon, { IconName, IconSize } from '../Icon'

describe('Icon', () => {
  describe('rendering', () => {
    it('should render different icons by name', () => {
      const { container: menuContainer, rerender: rerenderMenu } = render(<Icon name="menu" />)
      expect(menuContainer.querySelector('svg')).toBeInTheDocument()

      const { container: searchContainer } = render(<Icon name="search" />)
      expect(searchContainer.querySelector('svg')).toBeInTheDocument()

      const { container: closeContainer } = render(<Icon name="close" />)
      expect(closeContainer.querySelector('svg')).toBeInTheDocument()

      const { container: checkContainer } = render(<Icon name="check" />)
      expect(checkContainer.querySelector('svg')).toBeInTheDocument()
    })

    it('should render all available icons without error', () => {
      const iconNames: IconName[] = [
        'menu',
        'search',
        'moon',
        'sun',
        'upload',
        'download',
        'close',
        'check',
        'info',
        'settings',
        'more-vertical',
        'chevron-down',
        'trash',
        'copy',
      ]

      iconNames.forEach((name) => {
        const { container } = render(<Icon name={name} />)
        expect(container.querySelector('svg')).toBeInTheDocument()
      })
    })
  })

  describe('size prop', () => {
    it('should render with default size (md)', () => {
      const { container } = render(<Icon name="search" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-5', 'h-5')
    })

    it('should handle xs size', () => {
      const { container } = render(<Icon name="search" size="xs" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-3', 'h-3')
    })

    it('should handle sm size', () => {
      const { container } = render(<Icon name="search" size="sm" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-4', 'h-4')
    })

    it('should handle lg size', () => {
      const { container } = render(<Icon name="search" size="lg" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-6', 'h-6')
    })

    it('should handle xl size', () => {
      const { container } = render(<Icon name="search" size="xl" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-8', 'h-8')
    })

    it('should accept all IconSize values', () => {
      const sizes: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
      
      sizes.forEach((size) => {
        const { container } = render(<Icon name="search" size={size} />)
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()
      })
    })
  })

  describe('color prop', () => {
    it('should apply custom className for color', () => {
      const { container } = render(<Icon name="search" className="text-red-500" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-red-500')
    })

    it('should apply multiple custom classes', () => {
      const { container } = render(
        <Icon name="search" className="text-blue-500 hover:text-blue-700" />
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('text-blue-500', 'hover:text-blue-700')
    })

    it('should merge custom className with size classes', () => {
      const { container } = render(
        <Icon name="search" size="lg" className="text-green-500" />
      )
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('w-6', 'h-6', 'text-green-500')
    })
  })

  describe('accessibility', () => {
    it('should apply ariaLabel when provided', () => {
      const { container } = render(<Icon name="search" ariaLabel="Search" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-label', 'Search')
    })

    it('should set aria-hidden when decorative is true without ariaLabel', () => {
      const { container } = render(<Icon name="search" decorative={true} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('should set aria-hidden to false when ariaLabel is provided', () => {
      const { container } = render(<Icon name="search" ariaLabel="Search" />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'false')
    })
  })

  describe('additional props', () => {
    it('should have correct structure with svg element', () => {
      const { container } = render(<Icon name="search" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg?.tagName.toLowerCase()).toBe('svg')
    })
  })
})
