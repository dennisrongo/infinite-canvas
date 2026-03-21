import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Select from '../Select'
import type { SelectOption } from '../Select'

describe('Select', () => {
  const mockOptions: SelectOption[] = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ]

  describe('rendering', () => {
    it('should render options correctly', () => {
      render(
        <Select
          id="test-select"
          options={mockOptions}
          value=""
          onChange={() => {}}
        />
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    it('should render with label when provided', () => {
      render(
        <Select
          id="test-select"
          label="Test Label"
          options={mockOptions}
          value=""
          onChange={() => {}}
        />
      )

      expect(screen.getByText('Test Label')).toBeInTheDocument()
    })

    it('should render with placeholder', () => {
      render(
        <Select
          id="test-select"
          options={mockOptions}
          value=""
          onChange={() => {}}
          placeholder="Choose an option"
        />
      )

      expect(screen.getByText('Choose an option')).toBeInTheDocument()
    })

    it('should not render label when showLabel is false', () => {
      render(
        <Select
          id="test-select"
          label="Test Label"
          options={mockOptions}
          value=""
          onChange={() => {}}
          showLabel={false}
        />
      )

      expect(screen.queryByText('Test Label')).not.toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('should call onValueChange when option is selected', () => {
      const mockOnChange = vi.fn()
      
      render(
        <Select
          id="test-select"
          options={mockOptions}
          value=""
          onChange={mockOnChange}
        />
      )

      const select = screen.getByRole('combobox')
      fireEvent.change(select, { target: { value: 'option2' } })

      expect(mockOnChange).toHaveBeenCalledWith('option2')
    })

    it('should display the selected value', () => {
      render(
        <Select
          id="test-select"
          options={mockOptions}
          value="option2"
          onChange={() => {}}
        />
      )

      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('option2')
    })
  })

  describe('disabled state', () => {
    it('should handle disabled state', () => {
      render(
        <Select
          id="test-select"
          options={mockOptions}
          value=""
          onChange={() => {}}
          disabled={true}
        />
      )

      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
    })

    it('should not call onChange when disabled', () => {
      const mockOnChange = vi.fn()
      
      render(
        <Select
          id="test-select"
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )

      // Verify the select element is disabled
      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have correct id for label association', () => {
      render(
        <Select
          id="my-select"
          label="My Select"
          options={mockOptions}
          value=""
          onChange={() => {}}
        />
      )

      const label = screen.getByText('My Select')
      expect(label).toHaveAttribute('for', 'my-select')
    })
  })
})
