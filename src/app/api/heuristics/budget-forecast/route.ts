import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { forecastMonthlyBills } from '@/lib/heuristics/budget-forecasting';
import { eq, and, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '3', 10);

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const history = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.orgId, authUser.orgId),
          gte(financialObligations.dueDate, cutoffDate)
        )
      )
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
