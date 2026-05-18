import { blendedCmFromStreams, monthlyPnLFromCm } from "@/lib/planning/primitives";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import { resolveEffectiveCompany } from "@/lib/planning/scenario/resolve-effective-planning";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures/executive-workspace-measures";
import type { PlanningContext } from "@/lib/planning/measures/planning-context";
import type {
  ConfidenceBandPoint,
  FinancialTrajectory,
  ForecastHorizon,
  ForecastPeriodPoint,
} from "@/types/forward-forecast";
import type { PostureLevel } from "@/types/scenario-governance";
import { periodLabels } from "./horizon";

const EPS = 1e-9;

function confidenceSpreadPct(level: PostureLevel): number {
  switch (level) {
    case "low":
      return 0.08;
    case "high":
      return 0.03;
    default:
      return 0.05;
  }
}

function scenarioCm(
  streams: PlanningContext["streams"],
  effective: ReturnType<typeof resolveEffectiveCompany>,
  revenueMixAdj: number
): number {
  const companyStreams = streams.filter((s) => s.companyId === effective.id);
  const baseCm = blendedCmFromStreams(companyStreams, effective.contributionMarginPct);
  return Math.min(0.999, Math.max(0.05, baseCm * (1 + revenueMixAdj * 0.05)));
}

export type ProjectFinancialTrajectoryInput = {
  context: PlanningContext;
  measures: ExecutiveWorkspaceMeasuresResult;
  horizon: ForecastHorizon;
};

export function projectFinancialTrajectory(
  input: ProjectFinancialTrajectoryInput
): FinancialTrajectory {
  const { context, measures, horizon } = input;
  const { company, streams, scenarioBundles, activeScenarioId } = context;
  const activeScenario = measures.activeScenario;
  const bundle = scenarioBundles?.[activeScenarioId];
  const merged = bundle ? mergeGovernanceOnHydrate(bundle) : null;
  const effective = merged ? resolveEffectiveCompany(company, merged) : company;
  const sc = merged?.scenario ?? activeScenario;

  const cm = scenarioCm(streams, effective, sc.revenueMixAdj);
  const fixedCosts = effective.fixedCostsMonthly * (1 + sc.fixedCostAdj);
  const npTarget = Math.min(cm - EPS, sc.npTargetPct);
  const monthlyBase = effective.growthTargetPct / 12;
  const monthlyRate = monthlyBase + sc.growthAdj / horizon.months;

  const labels = periodLabels(horizon);
  const points: ForecastPeriodPoint[] = [];
  let revenue = measures.activeEngine.revenue;

  for (let i = 0; i < horizon.months; i++) {
    if (i > 0) {
      revenue = revenue * (1 + monthlyRate);
    }
    const pnl = monthlyPnLFromCm({
      fixedCostsMonthly: fixedCosts,
      contributionMarginPct: cm,
      targetNpPct: npTarget,
      revenueMonthly: revenue,
    });
    const salesTarget =
      cm - npTarget > EPS ? fixedCosts / (cm - npTarget) : Number.POSITIVE_INFINITY;
    const salesGap = Number.isFinite(salesTarget)
      ? Math.max(0, salesTarget - revenue)
      : 0;

    points.push({
      period: labels[i]!,
      monthIndex: i,
      revenue: pnl.revenue,
      grossProfit: pnl.grossProfit,
      netProfit: pnl.netProfit,
      npPct: pnl.revenue > 0 ? pnl.netProfit / pnl.revenue : 0,
      contributionMarginPct: cm,
      salesGap,
    });
  }

  const spread = confidenceSpreadPct(merged?.governance.confidenceLevel ?? "neutral");
  const confidenceBands: ConfidenceBandPoint[] = points.map((p) => ({
    period: p.period,
    revenueLow: p.revenue * (1 - spread),
    revenueBase: p.revenue,
    revenueHigh: p.revenue * (1 + spread),
  }));

  const firstNp = points[0]?.npPct ?? 0;
  const lastNp = points[points.length - 1]?.npPct ?? 0;
  const marginTrendPct = (lastNp - firstNp) * 100;

  return { points, confidenceBands, marginTrendPct };
}
