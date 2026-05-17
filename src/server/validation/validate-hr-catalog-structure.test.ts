import { describe, expect, it } from "vitest";
import type { HrWorkforceCatalogPayload } from "./hr-catalog-schema";
import { validateHrCatalogStructure } from "./validate-hr-catalog-structure";

const base: HrWorkforceCatalogPayload = {
  businessUnits: [
    {
      id: "bu_1",
      name: "Main",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  departments: [
    {
      id: "dept_1",
      businessUnitId: "bu_1",
      name: "Eng",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  teams: [],
  roles: [
    {
      id: "role_1",
      businessUnitId: "bu_1",
      departmentId: "dept_1",
      name: "Dev",
      employmentType: "full_time",
      employeeCount: 1,
      currency: "USD",
      avgMonthlySalary: 0,
      avgMonthlySocialInsurance: 0,
      annualMedicalInsurance: 0,
      annualEndOfServiceCost: 0,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
    },
  ],
  hrGlobalSettings: {
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    weeksPerYear: 52,
    offDaysPerYear: 0,
    defaultCurrency: "USD",
  },
  ohManualByBusinessUnitId: {
    bu_1: {
      utilizationRatePct: 80,
      billableEmployeeCount: 1,
      totalAnnualOverhead: 0,
    },
  },
};

describe("validateHrCatalogStructure", () => {
  it("returns no issues for consistent catalog", () => {
    expect(validateHrCatalogStructure(base)).toEqual([]);
  });

  it("flags department with unknown business unit", () => {
    const catalog: HrWorkforceCatalogPayload = {
      ...base,
      departments: [{ ...base.departments[0]!, businessUnitId: "bu_missing" }],
    };
    expect(validateHrCatalogStructure(catalog).length).toBeGreaterThan(0);
  });

  it("flags OH map key outside business units", () => {
    const catalog: HrWorkforceCatalogPayload = {
      ...base,
      ohManualByBusinessUnitId: {
        bu_unknown: { utilizationRatePct: 0, billableEmployeeCount: 0, totalAnnualOverhead: 0 },
      },
    };
    expect(validateHrCatalogStructure(catalog).some((i) => i.path.includes("ohManual"))).toBe(
      true
    );
  });
});
