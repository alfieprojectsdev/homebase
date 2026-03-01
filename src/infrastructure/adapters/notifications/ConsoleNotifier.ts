import { INotifier, AlertUrgency } from '@/core/ports/INotifier';
import { User } from '@/core/domain/identity/models/User';

export class ConsoleNotifier implements INotifier {
    async sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean> {
        const isDebug = process.env.DEBUG_NOTIFICATIONS === 'true';

        const timestamp = new Date().toISOString();

        // Redact PII unless in debug mode
        const displayName = isDebug ? user.name : (user.name ? `${user.name.charAt(0)}***` : 'Unknown');
        const displayEmail = isDebug ? user.email : this.maskEmail(user.email);
        const displayMessage = isDebug ? message : '[REDACTED MESSAGE CONTENT]';

        console.log(`
      [${urgency.toUpperCase()} ALERT]
      To: ${displayName} <${displayEmail}>
      Message: ${displayMessage}
      Context: ${timestamp}
    `);

        // In a real adapter, here we would call Twilio/FCM
        return true;
    }

    private maskEmail(email: string): string {
        if (!email) return '***';
        const parts = email.split('@');
        if (parts.length !== 2) return '***';

        const [local, domain] = parts;
        const maskedLocal = local.length > 2
            ? `${local.substring(0, 2)}***`
            : `${local.charAt(0)}***`;

        return `${maskedLocal}@${domain}`;
    }
}
