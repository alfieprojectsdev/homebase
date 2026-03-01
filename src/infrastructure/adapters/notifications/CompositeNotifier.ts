import { INotifier, AlertUrgency } from '@/core/ports/INotifier';
import { User } from '@/core/domain/identity/models/User';

export class CompositeNotifier implements INotifier {
    private readonly notifiers: INotifier[];

    constructor(...notifiers: INotifier[]) {
        this.notifiers = notifiers;
    }

    async sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean> {
        const results = await Promise.allSettled(
            this.notifiers.map(n => n.sendAlert(user, message, urgency))
        );
        // Return true if at least one notifier succeeded
        return results.some(r => r.status === 'fulfilled' && r.value === true);
    }
}
