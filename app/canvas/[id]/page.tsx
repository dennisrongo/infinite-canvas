'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Note {
  id: string;
  title: string;
  content: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

interface Canvas {
  id: string;
  name: string;
  notes: Note[];
}

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const canvasId = params.id as string;
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCanvas();
  }, [canvasId]);

  const fetchCanvas = async () => {
    try {
      const res = await fetch(`/api/canvases/${canvasId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Canvas not found');
        } else if (res.status === 403) {
          setError('You do not have access to this canvas');
        } else {
          throw new Error('Failed to fetch canvas');
        }
        return;
      }
      const data = await res.json();
      setCanvas(data.canvas);
    } catch (err) {
      console.error('Error fetching canvas:', err);
      setError('Failed to load canvas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-[#1E293B] dark:text-[#F1F5F9]">Loading canvas...</div>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#1E293B] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Canvas not found'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#1E293B]">
      {/* Header */}
      <header className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#475569] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm border border-[#E2E8F0] dark:border-[#475569] rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">
              {canvas.name}
            </h1>
          </div>
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

      {/* Canvas Area */}
      <main className="flex-1 relative overflow-hidden bg-[#F8FAFC] dark:bg-[#1E293B]">
        {canvas.notes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-[#1E293B] dark:text-[#F1F5F9] text-lg mb-2">
                No notes yet
              </p>
              <p className="text-[#64748B] mb-4">
                Double-click anywhere to create your first note
              </p>
              <p className="text-sm text-[#64748B]">
                (Canvas functionality coming soon)
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-[#1E293B] dark:text-[#F1F5F9] text-lg mb-2">
                Canvas: {canvas.name}
              </p>
              <p className="text-[#64748B] mb-4">
                {canvas.notes.length} note(s)
              </p>
              <p className="text-sm text-[#64748B]">
                (Full canvas functionality coming soon)
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
