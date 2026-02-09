'use client';

import React from 'react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  noteTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  isOpen,
  noteTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1E293B] rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
            Delete Note
          </h2>
        </div>

        {/* Warning message */}
        <div className="mb-4">
          <p className="text-[#64748B] dark:text-[#94A3B8] mb-2">
            Are you sure you want to delete this note? This action cannot be undone.
          </p>
          <div className="bg-[#FEF2F2] dark:bg-[#7F1D1D] border border-[#FECACA] dark:border-[#991B1B] rounded-lg p-3">
            <p className="text-sm font-medium text-[#991B1B] dark:text-[#FCA5A5]">
              Note: "{noteTitle || 'Untitled Note'}"
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] text-[#1E293B] dark:text-[#F1F5F9] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#334155] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
