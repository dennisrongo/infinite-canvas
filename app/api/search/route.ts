import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrRestoreDEK } from '@/lib/dek';
import { decryptNote, isEncryptedData } from '@/lib/encryption';

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

    // Use raw SQL query for better performance with large datasets
    // This avoids fetching all notes and filtering in JavaScript
    const startTime = Date.now();
    const searchPattern = `%${searchTerms}%`;

    // Build the query conditionally based on parameters (PostgreSQL $N placeholders)
    const params: any[] = [session.userId];
    let whereSQL = 'WHERE c.user_id = $1';

    if (canvasId) {
      params.push(canvasId);
      whereSQL += ' AND n.canvas_id = $' + params.length;
    }

    const titleIdx = params.length + 1;
    const contentIdx = params.length + 2;
    whereSQL += ` AND (n.title ILIKE $${titleIdx} OR n.content ILIKE $${contentIdx})`;
    params.push(searchPattern, searchPattern);

    if (dateFilter) {
      const dateThreshold = getDateFilterThreshold(dateFilter);
      if (dateThreshold) {
        params.push(dateThreshold.toISOString());
        whereSQL += ' AND n.updated_at >= $' + params.length + '::timestamp';
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

    // Get DEK for decryption
    const dek = await getOrRestoreDEK(session.userId);

    // Format results (decrypt if needed)
    const results = (notes as any[]).map((note) => {
      let title = note.title;
      let content = note.content;

      // Try to decrypt if we have a DEK and the data looks encrypted
      if (dek && isEncryptedData(title) && isEncryptedData(content)) {
        try {
          const decrypted = decryptNote(title, content, dek);
          title = decrypted.title;
          content = decrypted.content;
        } catch (decryptError) {
          console.error('Failed to decrypt note during search:', note.id, decryptError);
          // Keep encrypted values if decryption fails
        }
      }

      return {
        id: note.id,
        title,
        content,
        contentPreview: content
          ? content.substring(0, 150) + (content.length > 150 ? '...' : '')
          : '',
        canvasId: note.canvasId,
        canvasName: note.canvasName,
        positionX: Number(note.positionX),
        positionY: Number(note.positionY),
        createdAt: new Date(note.createdAt as string | Date),
        updatedAt: new Date(note.updatedAt as string | Date),
      };
    });

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

// Helper function to get date filter threshold
function getDateFilterThreshold(dateFilter: string): Date | null {
  const now = new Date();
  switch (dateFilter) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'week':
      return new Date(now.setDate(now.getDate() - 7));
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1));
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return null;
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
