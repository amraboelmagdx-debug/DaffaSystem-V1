import { describe, expect, it } from "vitest";
import { parseHrSnapshotPayload } from "@/stores/use-hr-workforce-store";
import { validateHrSnapshotPayloadForRestore } from "./snapshot-restore";

describe("snapshot parse + restore validation (roundtrip)", () => {
  it("accepts legacy v2 JSON without engine/formula fields after parse", () => {
    const json = JSON.stringify({
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
    const p = parseHrSnapshotPayload(json);
    expect(p.engineVersion).toBe(1);
    expect(p.formulaVersion).toBe(1);
    const v = validateHrSnapshotPayloadForRestore(p);
    expect(v.ok).toBe(true);
  });
});
