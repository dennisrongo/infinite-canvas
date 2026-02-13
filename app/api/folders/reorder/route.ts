import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';

interface ReorderItem {
  folderId: string;
  order: number;
}

// POST /api/folders/reorder - Batch reorder folders
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
      if (!update.folderId || !isValidUUID(update.folderId)) {
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

    // Get all folder IDs from updates
    const folderIds = updates.map(u => u.folderId);

    // Verify all folders belong to the user
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

    // Perform batch update in a transaction
    const updatePromises = updates.map(update =>
      prisma.folder.update({
        where: { id: update.folderId },
        data: {
          order: update.order,
        },
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Folders reordered successfully',
      count: updates.length,
    });
  } catch (error) {
    console.error('Error reordering folders:', error);
    return NextResponse.json(
      { error: 'Failed to reorder folders' },
      { status: 500 }
    );
  }
}
