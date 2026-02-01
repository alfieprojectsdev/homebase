import { Bill } from '@/core/domain/finance/models/Bill';
import { RecurrenceEngine } from '@/core/domain/finance/services/RecurrenceEngine';
import { INotifier } from '@/core/ports/INotifier';
import { IPersistence } from '@/core/ports/IPersistence';
import { User } from '@/core/domain/identity/models/User';

export class DailyBriefingService {
    constructor(
        private billRepo: IPersistence<Bill>,
        private userRepo: IPersistence<User>,
        private notifier: INotifier
    ) { }

    async runSystemCheck(): Promise<void> {
        const users = await this.userRepo.findAll();
        console.log(`[DailyBriefing] Checking for ${users.length} users...`);

        for (const user of users) {
            await this.checkBillsForUser(user);
        }
    }

    private async checkBillsForUser(user: User): Promise<void> {
        const allBills = await this.billRepo.findAll({ orgId: user.orgId });
        const now = new Date();

        for (const bill of allBills) {
            if (bill.status === 'paid') continue;

            const daysUntilDue = Math.ceil((bill.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Urgency Logic
            let urgencyScore = 0;
            if (daysUntilDue <= 1) urgencyScore = 90;
            else if (daysUntilDue <= 3) urgencyScore = 70;

            if (urgencyScore > 80) {
                await this.notifier.sendAlert(
                    user,
                    `URGENT: ${bill.name} is due ${daysUntilDue <= 0 ? 'today' : 'tomorrow'} (${bill.amount} PHP)`,
                    'critical'
                );
            }
        }
    }
}
