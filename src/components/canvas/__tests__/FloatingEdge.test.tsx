import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import FloatingEdge from '../FloatingEdge'

// Mock @xyflow/react module
vi.mock('@xyflow/react', () => {
  const React = require('react')
  
  return {
    getBezierPath: vi.fn(() => ['M0,0 C50,0 50,100 100,100']),
    BaseEdge: ({ id, path, style }: { id: string; path: string; style: React.CSSProperties }) => (
      <div data-testid={`base-edge-${id}`} data-path={path} style={style} />
    ),
    Position: {
      Top: 'top',
      Bottom: 'bottom',
      Left: 'left',
      Right: 'right',
    },
    useStore: vi.fn(),
  }
})

// Import after mocking
import { useStore, getBezierPath } from '@xyflow/react'

const mockUseStore = useStore as ReturnType<typeof vi.fn>
const mockGetBezierPath = getBezierPath as ReturnType<typeof vi.fn>

// Type for edge props
interface EdgeTestProps {
  id: string
  source: string
  target: string
  sourceHandleId?: string
  targetHandleId?: string
  style?: React.CSSProperties
}

// Helper to create edge props that bypass strict type checking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createEdgeProps = (props: EdgeTestProps): any => props

describe('FloatingEdge', () => {
  const createMockSourceNode = (width = 300, height = 200) => ({
    id: 'source-node',
    type: 'note',
    position: { x: 0, y: 0 },
    internals: {
      positionAbsolute: { x: 0, y: 0 },
    },
    measured: {
      width,
      height,
    },
  })

  const createMockTargetNode = (width = 300, height = 200) => ({
    id: 'target-node',
    type: 'note',
    position: { x: 400, y: 300 },
    internals: {
      positionAbsolute: { x: 400, y: 300 },
    },
    measured: {
      width,
      height,
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBezierPath.mockReturnValue(['M0,0 C50,0 50,100 100,100'])
  })

  describe('Basic rendering', () => {
    it('should render correctly with source and target positions', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-1',
        source: 'source-node',
        target: 'target-node',
        sourceHandleId: 'right',
        targetHandleId: 'left',
      })

      const { container } = render(<FloatingEdge {...props} />)

      // Should render BaseEdge components
      const baseEdges = container.querySelectorAll('[data-testid^="base-edge-"]')
      expect(baseEdges.length).toBe(2) // One glow, one main edge
    })

    it('should render with default handle positions when no handle IDs provided', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-2',
        source: 'source-node',
        target: 'target-node',
      })

      const { container } = render(<FloatingEdge {...props} />)

      const baseEdges = container.querySelectorAll('[data-testid^="base-edge-"]')
      expect(baseEdges.length).toBe(2)
    })
  })

  describe('Path calculation', () => {
    it('should call getBezierPath with correct parameters', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-3',
        source: 'source-node',
        target: 'target-node',
        sourceHandleId: 'right',
        targetHandleId: 'left',
      })

      render(<FloatingEdge {...props} />)

      expect(mockGetBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceX: expect.any(Number),
          sourceY: expect.any(Number),
          targetX: expect.any(Number),
          targetY: expect.any(Number),
          sourcePosition: 'right',
          targetPosition: 'left',
        })
      )
    })

    it('should calculate handle positions correctly', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-4',
        source: 'source-node',
        target: 'target-node',
        sourceHandleId: 'top',
        targetHandleId: 'bottom',
      })

      render(<FloatingEdge {...props} />)

      expect(mockGetBezierPath).toHaveBeenCalledWith(
        expect.objectContaining({
          sourcePosition: 'top',
          targetPosition: 'bottom',
        })
      )
    })
  })

  describe('Edge styling', () => {
    it('should render edges with correct styling', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-5',
        source: 'source-node',
        target: 'target-node',
      })

      const { container } = render(<FloatingEdge {...props} />)

      const mainEdge = container.querySelector('[data-testid="base-edge-edge-5"]')
      expect(mainEdge).toHaveStyle({ stroke: '#8B5CF6' })
      expect(mainEdge).toHaveStyle({ strokeWidth: 2 })
    })

    it('should render glow effect edge', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-6',
        source: 'source-node',
        target: 'target-node',
      })

      const { container } = render(<FloatingEdge {...props} />)

      const glowEdge = container.querySelector('[data-testid="base-edge-edge-6-glow"]')
      expect(glowEdge).toHaveStyle({ stroke: '#8B5CF6' })
      expect(glowEdge).toHaveStyle({ strokeWidth: 6 })
      expect(glowEdge).toHaveStyle({ opacity: 0.15 })
    })
  })

  describe('Error handling', () => {
    it('should return null when source node is not found', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            // Only target node
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-7',
        source: 'source-node',
        target: 'target-node',
      })

      const { container } = render(<FloatingEdge {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('should return null when target node is not found', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            // Only source node
            ['source-node', createMockSourceNode()],
          ]),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-8',
        source: 'source-node',
        target: 'target-node',
      })

      const { container } = render(<FloatingEdge {...props} />)

      expect(container.firstChild).toBeNull()
    })

    it('should return null when both nodes are not found', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map(),
        }
        return selector(state)
      })

      const props = createEdgeProps({
        id: 'edge-9',
        source: 'source-node',
        target: 'target-node',
      })

      const { container } = render(<FloatingEdge {...props} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Custom style prop', () => {
    it('should merge custom style with default style', () => {
      mockUseStore.mockImplementation((selector: (state: unknown) => unknown) => {
        const state = {
          nodeLookup: new Map([
            ['source-node', createMockSourceNode()],
            ['target-node', createMockTargetNode()],
          ]),
        }
        return selector(state)
      })

      const customStyle = { strokeWidth: 5, strokeDasharray: '5,5' }

      const props = createEdgeProps({
        id: 'edge-10',
        source: 'source-node',
        target: 'target-node',
        style: customStyle,
      })

      const { container } = render(<FloatingEdge {...props} />)

      const mainEdge = container.querySelector('[data-testid="base-edge-edge-10"]')
      expect(mainEdge).toHaveStyle({ strokeWidth: 5 })
      expect(mainEdge).toHaveStyle({ strokeDasharray: '5,5' })
      expect(mainEdge).toHaveStyle({ stroke: '#8B5CF6' }) // Default stroke preserved
    })
  })
})
