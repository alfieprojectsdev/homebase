/**
 * Recurrence utility functions for Phase 1.5B
 * Handles next due date calculations and human-readable labels
 */

export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual';

/**
 * Calculates the next due date based on recurrence settings
 *
 * @param currentDueDate - The current due date to calculate from
 * @param frequency - Recurrence frequency (monthly, quarterly, biannual, annual)
 * @param interval - Multiplier for frequency (default 1)
 * @param dayOfMonth - Optional specific day of month (handles edge cases like Feb 31 → Feb 28/29)
 * @returns The next calculated due date
 *
 * @example
 * // Monthly recurrence
 * calculateNextDueDate(new Date('2026-01-15'), 'monthly', 1)
 * // Returns: 2026-02-15
 *
 * @example
 * // Quarterly recurrence (3 months)
 * calculateNextDueDate(new Date('2026-01-15'), 'quarterly', 1)
 * // Returns: 2026-04-15
 *
 * @example
 * // Handle Feb 31 edge case (becomes Feb 28/29)
 * calculateNextDueDate(new Date('2026-01-31'), 'monthly', 1)
 * // Returns: 2026-02-28
 */
export function calculateNextDueDate(
  currentDueDate: Date,
  frequency: RecurrenceFrequency,
  interval: number = 1,
  dayOfMonth?: number
): Date {
  const next = new Date(currentDueDate);
  const originalDay = next.getDate();

  // Calculate target month/year before changing date
  let targetMonth: number;
  let targetYear: number = next.getFullYear();

  switch (frequency) {
    case 'monthly':
      targetMonth = next.getMonth() + interval;
      break;
    case 'quarterly':
      targetMonth = next.getMonth() + (3 * interval);
      break;
    case 'biannual':
      targetMonth = next.getMonth() + (6 * interval);
      break;
    case 'annual':
      targetMonth = next.getMonth();
      targetYear = next.getFullYear() + interval;
      break;
  }

  // Normalize month overflow (e.g., month 13 → month 1 of next year)
  while (targetMonth > 11) {
    targetMonth -= 12;
    targetYear += 1;
  }

  // Get the maximum day in the target month
  const maxDayInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  // Determine the day to use
  let dayToUse: number;
  if (dayOfMonth !== undefined) {
    // Use specified day of month, capped at max days in month
    dayToUse = Math.min(dayOfMonth, maxDayInTargetMonth);
  } else {
    // Use original day, capped at max days in target month
    dayToUse = Math.min(originalDay, maxDayInTargetMonth);
  }

  // Set the date to the target month/year/day
  next.setFullYear(targetYear, targetMonth, dayToUse);

  return next;
}

/**
 * Generates a human-readable label for recurrence settings
 *
 * @param frequency - Recurrence frequency
 * @param interval - Multiplier for frequency (default 1)
 * @returns Human-readable label like "Repeats monthly" or "Repeats 3 monthly"
 *
 * @example
 * getRecurrenceLabel('monthly', 1)
 * // Returns: "Repeats monthly"
 *
 * @example
 * getRecurrenceLabel('quarterly', 2)
 * // Returns: "Repeats 2 quarterly"
 */
export function getRecurrenceLabel(
  frequency: RecurrenceFrequency,
  interval: number = 1
): string {
  const freq = interval === 1 ? frequency : `${interval} ${frequency}`;
  return `Repeats ${freq}`;
}
