// @ts-ignore
import { expect, test, describe, mock } from "bun:test";

mock.module("simple-statistics", () => {
  return {
    mean: (arr: number[]) => {
      if (arr.length === 0) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    },
    standardDeviation: (arr: number[]) => {
      if (arr.length === 0) return 0;
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
    },
  };
});

const { detectAnomalies } = await import("./anomaly-detection");

describe("detectAnomalies", () => {
  const baseBill = {
    id: 1,
    name: "Test Bill",
    amount: 100,
    dueDate: new Date(),
    createdAt: new Date(),
  };

  test("should return no anomaly if history has fewer than 2 bills", () => {
    const history = [
      { ...baseBill, amount: 100 },
    ];
    const currentBill = { ...baseBill, amount: 150 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(false);
  });

  test("should return no anomaly if history is empty", () => {
    const result = detectAnomalies({ ...baseBill, amount: 150 }, []);
    expect(result.isAnomaly).toBe(false);
  });

  test("should return no anomaly if standard deviation is 0", () => {
    const history = [
      { ...baseBill, amount: 100 },
      { ...baseBill, amount: 100 },
    ];
    const currentBill = { ...baseBill, amount: 150 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(false);
  });

  test("should return no anomaly for a normal bill amount", () => {
    // Mean = 100, StdDev = 10
    // history: [90, 110, 100]
    // mean = (90+110+100)/3 = 100
    // variance = ((90-100)^2 + (110-100)^2 + (100-100)^2) / 3 = (100 + 100 + 0) / 3 = 66.66
    // stdDev = sqrt(66.66) = 8.165
    const history = [
      { ...baseBill, amount: 90 },
      { ...baseBill, amount: 110 },
      { ...baseBill, amount: 100 },
    ];
    // z-score = (current - mean) / stdDev
    // For no anomaly, z-score <= 2
    // If current = 115, z-score = (115 - 100) / 8.165 = 1.837 <= 2
    const currentBill = { ...baseBill, amount: 115 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(false);
  });

  test("should detect a medium anomaly for a higher amount (z-score > 2)", () => {
    const history = [
      { ...baseBill, amount: 90 },
      { ...baseBill, amount: 110 },
      { ...baseBill, amount: 100 },
    ];
    // stdDev approx 8.165. 2 * stdDev approx 16.33
    // current = 120, z-score = 20 / 8.165 = 2.449
    const currentBill = { ...baseBill, amount: 120 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe("medium");
    expect(result.message).toContain("higher than usual");
  });

  test("should detect a medium anomaly for a lower amount (z-score < -2)", () => {
    const history = [
      { ...baseBill, amount: 90 },
      { ...baseBill, amount: 110 },
      { ...baseBill, amount: 100 },
    ];
    // current = 80, z-score = -20 / 8.165 = -2.449
    const currentBill = { ...baseBill, amount: 80 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe("medium");
    expect(result.message).toContain("lower than usual");
  });

  test("should detect a high anomaly for a much higher amount (z-score > 3)", () => {
    const history = [
      { ...baseBill, amount: 90 },
      { ...baseBill, amount: 110 },
      { ...baseBill, amount: 100 },
    ];
    // stdDev approx 8.165. 3 * stdDev approx 24.495
    // current = 130, z-score = 30 / 8.165 = 3.67
    const currentBill = { ...baseBill, amount: 130 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe("high");
    expect(result.message).toContain("higher than usual");
  });

  test("should detect a high anomaly for a much lower amount (z-score < -3)", () => {
    const history = [
      { ...baseBill, amount: 90 },
      { ...baseBill, amount: 110 },
      { ...baseBill, amount: 100 },
    ];
    // current = 70, z-score = -30 / 8.165 = -3.67
    const currentBill = { ...baseBill, amount: 70 };
    const result = detectAnomalies(currentBill, history);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe("high");
    expect(result.message).toContain("lower than usual");
  });
});
