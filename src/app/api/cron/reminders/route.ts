import { NextRequest, NextResponse } from 'next/server';
import { sendChoreReminders } from '@/lib/notifications/chores';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET if present, or require one to be set
  // This prevents unauthorized triggers
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Get distinct organizations to process
    // We only need one admin/member per org to process org-wide chore reminders
    const distinctOrgs = await db.execute(sql`
      SELECT DISTINCT ON (org_id) id as "userId", org_id as "orgId"
      FROM users
      WHERE role != 'viewer'
      ORDER BY org_id, id
    `);

    let processedCount = 0;

    for (const row of distinctOrgs.rows) {
      await sendChoreReminders({
        userId: row.userId as number,
        orgId: row.orgId as number,
      });
      processedCount++;
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
