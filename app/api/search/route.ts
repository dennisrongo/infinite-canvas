import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { search, rebuildIndex, getCanvasNameForSearch } from '@/lib/search-index';

// Maximum search query length to prevent performance issues
const MAX_SEARCH_QUERY_LENGTH = 1000;

// Maximum number of results to return (for performance and UX)
const MAX_RESULTS = 50;

// POST /api/search - Search notes using the search index
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      query, 
      canvasId, 
      sortBy = 'updatedAt', 
      sortOrder = 'desc', 
      dateFilter,
      offset = 0,
      limit = MAX_RESULTS,
      rebuildIndex: rebuildIndexRequested 
    } = body;

    // Handle rebuild index request (for initial setup or manual rebuild)
    if (rebuildIndexRequested) {
      try {
        const result = await rebuildIndex(session.userId);
        return NextResponse.json({ 
          message: 'Index rebuilt successfully',
          indexed: result.indexed,
          failed: result.failed,
        });
      } catch (indexError) {
        console.error('Failed to rebuild search index:', indexError);
        return NextResponse.json({ 
          error: 'Failed to rebuild search index' 
        }, { status: 500 });
      }
    }

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

    // Validate sortBy field
    const validSortFields = ['createdAt', 'updatedAt', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'updatedAt';

    // Validate sortOrder
    const validSortOrders = ['asc', 'desc'];
    const sortDirection = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    // Perform search using the search index
    const searchResult = await search(
      session.userId,
      searchTerms,
      {
        canvasId,
        sortBy: sortField,
        sortOrder: sortDirection,
        limit: Math.min(limit, MAX_RESULTS),
        offset,
        dateFilter,
      }
    );

    // Get canvas names for each result (if needed for display)
    // We do this in parallel with the search results
    const canvasIds = [...new Set(searchResult.results.map(r => r.canvasId))];
    const canvasNamesMap = new Map<string, string>();
    
    await Promise.all(
      canvasIds.map(async (canvasId) => {
        const name = await getCanvasNameForSearch(canvasId, session.userId);
        if (name) {
          canvasNamesMap.set(canvasId, name);
        }
      })
    );

    // Add canvas names to results
    const resultsWithCanvasNames = searchResult.results.map(result => ({
      ...result,
      canvasName: canvasNamesMap.get(result.canvasId) || 'Unknown Canvas',
    }));

    return NextResponse.json({
      results: resultsWithCanvasNames,
      totalCount: searchResult.totalCount,
      hasMore: searchResult.hasMore,
      searchTime: searchResult.searchTime,
      ...(wasTruncated && {
        warning: `Search query was truncated to ${MAX_SEARCH_QUERY_LENGTH} characters for performance.`
      })
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// GET /api/search - Health check and index status
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Search API is running. Use POST to search.'
  });
}
