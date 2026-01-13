import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { calculateUrgencyScore } from '@/lib/heuristics/urgency-scoring';
import { calculateUserBehavior } from '@/lib/heuristics/user-behavior';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { billId } = body;

    if (!billId) {
      return NextResponse.json({ error: 'billId required' }, { status: 400 });
    }

    const [bill] = await db
      .select()
      .from(financialObligations)
      .where(eq(financialObligations.id, parseInt(billId)))
      .limit(1);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const userBehavior = await calculateUserBehavior(
      authUser.userId,
      authUser.orgId
    );

    const urgencyScore = calculateUrgencyScore(
      {
        id: bill.id,
        name: bill.name,
        amount: parseFloat(bill.amount),
        dueDate: bill.dueDate,
        status: bill.status,
        category: bill.category,
        residenceId: bill.residenceId || undefined,
      },
      {
        currentResidence: userBehavior.primaryResidence,
        userLatenessRate: userBehavior.overallForgetRate,
        severeWeatherForecast: false,
      }
    );

    await db
      .update(financialObligations)
      .set({
        urgencyScore: urgencyScore.score,
        urgencyLevel: urgencyScore.level,
        urgencyReasons: urgencyScore.reasons,
        lastUrgencyCalculation: new Date(),
      })
      .where(eq(financialObligations.id, parseInt(billId)));

    return NextResponse.json({ urgencyScore });
  } catch (error) {
    console.error('Calculate urgency error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
