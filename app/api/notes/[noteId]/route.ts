import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { noteUpdateSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import { validateCSRFToken } from '@/lib/csrf';

// PUT /api/notes/:noteId - Update note content or position
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'CSRF validation failed', message: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }

    const { noteId } = await params;
    const body = await request.json();

    // Validate and sanitize input using Zod schema
    const validatedData = noteUpdateSchema.parse(body);

    // Verify the note exists and belongs to the user's canvas
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        canvas: {
          userId: session.userId,
        },
      },
      include: {
        canvas: true,
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Build update data object
    const updateData: any = {};

    if (validatedData.title !== undefined) {
      const trimmedTitle = validatedData.title.trim() || 'Untitled Note';

      // Check for duplicate title within the same canvas (excluding current note)
      const existingNote = await prisma.note.findFirst({
        where: {
          canvasId: note.canvasId,
          title: trimmedTitle,
          id: { not: noteId }, // Exclude current note
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

      updateData.title = trimmedTitle;
    }

    if (validatedData.content !== undefined) {
      // Content is already sanitized by the Zod schema
      updateData.content = validatedData.content;
    }

    if (validatedData.positionX !== undefined) {
      updateData.positionX = validatedData.positionX;
    }

    if (validatedData.positionY !== undefined) {
      updateData.positionY = validatedData.positionY;
    }

    if (validatedData.width !== undefined) {
      updateData.width = validatedData.width;
    }

    if (validatedData.height !== undefined) {
      updateData.height = validatedData.height;
    }

    if (validatedData.fontFamily !== undefined) {
      updateData.fontFamily = validatedData.fontFamily;
    }

    if (validatedData.fontSize !== undefined) {
      updateData.fontSize = validatedData.fontSize;
    }

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json({ note: updatedNote });
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

    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/:noteId - Delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'CSRF validation failed', message: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }

    const { noteId } = await params;

    // Verify the note exists and belongs to the user's canvas
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        canvas: {
          userId: session.userId,
        },
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Delete note
    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({
      message: 'Note deleted successfully',
      noteId
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
