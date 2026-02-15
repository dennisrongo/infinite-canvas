'use client';

import React from 'react';
import { Select } from '@/components/ui';

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

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36];

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
          className="type-button px-3 py-1.5 font-bold text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] rounded transition"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={onItalic}
          className="type-button px-3 py-1.5 italic text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] rounded transition"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={onUnderline}
          className="type-button px-3 py-1.5 underline text-[#1E293B] dark:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#475569] rounded transition"
          title="Underline (Ctrl+U)"
        >
          U
        </button>
      </div>

      {/* Font Family Dropdown */}
      <div className="flex items-center gap-2 border-r border-[#E2E8F0] dark:border-[#475569] pr-2">
        <label htmlFor="font-family" className="type-label text-[#64748B] dark:text-[#94A3B8]">
          Font:
        </label>
        <Select
          id="font-family"
          options={FONT_FAMILIES.map(f => ({ label: f.name, value: f.value }))}
          value={fontFamily}
          onChange={onFontFamilyChange}
          showLabel={false}
          className="w-32"
        />
      </div>

      {/* Font Size Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="font-size" className="type-label text-[#64748B] dark:text-[#94A3B8]">
          Size:
        </label>
        <Select
          id="font-size"
          options={FONT_SIZES.map(size => ({ label: `${size}px`, value: String(size) }))}
          value={String(fontSize)}
          onChange={(val) => onFontSizeChange(Number(val))}
          showLabel={false}
          className="w-20"
        />
      </div>
    </div>
  );
}
