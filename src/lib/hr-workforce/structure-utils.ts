import type { HrBusinessUnit, HrDepartment, HrTeam, JobRole } from "@/types/hr-workforce";
import { effectiveOperationalRoleType } from "./role-operational-type";

export function nowIso(): string {
  return new Date().toISOString();
}

export function businessUnitById(
  id: string,
  units: HrBusinessUnit[]
): HrBusinessUnit | undefined {
  return units.find((u) => u.id === id);
}

export function departmentById(id: string, departments: HrDepartment[]): HrDepartment | undefined {
  return departments.find((d) => d.id === id);
}

export function teamById(id: string, teams: HrTeam[]): HrTeam | undefined {
  return teams.find((t) => t.id === id);
}

/** Active chain for operational rollups (default). */
export function isRoleInActiveOperationalStructure(
  role: JobRole,
  businessUnits: HrBusinessUnit[],
  departments: HrDepartment[],
  teams: HrTeam[],
  opts?: { useTeamLevel?: boolean }
): boolean {
  if (role.archived) return false;
  const bu = businessUnitById(role.businessUnitId, businessUnits);
  if (!bu || !bu.isActive) return false;
  const dept = departmentById(role.departmentId, departments);
  if (!dept || !dept.isActive || dept.businessUnitId !== bu.id) return false;
  const teamLayerOn = opts?.useTeamLevel !== false;
  if (teamLayerOn && role.teamId) {
    const tm = teamById(role.teamId, teams);
    if (!tm || !tm.isActive || tm.departmentId !== dept.id) return false;
  }
  return true;
}

export function effectiveOhBillableHeadcount(
  roles: JobRole[],
  ohManual: { billableFteSource?: string; billableEmployeeCount: number },
  /** When set, only roles in this business unit are counted for `from_roles`. */
  businessUnitId?: string
): number {
  const inBu = (r: JobRole) => (businessUnitId ? r.businessUnitId === businessUnitId : true);
  if (ohManual.billableFteSource === "from_roles") {
    return roles
      .filter(
        (r) => !r.archived && inBu(r) && effectiveOperationalRoleType(r) === "delivery"
      )
      .reduce((s, r) => s + Math.max(0, Math.floor(r.employeeCount)), 0);
  }
  return Math.max(0, Math.floor(ohManual.billableEmployeeCount));
}

export function syncRoleBusinessUnitFromDepartment(
  role: Pick<JobRole, "departmentId">,
  departments: HrDepartment[]
): string {
  const d = departmentById(role.departmentId, departments);
  return d?.businessUnitId ?? "";
}
