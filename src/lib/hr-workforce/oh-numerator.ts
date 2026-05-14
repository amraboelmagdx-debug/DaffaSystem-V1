import type { HrGlobalSettings, JobRole, OhManualSettings, OhNonWorkforceLine, OhNumeratorDetail } from "@/types/hr-workforce";
import { computeAllRoleBreakdowns } from "./workforce-cost-engine";
import { effectiveOperationalRoleType } from "./role-operational-type";

export function annualAmountNonWorkforceLine(line: OhNonWorkforceLine): number {
  if (!line.active) return 0;
  if (line.recurring === "yearly") return Math.max(0, line.amount);
  return Math.max(0, line.amount) * 12;
}

export function sumNonWorkforceLinesAnnual(lines: OhNonWorkforceLine[] | undefined): number {
  if (!lines?.length) return 0;
  return lines.reduce((s, l) => s + annualAmountNonWorkforceLine(l), 0);
}

/**
 * Annual loaded labor cost (existing engine, OH rate = 0) for roles marked non-billable.
 * Used as the workforce slice of a composed annual OH numerator without circular OH stacking.
 */
export function indirectNonBillableWorkforceAnnualStd(
  roles: JobRole[],
  settings: HrGlobalSettings,
  /** When set, only roles in this unit contribute to the indirect payroll slice. */
  businessUnitId?: string
): number {
  const slice = businessUnitId ? roles.filter((r) => r.businessUnitId === businessUnitId) : roles;
  const breakdowns = computeAllRoleBreakdowns(slice, settings, () => 0);
  const byId = new Map(breakdowns.map((b) => [b.roleId, b]));
  let sum = 0;
  for (const r of slice) {
    if (r.archived || effectiveOperationalRoleType(r) === "delivery") continue;
    const b = byId.get(r.id);
    if (b) sum += b.annualTotalCost;
  }
  return sum;
}

export function resolveOhAnnualNumerator(
  ohManual: OhManualSettings,
  roles: JobRole[],
  settings: HrGlobalSettings,
  businessUnitId?: string
): OhNumeratorDetail {
  const composed = ohManual.useComposedAnnualOh === true;
  if (!composed) {
    return {
      totalNumerator: Math.max(0, ohManual.totalAnnualOverhead),
      composed: false,
      indirectWorkforceAnnualStd: 0,
      nonWorkforceLinesAnnual: 0,
      additionalAnnualOverhead: 0,
    };
  }
  const indirectWorkforceAnnualStd = indirectNonBillableWorkforceAnnualStd(roles, settings, businessUnitId);
  const nonWorkforceLinesAnnual = sumNonWorkforceLinesAnnual(ohManual.ohNonWorkforceLines);
  const additionalAnnualOverhead = Math.max(0, ohManual.totalAnnualOverhead);
  const totalNumerator = indirectWorkforceAnnualStd + nonWorkforceLinesAnnual + additionalAnnualOverhead;
  return {
    totalNumerator,
    composed: true,
    indirectWorkforceAnnualStd,
    nonWorkforceLinesAnnual,
    additionalAnnualOverhead,
  };
}
