import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { forecastMonthlyBills } from '@/lib/heuristics/budget-forecasting';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '3', 10);

    const history = await db
      .select()
      .from(financialObligations)
      .where(eq(financialObligations.orgId, authUser.orgId))
      .orderBy(financialObligations.dueDate);

    const forecast = forecastMonthlyBills(
      history.map((h) => ({
        id: h.id,
        name: h.name,
        amount: parseFloat(h.amount),
        dueDate: h.dueDate,
        status: h.status,
        category: h.category || undefined,
      }))
    );

    return NextResponse.json({ forecast });
  } catch (error) {
    console.error('Budget forecast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
