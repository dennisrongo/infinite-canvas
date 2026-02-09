import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/canvases/:id/notes - Create a new note
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
    const body = await request.json();
    const { id, title, content, positionX, positionY, width, height } = body;

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
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (positionX === undefined || positionY === undefined) {
      return NextResponse.json(
        { error: 'Position is required' },
        { status: 400 }
      );
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        canvasId,
        title: title.trim() || 'Untitled Note',
        content: content || '',
        positionX: Number(positionX),
        positionY: Number(positionY),
        width: Number(width || 300),
        height: Number(height || 200),
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

// GET /api/canvases/:id/notes - Get all notes in a canvas
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

    // Get notes
    const notes = await prisma.note.findMany({
      where: {
        canvasId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
