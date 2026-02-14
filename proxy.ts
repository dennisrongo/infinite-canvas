import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/csrf',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
];

// Check if a path is public
function isPublicPath(pathname: string): boolean {
  // Check exact matches
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return true;
  }

  // Check API paths that start with /api/auth
  if (pathname.startsWith('/api/auth/')) {
    // Allow only public auth endpoints
    const publicAuthEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/csrf',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
    ];
    return publicAuthEndpoints.some(endpoint => pathname.startsWith(endpoint));
  }

  return false;
}

// Check if a path requires authentication
function isProtectedPath(pathname: string): boolean {
  const protectedPatterns = [
    '/dashboard',
    '/canvas/',
    '/settings',
  ];

  return protectedPatterns.some(pattern => pathname.startsWith(pattern));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check if the path requires authentication
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token
  const authToken = request.cookies.get('auth_token');

  if (!authToken) {
    // Redirect to login with return URL (using returnUrl to match login page)
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
