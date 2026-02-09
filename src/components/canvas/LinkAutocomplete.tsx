'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Note {
  id: string;
  title: string;
}

interface LinkAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  canvasId: string;
  onSelect: (noteTitle: string) => void;
  onClose: () => void;
}

export default function LinkAutocomplete({
  textareaRef,
  canvasId,
  onSelect,
  onClose,
}: LinkAutocompleteProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/canvases/${canvasId}/notes`);
        if (!res.ok) throw new Error('Failed to fetch notes');
        const data = await res.json();
        setNotes(data.notes || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setNotes([]);
      }
    };

    fetchNotes();
  }, [canvasId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const updatePosition = () => {
      const textareaRect = textarea.getBoundingClientRect();
      setPosition({
        top: textareaRect.bottom + 5,
        left: textareaRect.left,
      });
    };

    updatePosition();
  }, [textareaRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const filteredNotes = getFilteredNotes();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredNotes.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredNotes.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedNote = filteredNotes[selectedIndex];
        if (selectedNote) {
          onSelect(selectedNote.title);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [notes, selectedIndex, searchQuery, onSelect, onClose]);

  const getFilteredNotes = () => {
    if (!searchQuery) return notes;
    return notes.filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredNotes = getFilteredNotes();

  if (filteredNotes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="fixed bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#475569] rounded-lg shadow-lg z-50 p-3 text-sm text-[#64748B] dark:text-[#94A3B8]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxHeight: '300px',
          overflow: 'auto',
        }}
      >
        No notes found. Type a note title to create a new link.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#475569] rounded-lg shadow-lg z-50"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: '300px',
        overflow: 'auto',
        minWidth: '250px',
      }}
    >
      {filteredNotes.map((note, index) => (
        <button
          key={note.id}
          className={`w-full text-left px-4 py-2 transition ${
            index === selectedIndex
              ? 'bg-[#3B82F6] text-white'
              : 'bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#F1F5F9] dark:hover:bg-[#475569]'
          }`}
          onClick={() => onSelect(note.title)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {note.title || 'Untitled Note'}
        </button>
      ))}
    </div>
  );
}
