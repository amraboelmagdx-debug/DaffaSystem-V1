import { describe, expect, it } from "vitest";
import { hrWorkforceCatalogPayloadSchema } from "./hr-catalog-schema";

const minimalCatalog = {
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
      employmentType: "full_time" as const,
      employeeCount: 1,
      currency: "USD",
      avgMonthlySalary: 1000,
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
      totalAnnualOverhead: 10000,
    },
  },
};

describe("hrWorkforceCatalogPayloadSchema", () => {
  it("accepts a minimal valid catalog", () => {
    const r = hrWorkforceCatalogPayloadSchema.safeParse(minimalCatalog);
    expect(r.success).toBe(true);
  });

  it("rejects missing hrGlobalSettings.defaultCurrency", () => {
    const bad = {
      ...minimalCatalog,
      hrGlobalSettings: { ...minimalCatalog.hrGlobalSettings, defaultCurrency: "" },
    };
    const r = hrWorkforceCatalogPayloadSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });
});
