import { describe, expect, it } from "vitest";
import type { JobRole } from "@/types/hr-workforce";
import { newHrId } from "./id";
import type { HrGlobalSettings } from "@/types/hr-workforce";
import { computeRoleCostBreakdown } from "./workforce-cost-engine";
import { monthlyWorkingHoursPerEmployee } from "./monthly-hours";

const settings: HrGlobalSettings = {
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 10,
  defaultCurrency: "SAR",
};

function baseRole(over: Partial<JobRole> = {}): JobRole {
  return {
    id: newHrId("role"),
    businessUnitId: "bu1",
    departmentId: "d1",
    name: "Engineer",
    employmentType: "full_time",
    employeeCount: 2,
    currency: "SAR",
    avgMonthlySalary: 6000,
    avgMonthlySocialInsurance: 500,
    annualMedicalInsurance: 2400,
    annualEndOfServiceCost: 12000,
    riskFactorPct: 10,
    isBillable: true,
    includeInOhAllocation: true,
    operationalRoleType: "delivery",
    additionalCosts: [],
    ...over,
  };
}

describe("computeRoleCostBreakdown", () => {
  it("annual benefits convert to monthly and risk applies at end", () => {
    const role = baseRole();
    const mh = monthlyWorkingHoursPerEmployee(settings);
    const b = computeRoleCostBreakdown(role, settings, 5);
    const perEmpBase = 6000 + 500 + 2400 / 12 + 12000 / 12;
    const monthlyBase = perEmpBase * 2;
    expect(b.monthlyBaseCost).toBeCloseTo(monthlyBase, 6);
    const sub = monthlyBase;
    expect(b.monthlySubtotalBeforeRisk).toBeCloseTo(sub, 6);
    expect(b.monthlyTotalCost).toBeCloseTo(sub * 1.1, 6);
    expect(b.standardHourlyCost).toBeCloseTo(b.monthlyTotalCost / (mh * 2), 6);
    expect(b.ohAdjustedHourlyCost).toBeCloseTo(b.standardHourlyCost + 5, 6);
  });

  it("percentage additional applies to pre-risk base", () => {
    const role = baseRole({
      additionalCosts: [
        {
          id: "1",
          costName: "Bonus pool",
          amount: 10,
          costType: "percentage",
          recurring: "monthly",
          percentageBasis: "salary_plus_benefits",
        },
      ],
    });
    const b = computeRoleCostBreakdown(role, settings, 0);
    const perEmpBase = 6000 + 500 + 200 + 1000;
    const monthlyBase = perEmpBase * 2;
    const add = monthlyBase * 0.1;
    expect(b.monthlyAdditionalCosts).toBeCloseTo(add, 6);
    expect(b.monthlySubtotalBeforeRisk).toBeCloseTo(monthlyBase + add, 6);
  });

  it("fixed additional is per employee and scales with headcount", () => {
    const role = baseRole({
      employeeCount: 3,
      additionalCosts: [
        { id: "1", costName: "Allowance", amount: 100, costType: "fixed", recurring: "monthly" },
      ],
    });
    const b = computeRoleCostBreakdown(role, settings, 0);
    expect(b.monthlyAdditionalCosts).toBeCloseTo(300, 6);
  });

  it("yearly additional is amortized per month per employee × headcount", () => {
    const role = baseRole({
      employeeCount: 2,
      additionalCosts: [
        { id: "1", costName: "Annual fee", amount: 12000, costType: "variable", recurring: "yearly" },
      ],
    });
    const b = computeRoleCostBreakdown(role, settings, 0);
    expect(b.monthlyAdditionalCosts).toBeCloseTo(2000, 6);
  });
});
