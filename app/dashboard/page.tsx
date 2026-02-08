'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Canvas {
  id: string;
  name: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  canvases: Canvas[];
}

interface CanvasesResponse {
  folders: Folder[];
  canvases: Canvas[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootCanvases, setRootCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deleteMoveToRoot, setDeleteMoveToRoot] = useState(true);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [renameName, setRenameName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) throw new Error('Failed to fetch folders');
      const data = await res.json();
      setFolders(data.folders || []);

      const canvasesRes = await fetch('/api/canvases');
      if (!canvasesRes.ok) throw new Error('Failed to fetch canvases');
      const canvasesData: CanvasesResponse = await canvasesRes.json();
      setRootCanvases((canvasesData.canvases || []).filter((c: Canvas) => {
        return !data.folders?.some((f: Folder) => f.canvases.some((fc: Canvas) => fc.id === c.id));
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to load folders and canvases');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const data = await res.json();
      setFolders([...folders, data.folder]);
      setNewFolderName('');
      setShowNewFolderModal(false);
      showMessage('success', `Folder "${data.folder.name}" created successfully`);
    } catch (error: any) {
      console.error('Error creating folder:', error);
      showMessage('error', error.message || 'Failed to create folder');
    }
  };

  const confirmDeleteFolder = (folder: Folder) => {
    setFolderToDelete(folder);
    setDeleteMoveToRoot(folder.canvases.length > 0);
    setShowDeleteModal(true);
  };

  const deleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      const url = `/api/folders/${folderToDelete.id}?moveCanvasesToRoot=${deleteMoveToRoot}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      setFolders(folders.filter(f => f.id !== folderToDelete.id));

      if (deleteMoveToRoot && folderToDelete.canvases.length > 0) {
        setRootCanvases([...rootCanvases, ...folderToDelete.canvases]);
      }

      setShowDeleteModal(false);
      setFolderToDelete(null);
      showMessage('success', 'Folder deleted successfully');
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      showMessage('error', error.message || 'Failed to delete folder');
    }
  };

  const openRenameModal = (folder: Folder) => {
    setFolderToRename(folder);
    setRenameName(folder.name);
    setShowRenameModal(true);
  };

  const renameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToRename || !renameName.trim()) return;

    try {
      const res = await fetch(`/api/folders/${folderToRename.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rename folder');
      }

      const data = await res.json();
      setFolders(folders.map(f => f.id === folderToRename.id ? data.folder : f));
      setShowRenameModal(false);
      setFolderToRename(null);
      setRenameName('');
      showMessage('success', 'Folder renamed successfully');
    } catch (error: any) {
      console.error('Error renaming folder:', error);
      showMessage('error', error.message || 'Failed to rename folder');
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const createCanvas = async (folderId?: string) => {
    const canvasName = prompt(folderId ? 'Enter canvas name:' : 'Enter canvas name for root:');
    if (!canvasName || !canvasName.trim()) return;

    try {
      const body: any = { name: canvasName.trim() };
      if (folderId) body.folderId = folderId;

      const res = await fetch('/api/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create canvas');

      const data = await res.json();
      if (folderId) {
        setFolders(folders.map(f => {
          if (f.id === folderId) {
            return { ...f, canvases: [...f.canvases, data.canvas] };
          }
          return f;
        }));
      } else {
        setRootCanvases([...rootCanvases, data.canvas]);
      }

      showMessage('success', `Canvas "${data.canvas.name}" created successfully`);
    } catch (error) {
      console.error('Error creating canvas:', error);
      showMessage('error', 'Failed to create canvas');
    }
  };

  const deleteCanvas = async (canvasId: string, folderId?: string) => {
    if (!confirm('Are you sure you want to delete this canvas?')) return;

    try {
      const res = await fetch(`/api/canvases/${canvasId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete canvas');

      if (folderId) {
        setFolders(folders.map(f => {
          if (f.id === folderId) {
            return { ...f, canvases: f.canvases.filter(c => c.id !== canvasId) };
          }
          return f;
        }));
      } else {
        setRootCanvases(rootCanvases.filter(c => c.id !== canvasId));
      }

      showMessage('success', 'Canvas deleted successfully');
    } catch (error) {
      console.error('Error deleting canvas:', error);
      showMessage('error', 'Failed to delete canvas');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B]">
      <header className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#475569] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
            Infinite Canvas
          </h1>
          <div className="flex items-center gap-4">
            <a
              href="/settings"
              className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
            >
              Settings
            </a>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {message && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow">
            <div className="p-6 border-b border-[#E2E8F0] dark:border-[#475569]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                  My Canvases
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition text-sm"
                  >
                    + New Folder
                  </button>
                  <button
                    onClick={() => createCanvas()}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition text-sm"
                  >
                    + New Canvas
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {folders.length === 0 && rootCanvases.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                    No canvases yet. Create your first canvas or folder to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {folders.map((folder) => (
                    <div key={folder.id} className="border border-[#E2E8F0] dark:border-[#475569] rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-[#1E293B] cursor-pointer"
                        onClick={() => toggleFolder(folder.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                            {expandedFolders.has(folder.id) ? '▼' : '▶'}
                          </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                            {folder.name}
                          </span>
                          <span className="text-sm text-[#64748B]">
                            ({folder.canvases.length} canvases)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); createCanvas(folder.id); }}
                            className="px-3 py-1 text-xs bg-[#3B82F6] text-white rounded hover:bg-[#2563EB] transition"
                          >
                            + Canvas
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openRenameModal(folder); }}
                            className="px-3 py-1 text-xs border border-[#E2E8F0] dark:border-[#475569] rounded hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmDeleteFolder(folder); }}
                            className="px-3 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {expandedFolders.has(folder.id) && (
                        <div className="p-4 border-t border-[#E2E8F0] dark:border-[#475569]">
                          {folder.canvases.length === 0 ? (
                            <p className="text-sm text-[#64748B]">No canvases in this folder</p>
                          ) : (
                            <div className="space-y-2">
                              {folder.canvases.map((canvas) => (
                                <div
                                  key={canvas.id}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded"
                                >
                                  <a
                                    href={`/canvas/${canvas.id}`}
                                    className="text-[#3B82F6] hover:underline font-medium"
                                  >
                                    {canvas.name}
                                  </a>
                                  <button
                                    onClick={() => deleteCanvas(canvas.id, folder.id)}
                                    className="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {rootCanvases.length > 0 && (
                    <div className="border border-[#E2E8F0] dark:border-[#475569] rounded-lg">
                      <div className="p-4 bg-[#F8FAFC] dark:bg-[#1E293B]">
                        <span className="font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                          Root (No Folder)
                        </span>
                        <span className="text-sm text-[#64748B] ml-2">
                          ({rootCanvases.length} canvases)
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {rootCanvases.map((canvas) => (
                          <div
                            key={canvas.id}
                            className="flex items-center justify-between p-3 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#475569] rounded"
                          >
                            <a
                              href={`/canvas/${canvas.id}`}
                              className="text-[#3B82F6] hover:underline font-medium"
                            >
                              {canvas.name}
                            </a>
                            <button
                              onClick={() => deleteCanvas(canvas.id)}
                              className="px-2 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Create New Folder
            </h3>
            <form onSubmit={createFolder}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                  className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && folderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Delete Folder
            </h3>
            {folderToDelete.canvases.length > 0 ? (
              <>
                <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                  This folder contains {folderToDelete.canvases.length} canvas(es). What would you like to do?
                </p>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={deleteMoveToRoot}
                      onChange={() => setDeleteMoveToRoot(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                      Move canvases to root (recommended)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!deleteMoveToRoot}
                      onChange={() => setDeleteMoveToRoot(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-[#1E293B] dark:text-[#F1F5F9]">
                      Delete folder and all canvases inside
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <p className="text-[#1E293B] dark:text-[#F1F5F9] mb-4">
                Are you sure you want to delete the folder "{folderToDelete.name}"?
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setFolderToDelete(null); }}
                className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteFolder}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && folderToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#0F172A] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F1F5F9] mb-4">
              Rename Folder
            </h3>
            <form onSubmit={renameFolder}>
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg bg-white dark:bg-[#1E293B] text-[#1E293B] dark:text-[#F1F5F9] mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowRenameModal(false); setFolderToRename(null); setRenameName(''); }}
                  className="px-4 py-2 border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
