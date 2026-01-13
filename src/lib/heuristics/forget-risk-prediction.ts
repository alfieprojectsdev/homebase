interface ForgetRiskPrediction {
  riskLevel: 'high' | 'medium' | 'low';
  probability: number;
  recommendation: string;
}

interface UserBehavior {
  overallForgetRate: number;
  primaryResidence: string;
  lastAppOpen: Date;
  forgetRateByType: Record<string, number>;
}

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  status: string;
  category?: string;
  residenceId?: number;
}

export function predictForgetRisk(
  bill: Bill,
  userBehavior: UserBehavior
): ForgetRiskPrediction {
  let forgetProbability = userBehavior.overallForgetRate;

  if (bill.residenceId) {
    forgetProbability *= 3;
  }

  const daysSinceCheckIn = Math.floor(
    (Date.now() - userBehavior.lastAppOpen.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCheckIn > 7) {
    forgetProbability *= 1.5;
  }

  if (bill.category) {
    const typeForgetRate = userBehavior.forgetRateByType[bill.category] || 0.5;
    forgetProbability = (forgetProbability + typeForgetRate) / 2;
  }

  forgetProbability = Math.min(forgetProbability, 0.95);

  let riskLevel: 'high' | 'medium' | 'low';
  if (forgetProbability > 0.7) {
    riskLevel = 'high';
  } else if (forgetProbability > 0.4) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  const recommendation =
    forgetProbability > 0.6
      ? 'Enable SMS fallback for this bill'
      : 'Standard notifications sufficient';

  return {
    riskLevel,
    probability: forgetProbability,
    recommendation,
  };
}
