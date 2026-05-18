import type { DemoRevenueStream } from "@/types/domain";
import type { ScenarioBundleEvaluation } from "@/types/scenario-comparison";
import type { FeasibilityDemand } from "@/types/operational-feasibility";
import { EPS, SALES_PLAN_DEMAND_BLEND_WEIGHT } from "./feasibility-constants";

/** Lever → multiplicative demand factor (deterministic v1). */
export function leverDemandFactor(scenario: ScenarioBundleEvaluation["scenario"]): number {
  return (
    1 +
    scenario.growthAdj * 0.85 +
    scenario.conversionRateAdj * 0.55 +
    scenario.pipelineWeightAdj * 0.45 +
    scenario.revenueMixAdj * 0.35
  );
}

export function revenueScaleFactor(
  evaluation: ScenarioBundleEvaluation,
  baseline?: ScenarioBundleEvaluation
): number {
  const rev = evaluation.engine.revenue;
  const baseRev = baseline?.engine.revenue ?? rev;
  if (Math.abs(baseRev) < EPS) return 1;
  return Math.max(0.25, rev / baseRev);
}

export function deriveScenarioDemand(input: {
  evaluation: ScenarioBundleEvaluation;
  baselineEvaluation?: ScenarioBundleEvaluation;
  supplyAnchorHoursMonth: number;
  salesPlanLoadIndex?: number | null;
}): FeasibilityDemand {
  const { evaluation, baselineEvaluation, supplyAnchorHoursMonth } = input;
  const revScale = revenueScaleFactor(evaluation, baselineEvaluation);
  const leverFactor = leverDemandFactor(evaluation.scenario);

  let salesPlanBlendFactor = 1;
  if (
    input.salesPlanLoadIndex != null &&
    Number.isFinite(input.salesPlanLoadIndex) &&
    supplyAnchorHoursMonth > EPS
  ) {
    const normalizedLoad = Math.max(0.5, Math.min(2.5, input.salesPlanLoadIndex / 10));
    salesPlanBlendFactor =
      1 - SALES_PLAN_DEMAND_BLEND_WEIGHT + SALES_PLAN_DEMAND_BLEND_WEIGHT * normalizedLoad;
  }

  const totalDemandHoursMonth =
    supplyAnchorHoursMonth * revScale * leverFactor * salesPlanBlendFactor;

  return {
    totalDemandHoursMonth,
    revenueScaleFactor: revScale,
    leverDemandFactor: leverFactor,
    salesPlanBlendFactor,
  };
}

export function allocateDemandToStreams(
  totalDemandHours: number,
  streams: DemoRevenueStream[]
): Map<string, number> {
  const map = new Map<string, number>();
  if (!streams.length || totalDemandHours <= 0) return map;

  const weightSum = streams.reduce((s, st) => s + Math.max(0, st.revenueWeight), 0) || 1;
  for (const st of streams) {
    const share = Math.max(0, st.revenueWeight) / weightSum;
    map.set(st.id, totalDemandHours * share);
  }
  return map;
}
