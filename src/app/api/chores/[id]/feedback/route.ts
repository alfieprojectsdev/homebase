import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { choreFeedback, choreHistory } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    await db.insert(choreFeedback).values({
      choreId: parseInt(params.id),
      userId: authUser.userId,
      orgId: authUser.orgId,
      feedbackType: body.feedbackType,
      reason: body.reason,
      snoozedUntil: body.snoozedUntil ? new Date(body.snoozedUntil) : null,
    });

    await db.insert(choreHistory).values({
      choreId: parseInt(params.id),
      userId: authUser.userId,
      orgId: authUser.orgId,
      action: 'not_applicable',
      notes: body.reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
