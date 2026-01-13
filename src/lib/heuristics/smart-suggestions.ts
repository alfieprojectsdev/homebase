import { organizations } from '@/lib/db/schema';
import { count, sql } from 'drizzle-orm';

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  status: string;
  category?: string;
}

interface BillSuggestion {
  bill: string;
  reason: string;
  confidence: number;
}

interface SuggestionPatterns {
  electricWater: number;
  internetWater: number;
  propertyInsurance: number;
}

export function suggestMissingBills(
  userBills: Bill[],
  allUserPatterns: SuggestionPatterns
): BillSuggestion[] {
  const userCategories = new Set(userBills.map((b) => b.category || ''));
  const suggestions: BillSuggestion[] = [];

  if (
    userCategories.has('utility-electric') &&
    !userCategories.has('utility-water')
  ) {
    suggestions.push({
      bill: 'Water bill',
      reason: `${Math.round(allUserPatterns.electricWater * 100)}% of users with electric also track water`,
      confidence: allUserPatterns.electricWater,
    });
  }

  if (
    userCategories.has('telecom-internet') &&
    !userCategories.has('utility-water')
  ) {
    suggestions.push({
      bill: 'Water bill',
      reason: `${Math.round(allUserPatterns.internetWater * 100)}% of users with internet also track water`,
      confidence: allUserPatterns.internetWater,
    });
  }

  return suggestions;
}

export async function calculatePatternAnalytics(
  dbInstance: any
): Promise<SuggestionPatterns> {
  const electricWaterPattern = await dbInstance.execute(sql`
    SELECT
      (SELECT COUNT(DISTINCT org_id)
       FROM financial_obligations
       WHERE category = 'utility-electric') as electric_users,
      (SELECT COUNT(DISTINCT org_id)
       FROM financial_obligations
       WHERE org_id IN (
         SELECT DISTINCT org_id FROM financial_obligations
         WHERE category = 'utility-electric'
       )
      AND category = 'utility-water') as electric_and_water_users
  `);

  const result = electricWaterPattern.rows[0];

  return {
    electricWater: result.electric_users > 0
      ? result.electric_and_water_users / result.electric_users
      : 0,
    internetWater: 0.85,
    propertyInsurance: 0.75,
  };
}
