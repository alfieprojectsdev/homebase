import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreHistory, chores } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const history = await db
      .select({
        id: choreHistory.id,
        choreId: choreHistory.choreId,
        action: choreHistory.action,
        previousProgress: choreHistory.previousProgress,
        newProgress: choreHistory.newProgress,
        notes: choreHistory.notes,
        timestamp: choreHistory.timestamp,
        choreTitle: chores.title,
      })
      .from(choreHistory)
      .innerJoin(chores, eq(choreHistory.choreId, chores.id))
      .where(eq(choreHistory.orgId, authUser.orgId))
      .orderBy(desc(choreHistory.timestamp))
      .limit(100);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
