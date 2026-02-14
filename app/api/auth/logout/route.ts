import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken, clearDEKCookie } from '@/lib/auth';
import { clearDEK } from '@/lib/dek-cache';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (token) {
      // Verify token and add to revoked list
      const payload = verifyToken(token);
      if (payload) {
        // Clear the DEK from memory cache and cookie
        clearDEK(payload.userId);
        await clearDEKCookie();

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

    // Return success JSON - frontend handles redirect via router.push()
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
