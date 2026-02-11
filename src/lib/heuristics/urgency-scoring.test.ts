import { describe, expect, test, setSystemTime, beforeEach, afterEach } from "bun:test";
import { calculateUrgencyScore, type Bill, type UrgencyContext } from "./urgency-scoring";

describe("calculateUrgencyScore", () => {
  const mockNow = new Date("2023-01-01T00:00:00.000Z");

  beforeEach(() => {
    setSystemTime(mockNow);
  });

  afterEach(() => {
    setSystemTime();
  });

  const baseBill: Bill = {
    id: 1,
    name: "Test Bill",
    amount: 100,
    dueDate: new Date("2023-01-10T00:00:00.000Z"), // > 7 days
    status: "unpaid",
  };

  const baseContext: UrgencyContext = {
    currentResidence: "",
    userLatenessRate: 0,
    severeWeatherForecast: false,
  };

  test("should return 0 score for bill due in > 7 days with no other factors", () => {
    const result = calculateUrgencyScore(baseBill, baseContext);
    expect(result.score).toBe(0);
    expect(result.level).toBe("normal");
    expect(result.reasons).toEqual([]);
  });

  test("should add 'due-imminent' score when due in <= 1 day", () => {
    const bill = { ...baseBill, dueDate: new Date("2023-01-02T00:00:00.000Z") }; // 1 day from now
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(50);
    expect(result.level).toBe("high"); // > 40
    expect(result.reasons).toContain("due-imminent");
  });

  test("should add 'due-soon' score when due in <= 3 days", () => {
    const bill = { ...baseBill, dueDate: new Date("2023-01-04T00:00:00.000Z") }; // 3 days from now
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(30);
    expect(result.level).toBe("normal"); // <= 40
    expect(result.reasons).toContain("due-soon");
  });

  test("should add 'due-week' score when due in <= 7 days", () => {
    const bill = { ...baseBill, dueDate: new Date("2023-01-08T00:00:00.000Z") }; // 7 days from now
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(15);
    expect(result.level).toBe("normal");
    expect(result.reasons).toContain("due-week");
  });

  test("should add 'remote-location' score if bill has residenceId and currentResidence is set", () => {
    const bill = { ...baseBill, residenceId: 123 };
    const context = { ...baseContext, currentResidence: "some-residence" };
    const result = calculateUrgencyScore(bill, context);
    expect(result.score).toBe(20);
    expect(result.reasons).toContain("remote-location");
  });

  test("should add 'high-amount' score if bill amount > 5000", () => {
    const bill = { ...baseBill, amount: 5001 };
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(10);
    expect(result.reasons).toContain("high-amount");
  });

  test("should add 'history-late' score if user lateness rate > 0.3", () => {
    const context = { ...baseContext, userLatenessRate: 0.31 };
    const result = calculateUrgencyScore(baseBill, context);
    expect(result.score).toBe(15);
    expect(result.reasons).toContain("history-late");
  });

  test("should add 'essential-service' score if category starts with 'utility-'", () => {
    const bill = { ...baseBill, category: "utility-electric" };
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(25);
    expect(result.reasons).toContain("essential-service");
  });

  test("should add 'weather-risk' score if severe weather forecast and bill has residenceId", () => {
    const bill = { ...baseBill, residenceId: 123 };
    const context = { ...baseContext, severeWeatherForecast: true };
    const result = calculateUrgencyScore(bill, context);
    expect(result.score).toBe(30);
    expect(result.reasons).toContain("weather-risk");
  });

  test("should cap score at 100", () => {
    // Combine multiple factors to exceed 100
    // due-imminent (50) + remote-location (20) + high-amount (10) + history-late (15) + essential-service (25) = 120
    const bill: Bill = {
      ...baseBill,
      dueDate: new Date("2023-01-02T00:00:00.000Z"), // +50
      residenceId: 123, // +20 (with context)
      amount: 6000, // +10
      category: "utility-water", // +25
    };
    const context: UrgencyContext = {
      currentResidence: "location", // +20 (with bill.residenceId)
      userLatenessRate: 0.4, // +15
      severeWeatherForecast: false,
    };

    const result = calculateUrgencyScore(bill, context);
    expect(result.score).toBe(100);
    expect(result.level).toBe("critical");
  });

  test("should assign 'critical' level for score > 70", () => {
    // due-imminent (50) + essential-service (25) = 75
    const bill: Bill = {
      ...baseBill,
      dueDate: new Date("2023-01-02T00:00:00.000Z"),
      category: "utility-gas",
    };
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(75);
    expect(result.level).toBe("critical");
  });

  test("should assign 'high' level for score > 40 and <= 70", () => {
    // due-imminent (50) = 50
    const bill: Bill = {
      ...baseBill,
      dueDate: new Date("2023-01-02T00:00:00.000Z"),
    };
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(50);
    expect(result.level).toBe("high");
  });

  test("should assign 'normal' level for score <= 40", () => {
    // due-soon (30) = 30
    const bill: Bill = {
      ...baseBill,
      dueDate: new Date("2023-01-04T00:00:00.000Z"),
    };
    const result = calculateUrgencyScore(bill, baseContext);
    expect(result.score).toBe(30);
    expect(result.level).toBe("normal");
  });
});
