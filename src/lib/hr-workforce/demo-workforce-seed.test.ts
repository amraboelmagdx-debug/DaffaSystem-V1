import { describe, expect, it, vi } from "vitest";
import { seedDemoWorkforceIfEmpty } from "./demo-workforce-seed";
import type { JobRole } from "@/types/hr-workforce";

describe("seedDemoWorkforceIfEmpty", () => {
  it("refuses when active roles exist", () => {
    const roles: JobRole[] = [{ ...minimalRole(), archived: false }];
    const r = seedDemoWorkforceIfEmpty(makeApi({ roles }));
    expect(r).toEqual({ ok: false, reason: "has_active_roles" });
  });

  it("adds roles and updates OH when workspace is empty", () => {
    const addRole = vi.fn();
    const addDepartment = vi.fn(() => ({ id: "dept-del", businessUnitId: "bu1", name: "Client Delivery" }));
    const addTeam = vi.fn(() => ({ id: "team1", departmentId: "dept-del", name: "Squad A" }));
    const setOh = vi.fn();
    const r = seedDemoWorkforceIfEmpty(
      makeApi({
        roles: [],
        addRole,
        addDepartment,
        addTeam,
        setOhManualForBusinessUnit: setOh,
      })
    );
    expect(r).toEqual({ ok: true, rolesAdded: 7 });
    expect(addRole).toHaveBeenCalledTimes(7);
    expect(setOh).toHaveBeenCalledTimes(1);
    expect(addDepartment).toHaveBeenCalled();
    expect(addTeam).toHaveBeenCalled();
  });
});

function minimalRole(): JobRole {
  return {
    id: "r1",
    businessUnitId: "bu1",
    departmentId: "d1",
    name: "X",
    employmentType: "full_time",
    employeeCount: 1,
    currency: "SAR",
    avgMonthlySalary: 1,
    avgMonthlySocialInsurance: 0,
    annualMedicalInsurance: 0,
    annualEndOfServiceCost: 0,
    riskFactorPct: 0,
    isBillable: true,
    includeInOhAllocation: true,
    operationalRoleType: "delivery",
    additionalCosts: [],
    archived: false,
  };
}

function makeApi(over: Partial<Parameters<typeof seedDemoWorkforceIfEmpty>[0]>) {
  return {
    roles: [] as JobRole[],
    businessUnits: [{ id: "bu1" }],
    departments: [{ id: "d1", businessUnitId: "bu1", name: "General" }],
    teams: [] as { id: string; departmentId: string; name: string }[],
    defaultCurrency: "SAR",
    ohManualForPrimaryBu: undefined,
    addDepartment: vi.fn(),
    addTeam: vi.fn(),
    addRole: vi.fn(),
    setOhManualForBusinessUnit: vi.fn(),
    ...over,
  } as Parameters<typeof seedDemoWorkforceIfEmpty>[0];
}
