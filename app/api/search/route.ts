import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, canvasId } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const searchTerms = query.trim().toLowerCase();
    if (!searchTerms) {
      return NextResponse.json({ results: [] });
    }

    // Build search query
    const whereClause: any = {
      canvas: {
        userId: session.userId,
      },
    };

    // If canvasId is provided, search only in that canvas
    if (canvasId) {
      whereClause.canvasId = canvasId;
    }

    // Search notes by title OR content
    const notes = await prisma.note.findMany({
      where: {
        ...whereClause,
        OR: [
          { title: { contains: searchTerms, mode: 'insensitive' } },
          { content: { contains: searchTerms, mode: 'insensitive' } },
        ],
      },
      include: {
        canvas: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50, // Limit results to prevent overwhelming responses
    });

    // Format results
    const results = notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      contentPreview: note.content
        ? note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')
        : '',
      canvasId: note.canvas.id,
      canvasName: note.canvas.name,
      positionX: note.positionX,
      positionY: note.positionY,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
