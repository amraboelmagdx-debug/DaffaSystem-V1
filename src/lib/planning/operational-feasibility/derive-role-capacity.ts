import { monthlyWorkingHoursPerEmployee } from "@/lib/hr-workforce/monthly-hours";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";
import { SAFE_UTILIZATION_PCT } from "./feasibility-constants";

export type RoleCapacitySupply = {
  roleId: string;
  roleName: string;
  availableHoursMonth: number;
  safeAvailableHoursMonth: number;
  employeeCount: number;
};

export function deriveRoleCapacityForBu(input: {
  hrBusinessUnitId: string;
  roles: JobRole[];
  hrGlobalSettings: HrGlobalSettings;
  ohManual: OhManualSettings;
}): RoleCapacitySupply[] {
  const { hrBusinessUnitId, roles, hrGlobalSettings, ohManual } = input;
  const hoursPerEmployee = monthlyWorkingHoursPerEmployee(hrGlobalSettings);
  const util = Math.min(1, Math.max(0, ohManual.utilizationRatePct / 100));
  const safeUtil = SAFE_UTILIZATION_PCT / 100;

  const deliveryRoles = roles.filter(
    (r) =>
      !r.archived &&
      r.businessUnitId === hrBusinessUnitId &&
      r.operationalRoleType === "delivery"
  );

  return deliveryRoles.map((r) => {
    const count = Math.max(0, r.employeeCount);
    const available = hoursPerEmployee * util * count;
    const safeAvailable = hoursPerEmployee * safeUtil * count;
    return {
      roleId: r.id,
      roleName: r.name,
      availableHoursMonth: available,
      safeAvailableHoursMonth: safeAvailable,
      employeeCount: count,
    };
  });
}

export function mergeOhManualForBu(
  buId: string,
  ohManualByBusinessUnitId: Record<string, OhManualSettings>
): OhManualSettings {
  return { ...DEFAULT_OH, ...(ohManualByBusinessUnitId[buId] ?? {}) };
}

export type HrStructureInput = {
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
};
