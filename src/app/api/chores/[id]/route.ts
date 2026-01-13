import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chores, choreHistory, choreStreaks } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chore = await db
      .select()
      .from(chores)
      .where(
        and(
          eq(chores.id, parseInt(params.id)),
          eq(chores.orgId, authUser.orgId)
        )
      )
      .limit(1);

    if (!chore.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ chore: chore[0] });
  } catch (error) {
    console.error('Get chore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const current = await db
      .select()
      .from(chores)
      .where(
        and(
          eq(chores.id, parseInt(params.id)),
          eq(chores.orgId, authUser.orgId)
        )
      )
      .limit(1);

    if (!current.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const previousProgress = current[0].progress;
    const isCompletion = body.progress === 100;

    const updated = await db
      .update(chores)
      .set({
        ...body,
        updatedAt: new Date(),
        lastProgressUpdateAt: new Date(),
        completedAt: isCompletion ? new Date() : current[0].completedAt,
      })
      .where(
        and(
          eq(chores.id, parseInt(params.id)),
          eq(chores.orgId, authUser.orgId)
        )
      )
      .returning();

    await db.insert(choreHistory).values({
      choreId: parseInt(params.id),
      userId: authUser.userId,
      orgId: authUser.orgId,
      action: isCompletion ? 'completed' : 'progress_updated',
      previousProgress,
      newProgress: body.progress,
    });

    if (isCompletion) {
      await updateStreak(parseInt(params.id), authUser.userId, authUser.orgId);
    }

    return NextResponse.json({ chore: updated[0] });
  } catch (error) {
    console.error('Update chore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db
      .delete(chores)
      .where(
        and(
          eq(chores.id, parseInt(params.id)),
          eq(chores.orgId, authUser.orgId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateStreak(choreId: number, userId: number, orgId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await db
    .select()
    .from(choreStreaks)
    .where(
      eq(choreStreaks.userId, userId)
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
