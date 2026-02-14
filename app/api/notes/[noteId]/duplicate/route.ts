import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';
import { indexNote } from '@/lib/search-index';

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

    // Index the new note in the search index
    // The original note might be encrypted, so we need to handle that
    let indexTitle = duplicateNote.title;
    let indexContent = duplicateNote.content;
    
    // If the original was encrypted, the duplicate will be too
    if (originalNote.isEncrypted) {
      // For duplicates, we can't easily decrypt without the DEK
      // The search index will be updated when the user opens/edits the note
      // For now, try to use the stored values (they won't match well if encrypted)
      const { isEncryptedData, decryptNote } = await import('@/lib/encryption');
      const { getOrRestoreDEK } = await import('@/lib/dek');
      
      const dek = await getOrRestoreDEK(session.userId);
      if (dek && isEncryptedData(duplicateNote.title) && isEncryptedData(duplicateNote.content)) {
        try {
          const decrypted = decryptNote(duplicateNote.title, duplicateNote.content, dek);
          indexTitle = decrypted.title;
          indexContent = decrypted.content;
        } catch {
          // Keep encrypted values if decryption fails
        }
      }
    }

    await indexNote(duplicateNote.id, session.userId, duplicateNote.canvasId, indexTitle, indexContent).catch((err) => {
      console.error('Failed to index duplicated note:', err);
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
