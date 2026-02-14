import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getOrRestoreDEK } from '@/lib/dek';
import { decryptNote, isEncryptedData, decrypt } from '@/lib/encryption';

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

    // Get DEK for decryption
    const dek = await getOrRestoreDEK(session.userId);

    // Since notes are encrypted, we need to fetch and decrypt first, then filter
    // This is necessary because the search terms can't match encrypted content
    const startTime = Date.now();

    // Build query parameters
    const params: any[] = [session.userId];
    let whereSQL = 'WHERE c.user_id = $1';

    if (canvasId) {
      params.push(canvasId);
      whereSQL += ' AND n.canvas_id = $' + params.length;
    }

    if (dateFilter) {
      const dateThreshold = getDateFilterThreshold(dateFilter);
      if (dateThreshold) {
        params.push(dateThreshold.toISOString());
        whereSQL += ' AND n.updated_at >= $' + params.length + '::timestamp';
      }
    }

    // Order by field mapping
    const orderByField = getFieldMapping(sortField);
    const orderDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

    // Fetch notes (without search filter - we'll filter after decryption)
    // If canvasId is specified, scope to that canvas for better performance
    // Otherwise, fetch a reasonable limit from all canvases
    const fetchLimit = canvasId ? MAX_RESULTS * 3 : MAX_RESULTS * 2;

    const notesQuery = `
      SELECT
        n.id,
        n.title,
        n.content,
        n.is_encrypted as "isEncrypted",
        n.position_x as "positionX",
        n.position_y as "positionY",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt",
        c.id as "canvasId",
        c.name as "canvasName",
        c.is_encrypted as "canvasIsEncrypted"
      FROM notes n
      INNER JOIN canvases c ON n.canvas_id = c.id
      ${whereSQL}
      ORDER BY ${orderByField} ${orderDirection}
      LIMIT ${fetchLimit}
    `;

    const notes = await prisma.$queryRawUnsafe<any[]>(notesQuery, ...params);

    // Normalize search terms for case-insensitive matching
    const normalizedSearchTerms = searchTerms.toLowerCase();

    // Decrypt and filter results
    const results: Array<{
      id: string;
      title: string;
      content: string;
      contentPreview: string;
      canvasId: string;
      canvasName: string;
      positionX: number;
      positionY: number;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const note of notes) {
      let title = note.title;
      let content = note.content;
      let canvasName = note.canvasName;
      let isEncrypted = note.isEncrypted;

      // Try to decrypt note title and content if we have a DEK
      if (dek && isEncryptedData(title) && isEncryptedData(content)) {
        try {
          const decrypted = decryptNote(title, content, dek);
          title = decrypted.title;
          content = decrypted.content;
          isEncrypted = true;
        } catch (decryptError) {
          console.error('Failed to decrypt note during search:', note.id, decryptError);
          // Keep encrypted values if decryption fails
        }
      } else if (!dek && isEncryptedData(title || '')) {
        // No DEK but data is encrypted - skip this note
        continue;
      }

      // Try to decrypt canvas name if encrypted
      if (dek && (note.canvasIsEncrypted || isEncryptedData(canvasName || ''))) {
        try {
          if (isEncryptedData(canvasName)) {
            const canvasNameData = JSON.parse(canvasName);
            canvasName = decrypt(canvasNameData, dek);
          }
        } catch (canvasDecryptError) {
          console.error('Failed to decrypt canvas name during search:', note.canvasId, canvasDecryptError);
        }
      }

      // Check if decrypted content matches search terms
      const titleLower = title?.toLowerCase() || '';
      const contentLower = content?.toLowerCase() || '';

      if (titleLower.includes(normalizedSearchTerms) || contentLower.includes(normalizedSearchTerms)) {
        results.push({
          id: note.id,
          title,
          content,
          contentPreview: content
            ? content.substring(0, 150) + (content.length > 150 ? '...' : '')
            : '',
          canvasId: note.canvasId,
          canvasName,
          positionX: Number(note.positionX),
          positionY: Number(note.positionY),
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        });

        // Stop once we have enough results
        if (results.length >= MAX_RESULTS) {
          break;
        }
      }
    }

    const searchTime = Date.now() - startTime;
    const totalCount = results.length;

    return NextResponse.json({
      results,
      totalCount,
      hasMore: false, // Since we filtered in-memory, we can't know if there are more
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
