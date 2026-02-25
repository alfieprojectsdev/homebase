import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { analyzeBillingCycle } from '@/lib/heuristics/temporal-analysis';
import { fetchBillHistory } from '@/lib/heuristics/utils';

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

    const { bill, history } = await fetchBillHistory(authUser.orgId, {
      billId: parseInt(billId),
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const analysis = analyzeBillingCycle(history);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Due date suggestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
