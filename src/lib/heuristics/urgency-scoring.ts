interface UrgencyContext {
  currentResidence: string;
  userLatenessRate: number;
  severeWeatherForecast: boolean;
}

interface UrgencyScore {
  score: number;
  level: 'critical' | 'high' | 'normal';
  reasons: string[];
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

export function calculateUrgencyScore(bill: Bill, context: UrgencyContext): UrgencyScore {
  let score = 0;
  const reasons: string[] = [];

  const daysUntilDue = Math.ceil((bill.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue <= 1) {
    score += 50;
    reasons.push('due-imminent');
  } else if (daysUntilDue <= 3) {
    score += 30;
    reasons.push('due-soon');
  } else if (daysUntilDue <= 7) {
    score += 15;
    reasons.push('due-week');
  }

  if (bill.residenceId && context.currentResidence) {
    score += 20;
    reasons.push('remote-location');
  }

  if (bill.amount > 5000) {
    score += 10;
    reasons.push('high-amount');
  }

  if (context.userLatenessRate > 0.3) {
    score += 15;
    reasons.push('history-late');
  }

  if (bill.category?.startsWith('utility-')) {
    score += 25;
    reasons.push('essential-service');
  }

  if (context.severeWeatherForecast && bill.residenceId) {
    score += 30;
    reasons.push('weather-risk');
  }

  const finalScore = Math.min(score, 100);

  let level: 'critical' | 'high' | 'normal';
  if (finalScore > 70) {
    level = 'critical';
  } else if (finalScore > 40) {
    level = 'high';
  } else {
    level = 'normal';
  }

  return {
    score: finalScore,
    level,
    reasons,
  };
}
