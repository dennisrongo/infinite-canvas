'use client';

import { useState, useRef } from 'react';
import { Select } from '@/components/ui';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any, folderId?: string) => Promise<void>;
  folders: Array<{ id: string; name: string }>;
}

export default function ImportModal({ isOpen, onClose, onImport, folders }: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);

      // Read and parse the file for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setPreviewData(data);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          setPreviewData(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!previewData || importing) return;

    setImporting(true);
    try {
      await onImport(previewData, selectedFolderId || undefined);
      handleClose();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setSelectedFolderId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0] dark:border-[#475569]">
          <h2 className="text-lg md:text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
            Import Canvas
          </h2>
          <button
            onClick={handleClose}
            className="text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] transition"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-2">
              Select Export File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            />
          </div>

          {/* Preview */}
          {previewData && (
            <div>
              <h3 className="text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-2">
                Preview
              </h3>
              <div className="bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#475569] rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">Canvas Name:</span>{' '}
                  <span className="text-[#64748B] dark:text-[#94A3B8]">{previewData.canvas?.name || 'Unknown'}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">Notes:</span>{' '}
                  <span className="text-[#64748B] dark:text-[#94A3B8]">{previewData.canvas?.notes?.length || 0}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">Connections:</span>{' '}
                  <span className="text-[#64748B] dark:text-[#94A3B8]">{previewData.canvas?.connections?.length || 0}</span>
                </div>
                {previewData.exportedAt && (
                  <div className="text-xs text-[#94A3B8] dark:text-[#64748B]">
                    Exported: {new Date(previewData.exportedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F1F5F9] mb-2">
              Import to Folder (Optional)
            </label>
            <Select
              id="folder-select"
              options={folders.map(folder => ({ label: folder.name, value: folder.id }))}
              value={selectedFolderId || ''}
              onChange={(val) => setSelectedFolderId(val || null)}
              placeholder="Root (No Folder)"
              showLabel={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#E2E8F0] dark:border-[#475569]">
          <button
            onClick={handleClose}
            disabled={importing}
            className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition text-[#1E293B] dark:text-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || importing}
            className="px-4 py-2 text-sm bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Canvas'}
          </button>
        </div>
      </div>
    </div>
  );
}
