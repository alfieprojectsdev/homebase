import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { suggestBillAmount } from '@/lib/heuristics/amount-prediction';
import { fetchBillHistory } from '@/lib/heuristics/utils';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const name = searchParams.get('name');

    const { bill, history } = await fetchBillHistory(authUser.orgId, {
      billId: billId ? parseInt(billId) : null,
      name,
    });

    if (billId && !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const suggestion = suggestBillAmount(history);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Amount suggestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
