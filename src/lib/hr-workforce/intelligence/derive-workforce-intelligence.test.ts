import { describe, expect, it } from "vitest";
import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";
import type { HrSnapshotRecord } from "@/stores/use-hr-workforce-store";
import { newHrId } from "../id";
import { deriveWorkspaceProjection } from "../workspace-projection";
import { deriveWorkforceIntelligence } from "./derive-workforce-intelligence";

const hrGlobalSettings: HrGlobalSettings = {
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 10,
  defaultCurrency: "SAR",
  useTeamLevel: true,
};

function seedOrg(): { bu: HrBusinessUnit; dept: HrDepartment; teams: HrTeam[] } {
  const t = new Date().toISOString();
  const bu: HrBusinessUnit = {
    id: "bu-test",
    name: "Alpha",
    code: "ALP",
    description: "",
    isActive: true,
    createdAt: t,
    updatedAt: t,
  };
  const dept: HrDepartment = {
    id: "dept-test",
    businessUnitId: bu.id,
    name: "Engineering",
    code: "",
    isActive: true,
    createdAt: t,
    updatedAt: t,
  };
  return { bu, dept, teams: [] };
}

function baseRole(over: Partial<JobRole> = {}): JobRole {
  return {
    id: newHrId("role"),
    businessUnitId: "bu-test",
    departmentId: "dept-test",
    name: "Role",
    employmentType: "full_time",
    employeeCount: 2,
    currency: "SAR",
    avgMonthlySalary: 8000,
    avgMonthlySocialInsurance: 400,
    annualMedicalInsurance: 2400,
    annualEndOfServiceCost: 9600,
    riskFactorPct: 5,
    isBillable: true,
    includeInOhAllocation: true,
    operationalRoleType: "delivery",
    additionalCosts: [],
    ...over,
  };
}

describe("deriveWorkforceIntelligence", () => {
  it("returns structured intelligence with valid ratios and alerts", () => {
    const { bu, dept, teams } = seedOrg();
    const r1 = baseRole({ name: "Dev A", operationalRoleType: "delivery", employeeCount: 6 });
    const r2 = baseRole({ name: "Dev B", operationalRoleType: "delivery", employeeCount: 4 });
    const r3 = baseRole({
      name: "PM",
      operationalRoleType: "indirect",
      employeeCount: 5,
      isBillable: false,
    });
    const roles: JobRole[] = [r1, r2, r3];
    const ohManualByBusinessUnitId: Record<string, OhManualSettings> = {
      [bu.id]: {
        utilizationRatePct: 75,
        billableEmployeeCount: 10,
        totalAnnualOverhead: 900_000,
        billableFteSource: "from_roles",
        useComposedAnnualOh: false,
        ohNonWorkforceLines: [],
      },
    };

    const model = deriveWorkspaceProjection({
      roles,
      businessUnits: [bu],
      departments: [dept],
      teams,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
    });

    const snapshots: HrSnapshotRecord[] = [];

    const intel = deriveWorkforceIntelligence({
      model,
      allRoles: roles,
      businessUnits: [bu],
      departments: [dept],
      teams,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
      currency: "SAR",
      snapshots,
    });

    expect(intel.generatedAt).toBeTruthy();
    expect(intel.primaryBusinessUnitId).toBe(bu.id);
    expect(intel.executive.totalHeadcount).toBeGreaterThan(0);
    expect(intel.executive.totalMonthlyWorkforceCost).toBeGreaterThan(0);

    expect(intel.executive.workforceEfficiencyRatio).toBeGreaterThanOrEqual(0);
    expect(intel.executive.workforceEfficiencyRatio).toBeLessThanOrEqual(1);

    const sumShares =
      intel.economics.ratios.deliveryPayrollShare + intel.economics.ratios.indirectBurdenShare;
    expect(sumShares).toBeGreaterThan(0.99);
    expect(sumShares).toBeLessThan(1.01);

    expect(intel.org.span.managementRatio).toBeGreaterThanOrEqual(0);
    expect(intel.org.span.managementRatio).toBeLessThanOrEqual(1);

    expect(Array.isArray(intel.alerts)).toBe(true);
    for (const a of intel.alerts) {
      expect(typeof a.id).toBe("string");
      expect(a.severity === "info" || a.severity === "warning").toBe(true);
      expect(a.titleKey.length).toBeGreaterThan(0);
      expect(a.bodyKey.length).toBeGreaterThan(0);
    }

    expect(intel.benchmarking.length).toBeGreaterThanOrEqual(1);
    expect(intel.roleSegments).toHaveLength(3);
  });

  it("suppresses snapshot trend when disableSnapshotTrend", () => {
    const { bu, dept, teams } = seedOrg();
    const r1 = baseRole({ name: "Dev A", operationalRoleType: "delivery", employeeCount: 2 });
    const roles: JobRole[] = [r1];
    const ohManualByBusinessUnitId: Record<string, OhManualSettings> = {
      [bu.id]: {
        utilizationRatePct: 75,
        billableEmployeeCount: 5,
        totalAnnualOverhead: 400_000,
        billableFteSource: "from_roles",
        useComposedAnnualOh: false,
        ohNonWorkforceLines: [],
      },
    };
    const model = deriveWorkspaceProjection({
      roles,
      businessUnits: [bu],
      departments: [dept],
      teams,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
    });
    const intel = deriveWorkforceIntelligence({
      model,
      allRoles: roles,
      businessUnits: [bu],
      departments: [dept],
      teams,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
      currency: "SAR",
      snapshots: [],
      disableSnapshotTrend: true,
    });
    expect(intel.trend.direction).toBe("unknown");
    expect(intel.trend.suppressedReason).toBe("snapshot_org_only");
  });
});
