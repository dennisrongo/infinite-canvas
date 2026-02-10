import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';

// POST /api/canvases/:id/connections - Create a new connection between notes
export async function POST(
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

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(canvasId)) {
      return NextResponse.json(
        { error: 'Invalid canvas ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sourceNoteId, targetNoteId } = body;

    // Security: Validate note UUID formats
    if (!isValidUUID(sourceNoteId)) {
      return NextResponse.json(
        { error: 'Invalid source note ID format' },
        { status: 400 }
      );
    }

    if (!isValidUUID(targetNoteId)) {
      return NextResponse.json(
        { error: 'Invalid target note ID format' },
        { status: 400 }
      );
    }

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

    // Validate required fields
    if (!sourceNoteId || !targetNoteId) {
      return NextResponse.json(
        { error: 'Source and target note IDs are required' },
        { status: 400 }
      );
    }

    if (sourceNoteId === targetNoteId) {
      return NextResponse.json(
        { error: 'Cannot connect a note to itself' },
        { status: 400 }
      );
    }

    // Verify both notes exist and belong to the canvas
    const [sourceNote, targetNote] = await Promise.all([
      prisma.note.findFirst({
        where: {
          id: sourceNoteId,
          canvasId,
        },
      }),
      prisma.note.findFirst({
        where: {
          id: targetNoteId,
          canvasId,
        },
      }),
    ]);

    if (!sourceNote) {
      return NextResponse.json(
        { error: 'Source note not found' },
        { status: 404 }
      );
    }

    if (!targetNote) {
      return NextResponse.json(
        { error: 'Target note not found' },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const existingConnection = await prisma.noteConnection.findFirst({
      where: {
        canvasId,
        sourceNoteId,
        targetNoteId,
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Connection already exists' },
        { status: 409 }
      );
    }

    // Create connection
    const connection = await prisma.noteConnection.create({
      data: {
        canvasId,
        sourceNoteId,
        targetNoteId,
      },
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

// GET /api/canvases/:id/connections - Get all connections in a canvas
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

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(canvasId)) {
      return NextResponse.json(
        { error: 'Invalid canvas ID format' },
        { status: 400 }
      );
    }

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

    // Get connections
    const connections = await prisma.noteConnection.findMany({
      where: {
        canvasId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
