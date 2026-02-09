'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NoteNodeProps {
  data: {
    title: string;
    content: string;
  };
  selected?: boolean;
  id: string;
}

export default function NoteNode({ data, selected, id }: NoteNodeProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 300, height: 200 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Get preview of content (first 100 chars)
  const contentPreview = data.content
    ? data.content.length > 100
      ? data.content.substring(0, 100) + '...'
      : data.content
    : 'No content';

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
      className={`px-4 py-3 bg-white dark:bg-[#1E293B] border-2 rounded-lg shadow-md transition-all relative ${
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
      <div className="text-sm text-[#64748B] dark:text-[#94A3B8] line-clamp-3">
        {contentPreview}
      </div>

      {/* Edit hint */}
      <div className="mt-2 text-xs text-[#94A3B8] dark:text-[#64748B] italic">
        Double-click to edit
      </div>

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
