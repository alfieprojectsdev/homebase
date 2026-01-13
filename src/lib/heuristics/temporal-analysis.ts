import { differenceInDays, addDays } from 'date-fns';

interface BillingCycleAnalysis {
  cycle: number;
  pattern: 'regular' | 'irregular';
  nextDueDate: Date | null;
  confidence: 'high' | 'low';
}

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

export function analyzeBillingCycle(bills: Bill[]): BillingCycleAnalysis {
  if (bills.length < 2) {
    return {
      cycle: 30,
      pattern: 'irregular',
      nextDueDate: null,
      confidence: 'low',
    };
  }

  const sortedBills = [...bills].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const intervals: number[] = [];

  for (let i = 1; i < sortedBills.length; i++) {
    const days = differenceInDays(sortedBills[i].dueDate, sortedBills[i - 1].dueDate);
    intervals.push(days);
  }

  const mode = findMode(intervals);
  const isConsistent = intervals.every((d) => Math.abs(d - mode) <= 2);

  const nextDueDate = isConsistent
    ? addDays(sortedBills[sortedBills.length - 1].dueDate, mode)
    : null;

  return {
    cycle: mode,
    pattern: isConsistent ? 'regular' : 'irregular',
    nextDueDate,
    confidence: isConsistent && intervals.length >= 3 ? 'high' : 'low',
  };
}

function findMode(numbers: number[]): number {
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let mode = numbers[0];

  numbers.forEach((num) => {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
      mode = num;
    }
  });

  return mode;
}
