import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { analyzeBillingCycle } from '@/lib/heuristics/temporal-analysis';
import { eq, and, desc } from 'drizzle-orm';

interface BillForAnalysis {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');

    if (!billId) {
      return NextResponse.json({ error: 'billId required' }, { status: 400 });
    }

    const [bill] = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.id, parseInt(billId)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .limit(1);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const billHistory = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.orgId, authUser.orgId),
          eq(financialObligations.name, bill.name)
        )
      )
      .orderBy(desc(financialObligations.dueDate))
      .limit(12);

    const analysis = analyzeBillingCycle(billHistory.map((b): BillForAnalysis => ({
      id: b.id,
      name: b.name,
      amount: parseFloat(b.amount),
      dueDate: b.dueDate,
      createdAt: b.createdAt,
    })));

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Due date suggestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
