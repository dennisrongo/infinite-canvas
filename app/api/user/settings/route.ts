import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/settings - Get user settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    // If settings don't exist, create with defaults
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.userId,
          theme: 'light',
          canvasSortOrder: 'updated',
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/user/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { theme, canvasSortOrder } = body;

    // Validate canvasSortOrder if provided
    const validSortOrders = ['updated', 'alphabetical', 'created'];
    if (canvasSortOrder && !validSortOrders.includes(canvasSortOrder)) {
      return NextResponse.json(
        { error: 'Invalid sort order. Must be one of: ' + validSortOrders.join(', ') },
        { status: 400 }
      );
    }

    // Get or create user settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.userId },
    });

    if (!settings) {
      // Create settings if they don't exist
      settings = await prisma.userSettings.create({
        data: {
          userId: session.userId,
          theme: theme || 'light',
          canvasSortOrder: canvasSortOrder || 'updated',
        },
      });
    } else {
      // Update existing settings
      settings = await prisma.userSettings.update({
        where: { userId: session.userId },
        data: {
          ...(theme !== undefined && { theme }),
          ...(canvasSortOrder !== undefined && { canvasSortOrder }),
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
