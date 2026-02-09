'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NoteNode from './NoteNode';

interface Note {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

interface ReactFlowCanvasProps {
  canvasId: string;
  initialNotes: Note[];
  onNoteCreate?: (position: { x: number; y: number }) => void;
  onNoteUpdate?: (noteId: string, position: { x: number; y: number }) => void;
}

const nodeTypes = {
  noteNode: NoteNode,
};

function ReactFlowCanvasInner({
  canvasId,
  initialNotes,
  onNoteCreate,
  onNoteUpdate,
}: ReactFlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const lastClickTime = useRef(0);
  const lastClickPosition = useRef({ x: 0, y: 0 });

  // Convert notes from database to React Flow nodes
  const initialNodes: Node[] = initialNotes.map((note) => ({
    id: note.id,
    type: 'noteNode',
    position: { x: note.positionX, y: note.positionY },
    data: {
      title: note.title || 'Untitled Note',
      content: note.content || '',
    },
    style: {
      width: note.width || 300,
      height: note.height || 200,
    },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Handle click on canvas to detect double-click
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now();
      const timeDiff = now - lastClickTime.current;
      const position = { x: event.clientX, y: event.clientY };
      const distance = Math.sqrt(
        Math.pow(position.x - lastClickPosition.current.x, 2) +
        Math.pow(position.y - lastClickPosition.current.y, 2)
      );

      // Check if this is a double-click (within 300ms and close in position)
      if (timeDiff < 300 && distance < 10) {
        if (onNoteCreate) {
          try {
            const flowPosition = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            onNoteCreate(flowPosition);
          } catch (error) {
            console.error('Error creating note:', error);
          }
        }
      }

      lastClickTime.current = now;
      lastClickPosition.current = position;
    },
    [onNoteCreate, screenToFlowPosition]
  );

  // Handle node drag end to update position in database
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNoteUpdate) {
        onNoteUpdate(node.id, node.position);
      }
    },
    [onNoteUpdate]
  );

  // Handle connections (for future feature)
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // Update nodes when initialNotes change
  useEffect(() => {
    const newNodes: Node[] = initialNotes.map((note) => ({
      id: note.id,
      type: 'noteNode',
      position: { x: note.positionX, y: note.positionY },
      data: {
        title: note.title || 'Untitled Note',
        content: note.content || '',
      },
      style: {
        width: note.width || 300,
        height: note.height || 200,
      },
    }));

    setNodes(newNodes);
  }, [initialNotes, setNodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      fitView
      className="bg-[#F8FAFC] dark:bg-[#1E293B]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        color="#CBD5E1"
      />
      <Controls />
    </ReactFlow>
  );
}

export default function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
