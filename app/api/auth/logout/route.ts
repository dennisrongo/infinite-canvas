import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (token) {
      // Verify token and add to revoked list
      const payload = verifyToken(token);
      if (payload) {
        // Calculate expiration time (7 days from now as that's our token expiry)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Add to revoked tokens
        await prisma.revokedToken.create({
          data: {
            token,
            userId: payload.userId,
            expiresAt,
          },
        });
      }

      // Clear the cookie
      cookieStore.delete('auth_token');
    }

    return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
