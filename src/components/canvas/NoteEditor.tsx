'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteId: string, title: string, content: string) => void;
}

export default function NoteEditor({ note, isOpen, onClose, onSave }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [note]);

  useEffect(() => {
    // Auto-save with debouncing
    if (isOpen && note) {
      const timer = setTimeout(() => {
        if (title !== note.title || content !== note.content) {
          handleSave();
        }
      }, 2000); // 2 second debounce

      return () => clearTimeout(timer);
    }
  }, [title, content, isOpen, note]);

  const handleSave = async () => {
    if (!note) return;

    setSaving(true);
    setSaveStatus('saving');

    try {
      await onSave(note.id, title, content);
      setSaveStatus('saved');

      // Reset saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving note:', error);
      setSaveStatus('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Save before closing if there are changes
    if (note && (title !== note.title || content !== note.content)) {
      handleSave().then(() => {
        setTimeout(() => onClose(), 500);
      });
    } else {
      onClose();
    }
  };

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1E293B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0] dark:border-[#475569]">
          <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
            Edit Note
          </h2>
          <div className="flex items-center gap-4">
            {/* Auto-save status indicator */}
            {saveStatus === 'saving' && (
              <span className="text-sm text-[#64748B] dark:text-[#94A3B8]">Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
            )}
            <button
              onClick={handleClose}
              className="text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Title Field */}
          <div className="mb-4">
            <label
              htmlFor="note-title"
              className="block text-sm font-medium text-[#64748B] dark:text-[#94A3B8] mb-2"
            >
              Title
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] text-lg font-semibold"
              placeholder="Enter note title..."
            />
          </div>

          {/* Body Field */}
          <div>
            <label
              htmlFor="note-content"
              className="block text-sm font-medium text-[#64748B] dark:text-[#94A3B8] mb-2"
            >
              Content (Markdown supported)
            </label>
            <textarea
              ref={textareaRef}
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] min-h-[400px] font-mono text-sm"
              placeholder="Enter note content... (Markdown supported)"
            />
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-between p-4 border-t border-[#E2E8F0] dark:border-[#475569]">
          <div className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            Auto-save enabled (2s after typing stops)
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:bg-[#94A3B8] disabled:cursor-not-allowed transition"
            >
              {saving ? 'Saving...' : 'Save Now'}
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
