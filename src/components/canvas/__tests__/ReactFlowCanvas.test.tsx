import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import ReactFlowCanvas from '../ReactFlowCanvas'

const mockSetViewport = vi.fn()
const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }))
const mockFitView = vi.fn()
const mockZoomIn = vi.fn()
const mockZoomOut = vi.fn()

let latestReactFlowProps: any = null

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

vi.mock('../DeleteConfirmationModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
    isOpen ? <button onClick={onConfirm}>Confirm delete</button> : null,
}))

vi.mock('@xyflow/react', async () => {
  const React = await import('react')

  const useNodesState = (initialNodes: any[]) => {
    const [nodes, setNodes] = React.useState(initialNodes)

    const onNodesChange = vi.fn((changes: Array<{ type: string; id: string; selected?: boolean }>) => {
      setNodes((prev: any[]) => {
        let next = [...prev]
        for (const change of changes) {
          if (change.type === 'remove') {
            next = next.filter((node) => node.id !== change.id)
          } else if (change.type === 'select') {
            next = next.map((node) =>
              node.id === change.id ? { ...node, selected: Boolean(change.selected) } : node
            )
          }
        }
        return next
      })
    })

    return [nodes, setNodes, onNodesChange]
  }

  const useEdgesState = (initialEdges: any[]) => {
    const [edges, setEdges] = React.useState(initialEdges)
    const onEdgesChange = vi.fn()
    return [edges, setEdges, onEdgesChange]
  }

  return {
    ReactFlow: (props: any) => {
      latestReactFlowProps = props
      return <div data-testid="react-flow" />
    },
    Background: () => null,
    MiniMap: () => null,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNodesState,
    useEdgesState,
    useViewport: () => ({ zoom: 1 }),
    useReactFlow: () => ({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      setViewport: mockSetViewport,
      getViewport: mockGetViewport,
      fitView: mockFitView,
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
    }),
    addEdge: (edge: any, edges: any[]) => [...edges, edge],
    ConnectionMode: { Loose: 'Loose' },
    BackgroundVariant: { Dots: 'dots' },
  }
})

describe('ReactFlowCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    latestReactFlowProps = null
  })

  it('preserves delete/duplicate callbacks on undo-restored nodes', async () => {
    const onNoteDelete = vi.fn()
    const onNoteRestore = vi.fn()

    render(
      <ReactFlowCanvas
        canvasId="canvas-1"
        initialNotes={[
          {
            id: 'note-1',
            title: 'Note 1',
            content: 'Body',
            positionX: 100,
            positionY: 120,
            width: 300,
            height: 200,
          },
        ]}
        selectedNoteId="note-1"
        onNoteDelete={onNoteDelete}
        onNoteRestore={onNoteRestore}
        onNoteDuplicate={vi.fn()}
      />
    )

    fireEvent.keyDown(window, { key: 'Delete' })
    fireEvent.click(await screen.findByText('Confirm delete'))

    await waitFor(() => {
      expect(onNoteDelete).toHaveBeenCalledWith('note-1')
    })

    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    await waitFor(() => {
      expect(onNoteRestore).toHaveBeenCalledTimes(1)
      const restoredNode = latestReactFlowProps.nodes.find((node: any) => node.id === 'note-1')
      expect(restoredNode).toBeDefined()
      expect(typeof restoredNode.data.onDelete).toBe('function')
      expect(typeof restoredNode.data.onDuplicate).toBe('function')
    })
  })
})
