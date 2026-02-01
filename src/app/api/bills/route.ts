import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { BillRepository } from '@/infrastructure/adapters/neon/BillRepository';
import { Bill } from '@/core/domain/finance/models/Bill';
import { RecurrenceEngine } from '@/core/domain/finance/services/RecurrenceEngine';

export const runtime = 'nodejs';

// Infrastructure Injection (in a real app, this would be a DI container)
const billRepo = new BillRepository();

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bills = await billRepo.findAll({ orgId: authUser.orgId });
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
      recurrenceEnabled,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceDayOfMonth
    } = body;

    // 1. Basic Validation (Controller Layer)
    if (!name || !amount || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Construct Core Entity
    const newBill = new Bill(
      'temp-new', // ID assigned by repo
      name,
      parseFloat(amount),
      new Date(dueDate),
      authUser.orgId,
      'pending'
    );

    // 3. Apply Domain Logic (Recurrence)
    if (recurrenceEnabled && recurrenceFrequency) {
      newBill.recurrence = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval || 1,
        dayOfMonth: recurrenceDayOfMonth
      };
      // Optional: Verify next date logic works (not strictly saving it here, but validating it)
      try {
        RecurrenceEngine.calculateNextDate(newBill.dueDate, newBill.recurrence);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid recurrence configuration' }, { status: 400 });
      }
    }

    // 4. Persistence
    const savedBill = await billRepo.save(newBill);

    return NextResponse.json({ bill: savedBill });
  } catch (error) {
    console.error('Create bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
