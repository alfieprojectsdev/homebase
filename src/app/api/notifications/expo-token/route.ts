import Expo from 'expo-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('token' in body) ||
    typeof (body as Record<string, unknown>).token !== 'string' ||
    !(body as Record<string, unknown>).token
  ) {
    return NextResponse.json({ error: 'Missing or invalid token field' }, { status: 400 });
  }

  const token = (body as Record<string, string>).token;

  if (!Expo.isExpoPushToken(token)) {
    return NextResponse.json(
      { error: 'Invalid Expo push token format' },
      { status: 400 },
    );
  }

  try {
    await db
      .update(users)
      .set({ expoPushToken: token })
      .where(eq(users.id, authUser.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expo token registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
