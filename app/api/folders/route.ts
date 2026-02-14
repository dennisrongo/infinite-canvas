import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrRestoreDEK, decryptNameWithDEK } from '@/lib/dek';
import { encrypt } from '@/lib/encryption';

interface FolderWithCanvases {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isEncrypted: boolean;
  encryptionVersion: number | null;
  canvases?: Array<{
    id: string;
    name: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    isEncrypted: boolean;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for selective fetching
    const { searchParams } = new URL(request.url);
    const includeCanvases = searchParams.get('includeCanvases') !== 'false'; // Default to true for backward compatibility

    // Use type assertion for conditional include
    const include = includeCanvases
      ? {
          canvases: {
            select: { id: true, name: true, updatedAt: true, createdAt: true, order: true, isEncrypted: true },
            orderBy: { order: 'asc' as const },
          },
        }
      : undefined;

    const folders = await prisma.folder.findMany({
      where: { userId: session.userId },
      include,
      orderBy: { order: 'asc' },
    }) as FolderWithCanvases[];

    // Get DEK for decryption
    const dek = await getOrRestoreDEK(session.userId);

    const decryptedFolders = folders.map((folder) => {
      // Decrypt folder name
      const { name: decryptedName } = dek
        ? decryptNameWithDEK(folder.name, folder.isEncrypted, dek)
        : { name: folder.isEncrypted ? '[Please log in to view]' : folder.name };
      
      // Decrypt canvas names inside folder (if canvases were included)
      const decryptedCanvases = folder.canvases
        ? folder.canvases.map((canvas) => {
            const { name: canvasName } = dek
              ? decryptNameWithDEK(canvas.name, canvas.isEncrypted, dek)
              : { name: canvas.isEncrypted ? '[Please log in to view]' : canvas.name };
            return { ...canvas, name: canvasName };
          })
        : [];
      
      return { ...folder, name: decryptedName, canvases: decryptedCanvases };
    });

    return NextResponse.json({ folders: decryptedFolders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Validate folder name length (max 255 characters for database, show friendlier error)
    if (trimmedName.length > 255) {
      return NextResponse.json(
        { error: 'Folder name is too long. Maximum 255 characters allowed.' },
        { status: 400 }
      );
    }

    // Warn about very long names (but still allow them)
    if (trimmedName.length > 100) {
      console.warn(`Folder name is unusually long (${trimmedName.length} characters)`);
    }

    // Check if DEK is available for encryption
    const dek = await getOrRestoreDEK(session.userId);
    let folderName = trimmedName;
    let isEncrypted = false;

    if (dek) {
      // Encrypt the folder name
      const encrypted = encrypt(trimmedName, dek);
      folderName = JSON.stringify(encrypted);
      isEncrypted = true;
    }

    const folder = await prisma.folder.create({
      data: { 
        userId: session.userId, 
        name: folderName,
        isEncrypted,
        encryptionVersion: isEncrypted ? 1 : null,
      },
      include: { canvases: true },
    });

    // Return decrypted name to client
    return NextResponse.json({ 
      folder: {
        ...folder,
        name: trimmedName,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
