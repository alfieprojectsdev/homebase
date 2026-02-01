export type NotificationChannel = 'urgent' | 'info' | 'marketing';

export interface NotificationMessage {
    title: string;
    body: string;
    metadata?: Record<string, any>;
    channels?: NotificationChannel[];
}

/**
 * Unified interface for alerting the household.
 * Implementations could be: Web Push, SMS (Twilio), MQTT (Home Assistant), or Local Speaker.
 */
export interface INotifier {
    notify(userId: string | number, message: NotificationMessage): Promise<boolean>;
    broadcast(message: NotificationMessage): Promise<boolean>;
}
