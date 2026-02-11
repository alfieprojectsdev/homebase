import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { IPersistence } from '@/core/ports/IPersistence';
import { Bill, BillStatus, RecurrenceFrequency } from '@/core/domain/finance/models/Bill';
import { eq, desc, and } from 'drizzle-orm';

export class BillRepository implements IPersistence<Bill> {
    async findById(id: string | number): Promise<Bill | null> {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(numericId)) return null;

        const result = await db
            .select()
            .from(financialObligations)
            .where(eq(financialObligations.id, numericId))
            .limit(1);

        if (result.length === 0) return null;
        return this.mapToDomain(result[0]);
    }

    async findAll(filter?: Partial<Bill>, options?: { limit?: number; offset?: number }): Promise<Bill[]> {
        // Only supporting basic filtering by orgId for now as per current use case
        if (!filter?.orgId) {
            throw new Error('OrgId is required for findAll bills');
        }

        let query = db
            .select()
            .from(financialObligations)
            .where(eq(financialObligations.orgId, filter.orgId))
            .orderBy(desc(financialObligations.dueDate))
            .$dynamic();

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.offset) {
            query = query.offset(options.offset);
        }

        const result = await query;
        return result.map(this.mapToDomain);
    }

    async save(bill: Bill): Promise<Bill> {
        const data = {
            orgId: bill.orgId,
            name: bill.name,
            amount: bill.amount.toString(),
            dueDate: bill.dueDate,
            status: bill.status,
            category: (bill.category as any) || 'uncategorized',

            // Recurrence mapping
            recurrenceEnabled: !!bill.recurrence,
            recurrenceFrequency: bill.recurrence?.frequency as any || null,
            recurrenceInterval: bill.recurrence?.interval || null,
            recurrenceDayOfMonth: bill.recurrence?.dayOfMonth || null,

            paidAt: bill.paidAt,
        };

        let savedId: number;

        if (bill.id && typeof bill.id === 'string' && !bill.id.startsWith('temp-')) {
            // Update existing (numeric ID in string)
            const id = parseInt(bill.id, 10);
            await db
                .update(financialObligations)
                .set(data)
                .where(eq(financialObligations.id, id));
            savedId = id;
        } else {
            // Insert new
            const [inserted] = await db
                .insert(financialObligations)
                .values(data)
                .returning({ id: financialObligations.id });
            savedId = inserted.id;
        }

        // Return re-fetched/re-constructed bill
        const saved = new Bill(
            savedId.toString(),
            bill.name,
            bill.amount,
            bill.dueDate,
            bill.orgId,
            bill.status,
            bill.recurrence,
            bill.category,
            bill.paidAt
        );
        return saved;
    }

    async delete(id: string | number): Promise<boolean> {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(numericId)) return false;

        await db.delete(financialObligations).where(eq(financialObligations.id, numericId));
        return true;
    }

    private mapToDomain(row: typeof financialObligations.$inferSelect): Bill {
        const b = new Bill(
            row.id.toString(),
            row.name,
            parseFloat(row.amount),
            row.dueDate,
            row.orgId,
            row.status as BillStatus,
            undefined, // Recurrence built below
            row.category,
            row.paidAt || undefined
        );

        if (row.recurrenceEnabled && row.recurrenceFrequency) {
            b.recurrence = {
                frequency: row.recurrenceFrequency as RecurrenceFrequency,
                interval: row.recurrenceInterval || 1,
                dayOfMonth: row.recurrenceDayOfMonth || undefined
            };
        }

        return b;
    }
}
