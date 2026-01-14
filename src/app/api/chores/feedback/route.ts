import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreFeedback, chores, users } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const feedback = await db
      .select({
        id: choreFeedback.id,
        choreId: choreFeedback.choreId,
        choreTitle: chores.title,
        userId: users.id,
        userName: users.name,
        feedbackType: choreFeedback.feedbackType,
        reason: choreFeedback.reason,
        createdAt: choreFeedback.createdAt,
      })
      .from(choreFeedback)
      .innerJoin(chores, eq(choreFeedback.choreId, chores.id))
      .innerJoin(users, eq(choreFeedback.userId, users.id))
      .where(eq(choreFeedback.orgId, authUser.orgId))
      .orderBy(desc(choreFeedback.createdAt))
      .limit(100);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Get feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
