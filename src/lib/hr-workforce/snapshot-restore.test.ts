import { describe, expect, it } from "vitest";
import { validateHrSnapshotPayloadForRestore } from "./snapshot-restore";
import type { HrSnapshotPayloadV2 } from "@/types/hr-workforce";

const minimalPayload = (): HrSnapshotPayloadV2 => ({
  v: 2,
  businessUnits: [
    {
      id: "bu1",
      name: "Main",
      code: "M",
      description: "",
      isActive: true,
      createdAt: "t",
      updatedAt: "t",
    },
  ],
  departments: [
    {
      id: "d1",
      businessUnitId: "bu1",
      name: "G",
      code: "",
      isActive: true,
      createdAt: "t",
      updatedAt: "t",
    },
  ],
  teams: [],
  roles: [
    {
      id: "r1",
      businessUnitId: "bu1",
      departmentId: "d1",
      name: "Role",
      employmentType: "full_time",
      employeeCount: 1,
      currency: "SAR",
      operationalRoleType: "delivery",
      avgMonthlySalary: 0,
      avgMonthlySocialInsurance: 0,
      annualMedicalInsurance: 0,
      annualEndOfServiceCost: 0,
      riskFactorPct: 0,
      isBillable: true,
      includeInOhAllocation: true,
      additionalCosts: [],
      archived: false,
    },
  ],
  hrGlobalSettings: {
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    weeksPerYear: 52,
    offDaysPerYear: 10,
    defaultCurrency: "SAR",
    useTeamLevel: true,
  },
  ohManualByBusinessUnitId: {},
});

describe("validateHrSnapshotPayloadForRestore", () => {
  it("accepts a minimal valid v2 payload", () => {
    const r = validateHrSnapshotPayloadForRestore(minimalPayload());
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects empty business units", () => {
    const p = minimalPayload();
    p.businessUnits = [];
    const r = validateHrSnapshotPayloadForRestore(p);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("business unit"))).toBe(true);
  });

  it("rejects invalid role rows", () => {
    const p = minimalPayload();
    p.roles = [{ ...p.roles[0]!, id: "" }];
    const r = validateHrSnapshotPayloadForRestore(p);
    expect(r.ok).toBe(false);
  });

  it("warns on newer engineVersion than app", () => {
    const p = minimalPayload();
    p.engineVersion = 99;
    const r = validateHrSnapshotPayloadForRestore(p);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.includes("engineVersion"))).toBe(true);
  });
});
