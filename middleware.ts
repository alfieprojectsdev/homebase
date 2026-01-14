import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './src/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log(`Middleware: Processing ${pathname}`);

  if (pathname.startsWith('/bills') || pathname.startsWith('/api/bills') || pathname.startsWith('/chores') || pathname.startsWith('/api/chores') || pathname.startsWith('/api/auth/me')) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);

    if (!payload) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  if (pathname === '/login' || pathname === '/signup') {
    const token = request.cookies.get('token')?.value;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const response = NextResponse.redirect(new URL('/bills', request.url));
        // Prevent caching to ensure redirect always happens
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/bills/:path*', '/api/bills/:path*', '/chores/:path*', '/api/chores/:path*', '/api/auth/me', '/login', '/signup'],
};
