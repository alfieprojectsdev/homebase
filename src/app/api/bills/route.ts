import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bills = await db
      .select()
      .from(financialObligations)
      .where(eq(financialObligations.orgId, authUser.orgId))
      .orderBy(financialObligations.dueDate);

    return NextResponse.json({ bills });
  } catch (error) {
    console.error('Get bills error:', error);
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
    const {
      name,
      amount,
      dueDate,
      residenceId,
      recurrenceEnabled,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceDayOfMonth,
      accountNumber
    } = body;

    if (!name || !amount || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate amount is positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > 999999999) {
      return NextResponse.json({ error: 'Amount must be a positive number less than 1 billion' }, { status: 400 });
    }

    // Validate dueDate is valid date
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }

    // Validate recurrence settings if enabled
    let validatedInterval = 1;
    if (recurrenceEnabled) {
      const validFrequencies = ['monthly', 'quarterly', 'biannual', 'annual'];
      if (recurrenceFrequency && !validFrequencies.includes(recurrenceFrequency)) {
        return NextResponse.json({ error: 'Invalid recurrence frequency' }, { status: 400 });
      }

      // Validate interval (1-12 reasonable range)
      const interval = recurrenceInterval || 1;
      if (interval < 1 || interval > 12) {
        return NextResponse.json({ error: 'Recurrence interval must be between 1 and 12' }, { status: 400 });
      }
      validatedInterval = interval;

      // Validate day of month (1-31)
      if (recurrenceDayOfMonth && (recurrenceDayOfMonth < 1 || recurrenceDayOfMonth > 31)) {
        return NextResponse.json({ error: 'Day of month must be between 1 and 31' }, { status: 400 });
      }
    }

    const [bill] = await db
      .insert(financialObligations)
      .values({
        orgId: authUser.orgId,
        residenceId: residenceId ? parseInt(residenceId) : null,
        name,
        amount: amount.toString(),
        dueDate: new Date(dueDate),
        status: 'pending',
        accountNumber: accountNumber || null,

        // Recurrence fields (Phase 1.5B)
        recurrenceEnabled: recurrenceEnabled || false,
        recurrenceFrequency: recurrenceEnabled ? recurrenceFrequency : null,
        recurrenceInterval: recurrenceEnabled ? validatedInterval : null,
        recurrenceDayOfMonth: recurrenceEnabled ? recurrenceDayOfMonth : null,
      })
      .returning();

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Create bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
