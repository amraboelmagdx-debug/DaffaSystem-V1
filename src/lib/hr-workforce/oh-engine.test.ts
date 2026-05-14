import { describe, expect, it } from "vitest";
import { computeOhEngine } from "./oh-engine";

describe("computeOhEngine", () => {
  it("computes billable hours and OH rate", () => {
    const weeksPerYear = 52;
    const r = computeOhEngine({
      workingDaysPerWeek: 5,
      workingHoursPerDay: 8,
      weeksPerYear,
      offDaysPerYear: 10,
      defaultCurrency: "SAR",
      utilizationRatePct: 80,
      billableEmployeeCount: 10,
      totalAnnualOverhead: 1_000_000,
    });
    const totalPerEmp = 5 * 8 * weeksPerYear;
    const off = 10 * 8;
    expect(r.totalAnnualHoursPerEmployee).toBe(totalPerEmp);
    expect(r.offHoursPerEmployeeYear).toBe(off);
    expect(r.netAvailableHoursPerEmployeeYear).toBe(totalPerEmp - off);
    const billable = (totalPerEmp - off) * 0.8 * 10;
    expect(r.totalBillableHoursPerYear).toBeCloseTo(billable, 6);
    expect(r.ohRatePerHour).toBeCloseTo(1_000_000 / billable, 6);
    expect(r.effectiveBillableEmployeeCount).toBe(10);
  });
});
