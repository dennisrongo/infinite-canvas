'use client';

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import Icon from '@/components/ui/Icon';

interface NoteNodeProps {
  data: {
    title: string;
    content: string;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
  };
  selected?: boolean;
  id: string;
}

// Accent colors for the left border (matching landing page glass-note style)
const NOTE_ACCENT_COLORS = [
  { border: 'border-l-pink-500', dot: 'bg-pink-500' },
  { border: 'border-l-blue-500', dot: 'bg-blue-500' },
  { border: 'border-l-sky-400', dot: 'bg-sky-400' },
  { border: 'border-l-purple-500', dot: 'bg-purple-500' },
  { border: 'border-l-teal-500', dot: 'bg-teal-500' },
  { border: 'border-l-orange-500', dot: 'bg-orange-500' },
];

// Get a consistent accent color based on note ID
function getAccentForId(id: string): { border: string; dot: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % NOTE_ACCENT_COLORS.length;
  return NOTE_ACCENT_COLORS[index];
}

// Generate content preview (extracted for memoization)
function generateContentPreview(content: string): string {
  if (!content || content.trim() === '') {
    return '';
  }

  // Remove markdown syntax for plain text preview
  const plainText = content
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/___/g, '').replace(/__/g, '').replace(/_/g, '')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '[Code]')
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image]')
    // Remove wiki links
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Split into lines and take first 3
  const lines = plainText.split('\n').filter(line => line.trim() !== '');
  const previewLines = lines.slice(0, 3);

  // Join with ellipsis if there's more content
  const preview = previewLines.join(' ');
  const hasMore = lines.length > 3 || preview.length < plainText.length;

  return hasMore ? preview + '...' : preview;
}

const NoteNode = memo(function NoteNode({ data, selected, id }: NoteNodeProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 300, height: 200 });
  const [showDropdown, setShowDropdown] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Get preview of content (memoized)
  const contentPreview = useMemo(() => generateContentPreview(data.content), [data.content]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  // Handle resize move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeStartRef.current) return;

      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.max(200, resizeStartRef.current.width + deltaX);
      const newHeight = Math.max(150, resizeStartRef.current.height + deltaY);

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Trigger a custom event to notify parent about size change
        const event = new CustomEvent('nodeResize', {
          detail: { id, width: size.width, height: size.height },
        });
        window.dispatchEvent(event);
      }
      resizeStartRef.current = null;
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, size, id]);

  // Get accent color for left border based on note ID
  const accent = useMemo(() => getAccentForId(id), [id]);

  // Listen for global close menu events (from ReactFlowCanvas onPaneClick)
  useEffect(() => {
    const handleCloseMenu = () => {
      setShowDropdown(false);
    };

    window.addEventListener('closeNodeMenu', handleCloseMenu);
    return () => {
      window.removeEventListener('closeNodeMenu', handleCloseMenu);
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Handle click on the node to close dropdown (but not on the dropdown itself)
  const handleNodeClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the node, not on child elements that should handle their own clicks
    if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      // Check if the click was on the three-dot button or dropdown - those handle their own state
      const target = e.target as HTMLElement;
      const isOnDropdownButton = target.closest('button');
      if (!isOnDropdownButton) {
        setShowDropdown(false);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    if (data.onDuplicate) {
      data.onDuplicate(id);
    }
  };

  // Handle right-click to show context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(true);
  };

  return (
    <div
      ref={nodeRef}
      className={`glass-note group relative border-l-4 ${accent.border} rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
        selected
          ? 'ring-2 ring-purple-500/50 ring-offset-2 ring-offset-white dark:ring-offset-[#1E293B] shadow-lg shadow-purple-500/10'
          : ''
      }`}
      style={{
        width: `${size.width}px`,
        minHeight: `${size.height}px`,
      }}
      onContextMenu={handleContextMenu}
      onClick={handleNodeClick}
    >
        <div className="px-4 py-3">
          {/* Connection handles - source handles for dragging connections to other nodes */}
          {/* Top */}
          <Handle
            type="source"
            position={Position.Top}
            id="top"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          {/* Bottom */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          {/* Right */}
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          {/* Left */}
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />

          {/* Selected indicator - visible badge with icon for accessibility */}
          {selected && (
            <div data-testid="selected-indicator" className="absolute -top-3 -right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md" aria-label="Selected note">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}

          {/* Title with accent dot and delete button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full ${accent.dot} flex-shrink-0`} />
              <div className="font-bold text-gray-800 dark:text-gray-100 text-base tracking-wide truncate">
                {data.title || 'Untitled Note'}
              </div>
            </div>
            {/* Delete/Dropdown button - appears on hover */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                aria-label="More options"
              >
                <Icon name="more-vertical" size="sm" className="text-gray-500 dark:text-gray-400" />
              </button>
              {/* Dropdown menu */}
              {showDropdown && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={handleDuplicate}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <Icon name="copy" size="xs" />
                    Duplicate
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                  >
                    <Icon name="trash" size="xs" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content preview */}
          {contentPreview ? (
            <div className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              {contentPreview}
            </div>
          ) : (
            <div className="text-base text-gray-400 dark:text-gray-500 italic">
              No content yet
            </div>
          )}

          {/* Edit hint */}
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Double-click to edit
          </div>
        </div>

        {/* Resize handles - only show when selected */}
        {selected && (
          <>
            <div
              data-testid="resize-se"
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
            <div
              data-testid="resize-sw"
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              data-testid="resize-ne"
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              data-testid="resize-nw"
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
          </>
        )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.id === nextProps.id &&
  prevProps.selected === nextProps.selected &&
  prevProps.data.title === nextProps.data.title &&
  prevProps.data.content === nextProps.data.content &&
  prevProps.data.onDelete === nextProps.data.onDelete &&
  prevProps.data.onDuplicate === nextProps.data.onDuplicate
));

export default NoteNode;
