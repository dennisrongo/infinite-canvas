'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NoteNodeProps {
  data: {
    title: string;
    content: string;
    onDuplicate?: (noteId: string) => void;
  };
  selected?: boolean;
  id: string;
}

export default function NoteNode({ data, selected, id }: NoteNodeProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 300, height: 200 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Get preview of content (first 2-3 lines, strip markdown)
  const contentPreview = (() => {
    if (!data.content || data.content.trim() === '') {
      return '';
    }

    // Remove markdown syntax for plain text preview
    const plainText = data.content
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
  })();

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

  return (
    <div
      ref={nodeRef}
      className={`group px-4 py-3 bg-white dark:bg-dark-note border-2 rounded-lg shadow-md transition-all relative ${
        selected
          ? 'border-light-primary dark:border-dark-primary shadow-[0_0_0_3px_rgba(59,130,246,0.15)] dark:shadow-[0_0_0_3px_rgba(96,165,250,0.2)]'
          : 'border-light-note-border dark:border-dark-note-border hover:border-light-primary dark:hover:border-dark-primary'
      }`}
      style={{ width: `${size.width}px`, minHeight: `${size.height}px` }}
    >
      {/* Connection handles - each side has a visible source handle (drag from) and
          an invisible target handle (drop onto). Using Strict mode so RF correctly
          resolves source→target on the exact side you drag to. */}
      {/* Top */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-src"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-tgt"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      {/* Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-src"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-tgt"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      {/* Right */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-src"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-tgt"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      {/* Left */}
      <Handle
        type="source"
        position={Position.Left}
        id="left-src"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-tgt"
        className="!w-3 !h-3 !bg-light-primary dark:!bg-dark-primary !border-2 !border-white dark:!border-gray-800 !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-200 hover:!scale-150 !cursor-crosshair"
      />

      {/* Selected indicator - visible badge with icon for accessibility */}
      {selected && (
        <div data-testid="selected-indicator" className="absolute -top-3 -right-3 w-6 h-6 bg-light-primary dark:bg-dark-primary rounded-full flex items-center justify-center shadow-md" aria-label="Selected note">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Title */}
      <div className="font-semibold text-light-text dark:text-dark-text mb-2 truncate pr-6">
        {data.title || 'Untitled Note'}
      </div>

      {/* Content preview */}
      {contentPreview ? (
        <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
          {contentPreview}
        </div>
      ) : (
        <div className="text-sm text-light-text-tertiary dark:text-dark-text-tertiary italic">
          No content yet
        </div>
      )}

      {/* Edit hint */}
      <div className="mt-2 text-xs text-light-text-tertiary dark:text-dark-text-tertiary italic flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Double-click to edit
      </div>

      {/* Duplicate button - visible on hover, with touch-friendly sizing */}
      {data.onDuplicate && (
        <button
          data-testid="duplicate-btn"
          onClick={(e) => {
            e.stopPropagation();
            data.onDuplicate?.(id);
          }}
          className="absolute top-2 right-2 min-w-[44px] min-h-[44px] p-3 bg-light-primary dark:bg-dark-primary hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover text-white rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm flex items-center justify-center"
          title="Duplicate note"
          style={{ opacity: selected ? 1 : 0 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            if (!selected) {
              e.currentTarget.style.opacity = '0';
            }
          }}
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        </button>
      )}

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
}
