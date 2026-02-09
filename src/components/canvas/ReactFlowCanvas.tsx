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

interface UndoAction {
  type: 'delete';
  note: Note;
  timestamp: number;
}

interface ReactFlowCanvasProps {
  canvasId: string;
  initialNotes: Note[];
  initialViewport?: { x: number; y: number; zoom: number };
  onNoteCreate?: (position: { x: number; y: number }) => void;
  onNoteUpdate?: (noteId: string, position: { x: number; y: number }) => void;
  onNoteDelete?: (noteId: string) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onNoteRestore?: (note: Note) => void;
}

const nodeTypes = {
  noteNode: NoteNode,
};

function ReactFlowCanvasInner({
  canvasId,
  initialNotes,
  initialViewport,
  onNoteCreate,
  onNoteUpdate,
  onNoteDelete,
  onViewportChange,
  onNoteRestore,
}: ReactFlowCanvasProps) {
  const { screenToFlowPosition, setViewport, getViewport } = useReactFlow();
  const lastClickTime = useRef(0);
  const lastClickPosition = useRef({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = React.useState<UndoAction[]>([]);

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

  // Custom onNodesChange handler to detect deletions
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // Before applying changes, check if any nodes are being deleted and save them to undo stack
      changes.forEach((change) => {
        if (change.type === 'remove' && change.id) {
          // Find the node being deleted
          const nodeToDelete = nodes.find(n => n.id === change.id);
          if (nodeToDelete && onNoteDelete) {
            // Save to undo stack before deleting
            const note: Note = {
              id: nodeToDelete.id,
              title: nodeToDelete.data.title || 'Untitled Note',
              content: nodeToDelete.data.content || '',
              positionX: nodeToDelete.position.x,
              positionY: nodeToDelete.position.y,
              width: typeof nodeToDelete.style?.width === 'number' ? nodeToDelete.style.width : 300,
              height: typeof nodeToDelete.style?.height === 'number' ? nodeToDelete.style.height : 200,
            };

            setUndoStack(prev => [...prev, {
              type: 'delete',
              note,
              timestamp: Date.now(),
            }]);

            // Call the delete API
            onNoteDelete(change.id);
          }
        }
      });

      onNodesChange(changes);
    },
    [onNodesChange, onNoteDelete, nodes]
  );

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

  // Restore viewport state when initialViewport changes
  useEffect(() => {
    if (initialViewport) {
      setViewport(initialViewport);
    }
  }, [initialViewport, setViewport]);

  // Handle viewport changes (pan and zoom)
  const onMoveEnd = useCallback(
    (event: React.MouseEvent | MouseEvent | TouchEvent | null, viewport: { x: number; y: number; zoom: number }) => {
      if (onViewportChange) {
        onViewportChange({
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        });
      }
    },
    [onViewportChange]
  );

  // Handle keyboard shortcuts for undo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (undoStack.length > 0) {
          const lastAction = undoStack[undoStack.length - 1];

          if (lastAction.type === 'delete' && onNoteRestore) {
            // Restore the deleted note
            onNoteRestore(lastAction.note);

            // Remove from undo stack
            setUndoStack(prev => prev.slice(0, -1));

            // Add the note back to the nodes state
            const restoredNode: Node = {
              id: lastAction.note.id,
              type: 'noteNode',
              position: { x: lastAction.note.positionX, y: lastAction.note.positionY },
              data: {
                title: lastAction.note.title,
                content: lastAction.note.content,
              },
              style: {
                width: lastAction.note.width,
                height: lastAction.note.height,
              },
            };

            setNodes(prev => [...prev, restoredNode]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, onNoteRestore, setNodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      onMoveEnd={onMoveEnd}
      nodeTypes={nodeTypes}
      fitView={initialViewport ? undefined : true}
      deleteKeyCode="Delete"
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
