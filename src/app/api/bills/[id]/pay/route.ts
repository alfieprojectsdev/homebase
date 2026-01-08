import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = request.headers.get('x-org-id');

    if (!orgId) {
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
          eq(financialObligations.orgId, parseInt(orgId))
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
