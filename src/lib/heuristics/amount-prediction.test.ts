import { describe, expect, it } from 'bun:test';
import { suggestBillAmount } from './amount-prediction';

// Replicating the interface as it's not exported
interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
}

// Helper to create a mock bill
const createBill = (amount: number, dateOffset: number = 0): Bill => ({
  id: Math.random(),
  name: 'Test Bill',
  amount,
  dueDate: new Date(Date.now() + dateOffset * 86400000),
  createdAt: new Date(),
});

describe('suggestBillAmount', () => {
  it('should return 0 with low confidence for empty bill history', () => {
    const result = suggestBillAmount([]);
    expect(result).toEqual({
      suggested: 0,
      confidence: 'low',
      pattern: 'fixed',
    });
  });

  it('should return the single amount with low confidence for one bill', () => {
    const result = suggestBillAmount([createBill(100)]);
    expect(result).toEqual({
      suggested: 100,
      confidence: 'low',
      pattern: 'fixed',
    });
  });

  it('should detect fixed pattern with high confidence for stable amounts (>= 3 bills)', () => {
    // Variance < 0.1
    const bills = [createBill(100), createBill(101), createBill(99)];
    const result = suggestBillAmount(bills);

    expect(result.pattern).toBe('fixed');
    expect(result.confidence).toBe('high');
    expect(result.suggested).toBeCloseTo(100, 0);
  });

  it('should detect variable pattern with medium confidence for moderate variance (< 0.3)', () => {
    // Mean ~120. SD needs to be < 0.3 * 120 = 36.
    // 100, 140, 120 -> mean 120.
    const bills = [createBill(100), createBill(140), createBill(120)];
    const result = suggestBillAmount(bills);

    expect(result.pattern).toBe('variable');
    expect(result.confidence).toBe('medium');
    expect(result.suggested).toBe(120);
    expect(result.range).toBeDefined();
    if (result.range) {
        expect(result.range[0]).toBeLessThan(120);
        expect(result.range[1]).toBeGreaterThan(120);
    }
  });

  it('should use linear regression for high variance', () => {
    // 100, 200, 300. Mean 200. SD ~100. CV = 0.5. > 0.3.
    // Linear regression: y = 100x + 100 (if x is index 0, 1, 2)
    // x=3 -> predicted = 400.

    const bills = [createBill(100), createBill(200), createBill(300)];
    const result = suggestBillAmount(bills);

    expect(result.pattern).toBe('variable');
    // < 6 bills -> low confidence
    expect(result.confidence).toBe('low');
    // Check if prediction is roughly 400
    expect(result.suggested).toBeCloseTo(400, -1);
  });
});
