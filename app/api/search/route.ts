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
    const { query, canvasId, sortBy = 'updatedAt', sortOrder = 'desc', dateFilter } = body;

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

    // Add date filter if specified
    if (dateFilter) {
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          whereClause.updatedAt = {
            gte: new Date(now.setHours(0, 0, 0, 0)),
          };
          break;
        case 'week':
          whereClause.updatedAt = {
            gte: new Date(now.setDate(now.getDate() - 7)),
          };
          break;
        case 'month':
          whereClause.updatedAt = {
            gte: new Date(now.setMonth(now.getMonth() - 1)),
          };
          break;
        case 'year':
          whereClause.updatedAt = {
            gte: new Date(now.setFullYear(now.getFullYear() - 1)),
          };
          break;
      }
    }

    // Validate sortBy field
    const validSortFields = ['createdAt', 'updatedAt', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';

    // Validate sortOrder
    const validSortOrders = ['asc', 'desc'];
    const sortDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    // For SQLite, we need to do case-insensitive search differently
    // Get all matching notes by canvas user, then filter manually
    const allNotes = await prisma.note.findMany({
      where: whereClause,
      include: {
        canvas: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortField]: sortDirection,
      },
      take: 100, // Get more candidates since we'll filter
    });

    // Filter notes case-insensitively
    const notes = allNotes.filter(note =>
      note.title.toLowerCase().includes(searchTerms) ||
      note.content.toLowerCase().includes(searchTerms)
    ).slice(0, 50); // Limit to 50 results

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
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
