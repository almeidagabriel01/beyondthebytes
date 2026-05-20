import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Server-only env — import after Next.js has loaded env files
const getSecret = () => new TextEncoder().encode(process.env['JWT_SECRET'] ?? '');

const PUBLIC_PATHS = ['/login', '/favicon.ico', '/_next', '/api'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    // Token expired or invalid — clear stale cookie and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }
}

export const config = {
  // Protect all routes except: login, Next.js internals, static files
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
