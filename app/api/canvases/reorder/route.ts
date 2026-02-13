import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';

interface ReorderItem {
  canvasId: string;
  folderId: string | null;
  order: number;
}

// POST /api/canvases/reorder - Batch reorder canvases
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { updates } = body as { updates: ReorderItem[] };

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Validate each update item
    for (const update of updates) {
      if (!update.canvasId || !isValidUUID(update.canvasId)) {
        return NextResponse.json(
          { error: 'Invalid canvas ID in updates' },
          { status: 400 }
        );
      }
      if (update.folderId !== null && !isValidUUID(update.folderId)) {
        return NextResponse.json(
          { error: 'Invalid folder ID in updates' },
          { status: 400 }
        );
      }
      if (typeof update.order !== 'number' || update.order < 0) {
        return NextResponse.json(
          { error: 'Invalid order value in updates' },
          { status: 400 }
        );
      }
    }

    // Get all canvas IDs from updates
    const canvasIds = updates.map(u => u.canvasId);

    // Verify all canvases belong to the user
    const canvases = await prisma.canvas.findMany({
      where: {
        id: { in: canvasIds },
        userId: session.userId,
      },
      select: { id: true },
    });

    if (canvases.length !== canvasIds.length) {
      return NextResponse.json(
        { error: 'One or more canvases not found or not owned by user' },
        { status: 404 }
      );
    }

    // Verify all folders belong to the user (if folderId is not null)
    const folderIds = [...new Set(updates.filter(u => u.folderId !== null).map(u => u.folderId!))];
    if (folderIds.length > 0) {
      const folders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds },
          userId: session.userId,
        },
        select: { id: true },
      });

      if (folders.length !== folderIds.length) {
        return NextResponse.json(
          { error: 'One or more folders not found or not owned by user' },
          { status: 404 }
        );
      }
    }

    // Perform batch update in a transaction
    const updatePromises = updates.map(update =>
      prisma.canvas.update({
        where: { id: update.canvasId },
        data: {
          folderId: update.folderId,
          order: update.order,
        },
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Canvases reordered successfully',
      count: updates.length,
    });
  } catch (error) {
    console.error('Error reordering canvases:', error);
    return NextResponse.json(
      { error: 'Failed to reorder canvases' },
      { status: 500 }
    );
  }
}
