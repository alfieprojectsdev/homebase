import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { detectAnomalies } from '@/lib/heuristics/anomaly-detection';
import { fetchBillHistory } from '@/lib/heuristics/utils';
import { HeuristicBill } from '@/lib/heuristics/types';

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

    let history: HeuristicBill[] = [];

    if (billId) {
      const { bill, history: fetchedHistory } = await fetchBillHistory(
        authUser.orgId,
        {
          billId: parseInt(billId),
        }
      );

      if (!bill) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }

      history = fetchedHistory;
    }

    const currentBill: HeuristicBill = {
      id: billId ? parseInt(billId) : 0,
      name: 'Current Bill',
      amount: parseFloat(amount),
      dueDate: new Date(),
      status: 'pending',
      createdAt: new Date(),
    };

    const detection = detectAnomalies(currentBill, history);

    return NextResponse.json({ detection });
  } catch (error) {
    console.error('Analyze bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
