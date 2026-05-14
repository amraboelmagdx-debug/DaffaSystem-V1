import { describe, expect, it } from "vitest";
import { monthlyWorkingHoursPerEmployee } from "./monthly-hours";

describe("monthlyWorkingHoursPerEmployee", () => {
  it("uses 5 × 8 × weeksPerYear / 12", () => {
    const m = monthlyWorkingHoursPerEmployee({
      workingDaysPerWeek: 5,
      workingHoursPerDay: 8,
      weeksPerYear: 50,
      offDaysPerYear: 0,
      defaultCurrency: "SAR",
    });
    expect(m).toBeCloseTo((5 * 8 * 50) / 12, 6);
  });
});
