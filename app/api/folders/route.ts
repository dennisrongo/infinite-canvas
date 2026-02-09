import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's canvas sort order preference
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
      select: { canvasSortOrder: true },
    });

    const sortOrder = userSettings?.canvasSortOrder || 'updated';

    // Determine sort order for canvases
    let canvasOrderBy: { [key: string]: 'asc' | 'desc' } = { updatedAt: 'desc' };
    if (sortOrder === 'alphabetical') {
      canvasOrderBy = { name: 'asc' };
    } else if (sortOrder === 'created') {
      canvasOrderBy = { createdAt: 'desc' };
    }

    const folders = await prisma.folder.findMany({
      where: { userId: session.userId },
      include: {
        canvases: {
          select: { id: true, name: true, updatedAt: true, createdAt: true },
          orderBy: canvasOrderBy,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ folders, sortOrder });
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

    if (name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name cannot be empty' }, { status: 400 });
    }

    const folder = await prisma.folder.create({
      data: { userId: session.userId, name: name.trim() },
      include: { canvases: true },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
