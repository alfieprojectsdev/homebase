import { mean, standardDeviation, linearRegression } from 'simple-statistics';

interface BillAmountPrediction {
  suggested: number;
  confidence: 'high' | 'medium' | 'low';
  pattern: 'fixed' | 'variable';
  range?: [number, number];
}

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

export function suggestBillAmount(billHistory: Bill[]): BillAmountPrediction {
  if (billHistory.length === 0) {
    return {
      suggested: 0,
      confidence: 'low',
      pattern: 'fixed',
    };
  }

  const amounts = billHistory.map((b) => b.amount);
  const meanAmount = mean(amounts);

  if (billHistory.length === 1) {
    return {
      suggested: meanAmount,
      confidence: 'low',
      pattern: 'fixed',
    };
  }

  const stdDevAmount = standardDeviation(amounts);
  const coefficientOfVariation = stdDevAmount / meanAmount;

  if (coefficientOfVariation < 0.1) {
    return {
      suggested: Math.round(meanAmount * 100) / 100,
      confidence: billHistory.length >= 3 ? 'high' : 'medium',
      pattern: 'fixed',
    };
  } else if (coefficientOfVariation < 0.3) {
    return {
      suggested: Math.round(meanAmount * 100) / 100,
      confidence: 'medium',
      pattern: 'variable',
      range: [
        Math.round((meanAmount - stdDevAmount) * 100) / 100,
        Math.round((meanAmount + stdDevAmount) * 100) / 100,
      ],
    };
  } else {
    const points = billHistory.map((b, i) => [i, b.amount]);
    const regression = linearRegression(points);
    const m = regression.m;
    const b = regression.b;
    const predicted = m * billHistory.length + b;

    return {
      suggested: Math.round(predicted * 100) / 100,
      confidence: billHistory.length >= 6 ? 'medium' : 'low',
      pattern: 'variable',
      range: [
        Math.round((meanAmount - stdDevAmount) * 100) / 100,
        Math.round((meanAmount + stdDevAmount) * 100) / 100,
      ],
    };
  }
}
