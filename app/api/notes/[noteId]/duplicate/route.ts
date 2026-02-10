import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';

// POST /api/notes/:noteId/duplicate - Create a copy of a note
export async function POST(
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

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID format' },
        { status: 400 }
      );
    }

    // Verify the note exists and belongs to the user's canvas
    const originalNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        canvas: {
          userId: session.userId,
        },
      },
    });

    if (!originalNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Create duplicate with offset position and "Copy" suffix
    const duplicateNote = await prisma.note.create({
      data: {
        canvasId: originalNote.canvasId,
        title: originalNote.title.includes(' - Copy')
          ? originalNote.title
          : `${originalNote.title} - Copy`,
        content: originalNote.content,
        positionX: originalNote.positionX + 50, // Offset by 50px to the right
        positionY: originalNote.positionY + 50, // Offset by 50px down
        width: originalNote.width,
        height: originalNote.height,
        fontFamily: originalNote.fontFamily,
        fontSize: originalNote.fontSize,
      },
    });

    return NextResponse.json({
      note: duplicateNote,
      message: 'Note duplicated successfully',
    });
  } catch (error) {
    console.error('Error duplicating note:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate note' },
      { status: 500 }
    );
  }
}
