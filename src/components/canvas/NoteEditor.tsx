'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import RichTextToolbar from './RichTextToolbar';
import LinkAutocomplete from './LinkAutocomplete';

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
}

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteId: string, title: string, content: string, fontFamily?: string, fontSize?: number) => void;
  canvasId: string;
}

export default function NoteEditor({ note, isOpen, onClose, onSave, canvasId }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(14);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [pastingImage, setPastingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Link autocomplete state
  const [showLinkAutocomplete, setShowLinkAutocomplete] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setFontFamily(note.fontFamily || 'Inter');
      setFontSize(note.fontSize || 14);
    } else {
      setTitle('');
      setContent('');
      setFontFamily('Inter');
      setFontSize(14);
    }
  }, [note]);

  useEffect(() => {
    // Auto-save with debouncing
    if (isOpen && note) {
      const timer = setTimeout(() => {
        if (
          title !== note.title ||
          content !== note.content ||
          fontFamily !== (note.fontFamily || 'Inter') ||
          fontSize !== (note.fontSize || 14)
        ) {
          handleSave();
        }
      }, 2000); // 2 second debounce

      return () => clearTimeout(timer);
    }
  }, [title, content, fontFamily, fontSize, isOpen, note]);

  const handleSave = async () => {
    if (!note) return;

    setSaving(true);
    setSaveStatus('saving');

    try {
      await onSave(note.id, title, content, fontFamily, fontSize);
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
    if (
      note &&
      (title !== note.title ||
        content !== note.content ||
        fontFamily !== (note.fontFamily || 'Inter') ||
        fontSize !== (note.fontSize || 14))
    ) {
      handleSave().then(() => {
        setTimeout(() => onClose(), 500);
      });
    } else {
      onClose();
    }
  };

  // Text formatting handlers
  const handleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (selectedText) {
      // Check if already wrapped in **
      if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
        // Remove bold
        const newText = selectedText.slice(2, -2);
        setContent(content.substring(0, start) + newText + content.substring(end));
      } else {
        // Add bold
        const newText = `**${selectedText}**`;
        setContent(content.substring(0, start) + newText + content.substring(end));
      }
    }
  };

  const handleItalic = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (selectedText) {
      // Check if already wrapped in *
      if (selectedText.startsWith('*') && selectedText.endsWith('*')) {
        // Remove italic
        const newText = selectedText.slice(1, -1);
        setContent(content.substring(0, start) + newText + content.substring(end));
      } else {
        // Add italic
        const newText = `*${selectedText}*`;
        setContent(content.substring(0, start) + newText + content.substring(end));
      }
    }
  };

  const handleUnderline = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (selectedText) {
      // Check if already wrapped in <u>
      if (selectedText.startsWith('<u>') && selectedText.endsWith('</u>')) {
        // Remove underline
        const newText = selectedText.slice(3, -4);
        setContent(content.substring(0, start) + newText + content.substring(end));
      } else {
        // Add underline (HTML tag since markdown doesn't support underline)
        const newText = `<u>${selectedText}</u>`;
        setContent(content.substring(0, start) + newText + content.substring(end));
      }
    }
  };

  // Handle content change and detect [[ for link autocomplete
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPosition);

    // Check if user just typed [[
    const doubleBracketMatch = textBeforeCursor.match(/\[\[([^\[]*)$/);
    if (doubleBracketMatch) {
      setLinkSearchQuery(doubleBracketMatch[1]);
      setShowLinkAutocomplete(true);
    } else {
      setShowLinkAutocomplete(false);
      setLinkSearchQuery('');
    }
  };

  const handleLinkSelect = (noteTitle: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);

    // Find the [[ position
    const doubleBracketIndex = textBeforeCursor.lastIndexOf('[[');
    if (doubleBracketIndex !== -1) {
      // Replace [[searchQuery with [[noteTitle]]
      const beforeLink = content.substring(0, doubleBracketIndex);
      const afterCursor = content.substring(cursorPosition);
      const newContent = `${beforeLink}[[${noteTitle}]]${afterCursor}`;
      setContent(newContent);

      // Move cursor after the closing ]]
      const newCursorPosition = doubleBracketIndex + noteTitle.length + 4;
      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }

    setShowLinkAutocomplete(false);
    setLinkSearchQuery('');
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file || !note) continue;

        setPastingImage(true);

        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('noteId', note.id);

          const response = await fetch('/api/images', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const data = await response.json();

          // Insert markdown image syntax at cursor position
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const imageMarkdown = `![${data.fileName || 'Image'}](${data.url})\n`;
            setContent(
              content.substring(0, start) + imageMarkdown + content.substring(end)
            );
          }
        } catch (error) {
          console.error('Error pasting image:', error);
          alert('Failed to paste image. Please try again.');
        } finally {
          setPastingImage(false);
        }
      }
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

        {/* Rich Text Toolbar */}
        <RichTextToolbar
          onBold={handleBold}
          onItalic={handleItalic}
          onUnderline={handleUnderline}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
        />

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
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="note-content"
                className="block text-sm font-medium text-[#64748B] dark:text-[#94A3B8]"
              >
                Content (Markdown supported)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    viewMode === 'edit'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#E2E8F0] dark:bg-[#475569] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#CBD5E1] dark:hover:bg-[#64748B]'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    viewMode === 'preview'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#E2E8F0] dark:bg-[#475569] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#CBD5E1] dark:hover:bg-[#64748B]'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1 text-sm rounded transition ${
                    viewMode === 'split'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#E2E8F0] dark:bg-[#475569] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#CBD5E1] dark:hover:bg-[#64748B]'
                  }`}
                >
                  Split
                </button>
              </div>
            </div>

            {/* Edit Mode */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  id="note-content"
                  value={content}
                  onChange={handleContentChange}
                  onPaste={handlePaste}
                  style={{
                    fontFamily: fontFamily.includes(',') ? fontFamily : `"${fontFamily}", sans-serif`,
                    fontSize: `${fontSize}px`,
                    height: viewMode === 'split' ? '400px' : '500px',
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] min-h-[400px]"
                  placeholder="Enter note content... (Markdown supported, Ctrl+V to paste images, type [[ for note links)"
                  disabled={pastingImage}
                />

                {/* Link Autocomplete */}
                {showLinkAutocomplete && (
                  <LinkAutocomplete
                    textareaRef={textareaRef}
                    canvasId={canvasId}
                    onSelect={handleLinkSelect}
                    onClose={() => {
                      setShowLinkAutocomplete(false);
                      setLinkSearchQuery('');
                    }}
                  />
                )}
              </div>
            )}

            {/* Preview Mode */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] prose prose-sm dark:prose-invert max-w-none overflow-y-auto ${
                  viewMode === 'split' ? 'mt-2 h-[400px]' : 'min-h-[500px]'
                }`}
                style={{
                  fontFamily: fontFamily.includes(',') ? fontFamily : `"${fontFamily}", sans-serif`,
                  fontSize: `${fontSize}px`,
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {content || '*Empty note - start typing to add content*'}
                </ReactMarkdown>
              </div>
            )}

            {pastingImage && (
              <div className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
                Uploading image...
              </div>
            )}
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
