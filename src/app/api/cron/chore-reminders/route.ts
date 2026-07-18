import { NextRequest, NextResponse } from 'next/server';
import { sendDueChoreReminders } from '@/lib/notifications/chore-reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Chore reminder dispatch for web-push (PWA) subscribers. Triggered every
 * 15 min by .github/workflows/chore-reminders.yml (Vercel Hobby crons are
 * daily-only). Same CRON_SECRET gate as /api/cron/daily.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDueChoreReminders();
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Chore reminder cron failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
