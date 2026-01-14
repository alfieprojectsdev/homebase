import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreStreaks, users } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const leaderboardData = await db
      .select({
        userId: users.id,
        userName: users.name,
        choreId: choreStreaks.choreId,
        totalStreaks: choreStreaks.currentStreak,
        longestStreak: choreStreaks.longestStreak,
      })
      .from(choreStreaks)
      .innerJoin(users, eq(choreStreaks.userId, users.id))
      .where(eq(choreStreaks.orgId, authUser.orgId))
      .orderBy(desc(choreStreaks.currentStreak));

    const aggregated = leaderboardData.reduce((acc: any[], entry) => {
      const existing = acc.find((e: any) => e.userId === entry.userId);
      if (existing) {
        existing.totalStreaks += entry.totalStreaks;
        existing.longestStreak = Math.max(existing.longestStreak || 0, entry.longestStreak || 0);
      } else {
        acc.push({ ...entry });
      }
      return acc;
    }, []);

    return NextResponse.json({ leaderboard: aggregated });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
