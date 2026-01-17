
import { db } from '@/lib/db';
import { notificationLogs, financialObligations, users } from '@/lib/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { NotificationService, UrgencyLevel, PushSubscription } from './service';

export class EscalationLogic {
    /**
     * Determine if a notification should be sent for a bill.
     * Prevents spam by checking notification logs.
     */
    static async shouldNotify(billId: number, urgency: UrgencyLevel, userId: number): Promise<boolean> {
        // 1. Get last notification for this bill of this urgency level
        const lastLog = await db.query.notificationLogs.findFirst({
            where: and(
                eq(notificationLogs.relatedBillId, billId),
                eq(notificationLogs.userId, userId),
                eq(notificationLogs.channel, urgency)
            ),
            orderBy: [desc(notificationLogs.sentAt)]
        });

        if (!lastLog) return true; // Never notified at this urgency

        const now = new Date();
        const lastSent = new Date(lastLog.sentAt!);
        const hoursSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

        // Throttle logic
        switch (urgency) {
            case 'normal': return hoursSinceLast > 168; // Once a week
            case 'high': return hoursSinceLast > 48; // Every 2 days
            case 'critical': return hoursSinceLast > 24; // Daily
            case 'emergency': return hoursSinceLast > 6; // Every 6 hours
            default: return false;
        }
    }

    /**
     * Log a sent notification
     */
    static async logNotification(
        userId: number,
        billId: number,
        urgency: UrgencyLevel,
        type: string,
        status: string,
        title: string = 'Bill Reminder',
        body: string = `Urgency: ${urgency}`,
        error?: string
    ) {
        await db.insert(notificationLogs).values({
            userId,
            relatedBillId: billId,
            channel: urgency,
            type,
            status,
            error: error || null,
            title,
            body,
        });
    }
}
