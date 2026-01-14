import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { suggestBillAmount } from '@/lib/heuristics/amount-prediction';
import { eq, and, desc } from 'drizzle-orm';

interface BillForPrediction {
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
    const name = searchParams.get('name');

    let billHistory: typeof financialObligations.$inferSelect[] = [];

    if (billId) {
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

      billHistory = await db
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
    } else if (name) {
      billHistory = await db
        .select()
        .from(financialObligations)
        .where(
          and(
            eq(financialObligations.orgId, authUser.orgId),
            eq(financialObligations.name, name)
          )
        )
        .orderBy(desc(financialObligations.dueDate))
        .limit(12);
    }

    const suggestion = suggestBillAmount(billHistory.map((b): BillForPrediction => ({
      id: b.id,
      name: b.name,
      amount: parseFloat(b.amount),
      dueDate: b.dueDate,
      createdAt: b.createdAt,
    })));

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Amount suggestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
