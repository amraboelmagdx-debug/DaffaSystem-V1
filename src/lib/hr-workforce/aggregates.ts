import type { JobRole, RoleCostBreakdown } from "@/types/hr-workforce";
import { effectiveOperationalRoleType } from "./role-operational-type";

export interface WorkforceDashboardAggregates {
  totalEmployees: number;
  billableEmployees: number;
  nonBillableEmployees: number;
  monthlyWorkforceCost: number;
  annualWorkforceCost: number;
  averageStandardHourly: number;
  averageOhAdjustedHourly: number;
}

export function buildWorkforceDashboardAggregates(
  roles: JobRole[],
  breakdowns: RoleCostBreakdown[]
): WorkforceDashboardAggregates {
  const active = roles.filter((r) => !r.archived);
  let totalEmployees = 0;
  let billableEmployees = 0;
  for (const r of active) {
    const c = Math.max(0, r.employeeCount);
    totalEmployees += c;
    if (effectiveOperationalRoleType(r) === "delivery") billableEmployees += c;
  }
  const nonBillableEmployees = Math.max(0, totalEmployees - billableEmployees);

  const byId = new Map(breakdowns.map((b) => [b.roleId, b]));
  let monthlyWorkforceCost = 0;
  let weightedStd = 0;
  let weightedOh = 0;
  let weight = 0;
  for (const r of active) {
    const b = byId.get(r.id);
    if (!b) continue;
    monthlyWorkforceCost += b.monthlyTotalCost;
    const w = Math.max(0, r.employeeCount);
    weightedStd += b.standardHourlyCost * w;
    weightedOh += b.ohAdjustedHourlyCost * w;
    weight += w;
  }
  const averageStandardHourly = weight > 0 ? weightedStd / weight : 0;
  const averageOhAdjustedHourly = weight > 0 ? weightedOh / weight : 0;

  return {
    totalEmployees,
    billableEmployees,
    nonBillableEmployees,
    monthlyWorkforceCost,
    annualWorkforceCost: monthlyWorkforceCost * 12,
    averageStandardHourly: averageStandardHourly,
    averageOhAdjustedHourly: averageOhAdjustedHourly,
  };
}

export interface DepartmentCostAggregate {
  departmentId: string;
  departmentName: string;
  headcount: number;
  billableHeadcount: number;
  monthlyCost: number;
}

export function aggregateByDepartment(
  roles: JobRole[],
  breakdowns: RoleCostBreakdown[],
  departmentNames: Map<string, string>
): DepartmentCostAggregate[] {
  const byId = new Map(breakdowns.map((b) => [b.roleId, b]));
  const map = new Map<string, DepartmentCostAggregate>();

  for (const r of roles) {
    if (r.archived) continue;
    const b = byId.get(r.id);
    if (!b) continue;
    const name = departmentNames.get(r.departmentId) ?? r.departmentId;
    const prev =
      map.get(r.departmentId) ??
      ({
        departmentId: r.departmentId,
        departmentName: name,
        headcount: 0,
        billableHeadcount: 0,
        monthlyCost: 0,
      } as DepartmentCostAggregate);
    prev.headcount += r.employeeCount;
    if (effectiveOperationalRoleType(r) === "delivery") prev.billableHeadcount += r.employeeCount;
    prev.monthlyCost += b.monthlyTotalCost;
    map.set(r.departmentId, prev);
  }
  return [...map.values()].sort((a, b) => b.monthlyCost - a.monthlyCost);
}
