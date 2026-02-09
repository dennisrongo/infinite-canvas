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
      className={`group px-4 py-3 bg-white dark:bg-[#1E293B] border-2 rounded-lg shadow-md transition-all relative ${
        selected
          ? 'border-[#3B82F6] ring-2 ring-[#3B82F6] ring-opacity-50'
          : 'border-[#E2E8F0] dark:border-[#475569] hover:border-[#3B82F6]'
      }`}
      style={{ width: `${size.width}px`, minHeight: `${size.height}px` }}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="!bg-[#3B82F6]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#3B82F6]" />

      {/* Title */}
      <div className="font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-2 truncate">
        {data.title || 'Untitled Note'}
      </div>

      {/* Content preview */}
      {contentPreview ? (
        <div className="text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
          {contentPreview}
        </div>
      ) : (
        <div className="text-sm text-[#94A3B8] dark:text-[#64748B] italic">
          No content yet
        </div>
      )}

      {/* Edit hint */}
      <div className="mt-2 text-xs text-[#94A3B8] dark:text-[#64748B] italic">
        Double-click to edit
      </div>

      {/* Duplicate button - visible on hover */}
      {data.onDuplicate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onDuplicate?.(id);
          }}
          className="absolute top-2 right-2 p-1.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
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
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, #3B82F6 50%)',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
            style={{
              background: 'linear-gradient(225deg, transparent 50%, #3B82F6 50%)',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
            style={{
              background: 'linear-gradient(45deg, transparent 50%, #3B82F6 50%)',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
            style={{
              background: 'linear-gradient(-45deg, transparent 50%, #3B82F6 50%)',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
        </>
      )}
    </div>
  );
}
