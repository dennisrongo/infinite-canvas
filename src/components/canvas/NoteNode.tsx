'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface NoteNodeProps {
  data: {
    title: string;
    content: string;
  };
  selected?: boolean;
}

export default function NoteNode({ data, selected }: NoteNodeProps) {
  // Get preview of content (first 100 chars)
  const contentPreview = data.content
    ? data.content.length > 100
      ? data.content.substring(0, 100) + '...'
      : data.content
    : 'No content';

  return (
    <div
      className={`px-4 py-3 bg-white dark:bg-[#1E293B] border-2 rounded-lg shadow-md transition-all ${
        selected
          ? 'border-[#3B82F6] ring-2 ring-[#3B82F6] ring-opacity-50'
          : 'border-[#E2E8F0] dark:border-[#475569] hover:border-[#3B82F6]'
      }`}
      style={{ minWidth: '200px', maxWidth: '400px' }}
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
    </div>
  );
}
