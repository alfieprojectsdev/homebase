import { db } from '@/lib/db';
import { users, financialObligations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface UserBehavior {
  overallForgetRate: number;
  primaryResidence: string;
  lastAppOpen: Date;
  forgetRateByType: Record<string, number>;
}

export async function calculateUserBehavior(
  userId: number,
  orgId: number
): Promise<UserBehavior> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const paidBills = await db
    .select({
      paidAt: financialObligations.paidAt,
      dueDate: financialObligations.dueDate,
      category: financialObligations.category
    })
    .from(financialObligations)
    .where(
      and(
        eq(financialObligations.orgId, orgId),
        eq(financialObligations.status, 'paid')
      )
    );

  let lateCount = 0;
  const forgetRateByType: Record<string, number> = {};
  const typeCounts: Record<string, { total: number; late: number }> = {};

  paidBills.forEach((bill) => {
    if (!bill.paidAt) return;

    const daysLate = Math.floor(
      (bill.paidAt.getTime() - bill.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const category = bill.category || 'uncategorized';

    if (!typeCounts[category]) {
      typeCounts[category] = { total: 0, late: 0 };
    }

    typeCounts[category].total++;

    if (daysLate > 0) {
      lateCount++;
      typeCounts[category].late++;
    }
  });

  const overallForgetRate = paidBills.length > 0 ? lateCount / paidBills.length : 0;

  Object.keys(typeCounts).forEach((key) => {
    forgetRateByType[key] =
      typeCounts[key].total > 0
        ? typeCounts[key].late / typeCounts[key].total
        : 0;
  });

  return {
    overallForgetRate,
    primaryResidence: user.primaryResidence || 'unknown',
    lastAppOpen: user.lastAppOpen || new Date(),
    forgetRateByType,
  };
}
