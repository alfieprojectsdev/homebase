import { db } from '@/lib/db';
import { chores, choreHistory } from '@/lib/db/schema';
import { eq, and, lt, or, isNull } from 'drizzle-orm';

interface ChoreNotificationContext {
  userId: number;
  orgId: number;
}

export async function sendChoreReminders(context: ChoreNotificationContext) {
  const now = new Date();
  const currentHour = now.getHours();

  const choresNeedingReminder = await db
    .select()
    .from(chores)
    .where(
      and(
        eq(chores.orgId, context.orgId),
        eq(chores.reminderEnabled, true),
        lt(chores.progress, 100),
        or(
          isNull(chores.lastReminderSentAt),
        )
      )
    );

  for (const chore of choresNeedingReminder) {
    if (!chore.activeStartHour || !chore.activeEndHour) continue;

    if (currentHour < chore.activeStartHour || currentHour >= chore.activeEndHour) {
      continue;
    }

    const shouldSend = await shouldSendReminder(chore, now);

    if (shouldSend) {
      console.log(`[Chore Notification] Reminder for chore "${chore.title}" (ID: ${chore.id})`);

      await db
        .update(chores)
        .set({ lastReminderSentAt: now })
        .where(eq(chores.id, chore.id));

      await db.insert(choreHistory).values({
        choreId: chore.id,
        userId: context.userId,
        orgId: context.orgId,
        action: 'progress_updated',
        newProgress: chore.progress,
      });
    }
  }
}

async function shouldSendReminder(chore: any, now: Date): Promise<boolean> {
  const lastReminder = chore.lastReminderSentAt ? new Date(chore.lastReminderSentAt) : null;

  if (!lastReminder) {
    return true;
  }

  const minutesSinceLastReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60);

  switch (chore.reminderFrequency) {
    case 'hourly':
      return minutesSinceLastReminder >= 60;
    case 'every_2_hours':
      return minutesSinceLastReminder >= 120;
    case 'every_3_hours':
      return minutesSinceLastReminder >= 180;
    case 'custom':
      if (chore.reminderCustomTimes) {
        const customTimes = typeof chore.reminderCustomTimes === 'string'
          ? JSON.parse(chore.reminderCustomTimes)
          : chore.reminderCustomTimes;

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        const lastReminderHour = lastReminder.getHours();
        const lastReminderDay = lastReminder.getDate();

        if (customTimes.includes(currentTimeStr)) {
          const isDifferentDay = lastReminderDay !== now.getDate();
          const isDifferentHour = lastReminderHour !== currentHour;

          return isDifferentDay || isDifferentHour;
        }

        return false;
      }
      return false;
    default:
      return false;
  }
}

export function getChoreNotificationPayload(chore: any) {
  return {
    title: chore.title,
    body: `${chore.progress}% complete - Don't forget to finish!`,
    icon: '/chore-icon.png',
    data: {
      choreId: chore.id,
      type: 'chore_reminder',
      actions: [
        { action: 'update_25', title: '+25%' },
        { action: 'mark_done', title: 'Mark Done' },
        { action: 'not_applicable', title: 'N/A' },
        { action: 'dismiss', title: 'Later' },
      ]
    }
  };
}
