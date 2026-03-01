import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from './jwt';

export async function getAuthUser(request: NextRequest) {
  // Try cookie first (web clients)
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  // Fallback: Bearer token header (mobile clients)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7);
    return verifyToken(bearerToken);
  }

  return null;
}

/**
 * Standardized session helper for Server Components, Server Actions, and Route Handlers.
 * Uses next/headers cookies() to retrieve the token.
 */
export async function getServerSession() {
  const token = cookies().get('token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}
