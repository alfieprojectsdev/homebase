import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { detectAnomalies } from '@/lib/heuristics/anomaly-detection';
import { eq, and, desc } from 'drizzle-orm';

interface BillForAnalysis {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount, billId } = body;

    if (!amount) {
      return NextResponse.json({ error: 'amount required' }, { status: 400 });
    }

    let history: BillForAnalysis[] = [];

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

      history = billHistory.map((b): BillForAnalysis => ({
        id: b.id,
        name: b.name,
        amount: parseFloat(b.amount),
        dueDate: b.dueDate,
        createdAt: b.createdAt,
      }));
    }

    const currentBill: BillForAnalysis = {
      id: billId ? parseInt(billId) : 0,
      name: 'Current Bill',
      amount: parseFloat(amount),
      dueDate: new Date(),
      createdAt: new Date(),
    };

    const detection = detectAnomalies(currentBill, history);

    return NextResponse.json({ detection });
  } catch (error) {
    console.error('Analyze bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
