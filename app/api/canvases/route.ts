import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCSRFToken } from '@/lib/csrf';

// GET /api/canvases - Get all canvases for the current user
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's canvas sort order preference
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
      select: { canvasSortOrder: true },
    });

    const sortOrder = userSettings?.canvasSortOrder || 'updated';

    // Determine sort order for canvases
    let orderBy: { [key: string]: 'asc' | 'desc' } = { updatedAt: 'desc' };
    if (sortOrder === 'alphabetical') {
      orderBy = { name: 'asc' };
    } else if (sortOrder === 'created') {
      orderBy = { createdAt: 'desc' };
    }

    const canvases = await prisma.canvas.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            notes: true,
          },
        },
      },
      orderBy,
    });

    return NextResponse.json({ canvases, sortOrder });
  } catch (error) {
    console.error('Error fetching canvases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvases' },
      { status: 500 }
    );
  }
}

// POST /api/canvases - Create a new canvas
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      return NextResponse.json(
        { error: 'CSRF validation failed', message: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, folderId } = body;

    // Validate canvas name
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Canvas name is required' },
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

    // If folderId is provided, verify it belongs to the user
    if (folderId) {
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

    const canvas = await prisma.canvas.create({
      data: {
        userId: session.userId,
        name: trimmedName,
        folderId: folderId || null,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ canvas }, { status: 201 });
  } catch (error) {
    console.error('Error creating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to create canvas' },
      { status: 500 }
    );
  }
}
