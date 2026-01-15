
import webpush from 'web-push';

// Initialize web-push with keys from env
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@homebase.app';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export type UrgencyLevel = 'normal' | 'high' | 'critical' | 'emergency';

export class NotificationService {
    /**
     * Send a Web Push notification
     */
    static async sendWebPush(subscription: PushSubscription, title: string, body: string, data?: any) {
        if (!vapidPublicKey || !vapidPrivateKey) {
            console.warn('VAPID keys not configured. Skipping Web Push.');
            return false;
        }

        try {
            const payload = JSON.stringify({
                title,
                body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                data,
            });

            await webpush.sendNotification(subscription, payload);
            return true;
        } catch (error) {
            console.error('Error sending Web Push:', error);
            return false;
        }
    }

    /**
     * Send SMS (Deferred / Stub)
     */
    static async sendSMS(to: string, body: string) {
        console.log(`[SMS DEFERRED] To: ${to}, Body: ${body}`);
        // Twilio implementation deferred
        return true;
    }

    /**
     * High-level orchestrator
     */
    static async sendNotification(
        userId: number,
        title: string,
        body: string,
        urgency: UrgencyLevel,
        subscription?: PushSubscription | null
    ) {
        const results = { push: false, sms: false };

        // 1. Always try Web Push if subscription exists
        if (subscription) {
            results.push = await this.sendWebPush(subscription, title, body, { urgency });
        }

        // 2. Escalation Logic (Stub)
        // If urgency is critical/emergency and SMS is enabled (future), send SMS
        if ((urgency === 'critical' || urgency === 'emergency')) {
            // SMS Logic here
        }

        return results;
    }
}
