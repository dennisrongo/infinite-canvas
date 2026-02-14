import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDEKCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { noteUpdateSchema, isValidUUID } from '@/lib/validation';
import { ZodError } from 'zod';
import { getDEK, cacheDEK } from '@/lib/dek-cache';
import { encryptNote, decryptNote, isEncryptedData } from '@/lib/encryption';
import { indexNote, removeFromIndex } from '@/lib/search-index';

/**
 * Get the DEK for the current user
 * First checks memory cache, then falls back to cookie
 */
async function getOrRestoreDEK(userId: string): Promise<Buffer | null> {
  // First check memory cache
  let dek = getDEK(userId);

  if (dek) {
    return dek;
  }

  // Try to restore from cookie
  dek = await getDEKCookie();

  if (dek) {
    // Cache it in memory for future requests
    cacheDEK(userId, dek);
    return dek;
  }

  return null;
}

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

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID format' },
        { status: 400 }
      );
    }

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
    const dek = await getOrRestoreDEK(session.userId);

    // Determine if this note should be encrypted
    const shouldEncrypt = dek !== null;

    // If note is already encrypted but we don't have DEK, we can't update content/title
    if (note.isEncrypted && !dek && (validatedData.title !== undefined || validatedData.content !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot update encrypted note. Please log in again to refresh your session.' },
        { status: 403 }
      );
    }

    if (validatedData.title !== undefined) {
      const trimmedTitle = validatedData.title.trim() || 'Untitled Note';

      // For duplicate title check, we need to compare with decrypted titles
      // This is a limitation - we can only check against unencrypted notes
      // or notes we can decrypt with the current DEK
      if (!note.isEncrypted) {
        const existingNote = await prisma.note.findFirst({
          where: {
            canvasId: note.canvasId,
            title: trimmedTitle,
            id: { not: noteId }, // Exclude current note
            isEncrypted: false, // Only check unencrypted notes
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
      }

      if (shouldEncrypt) {
        // We'll encrypt both title and content together below
        // Just store the plaintext for now
        updateData._plaintextTitle = trimmedTitle;
      } else {
        updateData.title = trimmedTitle;
      }
    }

    if (validatedData.content !== undefined) {
      if (shouldEncrypt) {
        // Store plaintext content for encryption step
        updateData._plaintextContent = validatedData.content;
      } else {
        updateData.content = validatedData.content;
      }
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

    // Handle encryption for title/content updates
    if (dek && (updateData._plaintextTitle !== undefined || updateData._plaintextContent !== undefined)) {
      // Get the plaintext title and content
      let plaintextTitle = updateData._plaintextTitle;
      let plaintextContent = updateData._plaintextContent;

      // If title wasn't updated, get current title (decrypt if needed)
      if (plaintextTitle === undefined) {
        if (note.isEncrypted && isEncryptedData(note.title)) {
          try {
            const decrypted = decryptNote(note.title, note.content, dek);
            plaintextTitle = decrypted.title;
          } catch {
            plaintextTitle = note.title; // Fallback to stored value
          }
        } else {
          plaintextTitle = note.title;
        }
      }

      // If content wasn't updated, get current content (decrypt if needed)
      if (plaintextContent === undefined) {
        if (note.isEncrypted && isEncryptedData(note.content)) {
          try {
            const decrypted = decryptNote(note.title, note.content, dek);
            plaintextContent = decrypted.content;
          } catch {
            plaintextContent = note.content; // Fallback to stored value
          }
        } else {
          plaintextContent = note.content;
        }
      }

      // Encrypt the title and content
      const encrypted = encryptNote(plaintextTitle, plaintextContent, dek);
      updateData.title = encrypted.encryptedTitle;
      updateData.content = encrypted.encryptedContent;
      updateData.isEncrypted = true;
      updateData.encryptionVersion = 1;

      // Remove temporary plaintext fields
      delete updateData._plaintextTitle;
      delete updateData._plaintextContent;
    }

    // Update note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    });

    // Sync search index with the updated note
    // We need the plaintext title and content for the index
    let indexTitle = updatedNote.title;
    let indexContent = updatedNote.content;

    if (updatedNote.isEncrypted && dek && isEncryptedData(updatedNote.title) && isEncryptedData(updatedNote.content)) {
      try {
        const decrypted = decryptNote(updatedNote.title, updatedNote.content, dek);
        indexTitle = decrypted.title;
        indexContent = decrypted.content;
      } catch {
        // Use encrypted values if decryption fails
      }
    }

    // Update the search index
    await indexNote(noteId, session.userId, updatedNote.canvasId, indexTitle, indexContent).catch((err) => {
      console.error('Failed to update search index:', err);
      // Don't fail the request if index update fails
    });

    // Return decrypted note to client
    let responseNote = updatedNote;
    if (updatedNote.isEncrypted && dek && isEncryptedData(updatedNote.title) && isEncryptedData(updatedNote.content)) {
      try {
        const decrypted = decryptNote(updatedNote.title, updatedNote.content, dek);
        responseNote = {
          ...updatedNote,
          title: decrypted.title,
          content: decrypted.content,
        };
      } catch {
        // Return encrypted note if decryption fails
      }
    }

    return NextResponse.json({ note: responseNote });
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

    const { noteId } = await params;

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID format' },
        { status: 400 }
      );
    }

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

    // Remove from search index
    await removeFromIndex(noteId).catch((err) => {
      console.error('Failed to remove from search index:', err);
      // Don't fail the request if index removal fails
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
