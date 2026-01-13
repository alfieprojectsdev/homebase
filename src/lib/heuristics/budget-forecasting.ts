import { mean } from 'simple-statistics';
import { getSeasonalFactor, getSeasonalNote } from './seasonal-factors';

interface BudgetForecast {
  predicted: number;
  confidence: 'high' | 'low';
  breakdown: Record<string, number>;
  seasonalNote?: string;
}

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  status: string;
  category?: string;
}

export function forecastMonthlyBills(history: Bill[]): BudgetForecast {
  const currentMonth = new Date().getMonth();

  const monthlyTotals: Record<number, Bill[]> = {};

  history.forEach((bill) => {
    const month = bill.dueDate.getMonth();
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = [];
    }
    monthlyTotals[month].push(bill);
  });

  const monthlySums: number[] = [];
  const monthlyBreakdowns: Record<number, Record<string, number>> = {};

  Object.keys(monthlyTotals).forEach((monthKey) => {
    const month = parseInt(monthKey);
    const bills = monthlyTotals[month];
    const total = bills.reduce((sum, b) => sum + b.amount, 0);
    monthlySums.push(total);

    const breakdown: Record<string, number> = {};
    bills.forEach((bill) => {
      const cat = bill.category || 'uncategorized';
      breakdown[cat] = (breakdown[cat] || 0) + bill.amount;
    });
    monthlyBreakdowns[month] = breakdown;
  });

  const alpha = 0.3;
  let forecast = monthlySums.length > 0 ? monthlySums[0] : 0;

  for (let i = 1; i < monthlySums.length; i++) {
    forecast = alpha * monthlySums[i] + (1 - alpha) * forecast;
  }

  const seasonalFactor = getSeasonalFactor(currentMonth);
  forecast *= seasonalFactor;

  const seasonalNote = getSeasonalNote(currentMonth);

  const breakdown: Record<string, number> = {};

  Object.keys(monthlyBreakdowns).forEach((monthKey) => {
    const monthBreakdown = monthlyBreakdowns[parseInt(monthKey)];
    Object.keys(monthBreakdown).forEach((cat) => {
      breakdown[cat] = (breakdown[cat] || 0) + monthBreakdown[cat];
    });
  });

  const avgBreakdown: Record<string, number> = {};
  const monthsWithData = Object.keys(monthlyBreakdowns).length;

  Object.keys(breakdown).forEach((cat) => {
    avgBreakdown[cat] = breakdown[cat] / monthsWithData;
  });

  return {
    predicted: Math.round(forecast * 100) / 100,
    confidence: history.length > 6 ? 'high' : 'low',
    breakdown: avgBreakdown,
    seasonalNote,
  };
}
