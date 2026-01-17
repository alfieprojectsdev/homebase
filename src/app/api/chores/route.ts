import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { chores, choreHistory } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';

const choreSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  residenceId: z.number().int().positive().optional(),
  assignedTo: z.array(z.number().int().positive()).optional(),
  progress: z.number().int().min(0).max(100).optional().default(0),
  progressUnit: z.enum(['percent', 'steps']).optional(),
  totalSteps: z.number().int().positive().optional(),
  steps: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.enum(['daily', 'weekly', 'custom']).optional(),
  resetTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'resetTime must be in HH:MM format').optional(),
  reminderEnabled: z.boolean().optional(),
  reminderFrequency: z.string().optional(),
  activeStartHour: z.number().int().min(0).max(23).optional(),
  activeEndHour: z.number().int().min(0).max(23).optional(),
});

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

    const parseResult = choreSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const validated = parseResult.data;

    const newChore = await db
      .insert(chores)
      .values({
        ...validated,
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
