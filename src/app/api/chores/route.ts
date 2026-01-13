import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chores, choreHistory } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allChores = await db
      .select()
      .from(chores)
      .where(eq(chores.orgId, authUser.orgId))
      .orderBy(desc(chores.createdAt));

    return NextResponse.json({ chores: allChores });
  } catch (error) {
    console.error('Get chores error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const newChore = await db
      .insert(chores)
      .values({
        ...body,
        orgId: authUser.orgId,
        createdBy: authUser.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(choreHistory).values({
      choreId: newChore[0].id,
      userId: authUser.userId,
      orgId: authUser.orgId,
      action: 'created',
      previousProgress: 0,
      newProgress: 0,
    });

    return NextResponse.json({ chore: newChore[0] });
  } catch (error) {
    console.error('Create chore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
