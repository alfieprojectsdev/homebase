
// @ts-ignore
import { describe, it, expect, mock } from 'bun:test';
import { DailyBriefingService } from './DailyBriefingService';
import { Bill } from '@/core/domain/finance/models/Bill';
import { User } from '@/core/domain/identity/models/User';
import { INotifier, AlertUrgency } from '@/core/ports/INotifier';
import { IPersistence } from '@/core/ports/IPersistence';

// Mock implementations
class MockBillRepo implements IPersistence<Bill> {
    public calls = 0;

    async findAll(filter?: Partial<Bill>): Promise<Bill[]> {
        this.calls++;
        if (filter?.orgId) {
             // Simulate returning empty or filtered if called with orgId
             return [];
        }

        // Return bills that trigger alerts
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return [
            // User 1 (org 1) - Urgent bill due tomorrow
            new Bill("1", "Electricity", 100, tomorrow, 1),
            // User 2 (org 2) - Not urgent
            new Bill("3", "Internet", 80, new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), 2),
        ];
    }

    async findById(id: string | number): Promise<Bill | null> { return null; }
    async save(entity: Bill): Promise<Bill> { return entity; }
    async delete(id: string | number): Promise<boolean> { return true; }
}

class MockUserRepo implements IPersistence<User> {
    async findAll(filter?: Partial<User>): Promise<User[]> {
        return [
            new User("u1", "User 1", "u1@example.com", 1, "member"),
            new User("u2", "User 2", "u2@example.com", 2, "member"),
        ];
    }

    async findById(id: string | number): Promise<User | null> { return null; }
    async save(entity: User): Promise<User> { return entity; }
    async delete(id: string | number): Promise<boolean> { return true; }
}

class MockNotifier implements INotifier {
    public alertsSent = 0;
    async sendAlert(user: User, message: string, urgency: AlertUrgency): Promise<boolean> {
        this.alertsSent++;
        return true;
    }
}

describe('DailyBriefingService', () => {
    it('should run system check efficiently (N+1 optimization)', async () => {
        const billRepo = new MockBillRepo();
        const userRepo = new MockUserRepo();
        const notifier = new MockNotifier();

        const service = new DailyBriefingService(billRepo, userRepo, notifier);

        await service.runSystemCheck();

        // Verify that findAll was called only once (optimization check)
        expect(billRepo.calls).toBe(1);

        // Verify that logic is still correct (1 alert sent)
        expect(notifier.alertsSent).toBe(1);
    });
});
