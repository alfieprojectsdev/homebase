import { db } from '@/lib/db';
import { chores, pushSubscriptions, notificationLogs, type Chore } from '@/lib/db/schema';
import { NotificationService, type PushSubscription } from '@/lib/notifications/service';
import { eq, and, lt, inArray } from 'drizzle-orm';

/**
 * Server-side chore reminder push for PWA clients (kids' iOS ≥16.4 devices).
 * The Android app schedules reminders on-device and never depends on this;
 * this path exists solely for web-push subscribers. Semantics mirror the
 * Android app's ReminderLogic (apps/android/.../reminders/ReminderLogic.kt):
 * frequency legs, active-hours window, null frequency → never remind.
 *
 * Invoked by /api/cron/chore-reminders every ~15 min (GitHub Actions
 * schedule — Vercel Hobby crons are daily-only).
 */

/** Active-hours window + reminder cadence are family-local, not UTC. */
const REMINDER_TZ = process.env.REMINDER_TZ || 'Asia/Manila';

const FREQUENCY_MINUTES: Record<string, number> = {
  hourly: 60,
  every_2_hours: 120,
  every_3_hours: 180,
};

function hourInTz(date: Date, timeZone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(date),
    10,
  );
}

function minutesOfDayInTz(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
  return (h % 24) * 60 + m;
}

/** Pure eligibility check — exported for tests. */
export function shouldRemindNow(chore: Chore, now: Date, tz: string = REMINDER_TZ): boolean {
  if (!chore.reminderEnabled) return false;
  if ((chore.progress ?? 0) >= 100) return false;

  const startHour = chore.activeStartHour ?? 5;
  const endHour = chore.activeEndHour ?? 21;
  const currentHour = hourInTz(now, tz);
  if (currentHour < startHour || currentHour >= endHour) return false;

  const last = chore.lastReminderSentAt ? new Date(chore.lastReminderSentAt) : null;
  const minutesSinceLast = last ? (now.getTime() - last.getTime()) / 60_000 : Infinity;

  const interval = chore.reminderFrequency ? FREQUENCY_MINUTES[chore.reminderFrequency] : undefined;
  if (interval !== undefined) return minutesSinceLast >= interval;

  if (chore.reminderFrequency === 'custom' && chore.reminderCustomTimes) {
    // ["HH:MM", ...] — fire when now (family tz) is within the cron cadence
    // window (15 min) after a listed time, and we haven't fired this leg.
    const times = String(chore.reminderCustomTimes).match(/([01]\d|2[0-3]):([0-5]\d)/g) ?? [];
    const nowMinutes = minutesOfDayInTz(now, tz);
    return times.some((t) => {
      const [h, m] = t.split(':').map(Number);
      const slot = h * 60 + m;
      const delta = nowMinutes - slot;
      return delta >= 0 && delta < 15 && minutesSinceLast > 15;
    });
  }

  return false; // null/unknown frequency — parity with the Android engine
}

export async function sendDueChoreReminders(now: Date = new Date()) {
  const candidates = await db
    .select()
    .from(chores)
    .where(and(eq(chores.reminderEnabled, true), lt(chores.progress, 100)));

  let sent = 0;
  let checked = 0;

  for (const chore of candidates) {
    checked++;
    if (!shouldRemindNow(chore, now)) continue;

    const recipientIds =
      chore.assignedTo && chore.assignedTo.length > 0 ? chore.assignedTo : [chore.createdBy];

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, recipientIds));

    let delivered = false;
    for (const sub of subs) {
      const ok = await NotificationService.sendWebPush(
        { endpoint: sub.endpoint, keys: sub.keys as PushSubscription['keys'] },
        chore.title,
        `${chore.progress ?? 0}% complete — don't forget to finish!`,
        { choreId: chore.id, type: 'chore_reminder', url: '/chores' },
      );
      delivered = delivered || ok;

      await db.insert(notificationLogs).values({
        userId: sub.userId,
        type: 'web-push',
        channel: 'chore-reminder',
        status: ok ? 'sent' : 'failed',
        title: chore.title,
        body: `${chore.progress ?? 0}% complete`,
        metadata: JSON.stringify({ choreId: chore.id }),
      });
    }

    // Advance the leg even if no subscriber existed — otherwise a chore with
    // no subscribed recipients would be re-evaluated as "due" forever and
    // spam-log every 15 minutes.
    await db.update(chores).set({ lastReminderSentAt: now }).where(eq(chores.id, chore.id));
    if (delivered) sent++;
  }

  return { checked, sent };
}
