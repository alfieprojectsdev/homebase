import { User } from '../domain/identity/models/User';

export type AlertUrgency = 'low' | 'critical';

export interface INotifier {
    /**
     * Sends an alert to a specific user.
     * @param user The user entity (containing phone/email/push tokens)
     * @param message Text content of the alert
     * @param urgency used to decide channel (critical -> sms/push, low -> log/email)
     */
    sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean>;
}

