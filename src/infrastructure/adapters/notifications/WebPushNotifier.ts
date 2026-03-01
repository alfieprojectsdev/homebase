import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NotificationService, PushSubscription } from '@/lib/notifications/service';
import { INotifier, AlertUrgency } from '@/core/ports/INotifier';
import { User } from '@/core/domain/identity/models/User';

export class WebPushNotifier implements INotifier {
    async sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean> {
        const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;

        const subs = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, userId));

        if (subs.length === 0) return false;

        const title = urgency === 'critical' ? '🚨 Homebase Alert' : 'Homebase';
        let anySuccess = false;

        for (const sub of subs) {
            const subscription: PushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys as { p256dh: string; auth: string },
            };
            try {
                const sent = await NotificationService.sendWebPush(subscription, title, message);
                if (sent) anySuccess = true;
            } catch (error: unknown) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode === 410 || statusCode === 404) {
                    // Subscription is expired or invalid — remove it so we don't retry
                    await db
                        .delete(pushSubscriptions)
                        .where(eq(pushSubscriptions.endpoint, sub.endpoint));
                    console.log(`[WebPushNotifier] Pruned stale subscription for user ${user.id}`);
                } else {
                    console.error(`[WebPushNotifier] Error sending to user ${user.id}:`, error);
                }
            }
        }

        return anySuccess;
    }
}
