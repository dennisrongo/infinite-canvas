import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/notes/:noteId/images - Upload image to note
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

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'png';
    const filename = `${timestamp}-${random}.${extension}`;

    // Ensure public/images directory exists
    const imagesDir = join(process.cwd(), 'public', 'images');
    if (!existsSync(imagesDir)) {
      await mkdir(imagesDir, { recursive: true });
    }

    // Write file to disk
    const filepath = join(imagesDir, filename);
    await writeFile(filepath, buffer);

    // Save image record to database
    const image = await prisma.image.create({
      data: {
        noteId: noteId,
        storagePath: `/images/${filename}`,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: buffer.length,
      },
    });

    return NextResponse.json({
      image: {
        id: image.id,
        url: image.storagePath,
        fileName: image.fileName,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
