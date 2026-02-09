'use client';

import React from 'react';

interface RichTextToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const FONT_FAMILIES = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier New', value: 'Courier New, monospace' },
  { name: 'Times New Roman', value: 'Times New Roman, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

export default function RichTextToolbar({
  onBold,
  onItalic,
  onUnderline,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
}: RichTextToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[#F8FAFC] dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#475569] flex-wrap">
      {/* Text Formatting Buttons */}
      <div className="flex items-center gap-1 border-r border-[#E2E8F0] dark:border-[#475569] pr-2">
        <button
          type="button"
          onClick={onBold}
          className="px-3 py-1.5 font-bold text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] rounded transition"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={onItalic}
          className="px-3 py-1.5 italic text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] rounded transition"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={onUnderline}
          className="px-3 py-1.5 underline text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] rounded transition"
          title="Underline (Ctrl+U)"
        >
          U
        </button>
      </div>

      {/* Font Family Dropdown */}
      <div className="flex items-center gap-2 border-r border-[#E2E8F0] dark:border-[#475569] pr-2">
        <label htmlFor="font-family" className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Font:
        </label>
        <select
          id="font-family"
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
          className="px-2 py-1.5 border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="font-size" className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Size:
        </label>
        <select
          id="font-size"
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="px-2 py-1.5 border border-[#E2E8F0] dark:border-[#475569] rounded bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F1F5F9] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
