import { mean, standardDeviation } from 'simple-statistics';

interface AnomalyDetection {
  isAnomaly: boolean;
  message?: string;
  severity?: 'high' | 'medium' | 'low';
}

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

export function detectAnomalies(currentBill: Bill, history: Bill[]): AnomalyDetection {
  if (history.length < 2) {
    return { isAnomaly: false };
  }

  const amounts = history.map((b) => b.amount);
  const meanAmount = mean(amounts);
  const stdDevAmount = standardDeviation(amounts);

  if (stdDevAmount === 0) {
    return { isAnomaly: false };
  }

  const zScore = (currentBill.amount - meanAmount) / stdDevAmount;

  if (Math.abs(zScore) > 3) {
    return {
      isAnomaly: true,
      message: zScore > 0
        ? `⚠️ This bill is ₱${Math.abs(zScore * stdDevAmount).toFixed(0)} higher than usual`
        : `⚠️ This bill is ₱${Math.abs(zScore * stdDevAmount).toFixed(0)} lower than usual`,
      severity: 'high',
    };
  } else if (Math.abs(zScore) > 2) {
    return {
      isAnomaly: true,
      message: zScore > 0
        ? `ℹ️ This bill is ₱${Math.abs(zScore * stdDevAmount).toFixed(0)} higher than usual`
        : `ℹ️ This bill is ₱${Math.abs(zScore * stdDevAmount).toFixed(0)} lower than usual`,
      severity: 'medium',
    };
  }

  return { isAnomaly: false };
}
