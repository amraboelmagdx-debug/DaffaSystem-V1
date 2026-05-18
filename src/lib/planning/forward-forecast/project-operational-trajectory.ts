import {
  buildFeasibilityEvalContext,
  evaluateOperationalFeasibility,
} from "@/lib/planning/operational-feasibility";
import {
  FEASIBLE_RATIO_THRESHOLD,
  INFEASIBLE_RATIO_THRESHOLD,
  SAFE_UTILIZATION_PCT,
  STANDARD_FTE_HOURS_MONTH,
} from "@/lib/planning/operational-feasibility/feasibility-constants";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { PlanningContext } from "@/lib/planning/measures/planning-context";
import type {
  FinancialTrajectory,
  ForecastHorizon,
  OperationalPeriodPoint,
  OperationalTrajectory,
} from "@/types/forward-forecast";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";
import type {
  OperationalFeasibilityStatus,
  UtilizationBand,
} from "@/types/operational-feasibility";
import { periodLabels } from "./horizon";

const EPS = 1e-9;

function utilizationBand(pct: number): UtilizationBand {
  if (pct <= SAFE_UTILIZATION_PCT) return "safe";
  if (pct <= 100) return "elevated";
  return "critical";
}

function statusFromRatio(ratio: number): OperationalFeasibilityStatus {
  if (ratio < FEASIBLE_RATIO_THRESHOLD) return "feasible";
  if (ratio < INFEASIBLE_RATIO_THRESHOLD) return "constrained";
  return "infeasible";
}

function roundFteGap(hours: number): number {
  if (hours <= 0) return 0;
  return Math.ceil(hours / STANDARD_FTE_HOURS_MONTH / 0.25) * 0.25;
}

export type ProjectOperationalTrajectoryInput = {
  context: PlanningContext;
  measures: ExecutiveWorkspaceMeasuresResult;
  financial: FinancialTrajectory;
  horizon: ForecastHorizon;
  hrSnapshot?: HrWorkforceSnapshot | null;
};

export function projectOperationalTrajectory(
  input: ProjectOperationalTrajectoryInput
): OperationalTrajectory {
  const { context, measures, financial, horizon, hrSnapshot } = input;
  const { company, streams, opportunities, scenarioBundles, activeScenarioId } = context;
  const bundle = scenarioBundles?.[activeScenarioId];
  const unavailable: OperationalTrajectory = {
    mode: "unavailable",
    points: [],
    firstSaturationMonth: null,
    recommendedHireFtePerMonth: null,
  };

  if (!hrSnapshot || !bundle) return unavailable;

  const baselineScenario = context.scenarios.find((s) => s.baseline);
  const baselineBundle = baselineScenario
    ? scenarioBundles?.[baselineScenario.id]
    : undefined;

  const feasCtx = buildFeasibilityEvalContext({
    anchorCompany: company,
    streams: streams.filter((s) => s.companyId === company.id),
    opportunities,
    bundle: mergeGovernanceOnHydrate(bundle),
    baselineBundle: baselineBundle
      ? mergeGovernanceOnHydrate(baselineBundle)
      : undefined,
    hrSnapshot,
  });

  const seed = evaluateOperationalFeasibility(feasCtx);
  if (seed.feasibilityMode !== "hr_backed" || !seed.demand || !seed.supply) {
    return unavailable;
  }

  const demand0 = seed.demand.totalDemandHoursMonth;
  const supply0 = seed.supply.totalBillableHoursMonth;
  const revenue0 = financial.points[0]?.revenue ?? measures.activeEngine.revenue;
  const fteGap = seed.staffing?.impliedFteGap ?? 0;
  const hireRate =
    fteGap > 0 && horizon.months > 0
      ? Math.min(fteGap / horizon.months, fteGap)
      : 0;
  const hireHoursPerMonth = hireRate * STANDARD_FTE_HOURS_MONTH;

  const labels = periodLabels(horizon);
  const points: OperationalPeriodPoint[] = [];
  let firstSaturationMonth: string | null = null;

  for (let i = 0; i < horizon.months; i++) {
    const fin = financial.points[i];
    const revenue = fin?.revenue ?? revenue0;
    const scale = revenue0 > EPS ? revenue / revenue0 : 1;
    const demand = demand0 * scale;
    const supply = supply0 + hireHoursPerMonth * i;
    const utilizationPct = supply > EPS ? (demand / supply) * 100 : 0;
    const ratio = supply > EPS ? demand / supply : 0;
    const band = utilizationBand(utilizationPct);
    const status = statusFromRatio(ratio);
    const deficitHours = Math.max(0, demand - supply);
    const hiringFteGap = roundFteGap(deficitHours);

    if (
      !firstSaturationMonth &&
      (utilizationPct > SAFE_UTILIZATION_PCT || status === "infeasible")
    ) {
      firstSaturationMonth = labels[i] ?? null;
    }

    points.push({
      period: labels[i]!,
      monthIndex: i,
      demandHours: demand,
      supplyHours: supply,
      utilizationPct,
      utilizationBand: band,
      hiringFteGap,
      feasibilityStatus: status,
    });
  }

  return {
    mode: "hr_backed",
    points,
    firstSaturationMonth,
    recommendedHireFtePerMonth: hireRate > 0 ? hireRate : null,
  };
}
