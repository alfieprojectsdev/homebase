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

        // Optimization: Fetch all bills once to avoid N+1 queries
        const allBills = await this.billRepo.findAll();

        // Group bills by orgId for O(1) access
        const billsByOrg = new Map<number, Bill[]>();
        for (const bill of allBills) {
            const orgBills = billsByOrg.get(bill.orgId) || [];
            orgBills.push(bill);
            billsByOrg.set(bill.orgId, orgBills);
        }

        for (const user of users) {
            const userBills = billsByOrg.get(user.orgId) || [];
            await this.checkBillsForUser(user, userBills);
        }
    }

    private async checkBillsForUser(user: User, bills: Bill[]): Promise<void> {
        const now = new Date();

        for (const bill of bills) {
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
