'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// Feature #139: Local storage key for draft backup
const DRAFT_STORAGE_PREFIX = 'note_draft_';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Link autocomplete state
  const [showLinkAutocomplete, setShowLinkAutocomplete] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkedNoteTitles, setLinkedNoteTitles] = useState<Set<string>>(new Set());

  // Feature #139: Track unsaved changes for refresh warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftRestoredBanner, setShowDraftRestoredBanner] = useState(false);

  // Extract linked note titles from content
  useEffect(() => {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const matches = content.match(linkRegex) || [];
    const titles = matches.map(match => match.replace(/\[\[|\]\]/g, ''));
    setLinkedNoteTitles(new Set(titles));
  }, [content]);

  // Feature #139: Track unsaved changes
  useEffect(() => {
    if (note) {
      const hasChanges =
        title !== note.title ||
        content !== note.content ||
        fontFamily !== (note.fontFamily || 'Inter') ||
        fontSize !== (note.fontSize || 14);
      setHasUnsavedChanges(hasChanges);

      // Save draft to localStorage whenever content changes
      if (hasChanges && isOpen) {
        const draftData = {
          title,
          content,
          fontFamily,
          fontSize,
          timestamp: Date.now(),
        };
        localStorage.setItem(`${DRAFT_STORAGE_PREFIX}${note.id}`, JSON.stringify(draftData));
      }
    }
  }, [title, content, fontFamily, fontSize, note, isOpen]);

  // Feature #139: Warn before page unload if there are unsaved changes
  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard message that browsers display
      const message =
        'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.';
      e.preventDefault();
      e.returnValue = message; // Required for Chrome
      return message; // Required for other browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, hasUnsavedChanges]);

  // Feature #139: Clean up draft when closing (after save completes)
  useEffect(() => {
    if (!isOpen && note && saveStatus === 'saved') {
      // Clear draft after successful save
      const timer = setTimeout(() => {
        localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${note.id}`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, note, saveStatus]);

  useEffect(() => {
    if (note) {
      // Feature #139: Check for draft restoration
      const draftKey = `${DRAFT_STORAGE_PREFIX}${note.id}`;
      const savedDraft = localStorage.getItem(draftKey);

      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          // Check if draft is recent (within 1 hour)
          const draftAge = Date.now() - draft.timestamp;
          const oneHour = 60 * 60 * 1000;

          if (draftAge < oneHour) {
            // Restore from draft
            setTitle(draft.title);
            setContent(draft.content);
            setFontFamily(draft.fontFamily || 'Inter');
            setFontSize(draft.fontSize || 14);
            setShowDraftRestoredBanner(true);

            // Auto-hide the banner after 5 seconds
            setTimeout(() => {
              setShowDraftRestoredBanner(false);
            }, 5000);
          } else {
            // Draft too old, use server data and clear draft
            localStorage.removeItem(draftKey);
            setTitle(note.title || '');
            setContent(note.content || '');
            setFontFamily(note.fontFamily || 'Inter');
            setFontSize(note.fontSize || 14);
          }
        } catch (e) {
          // Invalid draft data, use server data
          console.error('Error parsing draft:', e);
          localStorage.removeItem(draftKey);
          setTitle(note.title || '');
          setContent(note.content || '');
          setFontFamily(note.fontFamily || 'Inter');
          setFontSize(note.fontSize || 14);
        }
      } else {
        // No draft, use server data
        setTitle(note.title || '');
        setContent(note.content || '');
        setFontFamily(note.fontFamily || 'Inter');
        setFontSize(note.fontSize || 14);
      }
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
    // Feature #74: Navigate to the linked note
    console.log('Clicked link to note:', noteTitle);

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
        {/* Feature #139: Draft restored banner */}
        {showDraftRestoredBanner && (
          <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-amber-600 dark:text-amber-400"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Unsaved changes restored from browser storage
              </span>
            </div>
            <button
              onClick={() => setShowDraftRestoredBanner(false)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
        )}

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
            {hasUnsavedChanges && saveStatus !== 'saving' && saveStatus !== 'saved' && (
              <span className="text-sm text-amber-600 dark:text-amber-400">Unsaved changes</span>
            )}
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
                  rehypePlugins={[rehypeHighlight, rehypeSanitize]}
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
                                      // Feature #74: Navigate to linked note
                                      handleNoteLinkClick(noteTitle);
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
              className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:bg-[#94A3B8] disabled:cursor-not-allowed transition flex items-center gap-2"
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
