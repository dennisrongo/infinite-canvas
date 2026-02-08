import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    if (name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 });
    }

    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: { canvases: true },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (existingFolder.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
      include: { canvases: true },
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const moveCanvasesToRoot = searchParams.get('moveCanvasesToRoot') === 'true';

    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: { canvases: true },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (existingFolder.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasCanvases = existingFolder.canvases.length > 0;

    if (hasCanvases && !moveCanvasesToRoot) {
      return NextResponse.json(
        {
          error: 'Folder contains canvases',
          message: 'This folder contains canvases. Please specify whether to move canvases to root or delete them.',
          canvasCount: existingFolder.canvases.length,
        },
        { status: 409 }
      );
    }

    if (hasCanvases && moveCanvasesToRoot) {
      await prisma.canvas.updateMany({
        where: { folderId: id },
        data: { folderId: null },
      });
    }

    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: hasCanvases && moveCanvasesToRoot
        ? 'Folder deleted and canvases moved to root'
        : 'Folder deleted',
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
