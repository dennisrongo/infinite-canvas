import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<LoadingSpinner />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('animate-spin')
    })

    it('should render with default size (md)', () => {
      const { container } = render(<LoadingSpinner />)
      
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    it('should render different sizes correctly', () => {
      // Small size
      const { container: smallContainer } = render(<LoadingSpinner size="sm" />)
      const smallSvg = smallContainer.querySelector('svg')
      expect(smallSvg).toHaveClass('h-3', 'w-3')

      // Medium size
      const { container: mediumContainer } = render(<LoadingSpinner size="md" />)
      const mediumSvg = mediumContainer.querySelector('svg')
      expect(mediumSvg).toHaveClass('h-4', 'w-4')

      // Large size
      const { container: largeContainer } = render(<LoadingSpinner size="lg" />)
      const largeSvg = largeContainer.querySelector('svg')
      expect(largeSvg).toHaveClass('h-6', 'w-6')
    })

    it('should render with custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />)
      
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('custom-class')
    })

    it('should render with both custom className and size classes', () => {
      const { container } = render(<LoadingSpinner size="lg" className="my-custom-spinner" />)
      
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin', 'h-6', 'w-6', 'my-custom-spinner')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-hidden set to true', () => {
      const { container } = render(<LoadingSpinner />)
      
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have proper SVG viewBox', () => {
      const { container } = render(<LoadingSpinner />)
      
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })
  })

  describe('Structure', () => {
    it('should render circle element for the spinner track', () => {
      const { container } = render(<LoadingSpinner />)
      
      const circle = container.querySelector('circle')
      expect(circle).toBeInTheDocument()
      expect(circle).toHaveClass('opacity-25')
    })

    it('should render path element for the spinner indicator', () => {
      const { container } = render(<LoadingSpinner />)
      
      const path = container.querySelector('path')
      expect(path).toBeInTheDocument()
      expect(path).toHaveClass('opacity-75')
    })

    it('should use currentColor for stroke', () => {
      const { container } = render(<LoadingSpinner />)
      
      const circle = container.querySelector('circle')
      expect(circle).toHaveAttribute('stroke', 'currentColor')
    })
  })

  describe('Props', () => {
    it('should handle all size options', () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg']
      const expectedClasses = {
        sm: ['h-3', 'w-3'],
        md: ['h-4', 'w-4'],
        lg: ['h-6', 'w-6'],
      }

      sizes.forEach(size => {
        const { container } = render(<LoadingSpinner size={size} />)
        const svg = container.querySelector('svg')
        expectedClasses[size].forEach(cls => {
          expect(svg).toHaveClass(cls)
        })
      })
    })

    it('should accept empty className', () => {
      const { container } = render(<LoadingSpinner className="" />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })
})
