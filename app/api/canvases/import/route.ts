import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/canvases/import - Import canvas from JSON
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { importData, folderId } = body;

    // Validate import data structure
    if (!importData || !importData.canvas) {
      return NextResponse.json(
        { error: 'Invalid import data format' },
        { status: 400 }
      );
    }

    const { canvas: canvasData } = importData;

    // Validate canvas name
    if (!canvasData.name || typeof canvasData.name !== 'string') {
      return NextResponse.json(
        { error: 'Canvas name is required' },
        { status: 400 }
      );
    }

    const trimmedName = canvasData.name.trim();

    if (trimmedName.length === 0 || trimmedName.length > 255) {
      return NextResponse.json(
        { error: 'Canvas name must be between 1 and 255 characters' },
        { status: 400 }
      );
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

    // Create the canvas
    const canvas = await prisma.canvas.create({
      data: {
        userId: session.userId,
        folderId: folderId || null,
        name: trimmedName,
        viewportX: canvasData.viewportX || 0,
        viewportY: canvasData.viewportY || 0,
        zoom: canvasData.zoom || 1,
      },
    });

    // Create notes and track ID mappings for connections
    const noteIdMap = new Map<string, string>(); // export index -> new UUID

    if (canvasData.notes && Array.isArray(canvasData.notes)) {
      for (const noteData of canvasData.notes) {
        // Validate note data
        if (!noteData.title || typeof noteData.title !== 'string') {
          continue; // Skip invalid notes
        }

        const note = await prisma.note.create({
          data: {
            canvasId: canvas.id,
            title: noteData.title,
            content: noteData.content || '',
            positionX: noteData.positionX || 0,
            positionY: noteData.positionY || 0,
            width: noteData.width || 300,
            height: noteData.height || 200,
            fontFamily: noteData.fontFamily || 'Inter',
            fontSize: noteData.fontSize || 14,
          },
        });

        // Store the mapping using array index as key
        const index = canvasData.notes.indexOf(noteData);
        noteIdMap.set(String(index), note.id);

        // Create images if present
        if (noteData.images && Array.isArray(noteData.images)) {
          for (const imageData of noteData.images) {
            await prisma.image.create({
              data: {
                noteId: note.id,
                storagePath: imageData.storagePath,
                fileName: imageData.fileName,
                mimeType: imageData.mimeType,
                sizeBytes: imageData.sizeBytes,
              },
            });
          }
        }
      }
    }

    // Create connections
    if (canvasData.connections && Array.isArray(canvasData.connections)) {
      for (const connData of canvasData.connections) {
        const sourceId = noteIdMap.get(String(connData.sourceIndex));
        const targetId = noteIdMap.get(String(connData.targetIndex));

        // Only create connection if both notes exist
        if (sourceId && targetId && sourceId !== targetId) {
          try {
            await prisma.noteConnection.create({
              data: {
                canvasId: canvas.id,
                sourceNoteId: sourceId,
                targetNoteId: targetId,
              },
            });
          } catch (error) {
            // Connection might already exist (duplicate), skip it
            console.warn('Failed to create connection, likely duplicate:', error);
          }
        }
      }
    }

    // Fetch the complete imported canvas
    const importedCanvas = await prisma.canvas.findFirst({
      where: {
        id: canvas.id,
        userId: session.userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        notes: {
          include: {
            images: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        connections: true,
      },
    });

    return NextResponse.json({
      message: 'Canvas imported successfully',
      canvas: importedCanvas,
    });
  } catch (error) {
    console.error('Error importing canvas:', error);
    return NextResponse.json(
      { error: 'Failed to import canvas' },
      { status: 500 }
    );
  }
}
