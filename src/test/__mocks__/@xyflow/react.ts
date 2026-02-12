/**
 * Mock for @xyflow/react (ReactFlow)
 * This provides a minimal implementation for testing canvas components
 */

import { ReactElement } from 'react'
import { ReactFlowRef } from '@xyflow/react'

export interface MockNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: Record<string, any>
}

export interface MockEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface ReactFlowProps {
  nodes: MockNode[]
  edges: MockEdge[]
  onNodesChange?: (changes: any[]) => void
  onEdgesChange?: (changes: any[]) => void
  onConnect?: (connection: any) => void
  onNodeClick?: (event: any, node: MockNode) => void
  onEdgeClick?: (event: any, edge: MockEdge) => void
  onPaneClick?: (event: any) => void
  nodeTypes?: Record<string, React.ElementType>
  edgeTypes?: Record<string, React.ElementType>
  fitView?: boolean
  defaultViewport?: { x: number; y: number; zoom: number }
  minZoom?: number
  maxZoom?: number
  children?: React.ReactNode
  className?: string
  proOptions?: { hideAttribution: boolean }
}

export const Background = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children)
}

export const Controls = () => {
  return React.createElement('div', { 'data-testid': 'react-flow-controls' })
}

export const MiniMap = () => {
  return React.createElement('div', { 'data-testid': 'react-flow-minimap' })
}

export const MarkerType = {
  Arrow: 'arrow',
  ArrowClosed: 'arrowclosed',
}

export const applyNodeChanges = <T,>(changes: any[], nodes: T[]): T[] => {
  return nodes
}

export const applyEdgeChanges = <T,>(changes: any[], edges: T[]): T[] => {
  return edges
}

export const addEdge = <T,>(edgeParams: any, edges: T[]): T[] => {
  return edges
}

export const ConnectionMode = {
  Strict: 'strict',
  Loose: 'loose',
}

export const Panel = ({ children, position }: { children: React.ReactNode; position?: string }) => {
  return React.createElement('div', { 'data-testid': `react-flow-panel-${position || 'default'}` }, children)
}

export const ReactFlowProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children)
}

const ReactFlowComponent = ({ nodes, edges, children, className = '' }: ReactFlowProps) => {
  return React.createElement('div', { className: `react-flow ${className}`, 'data-testid': 'react-flow' },
    children,
    React.createElement('div', { 'data-testid': 'react-flow-nodes', 'data-nodes-count': nodes.length }),
    React.createElement('div', { 'data-testid': 'react-flow-edges', 'data-edges-count': edges.length })
  )
}

ReactFlowComponent.displayName = 'ReactFlow'

export const ReactFlow = ReactFlowComponent

export const useReactFlow = (): ReactFlowRef => {
  return {
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setZoom: vi.fn(),
    getZoom: vi.fn(() => 1),
    setViewport: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
    setCenter: vi.fn(),
    fitBounds: vi.fn(),
    project: vi.fn((position) => position),
    toObject: vi.fn(() => ({ nodes: [], edges: [] })),
    deleteElements: vi.fn(),
    getNodes: vi.fn(() => []),
    getEdges: vi.fn(() => []),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    addNodes: vi.fn(),
    addEdges: vi.fn(),
  }
}

export const useNodesState = <T,>(initialNodes: T[]): [T[], any, any] => {
  return [initialNodes, vi.fn(), vi.fn()]
}

export const useEdgesState = <T,>(initialEdges: T[]): [T[], any, any] => {
  return [initialEdges, vi.fn(), vi.fn()]
}

export const getBezierPath = vi.fn(() => ['', 0, 0, 0, 0])

export const getMarkerEnd = vi.fn(() => '')

export const isNode = (obj: any): obj is MockNode => {
  return obj?.id && obj?.position
}

export const isEdge = (obj: any): obj is MockEdge => {
  return obj?.id && obj?.source && obj?.target
}

export default {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  getBezierPath,
  getMarkerEnd,
  isNode,
  isEdge,
}
