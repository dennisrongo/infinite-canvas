'use client';

import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NoteNodeProps {
  data: {
    title: string;
    content: string;
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
  const nodeRef = useRef<HTMLDivElement>(null);
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
    >
        <div className="px-4 py-3">
          {/* Connection handles - each side has a visible source handle (drag from) and
              an invisible target handle (drop onto). Using Strict mode so RF correctly
              resolves source→target on the exact side you drag to. */}
          {/* Top */}
          <Handle
            type="source"
            position={Position.Top}
            id="top-src"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          <Handle
            type="target"
            position={Position.Top}
            id="top-tgt"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          {/* Bottom */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom-src"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          <Handle
            type="target"
            position={Position.Bottom}
            id="bottom-tgt"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          {/* Right */}
          <Handle
            type="source"
            position={Position.Right}
            id="right-src"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="right-tgt"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          {/* Left */}
          <Handle
            type="source"
            position={Position.Left}
            id="left-src"
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-tgt"
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

          {/* Title with accent dot */}
          <div className="flex items-center gap-2 mb-2 pr-6">
            <div className={`w-2 h-2 rounded-full ${accent.dot} flex-shrink-0`} />
            <div className="font-bold text-gray-800 dark:text-gray-100 text-base tracking-wide truncate">
              {data.title || 'Untitled Note'}
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
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize min-w-[44px] min-h-[44px]"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
            <div
              data-testid="resize-sw"
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize min-w-[44px] min-h-[44px]"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              data-testid="resize-ne"
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize min-w-[44px] min-h-[44px]"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              data-testid="resize-nw"
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize min-w-[44px] min-h-[44px]"
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
  prevProps.data.content === nextProps.data.content
));

export default NoteNode;
