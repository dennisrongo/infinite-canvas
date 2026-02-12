/**
 * Unit tests for useDebounce hook
 */

import React, { useState, useEffect } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useDebounce } from '../useDebounce'

// Test component that uses the debounce hook
function TestDebounceComponent({ value, delay }: { value: string; delay: number }) {
  const debouncedValue = useDebounce(value, delay)

  return (
    <div>
      <span data-testid="debounced-value">{debouncedValue}</span>
    </div>
  )
}

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return initial value immediately', () => {
    render(<TestDebounceComponent value="test" delay={500} />)

    expect(screen.getByTestId('debounced-value')).toHaveTextContent('test')
  })

  it('should update value after delay', async () => {
    const { rerender } = render(<TestDebounceComponent value="initial" delay={500} />)

    expect(screen.getByTestId('debounced-value')).toHaveTextContent('initial')

    // Update the prop value wrapped in act
    act(() => {
      rerender(<TestDebounceComponent value="updated" delay={500} />)
    })

    // Should not update immediately
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('initial')

    // Fast-forward time wrapped in act
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now it should update
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('updated')
  })

  it('should handle zero delay', () => {
    render(<TestDebounceComponent value="test" delay={0} />)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.getByTestId('debounced-value')).toHaveTextContent('test')
  })

  it('should clear timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount } = render(<TestDebounceComponent value="test" delay={500} />)

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })

  it('should handle rapid value changes', () => {
    const { rerender } = render(<TestDebounceComponent value="initial" delay={500} />)

    // Should show initial value
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('initial')

    // Rapidly change values - each change should reset the timer
    act(() => {
      rerender(<TestDebounceComponent value="change1" delay={500} />)
      vi.advanceTimersByTime(200)
    })

    act(() => {
      rerender(<TestDebounceComponent value="change2" delay={500} />)
      vi.advanceTimersByTime(200)
    })

    act(() => {
      rerender(<TestDebounceComponent value="change3" delay={500} />)
    })

    // Should still show initial since we never completed the full 500ms delay
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('initial')

    // Complete the final delay
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now it should update to the most recent value (change3)
    expect(screen.getByTestId('debounced-value')).toHaveTextContent('change3')
  })
})
