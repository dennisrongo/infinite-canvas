import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';

// GET /api/canvases/:id/export - Export canvas as JSON
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

    // Security: Validate UUID format
    if (!isValidUUID(canvasId)) {
      return NextResponse.json(
        { error: 'Invalid canvas ID format' },
        { status: 400 }
      );
    }

    // Fetch canvas with all related data
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
          include: {
            images: true,
          },
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

    // Create export data structure
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      canvas: {
        name: canvas.name,
        viewportX: canvas.viewportX,
        viewportY: canvas.viewportY,
        zoom: canvas.zoom,
        notes: canvas.notes.map(note => ({
          title: note.title,
          content: note.content,
          positionX: note.positionX,
          positionY: note.positionY,
          width: note.width,
          height: note.height,
          fontFamily: note.fontFamily,
          fontSize: note.fontSize,
          images: note.images.map(img => ({
            storagePath: img.storagePath,
            fileName: img.fileName,
            mimeType: img.mimeType,
            sizeBytes: img.sizeBytes,
          })),
        })),
        connections: canvas.connections.map(conn => ({
          sourceIndex: canvas.notes.findIndex(n => n.id === conn.sourceNoteId),
          targetIndex: canvas.notes.findIndex(n => n.id === conn.targetNoteId),
        })),
      },
    };

    // Create response with JSON file download
    const filename = `${canvas.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting canvas:', error);
    return NextResponse.json(
      { error: 'Failed to export canvas' },
      { status: 500 }
    );
  }
}
