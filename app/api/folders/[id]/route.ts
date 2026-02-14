import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';
import { getOrRestoreDEK } from '@/lib/dek';
import { encrypt } from '@/lib/encryption';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid folder ID format' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 });
    }

    // Validate folder name length (max 255 characters)
    if (trimmedName.length > 255) {
      return NextResponse.json(
        { error: 'Folder name is too long. Maximum 255 characters allowed.' },
        { status: 400 }
      );
    }

    // Warn about very long names
    if (trimmedName.length > 100) {
      console.warn(`Folder name is unusually long (${trimmedName.length} characters)`);
    }

    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: { canvases: true },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (existingFolder.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if DEK is available for encryption
    const dek = await getOrRestoreDEK(session.userId);
    let folderName = trimmedName;
    let isEncrypted = existingFolder.isEncrypted;
    let encryptionVersion = existingFolder.encryptionVersion;

    // Only encrypt if we have a DEK and the folder is not already encrypted
    // This preserves existing encryption status
    if (dek && !isEncrypted) {
      const encrypted = encrypt(trimmedName, dek);
      folderName = JSON.stringify(encrypted);
      isEncrypted = true;
      encryptionVersion = 1;
    }

    const folder = await prisma.folder.update({
      where: { id },
      data: { 
        name: folderName,
        isEncrypted,
        encryptionVersion,
      },
      include: { canvases: true },
    });

    // Return decrypted name to client
    return NextResponse.json({ 
      folder: {
        ...folder,
        name: trimmedName,
      }
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid folder ID format' },
        { status: 400 }
      );
    }
    const { searchParams } = new URL(request.url);
    const moveCanvasesToRoot = searchParams.get('moveCanvasesToRoot') === 'true';

    const existingFolder = await prisma.folder.findUnique({
      where: { id },
      include: { canvases: true },
    });

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    if (existingFolder.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hasCanvases = existingFolder.canvases.length > 0;

    // If folder has canvases and moveCanvasesToRoot is true, move canvases to root
    // If folder has canvases and moveCanvasesToRoot is false, delete the canvases
    if (hasCanvases && moveCanvasesToRoot) {
      await prisma.canvas.updateMany({
        where: { folderId: id },
        data: { folderId: null },
      });
    } else if (hasCanvases && !moveCanvasesToRoot) {
      // Delete all canvases in the folder (cascade will handle notes and connections)
      await prisma.canvas.deleteMany({
        where: { folderId: id },
      });
    }

    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: hasCanvases && moveCanvasesToRoot
        ? 'Folder deleted and canvases moved to root'
        : hasCanvases && !moveCanvasesToRoot
          ? 'Folder and all canvases deleted'
          : 'Folder deleted',
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
