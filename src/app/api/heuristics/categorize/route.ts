import { NextRequest, NextResponse } from 'next/server';
import { autoCategorizeBill } from '@/lib/heuristics/auto-categorization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, amount } = body;

    const result = autoCategorizeBill({ name, amount });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Auto categorize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
