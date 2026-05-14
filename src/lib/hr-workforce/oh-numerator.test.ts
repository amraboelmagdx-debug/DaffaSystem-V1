import { describe, expect, it } from "vitest";
import type { HrGlobalSettings, JobRole, OhManualSettings } from "@/types/hr-workforce";
import { annualAmountNonWorkforceLine, resolveOhAnnualNumerator } from "./oh-numerator";

const settings: HrGlobalSettings = {
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 10,
  defaultCurrency: "SAR",
  useTeamLevel: true,
};

function role(p: Partial<JobRole> & Pick<JobRole, "id" | "isBillable">): JobRole {
  const isBillable = p.isBillable;
  const includeInOhAllocation = isBillable ? true : true;
  const operationalRoleType = isBillable ? "delivery" : "indirect";
  return {
    businessUnitId: "bu",
    departmentId: "d",
    name: "R",
    employmentType: "full_time",
    employeeCount: 1,
    currency: "SAR",
    avgMonthlySalary: isBillable ? 10_000 : 5_000,
    avgMonthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable,
    includeInOhAllocation,
    operationalRoleType,
    additionalCosts: [],
    archived: false,
    ...p,
  } as JobRole;
}

describe("resolveOhAnnualNumerator", () => {
  it("legacy mode uses totalAnnualOverhead only", () => {
    const oh: OhManualSettings = {
      utilizationRatePct: 80,
      billableEmployeeCount: 10,
      totalAnnualOverhead: 120_000,
      billableFteSource: "manual",
      useComposedAnnualOh: false,
      ohNonWorkforceLines: [],
    };
    const r = resolveOhAnnualNumerator(oh, [], settings);
    expect(r.composed).toBe(false);
    expect(r.totalNumerator).toBe(120_000);
  });

  it("composed mode adds indirect non-billable and lines", () => {
    const roles = [
      role({ id: "1", isBillable: true }),
      role({ id: "2", isBillable: false, avgMonthlySalary: 12_000 }),
    ];
    const oh: OhManualSettings = {
      utilizationRatePct: 80,
      billableEmployeeCount: 10,
      totalAnnualOverhead: 10_000,
      billableFteSource: "manual",
      useComposedAnnualOh: true,
      ohNonWorkforceLines: [
        {
          id: "x",
          name: "Rent",
          amount: 1000,
          recurring: "monthly",
          active: true,
        },
      ],
    };
    const r = resolveOhAnnualNumerator(oh, roles, settings);
    expect(r.composed).toBe(true);
    expect(r.nonWorkforceLinesAnnual).toBe(12_000);
    expect(r.additionalAnnualOverhead).toBe(10_000);
    expect(r.indirectWorkforceAnnualStd).toBeGreaterThan(0);
    expect(r.totalNumerator).toBe(r.indirectWorkforceAnnualStd + 12_000 + 10_000);
  });
});

describe("annualAmountNonWorkforceLine", () => {
  it("annualizes monthly", () => {
    expect(
      annualAmountNonWorkforceLine({
        id: "1",
        name: "a",
        amount: 100,
        recurring: "monthly",
        active: true,
      })
    ).toBe(1200);
  });
});
