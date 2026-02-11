import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from './jwt';

export async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
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
