'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import 'highlight.js/styles/github-dark.css';
import RichTextToolbar from './RichTextToolbar';
import LinkAutocomplete from './LinkAutocomplete';
import { sanitizeMarkdown } from '@/lib/sanitization';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDateTime, formatRelativeTime } from '@/lib/date';

// Static remark/rehype plugins - moved outside component to avoid recreation on each render
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight, rehypeSanitize];

// Memoized markdown preview component to prevent unnecessary re-renders
interface MemoizedMarkdownPreviewProps {
  content: string;
  fontFamily: string;
  fontSize: number;
  viewMode: 'edit' | 'preview' | 'split';
  linkedNoteTitles: Set<string>;
  onNoteLinkClick: (noteTitle: string) => void;
  remarkPlugins: typeof remarkPlugins;
  rehypePlugins: typeof rehypePlugins;
}

const MemoizedMarkdownPreview = React.memo(function MemoizedMarkdownPreview({
  content,
  fontFamily,
  fontSize,
  viewMode,
  linkedNoteTitles,
  onNoteLinkClick,
  remarkPlugins,
  rehypePlugins,
}: MemoizedMarkdownPreviewProps) {
  // Memoize the rendered markdown based on content and styling
  const markdownElement = useMemo(() => (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={{
        // Custom renderer for wiki-style [[links]]
        p: ({ children }) => {
          // Check if children contain [[link]] syntax
          const childStr = String(children);
          if (childStr.includes('[[')) {
            // Replace [[Note Title]] with a clickable link
            const parts = childStr.split(/(\[\[[^\]]+\]\])/g);
            return (
              <>
                {parts.map((part, i) => {
                  const linkMatch = part.match(/\[\[([^\]]+)\]\]/);
                  if (linkMatch) {
                    const noteTitle = linkMatch[1];
                    const isLinkedNote = linkedNoteTitles.has(noteTitle);
                    return (
                      <a
                        key={i}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onNoteLinkClick(noteTitle);
                        }}
                        className={`font-medium ${
                          isLinkedNote
                            ? 'text-[#3B82F6] hover:text-[#2563EB] underline'
                            : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#3B82F6] underline decoration-dashed'
                        }`}
                        title={isLinkedNote ? `Jump to "${noteTitle}"` : `Note "${noteTitle}" not found in this canvas`}
                      >
                        {noteTitle}
                      </a>
                    );
                  }
                  return part;
                })}
              </>
            );
          }
          return <>{children}</>;
        },
      }}
    >
      {content || '*Empty note - start typing to add content*'}
    </ReactMarkdown>
  ), [content, linkedNoteTitles, onNoteLinkClick, remarkPlugins, rehypePlugins]);

  return (
    <div
      className={`w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] prose prose-sm dark:prose-invert max-w-none overflow-y-auto ${
        viewMode === 'split' ? 'mt-2 h-[400px]' : 'min-h-[500px]'
      }`}
      style={{
        fontFamily: fontFamily.includes(',') ? fontFamily : `"${fontFamily}", sans-serif`,
        fontSize: `${fontSize}px`,
      }}
    >
      {markdownElement}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for linkedNoteTitles Set
  if (prevProps.content !== nextProps.content) return false;
  if (prevProps.fontFamily !== nextProps.fontFamily) return false;
  if (prevProps.fontSize !== nextProps.fontSize) return false;
  if (prevProps.viewMode !== nextProps.viewMode) return false;

  // Compare function reference - if parent passes new function, re-render
  if (prevProps.onNoteLinkClick !== nextProps.onNoteLinkClick) return false;

  // Compare Sets by size and values
  if (prevProps.linkedNoteTitles.size !== nextProps.linkedNoteTitles.size) return false;
  for (const title of prevProps.linkedNoteTitles) {
    if (!nextProps.linkedNoteTitles.has(title)) return false;
  }

  return true;
});

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

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteId: string, title: string, content: string, fontFamily?: string, fontSize?: number) => void;
  canvasId: string;
  onNavigateToNote?: (noteTitle: string) => void;
}

