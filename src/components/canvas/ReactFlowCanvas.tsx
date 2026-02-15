'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NoteNode from './NoteNode';
import FloatingEdge from './FloatingEdge';
import { useTheme } from '@/contexts/ThemeContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

// Loading skeleton for NoteEditor
function NoteEditorSkeleton() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1E293B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4 animate-pulse">
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#475569]">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </div>
        <div className="flex-1 p-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#475569]">
          <div className="flex justify-end gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lazy load NoteEditor - it's only needed when editing a note
const NoteEditor = dynamic(() => import('./NoteEditor'), {
  ssr: false,
  loading: () => <NoteEditorSkeleton />,
});

interface Note {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  fontFamily?: string | null;
  fontSize?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface NoteConnection {
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
  initialConnections?: NoteConnection[];
  initialViewport?: { x: number; y: number; zoom: number };
  selectedNoteId?: string; // For deep linking to specific notes
  openEditorOnLoad?: boolean; // Auto-open editor when note is selected via deep link
  onNoteCreate?: (position: { x: number; y: number }) => void;
  onNoteUpdate?: (noteId: string, position: { x: number; y: number }, size?: { width: number; height: number }, title?: string, content?: string, fontFamily?: string, fontSize?: number) => void;
  onNoteDelete?: (noteId: string) => void;
  onViewportChange?: (viewport: { x: number; y: number; zoom: number }) => void;
  onNoteRestore?: (note: Note) => void;
  onConnectionCreate?: (sourceNoteId: string, targetNoteId: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onNoteDuplicate?: (noteId: string) => void;
  onNavigateToNote?: (noteTitle: string) => void;
  showEmptyState?: boolean;
}

interface CanvasNodeData {
  title: string;
  content: string;
  fontFamily?: string | null;
  fontSize?: number | null;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

function getCanvasNodeData(node: Node): CanvasNodeData {
  const data = (node.data ?? {}) as Record<string, unknown>;

  return {
    title: typeof data.title === 'string' ? data.title : 'Untitled Note',
    content: typeof data.content === 'string' ? data.content : '',
    fontFamily: typeof data.fontFamily === 'string' ? data.fontFamily : null,
    fontSize: typeof data.fontSize === 'number' ? data.fontSize : null,
    onDelete: typeof data.onDelete === 'function' ? (data.onDelete as (id: string) => void) : undefined,
    onDuplicate: typeof data.onDuplicate === 'function' ? (data.onDuplicate as (id: string) => void) : undefined,
  };
}

const nodeTypes = {
  noteNode: NoteNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

function ReactFlowCanvasInner({
  canvasId,
  initialNotes,
  initialConnections,
  initialViewport,
  selectedNoteId,
  openEditorOnLoad,
  onNoteCreate,
  onNoteUpdate,
  onNoteDelete,
  onViewportChange,
  onNoteRestore,
  onConnectionCreate,
  onConnectionDelete,
  onNoteDuplicate,
  onNavigateToNote,
  showEmptyState,
}: ReactFlowCanvasProps) {
  const { theme } = useTheme();
  const { screenToFlowPosition, setViewport, getViewport, fitView, zoomIn, zoomOut } = useReactFlow();
  const viewport = useViewport();
  const prevInitialNotes = useRef<Note[]>(initialNotes);
  const isRestoringViewportRef = useRef(false);
  const [undoStack, setUndoStack] = React.useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = React.useState<RedoAction[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  // Track if we've already opened the editor for a specific note to prevent duplicates
  const openedNoteRef = useRef<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    noteId: string | null;
    noteTitle: string;
  }>({
    isOpen: false,
    noteId: null,
    noteTitle: '',
  });
  const nodesRef = useRef<Node[]>([]);

  // Reset opened note tracking when canvas changes
  useEffect(() => {
    openedNoteRef.current = null;
  }, [canvasId]);

  // Handle deep linking - scroll to and select the specified note
  useEffect(() => {
    if (selectedNoteId && initialNotes.length > 0) {
      const targetNote = initialNotes.find(n => n.id === selectedNoteId);
      if (targetNote) {
        // Center viewport on the note
        const noteWidth = targetNote.width || 300;
        const noteHeight = targetNote.height || 200;
        setViewport(
          {
            x: -targetNote.positionX - noteWidth / 2 + window.innerWidth / 2,
            y: -targetNote.positionY - noteHeight / 2 + window.innerHeight / 2,
            zoom: 1,
          },
          { duration: 500 }
        );
      }
    }
  }, [selectedNoteId, initialNotes, setViewport]);

  // Auto-open editor when openEditorOnLoad is true
  useEffect(() => {
    if (openEditorOnLoad && selectedNoteId && initialNotes.length > 0) {
      // Skip if we've already opened this note (prevents duplicate opens on same canvas)
      if (openedNoteRef.current === selectedNoteId) {
        return;
      }

      const targetNote = initialNotes.find(n => n.id === selectedNoteId);
      if (targetNote) {
        // Mark as opened to prevent duplicates
        openedNoteRef.current = selectedNoteId;
        // Open editor quickly with minimal delay for viewport animation
        setTimeout(() => {
          setEditingNote(targetNote);
          setIsEditorOpen(true);
        }, 300);
      }
    }
    // Reset opened note ref when selectedNoteId is cleared or openEditorOnLoad becomes false
    // This allows re-clicking search results after the URL param is cleared
    if (!selectedNoteId || !openEditorOnLoad) {
      openedNoteRef.current = null;
    }
  }, [openEditorOnLoad, selectedNoteId, initialNotes]);

  const handleNodeDeleteRequest = useCallback((id: string) => {
    const nodeToDelete = nodesRef.current.find(n => n.id === id);
    if (!nodeToDelete) return;

    const nodeData = getCanvasNodeData(nodeToDelete);
    setDeleteConfirmation({
      isOpen: true,
      noteId: id,
      noteTitle: nodeData.title,
    });
  }, []);

  const handleNodeDuplicateRequest = useCallback((id: string) => {
    if (onNoteDuplicate) {
      onNoteDuplicate(id);
    }
  }, [onNoteDuplicate]);

  // Convert notes from database to React Flow nodes
  const initialNodes: Node[] = initialNotes.map((note) => ({
    id: note.id,
    type: 'noteNode',
    position: { x: note.positionX, y: note.positionY },
    data: {
      title: note.title || 'Untitled Note',
      content: note.content || '',
      fontFamily: note.fontFamily,
      fontSize: note.fontSize,
      onDelete: handleNodeDeleteRequest,
      onDuplicate: handleNodeDuplicateRequest,
    },
    style: {
      width: note.width || 300,
      height: note.height || 200,
    },
    // Mark the selected note for deep linking
    selected: selectedNoteId === note.id,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Convert connections from database to React Flow edges
  const initialEdges: Edge[] = (initialConnections || []).map((conn) => ({
    id: conn.id,
    source: conn.sourceNoteId,
    target: conn.targetNoteId,
    type: 'floating',
    animated: false,
    selectable: true, // Feature #49 - Allow edge selection
    deletable: true, // Feature #49 - Allow edge deletion
  }));

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Custom onNodesChange handler to detect deletions
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // Filter out removal changes - we'll handle them via confirmation modal
      const nonRemoveChanges = changes.filter((change) => change.type !== 'remove');

      // Check if any nodes are being deleted and show confirmation
      const deleteChanges = changes.filter((change) => change.type === 'remove' && change.id);

      if (deleteChanges.length > 0) {
        // Show confirmation modal for first deletion
        const change = deleteChanges[0];
        const nodeToDelete = nodes.find(n => n.id === change.id);

        if (nodeToDelete) {
          const nodeData = getCanvasNodeData(nodeToDelete);
          setDeleteConfirmation({
            isOpen: true,
            noteId: change.id,
            noteTitle: nodeData.title,
          });
        }
      }

      // Apply non-removal changes immediately
      if (nonRemoveChanges.length > 0) {
        onNodesChange(nonRemoveChanges);
      }
    },
    [onNodesChange, nodes]
  );

  // Handle confirmed deletion
  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirmation.noteId || !onNoteDelete) return;

    const nodeToDelete = nodes.find(n => n.id === deleteConfirmation.noteId);
    if (!nodeToDelete) return;

    // Save to undo stack before deleting
    const nodeData = getCanvasNodeData(nodeToDelete);
    const note: Note = {
      id: nodeToDelete.id,
      title: nodeData.title,
      content: nodeData.content,
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
    onNoteDelete(deleteConfirmation.noteId);

    // Remove node from local state
    setNodes((nds) => nds.filter((n) => n.id !== deleteConfirmation.noteId));

    // Close modal
    setDeleteConfirmation({ isOpen: false, noteId: null, noteTitle: '' });
  }, [deleteConfirmation.noteId, nodes, onNoteDelete, setNodes]);

  // Handle cancelled deletion
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmation({ isOpen: false, noteId: null, noteTitle: '' });
  }, []);

  // Refs for double-click detection
  const lastClickTime = useRef(0);
  const lastClickPosition = useRef({ x: 0, y: 0 });

  // Handle click on canvas and detect double-click
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      // Close any open node menus/dropdowns when clicking on the canvas
      window.dispatchEvent(new Event('closeNodeMenu'));

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
            console.error('[onPaneClick] Error creating note:', error);
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

  // Helper function to construct a Note object from a Node
  const getNoteFromNode = useCallback((node: Node): Note => {
    const initialNote = initialNotes.find(n => n.id === node.id);
    const nodeData = getCanvasNodeData(node);
    return {
      id: node.id,
      title: nodeData.title,
      content: nodeData.content,
      positionX: node.position.x,
      positionY: node.position.y,
      width: typeof node.style?.width === 'number' ? node.style.width : 300,
      height: typeof node.style?.height === 'number' ? node.style.height : 200,
      fontFamily: nodeData.fontFamily,
      fontSize: nodeData.fontSize,
      createdAt: initialNote?.createdAt,
      updatedAt: initialNote?.updatedAt,
    };
  }, [initialNotes]);

  // Handle node single-click to open editor
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      
      const note = getNoteFromNode(node);
      setEditingNote(note);
      setIsEditorOpen(true);
    },
    [getNoteFromNode]
  );

  // Handle node double-click to open editor
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();

      const note = getNoteFromNode(node);
      setEditingNote(note);
      setIsEditorOpen(true);
    },
    [getNoteFromNode]
  );

  // Handle saving note content from editor
  const handleNoteContentSave = useCallback(
    async (noteId: string, title: string, content: string, fontFamily?: string, fontSize?: number) => {
      if (onNoteUpdate) {
        // Find the node to get its position
        const node = nodes.find(n => n.id === noteId);
        if (node) {
          await onNoteUpdate(noteId, node.position, undefined, title, content, fontFamily, fontSize);

          // Update local state
          setNodes(prev => prev.map(n =>
            n.id === noteId
              ? { ...n, data: { ...n.data, title, content, fontFamily, fontSize } }
              : n
          ));

          // Update the editingNote reference
          if (editingNote && editingNote.id === noteId) {
            setEditingNote(prev => prev ? { ...prev, title, content, fontFamily, fontSize } : null);
          }
        }
      }
    },
    [onNoteUpdate, nodes, editingNote, setNodes]
  );

  // Handle closing the editor
  const handleEditorClose = useCallback(() => {
    setIsEditorOpen(false);
    setEditingNote(null);
  }, []);

  // Handle navigating to a linked note (Feature #74)
  const handleNavigateToNote = useCallback((noteTitle: string) => {
    // Find the note by title in the current nodes
    const targetNode = nodes.find(node => {
      const title = node.data.title;
      if (typeof title !== 'string') return false;
      return title === noteTitle || title.toLowerCase() === noteTitle.toLowerCase();
    });

    if (targetNode) {
      // First try to find full note data in initialNotes
      let noteData = initialNotes.find(n => n.id === targetNode.id);

      // If not found in initialNotes (e.g., newly created note), construct from node data
      if (!noteData) {
        noteData = {
          id: targetNode.id,
          title: String(targetNode.data.title || ''),
          content: String(targetNode.data.content || ''),
          positionX: targetNode.position.x,
          positionY: targetNode.position.y,
          width: Number(targetNode.style?.width || 300),
          height: Number(targetNode.style?.height || 200),
          fontFamily: getCanvasNodeData(targetNode).fontFamily,
          fontSize: getCanvasNodeData(targetNode).fontSize,
        };
      }

      setEditingNote(noteData);
      setIsEditorOpen(true);

      // Optional: Center the view on the target note
      const viewport = getViewport();
      const noteWidth = Number(targetNode.style?.width || 300);
      const noteHeight = Number(targetNode.style?.height || 200);
      setViewport({
        x: -targetNode.position.x + window.innerWidth / 2 / viewport.zoom - noteWidth / 2,
        y: -targetNode.position.y + window.innerHeight / 2 / viewport.zoom - noteHeight / 2,
        zoom: viewport.zoom,
      });

      // Save viewport change
      if (onViewportChange) {
        onViewportChange({
          x: -targetNode.position.x + window.innerWidth / 2 / viewport.zoom - noteWidth / 2,
          y: -targetNode.position.y + window.innerHeight / 2 / viewport.zoom - noteHeight / 2,
          zoom: viewport.zoom,
        });
      }
    } else {
      // Note not found - could offer to create it
      console.warn(`Note "${noteTitle}" not found in current canvas`);
    }
  }, [nodes, initialNotes, getViewport, setViewport, onViewportChange]);

  // Handle connections - create new connection
  const onConnect = useCallback(
    (connection: Connection) => {
      // Add edge to local state immediately (optimistic update)
      setEdges((eds) => addEdge({
        ...connection,
        type: 'floating',
        animated: false,
        selectable: true,
        deletable: true,
      }, eds));

      // Persist to API in the background
      if (onConnectionCreate) {
        onConnectionCreate(connection.source, connection.target);
      }
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

  // Update nodes when initialNotes change - SMART SYNC (don't replace entire state)
  useEffect(() => {
    // Only update if initialNotes reference has actually changed (by reference)
    const previousNotes = prevInitialNotes.current;
    const addedNotes = initialNotes.filter(note =>
      !previousNotes?.some(pn => pn.id === note.id)
    );

    // Find notes that were removed (exist in prev but not in current)
    const removedNoteIds = new Set(
      previousNotes
        ?.filter(pn => !initialNotes.some(cn => cn.id === pn.id))
        ?.map(pn => pn.id)
    );

    // Merge new changes with existing nodes state
    setNodes((currentNodes) => {
      // Start with existing current nodes
      const updatedNodes = [...currentNodes];

      // Add new notes
      for (const note of addedNotes) {
        const nodeData = {
          id: note.id,
          type: 'noteNode',
          position: { x: note.positionX, y: note.positionY },
          data: {
            title: note.title || 'Untitled Note',
            content: note.content || '',
            fontFamily: note.fontFamily,
            fontSize: note.fontSize,
            onDelete: handleNodeDeleteRequest,
            onDuplicate: handleNodeDuplicateRequest,
          },
          style: {
            width: note.width || 300,
            height: note.height || 200,
          },
        };
        updatedNodes.push(nodeData);
      }

      // Remove deleted notes (in reverse order to maintain indices)
      for (const noteId of removedNoteIds) {
        const index = updatedNodes.findIndex(n => n.id === noteId);
        if (index !== -1) {
          updatedNodes.splice(index, 1);
        }
      }

      return updatedNodes;
    });

    // Update ref for next comparison
    prevInitialNotes.current = initialNotes;
  }, [initialNotes, setNodes, handleNodeDeleteRequest, handleNodeDuplicateRequest]);

  // Update edges when initialConnections change
  useEffect(() => {
    const newEdges: Edge[] = (initialConnections || []).map((conn) => ({
      id: conn.id,
      source: conn.sourceNoteId,
      target: conn.targetNoteId,
      type: 'floating',
      animated: false,
      selectable: true, // Feature #49 - Allow edge selection
      deletable: true, // Feature #49 - Allow edge deletion
    }));

    setEdges(newEdges);
  }, [initialConnections, setEdges]);

  // Restore viewport state when initialViewport changes or center canvas on load (Feature #53)
  useEffect(() => {
    if (initialViewport) {
      // Restore saved viewport state — flag to skip the onMoveEnd save
      isRestoringViewportRef.current = true;
      setViewport(initialViewport);
      // Clear the flag after ReactFlow's onMoveEnd has had time to fire.
      // onMoveEnd is debounced/async, so requestAnimationFrame is too early.
      const timer = setTimeout(() => {
        isRestoringViewportRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
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
      // Skip saving when we're just restoring the initial viewport from the server
      if (isRestoringViewportRef.current) return;
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
      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement;
      const isInInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Check for Ctrl+Z or Cmd+Z for undo (Feature #55)
      // Only trigger if not in an input field to avoid conflicts with browser undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey && !isInInputField) {
        event.preventDefault();
        if (undoStack.length > 0) {
          const lastAction = undoStack[undoStack.length - 1];

          if (lastAction.type === 'delete' && onNoteDelete && onNoteRestore) {
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
                onDelete: handleNodeDeleteRequest,
                onDuplicate: handleNodeDuplicateRequest,
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
      // Only trigger if not in an input field to avoid conflicts with browser redo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey && !isInInputField) {
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

      // Check for Delete or Backspace keys to delete selected nodes (Feature #71) and edges (Feature #49)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't trigger if in an input field
        if (
          (event.target as HTMLElement).tagName !== 'INPUT' &&
          (event.target as HTMLElement).tagName !== 'TEXTAREA' &&
          !(event.target as HTMLElement).isContentEditable
        ) {
          // Feature #49: Check for selected edges first
          const selectedEdges = edges.filter(e => e.selected);
          if (selectedEdges.length > 0) {
            event.preventDefault();
            // Delete selected edges
            selectedEdges.forEach(edge => {
              if (onConnectionDelete) {
                onConnectionDelete(edge.id);
              }
            });
            // Remove from local state
            setEdges(prev => prev.filter(e => !e.selected));
            return;
          }

          // Get selected nodes from React Flow
          const selectedNodes = nodes.filter(n => n.selected);
          if (selectedNodes.length > 0) {
            event.preventDefault();
            // Show confirmation modal for first selected node
            const nodeToDelete = selectedNodes[0];
            setDeleteConfirmation({
              isOpen: true,
              noteId: nodeToDelete.id,
              noteTitle: getCanvasNodeData(nodeToDelete).title,
            });
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
              console.error('[KeyDown] Error creating note with N key:', error);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undoStack,
    redoStack,
    onNoteRestore,
    onNoteDelete,
    setNodes,
    onNoteCreate,
    getViewport,
    nodes,
    handleNodeDeleteRequest,
    handleNodeDuplicateRequest,
  ]);

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

  // Handler to zoom in
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  // Handler to zoom out
  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

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

  // Handler to zoom to fit all nodes (Feature #50)
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // Handler for fullscreen toggle
  const handleFullscreen = useCallback(() => {
    const canvasElement = document.querySelector('.react-flow') as HTMLElement;
    if (!canvasElement) return;

    if (!document.fullscreenElement) {
      canvasElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Get current zoom percentage for display
  const zoomPercentage = Math.round(viewport.zoom * 100);

  // Track fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Listen for fullscreen changes to update state and apply theme-aware background
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      
      // Apply theme-aware background color when entering/exiting fullscreen
      const canvasElement = document.querySelector('.react-flow') as HTMLElement;
      if (canvasElement) {
        if (fullscreen) {
          canvasElement.style.backgroundColor = theme === 'dark' ? '#1E293B' : '#FAFAFA';
        } else {
          canvasElement.style.backgroundColor = '';
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [theme]);

  // Determine background color based on theme and fullscreen state
  const backgroundColor = isFullscreen
    ? (theme === 'dark' ? '#1E293B' : '#FAFAFA')
    : undefined;

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        selectionKeyCode={null}
        multiSelectionKeyCode="Shift"
        connectionMode={ConnectionMode.Loose}
        panOnScroll
        zoomOnDoubleClick={false}
        selectionOnDrag
        className="bg-[#FAFAFA] dark:bg-[#1E293B]"
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={theme === 'dark' ? '#475569' : '#CBD5E1'}
        />
        <MiniMap
          nodeColor={(node) => {
            // Use purple-tinted colors for note nodes in minimap (Stitch design)
            return theme === 'dark' ? '#374151' : '#F3F4F6';
          }}
          maskColor={theme === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(139, 92, 246, 0.08)'}
          pannable
          zoomable
          position="bottom-right"
          className="!bg-white/90 dark:!bg-gray-800/90 !border !border-gray-200/60 dark:!border-gray-600/40 !rounded-lg !shadow-lg"
          ariaLabel="Canvas minimap"
        />
      </ReactFlow>

      {/* Canvas Controls (Stitch design) - positioned bottom left */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          padding: '6px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
          zIndex: 20,
        }}
      >
        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom Percentage */}
        <button
          onClick={handleResetZoom}
          title="Reset zoom to 100%"
          aria-label="Reset zoom to 100%"
          style={{
            minWidth: '44px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {zoomPercentage}%
        </button>

        {/* Fit View Button */}
        <button
          onClick={handleFitView}
          title="Zoom to fit all notes"
          aria-label="Zoom to fit all notes"
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={handleFullscreen}
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
          style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            color: theme === 'dark' ? '#9ca3af' : '#6b7280',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>

      {/* Empty State Overlay - shows when there are no notes */}
      {showEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm p-8 rounded-xl shadow-xl border border-gray-200/60 dark:border-gray-600/40 max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-gray-800 dark:text-gray-100 text-lg font-medium mb-2">
              No notes yet
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Double-click anywhere or press{' '}
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-mono text-purple-600 dark:text-purple-400">
                N
              </kbd>{' '}
              to create your first note
            </p>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {isEditorOpen && (
        <NoteEditor
          note={editingNote}
          isOpen={isEditorOpen}
          onClose={handleEditorClose}
          onSave={handleNoteContentSave}
          canvasId={canvasId}
          onNavigateToNote={handleNavigateToNote}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        noteTitle={deleteConfirmation.noteTitle}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
