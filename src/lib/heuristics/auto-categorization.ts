interface CategorizationResult {
  category: string;
  confidence: number;
  autoDetected: boolean;
}

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

export function autoCategorizeBill(bill: Partial<Bill>): CategorizationResult {
  const name = bill.name?.toLowerCase() || '';

  const patterns = [
    { regex: /electric|power|pelco|meralco/i, category: 'utility-electric', confidence: 0.9 },
    { regex: /water|maynilad/i, category: 'utility-water', confidence: 0.9 },
    { regex: /internet|wifi|pldt|globe|converge/i, category: 'telecom-internet', confidence: 0.9 },
    { regex: /netflix|spotify|disney|hbo/i, category: 'subscription-entertainment', confidence: 0.95 },
    { regex: /rent|lease/i, category: 'housing-rent', confidence: 0.85 },
    { regex: /insurance/i, category: 'insurance', confidence: 0.8 },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(name)) {
      return {
        category: pattern.category,
        confidence: pattern.confidence,
        autoDetected: true,
      };
    }
  }

  if (bill.amount) {
    const amount = parseFloat(bill.amount.toString());

    if (amount < 500) {
      return {
        category: 'subscription',
        confidence: 0.5,
        autoDetected: true,
      };
    }

    if (amount > 10000) {
      return {
        category: 'major-expense',
        confidence: 0.6,
        autoDetected: true,
      };
    }
  }

  return {
    category: 'uncategorized',
    confidence: 0,
    autoDetected: false,
  };
}
