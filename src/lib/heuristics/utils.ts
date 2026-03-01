import { db } from '@/lib/db';
import { financialObligations } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { HeuristicBill } from './types';

export async function fetchBillHistory(
  orgId: number,
  options: { billId?: number | null; name?: string | null; limit?: number }
): Promise<{ bill?: typeof financialObligations.$inferSelect; history: HeuristicBill[] }> {
  let bill: typeof financialObligations.$inferSelect | undefined;
  let billHistory: typeof financialObligations.$inferSelect[] = [];
  const limit = options.limit ?? 12;

  if (options.billId) {
    [bill] = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.id, options.billId),
          eq(financialObligations.orgId, orgId)
        )
      )
      .limit(1);

    if (bill) {
      billHistory = await db
        .select()
        .from(financialObligations)
        .where(
          and(
            eq(financialObligations.orgId, orgId),
            eq(financialObligations.name, bill.name)
          )
        )
        .orderBy(desc(financialObligations.dueDate))
        .limit(limit);
    }
  } else if (options.name) {
    billHistory = await db
      .select()
      .from(financialObligations)
      .where(
        and(
          eq(financialObligations.orgId, orgId),
          eq(financialObligations.name, options.name)
        )
      )
      .orderBy(desc(financialObligations.dueDate))
      .limit(limit);
  }

  const history = billHistory.map((b): HeuristicBill => ({
    id: b.id,
    name: b.name,
    amount: parseFloat(b.amount),
    dueDate: b.dueDate,
    status: b.status,
    category: b.category || undefined,
    residenceId: b.residenceId,
    createdAt: b.createdAt,
  }));

  return { bill, history };
}