export default function NoteEditor({ note, isOpen, onClose, onSave, canvasId, onNavigateToNote }: NoteEditorProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(14);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [pastingImage, setPastingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Link autocomplete state
  const [showLinkAutocomplete, setShowLinkAutocomplete] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkedNoteTitles, setLinkedNoteTitles] = useState<Set<string>>(new Set());

  // Track unsaved changes for refresh warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Extract linked note titles from content
  useEffect(() => {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const matches = content.match(linkRegex) || [];
    const titles = matches.map(match => match.replace(/\[\[|\]\]/g, ''));
    setLinkedNoteTitles(new Set(titles));
  }, [content]);

  // Track unsaved changes
  useEffect(() => {
    if (note) {
      const hasChanges =
        title !== note.title ||
        content !== note.content ||
        fontFamily !== (note.fontFamily || 'Inter') ||
        fontSize !== (note.fontSize || 14);
      setHasUnsavedChanges(hasChanges);
    }
  }, [title, content, fontFamily, fontSize, note]);

  // Warn before page unload if there are unsaved changes
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.';
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, hasUnsavedChanges]);

  // Load note data when note changes - database is single source of truth
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

  const handleSave = async () => {
    if (!note) return;

    setSaving(true);
    setSaveStatus('saving');

    try {
      await onSave(note.id, title, content, fontFamily, fontSize);
      setSaveStatus('saved');

      // Show toast notification on successful save
      showToast('Note saved successfully', 'success');

      // Reset saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Failed to save note', 'error');
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

    // Client-side sanitization for immediate protection
    const sanitizedValue = sanitizeMarkdown(newValue);
    setContent(sanitizedValue);

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = sanitizedValue.substring(0, cursorPosition);

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

  const handleNoteLinkClick = (noteTitle: string) => {
    // Check if the note exists in the current canvas
    if (linkedNoteTitles.has(noteTitle)) {
      // Note exists, trigger navigation
      if (onNavigateToNote) {
        onNavigateToNote(noteTitle);
      }
    } else {
      // Note doesn't exist, show a message
      alert(`Note "${noteTitle}" not found in this canvas.\n\nCreate it first, then the link will work.`);
    }
  };

  // Handle Tab key for indentation in textarea (accessibility)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();

      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert 2 spaces for indentation
      const newText = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newText);

      // Move cursor after the inserted spaces
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
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
        setImageUploadProgress(0);

        try {
          // Use XMLHttpRequest for upload progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('noteId', note.id);

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                setImageUploadProgress(percentComplete);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status === 200) {
                try {
                  const data = JSON.parse(xhr.responseText);

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

                  // Show completion message
                  showToast('Image uploaded successfully', 'success');
                  resolve();
                } catch (parseError) {
                  reject(new Error('Invalid response from server'));
                }
              } else {
                reject(new Error('Failed to upload image'));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'));
            });

            xhr.open('POST', '/api/images');
            xhr.send(formData);
          });
        } catch (error) {
          console.error('Error pasting image:', error);
          showToast('Failed to paste image. Please try again.', 'error');
        } finally {
          setPastingImage(false);
          setImageUploadProgress(0);
        }
      }
    }
  };

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-x-hidden">
      <div className="bg-white dark:bg-[#1E293B] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#475569]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg md:text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
              Edit Note
            </h2>
            <button
              onClick={handleClose}
              className="text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] transition"
              aria-label="Close editor"
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
          {/* Timestamps and Status Row */}
          <div className="flex items-center justify-between type-meta">
            <div className="flex items-center gap-3 text-[#94A3B8] dark:text-[#64748B]">
              {note?.createdAt && (
                <span title={formatDateTime(note.createdAt)}>
                  Created: {formatRelativeTime(note.createdAt)}
                </span>
              )}
              {note?.updatedAt && (
                <span title={formatDateTime(note.updatedAt)}>
                  • Updated: {formatRelativeTime(note.updatedAt)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <span className="type-nav text-[#64748B] dark:text-[#94A3B8]">Saving...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="type-nav text-green-600 dark:text-green-400">Saved ✓</span>
              )}
              {hasUnsavedChanges && saveStatus !== 'saving' && saveStatus !== 'saved' && (
                <span className="type-nav text-amber-600 dark:text-amber-400">Unsaved changes</span>
              )}
            </div>
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {/* Title Field */}
          <div className="mb-4">
            <label
              htmlFor="note-title"
              className="type-label block text-[#64748B] dark:text-[#94A3B8] mb-2"
            >
              Title
            </label>
            <input
              id="note-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  textareaRef.current?.focus();
                }
              }}
              className="h3 w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9]"
              placeholder="Enter note title... (Press Tab to move to content)"
            />
          </div>

          {/* Body Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="note-content"
                className="type-label block text-[#64748B] dark:text-[#94A3B8]"
              >
                Content (Markdown supported)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`type-button px-3 py-1 rounded transition ${
                    viewMode === 'edit'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#E2E8F0] dark:bg-[#475569] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#CBD5E1] dark:hover:bg-[#64748B]'
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`type-button px-3 py-1 rounded transition ${
                    viewMode === 'preview'
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-[#E2E8F0] dark:bg-[#475569] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#CBD5E1] dark:hover:bg-[#64748B]'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`type-button px-3 py-1 rounded transition ${
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
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  style={{
                    fontFamily: fontFamily.includes(',') ? fontFamily : `"${fontFamily}", sans-serif`,
                    fontSize: `${fontSize}px`,
                    height: viewMode === 'split' ? '400px' : '500px',
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] min-h-[400px]"
                  placeholder="Enter note content... (Markdown supported, Tab for indent, Ctrl+V to paste images, type [[ for note links)"
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
                    searchQuery={linkSearchQuery}
                  />
                )}
              </div>
            )}

            {/* Preview Mode */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <MemoizedMarkdownPreview
                content={content}
                fontFamily={fontFamily}
                fontSize={fontSize}
                viewMode={viewMode}
                linkedNoteTitles={linkedNoteTitles}
                onNoteLinkClick={handleNoteLinkClick}
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
              />
            )}

            {pastingImage && (
              <div className="mt-2">
                {imageUploadProgress > 0 ? (
                  <div className="space-y-1">
                    <div className="type-nav flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                      <span>Uploading image...</span>
                      <span>{imageUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#3B82F6] h-2 transition-all duration-200 ease-out"
                        style={{ width: `${imageUploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="type-nav text-[#64748B] dark:text-[#94A3B8]">
                    Uploading image...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-between p-4 border-t border-[#E2E8F0] dark:border-[#475569]">
          <div className="type-nav text-[#64748B] dark:text-[#94A3B8]">
            Changes are saved manually or when closing
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="type-button px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:bg-[#94A3B8] disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : 'Save Now'}
            </button>
            <button
              onClick={handleClose}
              className="type-button px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
