import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import { computeOhEngine } from "@/lib/hr-workforce/oh-engine";
import { resolveOhAnnualNumerator } from "@/lib/hr-workforce/oh-numerator";
import { effectiveOhBillableHeadcount } from "@/lib/hr-workforce/structure-utils";
import type { HrGlobalSettings, JobRole, OhManualSettings, OhNonWorkforceLine } from "@/types/hr-workforce";

export type OhScenarioPatch = Partial<
  Pick<OhManualSettings, "utilizationRatePct" | "billableEmployeeCount" | "totalAnnualOverhead">
> & {
  billableEmployeeCountDeltaPct?: number;
  /** Added to base utilization (points, not ratio). Clamped 0–100 after apply. */
  utilizationDeltaPct?: number;
  /** Scales `totalAnnualOverhead` by (1 + pct/100) before numerator resolution. */
  totalAnnualOverheadDeltaPct?: number;
  /** Scales rent-like non-workforce line amounts by (1 + pct/100) in composed OH. */
  rentNonWorkforceDeltaPct?: number;
};

function clampUtilPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function isRentNonWorkforceLine(line: OhNonWorkforceLine): boolean {
  const t = `${line.category ?? ""} ${line.name}`.toLowerCase();
  return /rent|lease|إيجار|تأجير/.test(t);
}

function buildScenarioManual(
  base: OhManualSettings,
  billable: number,
  patch: OhScenarioPatch
): OhManualSettings {
  let util = base.utilizationRatePct;
  if (patch.utilizationRatePct != null) util = clampUtilPct(patch.utilizationRatePct);
  else if (patch.utilizationDeltaPct != null) util = clampUtilPct(base.utilizationRatePct + patch.utilizationDeltaPct);

  let totalAnnual = base.totalAnnualOverhead;
  if (patch.totalAnnualOverhead != null) totalAnnual = Math.max(0, patch.totalAnnualOverhead);
  else if (patch.totalAnnualOverheadDeltaPct != null) {
    totalAnnual = Math.max(0, base.totalAnnualOverhead * (1 + patch.totalAnnualOverheadDeltaPct / 100));
  }

  let lines = [...(base.ohNonWorkforceLines ?? [])];
  if (patch.rentNonWorkforceDeltaPct != null && patch.rentNonWorkforceDeltaPct !== 0) {
    const mult = 1 + patch.rentNonWorkforceDeltaPct / 100;
    lines = lines.map((l) => (isRentNonWorkforceLine(l) ? { ...l, amount: l.amount * mult } : { ...l }));
  }

  return {
    ...base,
    billableEmployeeCount: billable,
    utilizationRatePct: util,
    totalAnnualOverhead: totalAnnual,
    ohNonWorkforceLines: lines,
  };
}

/**
 * What-if OH rate for a single BU — reuses live engine; no forecasting / catalog coupling.
 */
export function computeOhScenarioForBu(
  roles: JobRole[],
  hrGlobalSettings: HrGlobalSettings,
  ohManual: OhManualSettings,
  businessUnitId: string,
  patch: OhScenarioPatch
): { ohRatePerHour: number; baselineRate: number; deltaPct: number | null } {
  const base = { ...DEFAULT_OH, ...ohManual };
  let billable = effectiveOhBillableHeadcount(roles, base, businessUnitId);
  if (patch.billableEmployeeCount != null) {
    billable = Math.max(0, Math.floor(patch.billableEmployeeCount));
  } else if (patch.billableEmployeeCountDeltaPct != null) {
    billable = Math.max(0, Math.floor(billable * (1 + patch.billableEmployeeCountDeltaPct / 100)));
  }

  const scenarioManual = buildScenarioManual(base, billable, patch);
  const numerator = resolveOhAnnualNumerator(scenarioManual, roles, hrGlobalSettings, businessUnitId);
  const oh = computeOhEngine({
    ...hrGlobalSettings,
    ...scenarioManual,
    totalAnnualOverhead: numerator.totalNumerator,
  });
  const baseNum = resolveOhAnnualNumerator(base, roles, hrGlobalSettings, businessUnitId);
  const baseOh = computeOhEngine({
    ...hrGlobalSettings,
    ...base,
    billableEmployeeCount: effectiveOhBillableHeadcount(roles, base, businessUnitId),
    utilizationRatePct: base.utilizationRatePct,
    totalAnnualOverhead: baseNum.totalNumerator,
  });
  const deltaPct =
    baseOh.ohRatePerHour > 1e-9 ? ((oh.ohRatePerHour - baseOh.ohRatePerHour) / baseOh.ohRatePerHour) * 100 : null;
  return { ohRatePerHour: oh.ohRatePerHour, baselineRate: baseOh.ohRatePerHour, deltaPct };
}
