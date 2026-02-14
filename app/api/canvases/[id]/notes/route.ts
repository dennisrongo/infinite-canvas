import { NextRequest, NextResponse } from 'next/server';
import { getSession, getDEKCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { noteCreateSchema, isValidUUID } from '@/lib/validation';
import { ZodError } from 'zod';
import { getDEK, cacheDEK } from '@/lib/dek-cache';
import { encryptNote, decryptNote, isEncryptedData } from '@/lib/encryption';

/**
 * Get the DEK for the current user
 * First checks memory cache, then falls back to cookie
 */
async function getOrRestoreDEK(userId: string): Promise<Buffer | null> {
  // First check memory cache
  let dek = getDEK(userId);

  if (dek) {
    console.log('[DEK] Found in memory cache for user:', userId);
    return dek;
  }

  // Try to restore from cookie
  console.log('[DEK] Not in memory cache, trying cookie for user:', userId);
  dek = await getDEKCookie();

  if (dek) {
    console.log('[DEK] Restored from cookie, caching in memory');
    // Cache it in memory for future requests
    cacheDEK(userId, dek);
    return dek;
  }

  console.log('[DEK] Not found in cookie either');
  return null;
}

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

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(canvasId)) {
      return NextResponse.json(
        { error: 'Invalid canvas ID format' },
        { status: 400 }
      );
    }
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
    // Check if DEK is available for encryption
    const dek = await getOrRestoreDEK(session.userId);
    let noteTitle = trimmedTitle;
    let noteContent = validatedData.content;
    let isEncrypted = false;

    if (dek) {
      // Encrypt the note content
      const encrypted = encryptNote(trimmedTitle, validatedData.content, dek);
      noteTitle = encrypted.encryptedTitle;
      noteContent = encrypted.encryptedContent;
      isEncrypted = true;
    }

    const note = await prisma.note.create({
      data: {
        id: id || undefined, // Use provided ID for restore, otherwise generate new
        canvasId,
        title: noteTitle,
        content: noteContent, // Already sanitized by Zod schema
        positionX: validatedData.positionX,
        positionY: validatedData.positionY,
        width: validatedData.width,
        height: validatedData.height,
        isEncrypted,
        encryptionVersion: isEncrypted ? 1 : null,
      },
    });

    // Return decrypted note to client
    return NextResponse.json({
      note: {
        ...note,
        title: trimmedTitle,
        content: validatedData.content,
      }
    }, { status: 201 });
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

    // Get notes
    const notes = await prisma.note.findMany({
      where: {
        canvasId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Decrypt notes if DEK is available
    const dek = await getOrRestoreDEK(session.userId);

    // If we have encrypted notes but no DEK, user needs to re-login
    const hasEncryptedNotes = notes.some(note => note.isEncrypted);
    if (hasEncryptedNotes && !dek) {
      console.warn('User has encrypted notes but DEK not in cache - session may have expired or server restarted');
    }

    const decryptedNotes = notes.map((note) => {
      if (note.isEncrypted) {
        console.log('[Notes] Processing encrypted note:', note.id, 'has DEK:', !!dek);
        if (!dek) {
          // DEK not available - return error indicator
          return {
            ...note,
            title: '[Session Expired]',
            content: '[Your session has expired. Please log in again to view encrypted notes.]',
            decryptionError: true,
            needsReauth: true,
          };
        }
        try {
          // Only decrypt if the title/content look like encrypted JSON
          const titleIsEncrypted = isEncryptedData(note.title);
          const contentIsEncrypted = isEncryptedData(note.content);
          console.log('[Notes] Title is encrypted:', titleIsEncrypted, 'Content is encrypted:', contentIsEncrypted);

          if (titleIsEncrypted && contentIsEncrypted) {
            const decrypted = decryptNote(note.title, note.content, dek);
            console.log('[Notes] Successfully decrypted note:', note.id);
            return {
              ...note,
              title: decrypted.title,
              content: decrypted.content,
            };
          }
        } catch (error) {
          console.error('[Notes] Failed to decrypt note:', note.id, error);
          // Return note with error indicator - client can handle this
          return {
            ...note,
            title: '[Decryption Error]',
            content: '[Unable to decrypt this note. Please try logging in again.]',
            decryptionError: true,
          };
        }
      }
      return note;
    });

    return NextResponse.json({ notes: decryptedNotes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
