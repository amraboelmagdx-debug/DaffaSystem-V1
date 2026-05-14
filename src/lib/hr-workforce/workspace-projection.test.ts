import { describe, expect, it } from "vitest";
import { deriveHrWorkforceModel } from "@/lib/hr-workforce/selectors";
import { deriveWorkspaceProjection } from "./workspace-projection";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import type { HrGlobalSettings } from "@/types/hr-workforce";

const hrGlobalSettings: HrGlobalSettings = {
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 10,
  defaultCurrency: "SAR",
  useTeamLevel: true,
};

describe("deriveWorkspaceProjection", () => {
  it("matches deriveHrWorkforceModel for the same input", () => {
    const input = {
      roles: [],
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
      hrGlobalSettings,
      ohManualByBusinessUnitId: { bu1: { ...DEFAULT_OH } },
    };
    const a = deriveHrWorkforceModel(input);
    const b = deriveWorkspaceProjection(input);
    expect(b.dashboard.monthlyWorkforceCost).toBe(a.dashboard.monthlyWorkforceCost);
    expect(b.totalEffectiveOhBillableFte).toBe(a.totalEffectiveOhBillableFte);
  });
});
