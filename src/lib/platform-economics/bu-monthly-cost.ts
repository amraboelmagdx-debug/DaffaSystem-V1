import { deriveHrWorkforceModel } from "@/lib/hr-workforce/selectors";
import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";

/** Sum monthly loaded workforce cost for roles in a business unit (operational roles only). */
export function computeBusinessUnitMonthlyWorkforceCost(input: {
  businessUnitId: string;
  roles: JobRole[];
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
}): number {
  const derived = deriveHrWorkforceModel({
    roles: input.roles,
    businessUnits: input.businessUnits,
    departments: input.departments,
    teams: input.teams,
    hrGlobalSettings: input.hrGlobalSettings,
    ohManualByBusinessUnitId: input.ohManualByBusinessUnitId,
  });
  let total = 0;
  for (const b of derived.breakdowns) {
    const role = input.roles.find((r) => r.id === b.roleId);
    if (!role || role.archived || role.businessUnitId !== input.businessUnitId) continue;
    total += b.monthlyTotalCost;
  }
  return total;
}
