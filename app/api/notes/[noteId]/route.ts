import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    const { noteId } = await params;
    const body = await request.json();
    const { title, content, positionX, positionY, width, height, fontFamily, fontSize } = body;

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

    if (title !== undefined) {
      const trimmedTitle = title.trim() || 'Untitled Note';

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

    if (content !== undefined) {
      updateData.content = content;
    }

    if (positionX !== undefined) {
      updateData.positionX = Number(positionX);
    }

    if (positionY !== undefined) {
      updateData.positionY = Number(positionY);
    }

    if (width !== undefined) {
      updateData.width = Number(width);
    }

    if (height !== undefined) {
      updateData.height = Number(height);
    }

    if (fontFamily !== undefined) {
      updateData.fontFamily = String(fontFamily);
    }

    if (fontSize !== undefined) {
      updateData.fontSize = Number(fontSize);
    }

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
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
