import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Maximum search query length to prevent performance issues
const MAX_SEARCH_QUERY_LENGTH = 1000;

// Maximum number of results to return (for performance and UX)
const MAX_RESULTS = 50;

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

    // Handle very long search queries - truncate to max length
    let searchTerms = query.trim();
    let wasTruncated = false;

    if (searchTerms.length > MAX_SEARCH_QUERY_LENGTH) {
      searchTerms = searchTerms.substring(0, MAX_SEARCH_QUERY_LENGTH);
      wasTruncated = true;
    }

    if (!searchTerms) {
      return NextResponse.json({ results: [] });
    }

    // Build where clause base - user must own the canvas
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

    // For SQLite, use raw SQL query for better performance with large datasets
    // This avoids fetching all notes and filtering in JavaScript
    const startTime = Date.now();
    const searchTermLower = `%${searchTerms.toLowerCase()}%`;

    // Build the query conditionally based on parameters
    let whereSQL = 'WHERE c.user_id = ?';
    const params: any[] = [session.userId];

    if (canvasId) {
      whereSQL += ' AND n.canvas_id = ?';
      params.push(canvasId);
    }

    whereSQL += ' AND (LOWER(n.title) LIKE LOWER(?) OR LOWER(n.content) LIKE LOWER(?))';
    params.push(searchTermLower, searchTermLower);

    if (dateFilter) {
      const dateCondition = getDateFilterCondition(dateFilter);
      if (dateCondition) {
        whereSQL += ` AND ${dateCondition}`;
      }
    }

    // Get total count of matching notes (for pagination info)
    const countQuery = `
      SELECT COUNT(*) as count
      FROM notes n
      INNER JOIN canvases c ON n.canvas_id = c.id
      ${whereSQL}
    `;

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      countQuery,
      ...params
    );
    const totalCount = Number(countResult[0]?.count || 0);

    // Get paginated results with sorting
    const orderByField = getFieldMapping(sortField);
    const orderDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    const notesQuery = `
      SELECT
        n.id,
        n.title,
        n.content,
        n.position_x as "positionX",
        n.position_y as "positionY",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt",
        c.id as "canvasId",
        c.name as "canvasName"
      FROM notes n
      INNER JOIN canvases c ON n.canvas_id = c.id
      ${whereSQL}
      ORDER BY ${orderByField} ${orderDirection}
      LIMIT ${MAX_RESULTS}
    `;

    const notes = await prisma.$queryRawUnsafe(notesQuery, ...params);

    const searchTime = Date.now() - startTime;

    // Format results
    const results = (notes as any[]).map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      contentPreview: note.content
        ? note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')
        : '',
      canvasId: note.canvasId,
      canvasName: note.canvasName,
      positionX: Number(note.positionX),
      positionY: Number(note.positionY),
      createdAt: new Date(note.createdAt as string | Date),
      updatedAt: new Date(note.updatedAt as string | Date),
    }));

    return NextResponse.json({
      results,
      totalCount,
      hasMore: totalCount > MAX_RESULTS,
      searchTime,
      ...(wasTruncated && {
        warning: `Search query was truncated to ${MAX_SEARCH_QUERY_LENGTH} characters for performance.`
      })
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// Helper function to get date filter SQL condition
function getDateFilterCondition(dateFilter: string): string {
  const now = new Date();
  switch (dateFilter) {
    case 'today':
      return `datetime(n.updated_at) >= datetime('${new Date(now.setHours(0, 0, 0, 0)).toISOString()}')`;
    case 'week':
      return `datetime(n.updated_at) >= datetime('${new Date(now.setDate(now.getDate() - 7)).toISOString()}')`;
    case 'month':
      return `datetime(n.updated_at) >= datetime('${new Date(now.setMonth(now.getMonth() - 1)).toISOString()}')`;
    case 'year':
      return `datetime(n.updated_at) >= datetime('${new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()}')`;
    default:
      return '';
  }
}

// Helper function to map sort field to database column
function getFieldMapping(sortField: string): string {
  const fieldMap: Record<string, string> = {
    createdAt: 'n.created_at',
    updatedAt: 'n.updated_at',
    title: 'n.title',
  };
  return fieldMap[sortField] || 'n.updated_at';
}
