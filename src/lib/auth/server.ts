import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';

export async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return null;
  }

  return payload;
}
