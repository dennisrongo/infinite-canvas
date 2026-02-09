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

interface Connection {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
}

interface UndoAction {
  type: 'delete';
  note: Note;
  timestamp: number;
}

interface RedoAction {
  type: 'delete';
  note: Note;
  timestamp: number;
}

interface ReactFlowCanvasProps {
  canvasId: string;
  initialNotes: Note[];
  initialConnections?: Connection[];
  initialViewport?: { x: number; y: number; zoom: number };
  onNoteCreate?: (position: { x: number; y: number }) => void;
  onNoteUpdate?: (noteId: string, position: { x: number; y: number }, size?: { width: number; height: number }) => void;
  onNoteDelete?: (noteId: string) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onNoteRestore?: (note: Note) => void;
  onConnectionCreate?: (sourceNoteId: string, targetNoteId: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
}

const nodeTypes = {
  noteNode: NoteNode,
};

function ReactFlowCanvasInner({
  canvasId,
  initialNotes,
  initialConnections,
  initialViewport,
  onNoteCreate,
  onNoteUpdate,
  onNoteDelete,
  onViewportChange,
  onNoteRestore,
  onConnectionCreate,
  onConnectionDelete,
}: ReactFlowCanvasProps) {
  const { screenToFlowPosition, setViewport, getViewport, fitView } = useReactFlow();
  const lastClickTime = useRef(0);
  const lastClickPosition = useRef({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = React.useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = React.useState<RedoAction[]>([]);

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

  // Convert connections from database to React Flow edges
  const initialEdges: Edge[] = (initialConnections || []).map((conn) => ({
    id: conn.id,
    source: conn.sourceNoteId,
    target: conn.targetNoteId,
    type: 'smoothstep',
    animated: false,
  }));

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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

            // Clear redo stack when new action is performed (Feature #56)
            setRedoStack([]);

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

  // Handle connections - create new connection
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (onConnectionCreate) {
        // Call the API to create the connection
        await onConnectionCreate(connection.source, connection.target);
      }

      // Add edge to local state
      setEdges((eds) => addEdge({
        ...connection,
        type: 'smoothstep',
        animated: false,
      }, eds));
    },
    [setEdges, onConnectionCreate]
  );

  // Custom onEdgesChange handler to detect deletions
  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      // Check if any edges are being deleted
      changes.forEach((change) => {
        if (change.type === 'remove' && change.id && onConnectionDelete) {
          // Call the API to delete the connection
          onConnectionDelete(change.id);
        }
      });

      onEdgesChange(changes);
    },
    [onEdgesChange, onConnectionDelete]
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

  // Update edges when initialConnections change
  useEffect(() => {
    const newEdges: Edge[] = (initialConnections || []).map((conn) => ({
      id: conn.id,
      source: conn.sourceNoteId,
      target: conn.targetNoteId,
      type: 'smoothstep',
      animated: false,
    }));

    setEdges(newEdges);
  }, [initialConnections, setEdges]);

  // Restore viewport state when initialViewport changes or center canvas on load (Feature #53)
  useEffect(() => {
    if (initialViewport) {
      // Restore saved viewport state
      setViewport(initialViewport);
    } else if (nodes.length > 0) {
      // Auto-center on notes when loading a canvas with notes
      // Small delay to ensure ReactFlow has initialized
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 0 });
      }, 100);
    }
  }, [initialViewport, setViewport, fitView]);

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

  // Handle keyboard shortcuts for undo, redo, and creating notes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z for undo (Feature #55)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (undoStack.length > 0) {
          const lastAction = undoStack[undoStack.length - 1];

          if (lastAction.type === 'delete' && onNoteDelete) {
            // Restore the deleted note
            onNoteRestore(lastAction.note);

            // Move action from undo stack to redo stack (Feature #56)
            setUndoStack(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, lastAction]);

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

      // Check for Ctrl+Shift+Z or Cmd+Shift+Z for redo (Feature #56)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        if (redoStack.length > 0) {
          const lastRedoAction = redoStack[redoStack.length - 1];

          if (lastRedoAction.type === 'delete' && onNoteDelete) {
            // Re-apply the deleted note (delete it again)
            onNoteDelete(lastRedoAction.note.id);

            // Remove from nodes state
            setNodes(prev => prev.filter(n => n.id !== lastRedoAction.note.id));

            // Move action from redo stack back to undo stack
            setRedoStack(prev => prev.slice(0, -1));
            setUndoStack(prev => [...prev, lastRedoAction]);
          }
        }
      }

      // Check for 'N' key to create a new note (Feature #54)
      // Only trigger if no modifier keys are pressed and not in an input field
      if (event.key === 'n' || event.key === 'N') {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey &&
          (event.target as HTMLElement).tagName !== 'INPUT' &&
          (event.target as HTMLElement).tagName !== 'TEXTAREA' &&
          !(event.target as HTMLElement).isContentEditable
        ) {
          event.preventDefault();
          if (onNoteCreate) {
            try {
              // Get current viewport to center the new note
              const viewport = getViewport();
              // Calculate center position in flow coordinates
              const centerX = -viewport.x + (window.innerWidth / 2) / viewport.zoom;
              const centerY = -viewport.y + (window.innerHeight / 2) / viewport.zoom;

              onNoteCreate({ x: centerX, y: centerY });
            } catch (error) {
              console.error('Error creating note with N key:', error);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, onNoteRestore, onNoteDelete, setNodes, onNoteCreate, getViewport]);

  // Handle node resize events from NoteNode
  useEffect(() => {
    const handleResize = (event: any) => {
      if (event.detail && onNoteUpdate) {
        const { id, width, height } = event.detail;
        const node = nodes.find(n => n.id === id);
        if (node) {
          onNoteUpdate(id, node.position, { width, height });
        }
      }
    };

    window.addEventListener('nodeResize', handleResize);
    return () => window.removeEventListener('nodeResize', handleResize);
  }, [nodes, onNoteUpdate]);

  // Handler to reset zoom to 100% (Feature #52)
  const handleResetZoom = useCallback(() => {
    const currentViewport = getViewport();
    setViewport({
      x: currentViewport.x,
      y: currentViewport.y,
      zoom: 1,
    });

    // Save the new viewport state
    if (onViewportChange) {
      onViewportChange({
        x: currentViewport.x,
        y: currentViewport.y,
        zoom: 1,
      });
    }
  }, [setViewport, getViewport, onViewportChange]);

  // Custom control button for reset zoom
  const ResetZoomControl = () => (
    <button
      onClick={handleResetZoom}
      className="react-flow__controls-button"
      title="Reset zoom to 100%"
      aria-label="Reset zoom to 100%"
      style={{
        border: 'none',
        background: 'inherit',
        padding: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <text x="6" y="17" fontSize="12" fontWeight="bold" fill="currentColor">1:1</text>
      </svg>
    </button>
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      onMoveEnd={onMoveEnd}
      nodeTypes={nodeTypes}
      deleteKeyCode="Delete"
      className="bg-[#F8FAFC] dark:bg-[#1E293B]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        color="#CBD5E1"
      />
      <Controls>
        <ResetZoomControl />
      </Controls>
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
