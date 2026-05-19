import type { HrBusinessUnit, HrDepartment, JobRole } from "@/types/hr-workforce";

export function filterBusinessUnitsForBu(
  units: HrBusinessUnit[],
  hrBusinessUnitId: string | null | undefined
): HrBusinessUnit[] {
  if (!hrBusinessUnitId?.trim()) return units;
  return units.filter((u) => u.id === hrBusinessUnitId);
}

export function filterDepartmentsForBu(
  departments: HrDepartment[],
  hrBusinessUnitId: string | null | undefined
): HrDepartment[] {
  if (!hrBusinessUnitId?.trim()) return departments;
  return departments.filter((d) => d.businessUnitId === hrBusinessUnitId);
}

export function filterRolesForBu(
  roles: JobRole[],
  hrBusinessUnitId: string | null | undefined
): JobRole[] {
  if (!hrBusinessUnitId?.trim()) return roles;
  return roles.filter((r) => r.businessUnitId === hrBusinessUnitId);
}

export function belongsToBusinessUnit(
  businessUnitId: string | null | undefined,
  hrBusinessUnitId: string | null | undefined
): boolean {
  if (!hrBusinessUnitId?.trim()) return true;
  return businessUnitId === hrBusinessUnitId;
}
