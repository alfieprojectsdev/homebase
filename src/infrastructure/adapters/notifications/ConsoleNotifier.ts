import { INotifier, AlertUrgency } from '@/core/ports/INotifier';
import { User } from '@/core/domain/identity/models/User';

export class ConsoleNotifier implements INotifier {
    async sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean> {
        console.log(`
      [${urgency.toUpperCase()} ALERT]
      To: ${user.name} <${user.email}>
      Message: ${message}
      Context: ${new Date().toISOString()}
    `);

        // In a real adapter, here we would call Twilio/FCM
        return true;
    }
}
