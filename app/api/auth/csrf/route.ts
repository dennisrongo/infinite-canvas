import { NextResponse } from 'next/server';
import { getCSRFToken } from '@/lib/csrf';
import { getSession } from '@/lib/auth';

/**
 * GET /api/auth/csrf - Get CSRF token for the current session
 *
 * This endpoint provides the CSRF token to the frontend.
 * The token is also stored in an HTTP-only cookie for validation.
 */
export async function GET() {
  try {
    // User must be authenticated to get a CSRF token
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or generate CSRF token
    const token = await getCSRFToken();

    return NextResponse.json({
      csrfToken: token,
      headerName: 'x-csrf-token'
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
