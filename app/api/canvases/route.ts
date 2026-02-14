import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCSRFToken } from '@/lib/csrf';
import { checkRateLimit, getIdentifier, rateLimitConfigs } from '@/lib/rate-limit';
import { getOrRestoreDEK, decryptNameWithDEK } from '@/lib/dek';
import { encrypt } from '@/lib/encryption';

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

    const canvases = await prisma.canvas.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
            isEncrypted: true,
          },
        },
        _count: {
          select: {
            notes: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Get DEK for decryption
    const dek = await getOrRestoreDEK(session.userId);

    const decryptedCanvases = canvases.map((canvas) => {
      // Decrypt canvas name
      const { name: canvasName } = dek
        ? decryptNameWithDEK(canvas.name, canvas.isEncrypted, dek)
        : { name: canvas.isEncrypted ? '[Please log in to view]' : canvas.name };
      
      // Decrypt folder name if exists
      let folderDecrypted = canvas.folder;
      if (canvas.folder) {
        const { name: folderName } = dek
          ? decryptNameWithDEK(canvas.folder.name, canvas.folder.isEncrypted, dek)
          : { name: canvas.folder.isEncrypted ? '[Please log in to view]' : canvas.folder.name };
        folderDecrypted = { ...canvas.folder, name: folderName };
      }
      
      return { ...canvas, name: canvasName, folder: folderDecrypted };
    });

    return NextResponse.json({ canvases: decryptedCanvases });
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

    // Apply rate limiting for canvas creation
    const identifier = getIdentifier(request);
    const rateLimitResult = checkRateLimit(identifier, 'canvas-creation', rateLimitConfigs.canvasCreation);

    // Helper function to add rate limit headers
    const addRateLimitHeaders = (response: NextResponse, result: typeof rateLimitResult) => {
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      return response;
    };

    // Check if rate limited
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      const errorResponse = NextResponse.json(
        {
          error: 'Too many canvas creation attempts',
          message: rateLimitResult.blocked
            ? `You have been temporarily blocked due to excessive canvas creation. Please try again in ${retryAfter} seconds.`
            : `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter
        },
        { status: 429 }
      );
      errorResponse.headers.set('Retry-After', retryAfter.toString());
      return addRateLimitHeaders(errorResponse, rateLimitResult);
    }

    // Validate CSRF token for state-changing operation
    const isValidCSRF = await validateCSRFToken(request);
    if (!isValidCSRF) {
      const response = NextResponse.json(
        { error: 'CSRF validation failed', message: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const body = await request.json();
    const { name, folderId } = body;

    // Validate canvas name
    if (!name || typeof name !== 'string') {
      const response = NextResponse.json(
        { error: 'Canvas name is required' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      const response = NextResponse.json(
        { error: 'Canvas name cannot be empty' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // Validate canvas name length (max 255 characters)
    if (trimmedName.length > 255) {
      const response = NextResponse.json(
        { error: 'Canvas name is too long. Maximum 255 characters allowed.' },
        { status: 400 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
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
        const response = NextResponse.json(
          { error: 'Invalid folder' },
          { status: 400 }
        );
        return addRateLimitHeaders(response, rateLimitResult);
      }
    }

    // Check if DEK is available for encryption
    const dek = await getOrRestoreDEK(session.userId);
    let canvasName = trimmedName;
    let isEncrypted = false;

    if (dek) {
      // Encrypt the canvas name
      const encrypted = encrypt(trimmedName, dek);
      canvasName = JSON.stringify(encrypted);
      isEncrypted = true;
    }

    const canvas = await prisma.canvas.create({
      data: {
        userId: session.userId,
        name: canvasName,
        folderId: folderId || null,
        isEncrypted,
        encryptionVersion: isEncrypted ? 1 : null,
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

    // Return decrypted name to client
    const response = NextResponse.json({ 
      canvas: {
        ...canvas,
        name: trimmedName,
      }
    }, { status: 201 });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error creating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to create canvas' },
      { status: 500 }
    );
  }
}
