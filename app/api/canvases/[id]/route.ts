import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';
import { getOrRestoreDEK, decryptNameWithDEK } from '@/lib/dek';
import { decryptNote, isEncryptedData, encrypt } from '@/lib/encryption';

// Default and maximum pagination limits
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET /api/canvases/:id - Get a single canvas with notes and connections
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

    // Parse pagination and include query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10),
      MAX_LIMIT
    );
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeNotes = searchParams.get('includeNotes') !== 'false';
    const includeConnections = searchParams.get('includeConnections') !== 'false';

    const canvas = await prisma.canvas.findFirst({
      where: {
        id: canvasId,
        userId: session.userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            isEncrypted: true,
          },
        },
        ...(includeNotes && {
          notes: {
            orderBy: {
              createdAt: 'asc',
            },
            take: limit,
            skip: offset,
          },
        }),
        ...(includeConnections && {
          connections: {
            take: limit,
            skip: offset,
          },
        }),
      },
    });

    if (!canvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    // Get counts for pagination metadata (run in parallel with main query)
    const [notesCount, connectionsCount] = await Promise.all([
      prisma.note.count({ where: { canvasId } }),
      prisma.noteConnection.count({ where: { canvasId } }),
    ]);
    
    const pagination = {
      notes: { total: notesCount, limit, offset, hasMore: offset + (canvas.notes?.length || 0) < notesCount },
      connections: { total: connectionsCount, limit, offset, hasMore: offset + (canvas.connections?.length || 0) < connectionsCount },
    };

    // Get DEK for decryption
    const dek = await getOrRestoreDEK(session.userId);

    // Decrypt canvas name
    const { name: canvasName } = dek
      ? decryptNameWithDEK(canvas.name, canvas.isEncrypted, dek)
      : { name: canvas.isEncrypted ? '[Please log in to view]' : canvas.name };

    // Decrypt folder name if exists
    let folderDecrypted = canvas.folder;
    if (canvas.folder) {
      const { name: folderName } = dek
        ? decryptNameWithDEK(canvas.folder.name, canvas.folder.isEncrypted, dek)
        : { name: canvas.folder.isEncrypted ? '[Please log in to view]' : canvas.folder.name };
      folderDecrypted = { ...canvas.folder, name: folderName };
    }

    // Decrypt note titles and content
    const decryptedNotes = canvas.notes.map((note) => {
      if (note.isEncrypted && dek) {
        const titleIsEncrypted = isEncryptedData(note.title);
        const contentIsEncrypted = isEncryptedData(note.content);

        if (titleIsEncrypted && contentIsEncrypted) {
          try {
            const decrypted = decryptNote(note.title, note.content, dek);
            return {
              ...note,
              title: decrypted.title,
              content: decrypted.content,
            };
          } catch (error) {
            console.error('Failed to decrypt note:', note.id, error);
            return {
              ...note,
              title: '[Decryption Error]',
              content: '[Unable to decrypt this note]',
            };
          }
        }
      }
      return note;
    });

    return NextResponse.json({ 
      canvas: { ...canvas, name: canvasName, folder: folderDecrypted, notes: decryptedNotes },
      pagination
    });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvas' },
      { status: 500 }
    );
  }
}

// PUT /api/canvases/:id - Update canvas name or folder
export async function PUT(
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
    const { name, folderId, viewportX, viewportY, zoom, order } = body;

    // Security: Validate folderId UUID if provided
    if (folderId !== undefined && folderId !== null && !isValidUUID(folderId)) {
      return NextResponse.json(
        { error: 'Invalid folder ID format' },
        { status: 400 }
      );
    }

    // Verify the canvas belongs to the user
    const existingCanvas = await prisma.canvas.findFirst({
      where: {
        id: canvasId,
        userId: session.userId,
      },
    });

    if (!existingCanvas) {
      return NextResponse.json(
        { error: 'Canvas not found' },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Canvas name must be a string' },
          { status: 400 }
        );
      }

      const trimmedName = name.trim();

      if (trimmedName.length === 0) {
        return NextResponse.json(
          { error: 'Canvas name cannot be empty' },
          { status: 400 }
        );
      }

      // Validate canvas name length (max 255 characters)
      if (trimmedName.length > 255) {
        return NextResponse.json(
          { error: 'Canvas name is too long. Maximum 255 characters allowed.' },
          { status: 400 }
        );
      }

      // Warn about very long names
      if (trimmedName.length > 100) {
        console.warn(`Canvas name is unusually long (${trimmedName.length} characters)`);
      }
    }

    // If folderId is provided, verify it belongs to the user
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: session.userId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { error: 'Invalid folder' },
          { status: 400 }
        );
      }
    }

    // Update canvas
    const updateData: Record<string, unknown> = {};
    
    // Handle name encryption
    if (name !== undefined) {
      const trimmedName = name.trim();
      const dek = await getOrRestoreDEK(session.userId);
      
      if (dek && !existingCanvas.isEncrypted) {
        // Encrypt the name if we have a DEK and it's not already encrypted
        const encrypted = encrypt(trimmedName, dek);
        updateData.name = JSON.stringify(encrypted);
        updateData.isEncrypted = true;
        updateData.encryptionVersion = 1;
      } else {
        updateData.name = trimmedName;
      }
    }
    
    if (folderId !== undefined) {
      updateData.folderId = folderId;
    }
    if (viewportX !== undefined) {
      updateData.viewportX = viewportX;
    }
    if (viewportY !== undefined) {
      updateData.viewportY = viewportY;
    }
    if (zoom !== undefined) {
      updateData.zoom = zoom;
    }
    if (order !== undefined) {
      updateData.order = order;
    }

    const canvas = await prisma.canvas.update({
      where: { id: canvasId },
      data: updateData,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ canvas });
  } catch (error) {
    console.error('Error updating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to update canvas' },
      { status: 500 }
    );
  }
}

// DELETE /api/canvases/:id - Delete canvas (cascades to notes and connections)
export async function DELETE(
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

    // Delete canvas (Prisma will cascade delete notes and connections)
    await prisma.canvas.delete({
      where: { id: canvasId },
    });

    return NextResponse.json({
      message: 'Canvas deleted successfully',
      canvasId
    });
  } catch (error) {
    console.error('Error deleting canvas:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas' },
      { status: 500 }
    );
  }
}
