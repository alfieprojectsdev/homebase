import { RecurrenceConfig } from '../models/Bill';

/**
 * Pure mathematical engine for calculating recurring dates.
 * ZERO dependency on DB or specific entity types.
 */
export class RecurrenceEngine {

    /**
     * Calculates the next occurrence date.
     */
    static calculateNextDate(currentDate: Date, config: RecurrenceConfig): Date {
        const next = new Date(currentDate);
        const { frequency, interval = 1, dayOfMonth } = config;

        switch (frequency) {
            case 'weekly':
                next.setDate(next.getDate() + (7 * interval));
                break;
            case 'monthly':
                this.addMonths(next, interval);
                break;
            case 'quarterly':
                this.addMonths(next, 3 * interval);
                break;
            case 'biannual':
                this.addMonths(next, 6 * interval);
                break;
            case 'annual':
                next.setFullYear(next.getFullYear() + interval);
                break;
        }

        // Handle "Day of Month" pinning (e.g., always on the 15th)
        if (dayOfMonth && ['monthly', 'quarterly', 'biannual', 'annual'].includes(frequency)) {
            const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
            next.setDate(Math.min(dayOfMonth, maxDay));
        }

        // Check end date bounds
        if (config.endDate && next > config.endDate) {
            return currentDate; // Or handle as "cutoff reached"
        }

        return next;
    }

    private static addMonths(date: Date, months: number): void {
        const originalDay = date.getDate();
        date.setMonth(date.getMonth() + months);

        // Auto-correct month overflow (e.g. Jan 31 + 1 month -> Feb 28/29, not March 2/3)
        if (date.getDate() !== originalDay) {
            date.setDate(0); // Set to last day of previous month (which is the effective correct month)
        }
    }

    static getHumanReadableLabel(config: RecurrenceConfig): string {
        const { frequency, interval } = config;
        const freqString = interval === 1 ? frequency : `${interval} ${frequency}`;
        return `Repeats ${freqString}`;
    }
}
