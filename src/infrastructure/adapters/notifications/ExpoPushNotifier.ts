import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { INotifier, AlertUrgency } from '@/core/ports/INotifier';
import { User } from '@/core/domain/identity/models/User';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const expo = new Expo();

export class ExpoPushNotifier implements INotifier {
    async sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean> {
        if (!user.expoPushToken) return false;

        if (!Expo.isExpoPushToken(user.expoPushToken)) {
            console.warn(`[ExpoPushNotifier] Invalid Expo push token for user ${user.id}`);
            return false;
        }

        const pushMessage: ExpoPushMessage = {
            to: user.expoPushToken,
            title: urgency === 'critical' ? '🚨 Homebase Alert' : 'Homebase',
            body: message,
            sound: urgency === 'critical' ? 'default' : undefined,
            priority: urgency === 'critical' ? 'high' : 'normal',
            data: { urgency },
        };

        try {
            const chunks = expo.chunkPushNotifications([pushMessage]);
            for (const chunk of chunks) {
                const tickets = await expo.sendPushNotificationsAsync(chunk);
                for (const ticket of tickets) {
                    if (ticket.status === 'error') {
                        const errorCode = ticket.details?.error;
                        if (errorCode === 'DeviceNotRegistered') {
                            // Token is invalid — clear it so we don't retry
                            await db
                                .update(users)
                                .set({ expoPushToken: null })
                                .where(eq(users.id, typeof user.id === 'string' ? parseInt(user.id, 10) : user.id));
                            console.log(`[ExpoPushNotifier] Cleared stale Expo token for user ${user.id}`);
                        } else {
                            console.error(`[ExpoPushNotifier] Ticket error for user ${user.id}: ${ticket.message} (${errorCode})`);
                        }
                        return false;
                    }
                }
            }
            return true;
        } catch (error) {
            console.error(`[ExpoPushNotifier] Failed to send to user ${user.id}:`, error);
            return false;
        }
    }
}
