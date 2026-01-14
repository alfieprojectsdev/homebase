import { db } from '@/lib/db';
import { choreStreaks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function updateStreak(choreId: number, userId: number, orgId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await db
    .select()
    .from(choreStreaks)
    .where(
      and(
        eq(choreStreaks.userId, userId),
        eq(choreStreaks.choreId, choreId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(choreStreaks).values({
      userId,
      orgId,
      choreId,
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedAt: now,
    });
    return;
  }

  const streak = existing[0];
  const lastCompleted = streak.lastCompletedAt ? new Date(streak.lastCompletedAt) : now;
  const lastDay = new Date(lastCompleted.getFullYear(), lastCompleted.getMonth(), lastCompleted.getDate());

  const daysDiff = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak = streak.currentStreak || 1;

  if (daysDiff === 0) {
    return;
  } else if (daysDiff === 1) {
    newStreak = newStreak + 1;
  } else {
    newStreak = 1;
  }

  await db
    .update(choreStreaks)
    .set({
      currentStreak: newStreak,
      longestStreak: Math.max(streak.longestStreak || 0, newStreak),
      lastCompletedAt: now,
      updatedAt: now,
    })
    .where(eq(choreStreaks.id, streak.id));
}
