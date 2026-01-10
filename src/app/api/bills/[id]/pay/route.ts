import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/server';
import { calculateNextDueDate, RecurrenceFrequency } from '@/lib/utils/recurrence';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the bill first to check recurrence settings
    const [currentBill] = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.id, parseInt(params.id)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .limit(1);

    if (!currentBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Mark current bill as paid
    const [paidBill] = await db
      .update(financialObligations)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialObligations.id, parseInt(params.id)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .returning();

    let nextBill = null;
    let nextDueDate = null;

    // If recurring, create next occurrence
    if (currentBill.recurrenceEnabled && currentBill.recurrenceFrequency) {
      nextDueDate = calculateNextDueDate(
        new Date(currentBill.dueDate),
        currentBill.recurrenceFrequency as RecurrenceFrequency,
        currentBill.recurrenceInterval || 1,
        currentBill.recurrenceDayOfMonth || undefined
      );

      [nextBill] = await db
        .insert(financialObligations)
        .values({
          orgId: currentBill.orgId,
          residenceId: currentBill.residenceId,
          name: currentBill.name,
          amount: currentBill.amount,
          dueDate: nextDueDate,
          status: 'pending',
          recurrenceEnabled: true,
          recurrenceFrequency: currentBill.recurrenceFrequency,
          recurrenceInterval: currentBill.recurrenceInterval,
          recurrenceDayOfMonth: currentBill.recurrenceDayOfMonth,
          parentBillId: currentBill.id,
        })
        .returning();
    }

    return NextResponse.json({
      bill: paidBill,
      nextBill,
      message: nextBill
        ? `✓ Paid and created next occurrence for ${nextDueDate?.toLocaleDateString()}`
        : '✓ Bill marked as paid'
    });
  } catch (error) {
    console.error('Pay bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
