/**
 * Unit tests for QueryProvider
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useQueryClient } from '@tanstack/react-query'
import QueryProvider from '../QueryProvider'

function TestChild() {
  const queryClient = useQueryClient()
  return (
    <div>
      <span data-testid="has-client">{queryClient ? 'yes' : 'no'}</span>
      <span data-testid="child-content">Hello</span>
    </div>
  )
}

describe('QueryProvider', () => {
  it('should render children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">Test Content</div>
      </QueryProvider>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toHaveTextContent('Test Content')
  })

  it('should provide QueryClient to children', () => {
    render(
      <QueryProvider>
        <TestChild />
      </QueryProvider>
    )

    expect(screen.getByTestId('has-client')).toHaveTextContent('yes')
  })

  it('should render children content correctly', () => {
    render(
      <QueryProvider>
        <TestChild />
      </QueryProvider>
    )

    expect(screen.getByTestId('child-content')).toHaveTextContent('Hello')
  })
})
