
import { describe, it, expect } from "bun:test";
import { RecurrenceEngine } from "./RecurrenceEngine";
import { RecurrenceConfig } from "../models/Bill";

describe("RecurrenceEngine", () => {
    // Tests for calculateNextDate
    describe("calculateNextDate", () => {
        // Weekly
        it("should calculate next weekly occurrence correctly", () => {
            const start = new Date("2023-01-01"); // Sunday
            const config: RecurrenceConfig = { frequency: "weekly", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-01-08");
        });

        it("should calculate next bi-weekly occurrence correctly", () => {
            const start = new Date("2023-01-01");
            const config: RecurrenceConfig = { frequency: "weekly", interval: 2 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-01-15");
        });

        // Monthly
        it("should calculate next monthly occurrence correctly", () => {
            const start = new Date("2023-01-15");
            const config: RecurrenceConfig = { frequency: "monthly", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-02-15");
        });

        it("should handle month overflow (Jan 31 -> Feb 28)", () => {
            const start = new Date("2023-01-31");
            const config: RecurrenceConfig = { frequency: "monthly", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            // 2023 is not a leap year, so Feb has 28 days
            expect(next.toISOString().split("T")[0]).toBe("2023-02-28");
        });

        it("should handle leap year month overflow (Jan 31 -> Feb 29)", () => {
            const start = new Date("2024-01-31");
            const config: RecurrenceConfig = { frequency: "monthly", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            // 2024 is a leap year
            expect(next.toISOString().split("T")[0]).toBe("2024-02-29");
        });

        // Quarterly
        it("should calculate next quarterly occurrence correctly", () => {
            const start = new Date("2023-01-01");
            const config: RecurrenceConfig = { frequency: "quarterly", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-04-01");
        });

        // Biannual
        it("should calculate next biannual occurrence correctly", () => {
            const start = new Date("2023-01-01");
            const config: RecurrenceConfig = { frequency: "biannual", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-07-01");
        });

        // Annual
        it("should calculate next annual occurrence correctly", () => {
            const start = new Date("2023-01-01");
            const config: RecurrenceConfig = { frequency: "annual", interval: 1 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2024-01-01");
        });

        // dayOfMonth pinning
        it("should pin to specific day of month if configured", () => {
            const start = new Date("2023-01-10");
            // Next month would naturally be Feb 10, but pinned to 15
            const config: RecurrenceConfig = { frequency: "monthly", interval: 1, dayOfMonth: 15 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-02-15");
        });

        it("should pin to last day of month if dayOfMonth exceeds max days", () => {
             const start = new Date("2023-01-10");
            // Next month is Feb (28 days in 2023). Pinned to 30. Should be Feb 28.
            const config: RecurrenceConfig = { frequency: "monthly", interval: 1, dayOfMonth: 30 };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-02-28");
        });

        // endDate check
        it("should return currentDate if next date exceeds endDate", () => {
            const start = new Date("2023-01-01");
            const endDate = new Date("2023-01-05");
            // Next would be Jan 8, which is > Jan 5
            const config: RecurrenceConfig = { frequency: "weekly", interval: 1, endDate };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            // Expect it to return current date (cutoff reached behavior as per code comment)
            expect(next.getTime()).toBe(start.getTime());
        });

        it("should return next date if it equals endDate", () => {
             // If next falls exactly on end date, strict greater check (next > endDate) is false, so it returns next
            const start = new Date("2023-01-01");
            const endDate = new Date("2023-01-08");
            const config: RecurrenceConfig = { frequency: "weekly", interval: 1, endDate };
            const next = RecurrenceEngine.calculateNextDate(start, config);
            expect(next.toISOString().split("T")[0]).toBe("2023-01-08");
        });
    });

    describe("getHumanReadableLabel", () => {
        it("should return simple label for interval 1", () => {
            const config: RecurrenceConfig = { frequency: "monthly", interval: 1 };
            expect(RecurrenceEngine.getHumanReadableLabel(config)).toBe("Repeats monthly");
        });

        it("should return label with interval > 1", () => {
            const config: RecurrenceConfig = { frequency: "weekly", interval: 2 };
            expect(RecurrenceEngine.getHumanReadableLabel(config)).toBe("Repeats 2 weekly");
        });
    });
});
