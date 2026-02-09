import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { noteCreateSchema } from '@/lib/validation';
import { ZodError } from 'zod';

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
    const { id } = body;

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

    // Validate and sanitize input using Zod schema
    const validatedData = noteCreateSchema.parse(body);

    // Check for duplicate title within the same canvas
    const trimmedTitle = validatedData.title.trim() || 'Untitled Note';
    const existingNote = await prisma.note.findFirst({
      where: {
        canvasId,
        title: trimmedTitle,
      },
    });

    if (existingNote) {
      return NextResponse.json(
        {
          error: 'A note with this title already exists in this canvas. Please use a unique title.',
          field: 'title'
        },
        { status: 409 }
      );
    }

    // Create note with sanitized data
    const note = await prisma.note.create({
      data: {
        id: id || undefined, // Use provided ID for restore, otherwise generate new
        canvasId,
        title: trimmedTitle,
        content: validatedData.content, // Already sanitized by Zod schema
        positionX: validatedData.positionX,
        positionY: validatedData.positionY,
        width: validatedData.width,
        height: validatedData.height,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

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
