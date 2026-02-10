import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidUUID } from '@/lib/validation';

// DELETE /api/connections/:id - Delete a connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Security: Validate UUID format to prevent path traversal and injection attacks
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid connection ID format' },
        { status: 400 }
      );
    }

    // Find the connection and verify it belongs to a canvas owned by the user
    const connection = await prisma.noteConnection.findFirst({
      where: {
        id,
      },
      include: {
        canvas: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.canvas.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete the connection
    await prisma.noteConnection.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    );
  }
}
