import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { indexNote } from '@/lib/search-index';
import { isEncryptedData, encryptNote, decryptNote } from '@/lib/encryption';
import { getOrRestoreDEK, decryptNameWithDEK } from '@/lib/dek';

// Current encryption version constant
const CURRENT_ENCRYPTION_VERSION = 1;

// Helper to check if content looks encrypted
function looksLikeEncryptedContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  try {
    const parsed = JSON.parse(content);
    return isEncryptedData(content);
  } catch {
    return false;
  }
}

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

    // Get user's DEK for potential encryption/decryption
    const dek = await getOrRestoreDEK(session.userId);

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

    // Check if canvas name is encrypted and decrypt if needed
    let decryptedCanvasName = canvasData.name;
    
    if (isEncryptedData(canvasData.name) && dek) {
      try {
        const decrypted = decryptNameWithDEK(canvasData.name, true, dek);
        if (decrypted.isDecrypted) {
          decryptedCanvasName = decrypted.name;
        }
      } catch (error) {
        console.error('Failed to decrypt canvas name during import:', error);
      }
    }

    // Validate canvas name
    if (!canvasData.name || typeof canvasData.name !== 'string') {
      return NextResponse.json(
        { error: 'Canvas name is required' },
        { status: 400 }
      );
    }

    const trimmedName = decryptedCanvasName.trim();

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

        // DEBUG: Check if imported content looks encrypted
        const titleLooksEncrypted = looksLikeEncryptedContent(noteData.title);
        const contentLooksEncrypted = looksLikeEncryptedContent(noteData.content || '');
        const isImportedEncrypted = titleLooksEncrypted || contentLooksEncrypted;

        // Handle encryption: if imported content is encrypted, decrypt and re-encrypt for current user
        let noteTitle = noteData.title;
        let noteContent = noteData.content || '';
        let noteIsEncrypted = false;
        let decryptedTitle = noteData.title; // For indexing
        let decryptedContent = noteData.content || ''; // For indexing

        if (isImportedEncrypted) {
          if (dek) {
            // User has DEK - decrypt and re-encrypt for current user
            try {
              const decrypted = decryptNote(noteData.title, noteData.content || '', dek);
              decryptedTitle = decrypted.title;
              decryptedContent = decrypted.content;
              
              // Re-encrypt for current user
              const reEncrypted = encryptNote(decryptedTitle, decryptedContent, dek);
              noteTitle = reEncrypted.encryptedTitle;
              noteContent = reEncrypted.encryptedContent;
              noteIsEncrypted = true;
            } catch (error) {
              console.error('Failed to decrypt note during import:', error);
              // Store as-is but mark as encrypted so frontend shows decryption error
              noteIsEncrypted = true;
            }
          } else {
            // No DEK available - store with isEncrypted flag so frontend shows appropriate message
            noteIsEncrypted = true;
          }
        }

        const note = await prisma.note.create({
          data: {
            canvasId: canvas.id,
            title: noteTitle,
            content: noteContent,
            positionX: noteData.positionX || 0,
            positionY: noteData.positionY || 0,
            width: noteData.width || 300,
            height: noteData.height || 200,
            fontFamily: noteData.fontFamily || 'Inter',
            fontSize: noteData.fontSize || 14,
            isEncrypted: noteIsEncrypted,
            encryptionVersion: noteIsEncrypted ? CURRENT_ENCRYPTION_VERSION : null,
          },
        });

        // Store the mapping using array index as key
        const index = canvasData.notes.indexOf(noteData);
        noteIdMap.set(String(index), note.id);

        // Index the note in the search index (use decrypted content for indexing)
        const indexTitle = noteIsEncrypted && dek ? decryptedTitle : (noteData.title || '');
        const indexContent = noteIsEncrypted && dek ? decryptedContent : (noteData.content || '');
        await indexNote(note.id, session.userId, canvas.id, indexTitle, indexContent).catch((err) => {
          console.error('Failed to index imported note:', err);
        });

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

    // Decrypt notes for response if user has DEK
    let decryptedNotes = importedCanvas?.notes || [];
    if (dek && importedCanvas?.notes) {
      decryptedNotes = importedCanvas.notes.map((note) => {
        if (note.isEncrypted) {
          try {
            const decrypted = decryptNote(note.title, note.content, dek);
            return {
              ...note,
              title: decrypted.title,
              content: decrypted.content,
            };
          } catch (error) {
            console.error('Failed to decrypt note in response:', error);
            return {
              ...note,
              title: '[Decryption Error]',
              content: '[Unable to decrypt this note]',
            };
          }
        }
        return note;
      });
    }

    return NextResponse.json({
      message: 'Canvas imported successfully',
      canvas: { ...importedCanvas, notes: decryptedNotes },
    });
  } catch (error) {
    console.error('Error importing canvas:', error);
    return NextResponse.json(
      { error: 'Failed to import canvas' },
      { status: 500 }
    );
  }
}
