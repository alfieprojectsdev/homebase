export type BillStatus = 'pending' | 'paid' | 'overdue';
export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'weekly';

export interface RecurrenceConfig {
    frequency: RecurrenceFrequency;
    interval: number; // e.g., "every 2 weeks"
    dayOfMonth?: number;
    endDate?: Date;
}

export class Bill {
    constructor(
        public id: string | number, // Core logic handles generic IDs (string acceptable for UUIDs)
        public name: string,
        public amount: number,
        public dueDate: Date,
        public orgId: number,
        public status: BillStatus = 'pending',
        public recurrence?: RecurrenceConfig,
        public category?: string,
        public paidAt?: Date
    ) { }

    /**
     * Pure domain logic: Is this bill overdue relative to a reference date?
     */
    isOverdue(asOf: Date = new Date()): boolean {
        return this.status === 'pending' && this.dueDate < asOf;
    }

    /**
     * Pure domain logic: Mark as paid
     */
    markPaid(date: Date = new Date()): void {
        this.status = 'paid';
        this.paidAt = date;
    }
}
