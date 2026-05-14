import type { JobRole, RoleCostBreakdown } from "@/types/hr-workforce";
import type { HrGlobalSettings } from "@/types/hr-workforce";
import { monthlyWorkingHoursPerEmployee } from "./monthly-hours";

/** Approximate monthly overhead dollars at the margin: OH $/hr × monthly hours × headcount (rate from caller, e.g. per BU). */
export function monthlyOhSurchargeForRole(
  role: JobRole,
  settings: HrGlobalSettings,
  ohRatePerHour: number
): number {
  const mh = monthlyWorkingHoursPerEmployee(settings);
  const n = Math.max(0, role.employeeCount);
  return ohRatePerHour * mh * n;
}

export function rankRolesByMonthlyCost(
  roles: JobRole[],
  breakdownById: Map<string, RoleCostBreakdown>
): JobRole[] {
  return [...roles]
    .filter((r) => !r.archived)
    .sort(
      (a, b) =>
        (breakdownById.get(b.id)?.monthlyTotalCost ?? 0) -
        (breakdownById.get(a.id)?.monthlyTotalCost ?? 0)
    );
}

export function rankRolesByOhSurcharge(
  roles: JobRole[],
  settings: HrGlobalSettings,
  getOhRateForRole: (role: JobRole) => number
): JobRole[] {
  return [...roles]
    .filter((r) => !r.archived)
    .sort((a, b) => {
      const va = monthlyOhSurchargeForRole(a, settings, getOhRateForRole(a));
      const vb = monthlyOhSurchargeForRole(b, settings, getOhRateForRole(b));
      if (vb !== va) return vb - va;
      const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (byName !== 0) return byName;
      return a.id.localeCompare(b.id);
    });
}

export function rankRolesByRiskFactor(roles: JobRole[]): JobRole[] {
  return [...roles]
    .filter((r) => !r.archived)
    .sort((a, b) => b.riskFactorPct - a.riskFactorPct);
}
