'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import NoteNode from './NoteNode';
import FloatingEdge from './FloatingEdge';
import NoteEditor from './NoteEditor';
import { useTheme } from '@/contexts/ThemeContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';

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
  const { screenToFlowPosition, setViewport, getViewport, fitView } = useReactFlow();
  const prevInitialNotes = useRef<Note[]>(initialNotes);
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
        }, 300); // Reduced delay - viewport animates for 500ms but we can start opening earlier
      }
    }
    // Reset opened note ref when selectedNoteId changes (for navigating to different notes)
    if (!selectedNoteId) {
      openedNoteRef.current = null;
    }
  }, [openEditorOnLoad, selectedNoteId, initialNotes]);

  // Handler for duplicating a note
  const handleNoteDuplicate = useCallback((noteId: string) => {
    if (onNoteDuplicate) {
      onNoteDuplicate(noteId);
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
      onDuplicate: handleNoteDuplicate,
      fontFamily: note.fontFamily,
      fontSize: note.fontSize,
    },
    style: {
      width: note.width || 300,
      height: note.height || 200,
    },
    // Mark the selected note for deep linking
    selected: selectedNoteId === note.id,
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

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
          setDeleteConfirmation({
            isOpen: true,
            noteId: change.id,
            noteTitle: (nodeToDelete.data as any).title || 'Untitled Note',
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
    const note: Note = {
      id: nodeToDelete.id,
      title: (nodeToDelete.data as any).title || 'Untitled Note',
      content: (nodeToDelete.data as any).content || '',
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
      const now = Date.now();
      const timeDiff = now - lastClickTime.current;
      const position = { x: event.clientX, y: event.clientY };
      const distance = Math.sqrt(
        Math.pow(position.x - lastClickPosition.current.x, 2) +
        Math.pow(position.y - lastClickPosition.current.y, 2)
      );

      // Debug logging
      console.log('[onPaneClick]', { clientX: event.clientX, clientY: event.clientY, timeDiff, distance });

      // Check if this is a double-click (within 300ms and close in position)
      if (timeDiff < 300 && distance < 10) {
        console.log('[onPaneClick] Double-click detected! Creating note...');
        if (onNoteCreate) {
          try {
            const flowPosition = screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });
            console.log('[onPaneClick] Flow position:', flowPosition);
            onNoteCreate(flowPosition);
            console.log('[onPaneClick] Note created successfully');
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

  // Handle node double-click to open editor
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation();
      console.log('[onNodeDoubleClick] Opening node:', node.id, node.data);

      // CRITICAL FIX: Need to construct a Note object from the Node
      // Nodes have structure: { id, data: { title, content, ... }, position, ... }
      // Notes have structure: { id, title, content, positionX, positionY, ... }
      let note: Note | undefined;

      // First, check initialNotes for a Note object with metadata like createdAt, updatedAt
      const initialNote = initialNotes.find(n => n.id === node.id);
      if (initialNote) {
        note = initialNote;
      }

      // Always construct Note object from current node data (most up-to-date)
      note = {
        id: node.id,
        title: (node.data as any).title || 'Untitled Note',
        content: (node.data as any).content || '',
        positionX: node.position.x,
        positionY: node.position.y,
        width: typeof node.style?.width === 'number' ? node.style.width : 300,
        height: typeof node.style?.height === 'number' ? node.style.height : 200,
        fontFamily: (node.data as any).fontFamily,
        fontSize: (node.data as any).fontSize,
        createdAt: initialNote?.createdAt,
        updatedAt: initialNote?.updatedAt,
      };

      console.log('[onNodeDoubleClick] Constructed note object:', note);
      setEditingNote(note);
      setIsEditorOpen(true);
    },
    [nodes, initialNotes]
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
    console.log('[handleNavigateToNote] Looking for note:', noteTitle);

    // Find the note by title in the current nodes
    const targetNode = nodes.find(node => {
      const title = node.data.title;
      if (typeof title !== 'string') return false;
      return title === noteTitle || title.toLowerCase() === noteTitle.toLowerCase();
    });

    if (targetNode) {
      console.log('[handleNavigateToNote] Found note node:', targetNode.id);

      // First try to find full note data in initialNotes
      let noteData = initialNotes.find(n => n.id === targetNode.id);

      // If not found in initialNotes (e.g., newly created note), construct from node data
      if (!noteData) {
        console.log('[handleNavigateToNote] Note not in initialNotes, using current node data');
        noteData = {
          id: targetNode.id,
          title: String(targetNode.data.title || ''),
          content: String(targetNode.data.content || ''),
          positionX: targetNode.position.x,
          positionY: targetNode.position.y,
          width: Number(targetNode.style?.width || 300),
          height: Number(targetNode.style?.height || 200),
          fontFamily: (targetNode.data as any).fontFamily,
          fontSize: (targetNode.data as any).fontSize,
        };
      }

      console.log('[handleNavigateToNote] Setting editing note:', noteData);
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

    console.log('[Sync Effect] initialNotes changed:', {
      prevCount: previousNotes?.length || 0,
      currentCount: initialNotes.length,
      addedCount: addedNotes.length,
      addedNotes: addedNotes.map(n => n.id)
    });

    // Find notes that were removed (exist in prev but not in current)
    const removedNoteIds = new Set(
      previousNotes
        ?.filter(pn => !initialNotes.some(cn => cn.id === pn.id))
        ?.map(pn => pn.id)
    );

    console.log('[Sync Effect] removedNoteIds:', Array.from(removedNoteIds));

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
            onDuplicate: handleNoteDuplicate,
            fontFamily: note.fontFamily,
            fontSize: note.fontSize,
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

      console.log('[Sync Effect] Final nodes count:', updatedNodes.length);
      return updatedNodes;
    });

    // Update ref for next comparison
    prevInitialNotes.current = initialNotes;
  }, [initialNotes, setNodes, handleNoteDuplicate]);

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
              noteTitle: (nodeToDelete.data as any).title || 'Untitled Note',
            });
          }
        }
      }

      // Check for 'N' key to create a new note (Feature #54)
      // Only trigger if no modifier keys are pressed and not in an input field
      if (event.key === 'n' || event.key === 'N') {
        console.log('[KeyDown] N key pressed');
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey &&
          (event.target as HTMLElement).tagName !== 'INPUT' &&
          (event.target as HTMLElement).tagName !== 'TEXTAREA' &&
          !(event.target as HTMLElement).isContentEditable
        ) {
          console.log('[KeyDown] N key conditions met, creating note');
          event.preventDefault();
          if (onNoteCreate) {
            try {
              // Get current viewport to center the new note
              const viewport = getViewport();
              console.log('[KeyDown] Viewport:', viewport);
              // Calculate center position in flow coordinates
              const centerX = -viewport.x + (window.innerWidth / 2) / viewport.zoom;
              const centerY = -viewport.y + (window.innerHeight / 2) / viewport.zoom;
              console.log('[KeyDown] Creating note at center:', { centerX, centerY });

              onNoteCreate({ x: centerX, y: centerY });
              console.log('[KeyDown] onNoteCreate called successfully');
            } catch (error) {
              console.error('[KeyDown] Error creating note with N key:', error);
            }
          } else {
            console.error('[KeyDown] onNoteCreate is not defined!');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, onNoteRestore, onNoteDelete, setNodes, onNoteCreate, getViewport, nodes]);

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

  // Handler to zoom to fit all nodes (Feature #50)
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

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

  // Custom control button for zoom to fit (Feature #50)
  const FitViewControl = () => (
    <button
      onClick={handleFitView}
      className="react-flow__controls-button"
      title="Zoom to fit all notes"
      aria-label="Zoom to fit all notes"
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
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
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
        className="bg-[#F8FAFC] dark:bg-[#1E293B]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={theme === 'dark' ? '#475569' : '#CBD5E1'}
        />
        <Controls>
          <FitViewControl />
          <ResetZoomControl />
        </Controls>
      </ReactFlow>

      {/* Empty State Overlay - shows when there are no notes */}
      {showEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white dark:bg-[#1E293B] p-6 rounded-lg shadow-lg">
            <p className="text-[#1E293B] dark:text-[#F1F5F9] text-lg mb-2">
              No notes yet
            </p>
            <p className="text-[#64748B] dark:text-[#94A3B8]">
              Double-click anywhere or press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">N</kbd> to create your first note
            </p>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      <NoteEditor
        note={editingNote}
        isOpen={isEditorOpen}
        onClose={handleEditorClose}
        onSave={handleNoteContentSave}
        canvasId={canvasId}
        onNavigateToNote={handleNavigateToNote}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        noteTitle={deleteConfirmation.noteTitle}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}

export default function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
