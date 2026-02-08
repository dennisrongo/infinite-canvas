import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, validateEmail, generateToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = true } = body;

    if (!email || !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = generateToken({ userId: user.id, email: user.email });
    await setSessionCookie(token, rememberMe);

    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
