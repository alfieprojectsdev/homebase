import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [bill] = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.id, parseInt(params.id)),
          eq(financialObligations.orgId, authUser.orgId)
        )
      )
      .limit(1);

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ bill });
  } catch (error) {
    console.error('Get bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, amount, dueDate, residenceId } = body;

    if (!name || !amount || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [bill] = await db
      .update(financialObligations)
      .set({
        name,
        amount: amount.toString(),
        dueDate: new Date(dueDate),
        residenceId: residenceId ? parseInt(residenceId) : null,
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
    console.error('Update bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request);

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [bill] = await db
      .delete(financialObligations)
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

    return NextResponse.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
