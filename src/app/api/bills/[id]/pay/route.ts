import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [bill] = await db
      .update(financialObligations)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialObligations.id, parseInt(params.id)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .returning();

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Pay bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
