import { describe, expect, test } from 'bun:test';
import { calculateNextDueDate, getRecurrenceLabel } from './recurrence';

describe('recurrence utilities', () => {
  describe('calculateNextDueDate', () => {
    test('should calculate monthly recurrence correctly', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 1);
      expect(next.toISOString()).toContain('2026-02-15');
    });

    test('should handle monthly recurrence with interval > 1', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 2);
      expect(next.toISOString()).toContain('2026-03-15');
    });

    test('should handle month overflow correctly (Dec to Jan)', () => {
      const start = new Date('2026-12-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 1);
      expect(next.toISOString()).toContain('2027-01-15');
    });

    test('should handle end of month edge cases (Jan 31 to Feb 28)', () => {
      const start = new Date('2026-01-31T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 1);
      // Feb 2026 has 28 days
      expect(next.toISOString()).toContain('2026-02-28');
    });

    test('should handle leap year (Feb 29)', () => {
      const start = new Date('2024-01-31T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 1);
      // Feb 2024 is a leap year
      expect(next.toISOString()).toContain('2024-02-29');
    });

    test('should calculate quarterly recurrence correctly', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'quarterly', 1);
      expect(next.toISOString()).toContain('2026-04-15');
    });

    test('should calculate biannual recurrence correctly', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'biannual', 1);
      expect(next.toISOString()).toContain('2026-07-15');
    });

    test('should calculate annual recurrence correctly', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'annual', 1);
      expect(next.toISOString()).toContain('2027-01-15');
    });

    test('should respect custom dayOfMonth', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 1, 5);
      expect(next.toISOString()).toContain('2026-02-05');
    });

    test('should cap custom dayOfMonth at max days in month', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      const next = calculateNextDueDate(start, 'monthly', 1, 31);
      expect(next.toISOString()).toContain('2026-02-28');
    });

    test('should throw error for invalid date', () => {
      expect(() => calculateNextDueDate(new Date('invalid'), 'monthly')).toThrow('Invalid current due date');
    });

    test('should throw error for invalid interval', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      expect(() => calculateNextDueDate(start, 'monthly', 0)).toThrow('Interval must be between 1 and 12');
      expect(() => calculateNextDueDate(start, 'monthly', 13)).toThrow('Interval must be between 1 and 12');
    });

    test('should throw error for invalid dayOfMonth', () => {
      const start = new Date('2026-01-15T12:00:00Z');
      expect(() => calculateNextDueDate(start, 'monthly', 1, 0)).toThrow('Day of month must be between 1 and 31');
      expect(() => calculateNextDueDate(start, 'monthly', 1, 32)).toThrow('Day of month must be between 1 and 31');
    });
  });

  describe('getRecurrenceLabel', () => {
    test('should return simple label for interval 1', () => {
      expect(getRecurrenceLabel('monthly', 1)).toBe('Repeats monthly');
      expect(getRecurrenceLabel('quarterly', 1)).toBe('Repeats quarterly');
      expect(getRecurrenceLabel('biannual', 1)).toBe('Repeats biannual');
      expect(getRecurrenceLabel('annual', 1)).toBe('Repeats annual');
    });

    test('should return interval in label for interval > 1', () => {
      expect(getRecurrenceLabel('monthly', 2)).toBe('Repeats 2 monthly');
      expect(getRecurrenceLabel('quarterly', 3)).toBe('Repeats 3 quarterly');
    });
  });
});
