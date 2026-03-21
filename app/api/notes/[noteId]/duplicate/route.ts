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

    // Decrypt the original note's title and content for returning to client
    let decryptedTitle = originalNote.title;
    let decryptedContent = originalNote.content;
    let shouldEncrypt = false;
    let dek: Buffer | null = null;

    if (originalNote.isEncrypted) {
      const { isEncryptedData, decryptNote } = await import('@/lib/encryption');
      const { getOrRestoreDEK } = await import('@/lib/dek');

      dek = await getOrRestoreDEK(session.userId);
      if (!dek) {
        return NextResponse.json(
          { error: 'Failed to access encryption key for note duplication' },
          { status: 500 }
        );
      }

      const titleIsEncrypted = isEncryptedData(originalNote.title);
      const contentIsEncrypted = isEncryptedData(originalNote.content);

      // Data integrity guard: encrypted notes must have both title and content encrypted
      if (!titleIsEncrypted || !contentIsEncrypted) {
        return NextResponse.json(
          { error: 'Note encryption data is inconsistent' },
          { status: 500 }
        );
      }

      try {
        const decrypted = decryptNote(originalNote.title, originalNote.content, dek);
        decryptedTitle = decrypted.title;
        decryptedContent = decrypted.content;
        shouldEncrypt = true;
      } catch (error) {
        console.error('Failed to decrypt original note:', error);
        return NextResponse.json(
          { error: 'Failed to decrypt note for duplication' },
          { status: 500 }
        );
      }
    }

    // Create duplicate with offset position and "Copy" suffix
    const duplicateTitle = decryptedTitle.includes(' - Copy')
      ? decryptedTitle
      : `${decryptedTitle} - Copy`;
    
    // Prepare values for DB - encrypt if original was encrypted
    let dbTitle = duplicateTitle;
    let dbContent = decryptedContent;
    if (shouldEncrypt) {
      const { encryptNote } = await import('@/lib/encryption');
      if (!dek) {
        return NextResponse.json(
          { error: 'Failed to access encryption key for note duplication' },
          { status: 500 }
        );
      }

      const encrypted = encryptNote(duplicateTitle, decryptedContent, dek);
      dbTitle = encrypted.encryptedTitle;
      dbContent = encrypted.encryptedContent;
    }
    
    const duplicateNote = await prisma.note.create({
      data: {
        canvasId: originalNote.canvasId,
        title: dbTitle,
        content: dbContent,
        positionX: originalNote.positionX + 50, // Offset by 50px to the right
        positionY: originalNote.positionY + 50, // Offset by 50px down
        width: originalNote.width,
        height: originalNote.height,
        fontFamily: originalNote.fontFamily,
        fontSize: originalNote.fontSize,
        isEncrypted: shouldEncrypt,
        encryptionVersion: shouldEncrypt ? originalNote.encryptionVersion : null,
      },
    });

    // Index the new note in the search index with decrypted content
    const indexTitle = duplicateTitle;
    const indexContent = decryptedContent;
    
    await indexNote(duplicateNote.id, session.userId, duplicateNote.canvasId, indexTitle, indexContent).catch((err) => {
      console.error('Failed to index duplicated note:', err);
    });

    return NextResponse.json({
      note: {
        ...duplicateNote,
        title: duplicateTitle,
        content: decryptedContent,
      },
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
