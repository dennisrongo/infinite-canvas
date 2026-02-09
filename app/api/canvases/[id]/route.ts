import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/canvases/:id - Get a single canvas with notes and connections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: canvasId } = await params;

    const canvas = await prisma.canvas.findFirst({
      where: {
        id: canvasId,
        userId: session.userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        notes: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        connections: true,
      },
    });

    if (!canvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvas' },
      { status: 500 }
    );
  }
}

// PUT /api/canvases/:id - Update canvas name or folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: canvasId } = await params;
    const body = await request.json();
    const { name, folderId, viewportX, viewportY, zoom } = body;

    // Verify the canvas belongs to the user
    const existingCanvas = await prisma.canvas.findFirst({
      where: {
        id: canvasId,
        userId: session.userId,
      },
    });

    if (!existingCanvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Canvas name must be a string' },
          { status: 400 }
        );
      }

      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Canvas name cannot be empty' },
          { status: 400 }
        );
      }
    }

    // If folderId is provided, verify it belongs to the user
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.userId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Invalid folder' },
          { status: 400 }
        );
      }
    }

    // Update canvas
    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (folderId !== undefined) {
      updateData.folderId = folderId;
    }
    if (viewportX !== undefined) {
      updateData.viewportX = viewportX;
    }
    if (viewportY !== undefined) {
      updateData.viewportY = viewportY;
    }
    if (zoom !== undefined) {
      updateData.zoom = zoom;
    }

    const canvas = await prisma.canvas.update({
      where: { id: canvasId },
      data: updateData,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error('Error updating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to update canvas' },
      { status: 500 }
    );
  }
}

// DELETE /api/canvases/:id - Delete canvas (cascades to notes and connections)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: canvasId } = await params;

    // Verify the canvas belongs to the user
    const canvas = await prisma.canvas.findFirst({
      where: {
        id: canvasId,
        userId: session.userId,
      },
    });

    if (!canvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    // Delete canvas (Prisma will cascade delete notes and connections)
    await prisma.canvas.delete({
      where: { id: canvasId },
    });

    return NextResponse.json({
      message: 'Canvas deleted successfully',
      canvasId
    });
  } catch (error) {
    console.error('Error deleting canvas:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas' },
      { status: 500 }
    );
  }
}
