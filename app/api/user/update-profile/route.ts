import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = body;

    // Validate display name
    if (displayName === undefined || displayName === null) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Convert to string and trim
    const trimmedName = String(displayName).trim();

    // Check if empty after trimming
    if (trimmedName === '') {
      return NextResponse.json(
        { error: 'Display name cannot be empty' },
        { status: 400 }
      );
    }

    // Check length limits (reasonable limits)
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Display name must be less than 100 characters' },
        { status: 400 }
      );
    }

    // Update user's display name
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { displayName: trimmedName },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
