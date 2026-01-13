import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations, patternAnalytics } from '@/lib/db/schema';
import { getAuthUser } from '@/lib/auth/server';
import { suggestMissingBills } from '@/lib/heuristics/smart-suggestions';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userBills = await db
      .select()
      .from(financialObligations)
      .where(eq(financialObligations.orgId, authUser.orgId))
      .orderBy(financialObligations.dueDate);

    const patterns = await db
      .select()
      .from(patternAnalytics)
      .limit(10);

    const allUserPatterns = patterns.reduce((acc, p) => {
      acc[p.patternType] = parseFloat(p.percentage);
      return acc;
    }, {} as Record<string, number>);

    const suggestions = suggestMissingBills(
      userBills.map((b) => ({
        id: b.id,
        name: b.name,
        amount: parseFloat(b.amount),
        dueDate: b.dueDate,
        status: b.status,
        category: b.category || undefined,
      })),
      allUserPatterns as any
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
