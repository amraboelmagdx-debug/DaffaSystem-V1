import { evaluateScenarioBundle } from "@/lib/planning/scenario-comparison";
import type {
  CompareScenariosInput,
  ScenarioBundleEvaluation,
} from "@/types/scenario-comparison";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type { DriverSpec } from "./assumption-keys";

export type CounterfactualEvalContext = Pick<
  CompareScenariosInput,
  "anchorCompany" | "streams" | "opportunities"
>;

export function evaluateCounterfactualBundle(
  ctx: CounterfactualEvalContext,
  bundle: ScenarioPlanningBundle
): ScenarioBundleEvaluation {
  return evaluateScenarioBundle({
    anchorCompany: ctx.anchorCompany,
    streams: ctx.streams,
    opportunities: ctx.opportunities,
    bundle,
  });
}

export function evaluateDriverCounterfactual(
  ctx: CounterfactualEvalContext,
  baseBundle: ScenarioPlanningBundle,
  compareBundle: ScenarioPlanningBundle,
  driver: DriverSpec
): ScenarioBundleEvaluation {
  const synthetic = driver.applyCompare(baseBundle, compareBundle);
  return evaluateCounterfactualBundle(ctx, synthetic);
}

export type MeasureSnapshot = {
  revenue: number;
  netProfit: number;
  grossProfit: number;
  npPct: number;
  salesGap: number;
  workbookCm: number;
};

export function snapshotMeasures(eval_: ScenarioBundleEvaluation): MeasureSnapshot {
  return {
    revenue: eval_.engine.revenue,
    netProfit: eval_.engine.netProfit,
    grossProfit: eval_.engine.grossProfit,
    npPct: eval_.engine.npPct,
    salesGap: eval_.engine.salesNeededGap,
    workbookCm: eval_.workbook.workbookTargets.blended,
  };
}

export function marginalFromSnapshots(
  base: MeasureSnapshot,
  counterfactual: MeasureSnapshot
): MeasureSnapshot {
  return {
    revenue: counterfactual.revenue - base.revenue,
    netProfit: counterfactual.netProfit - base.netProfit,
    grossProfit: counterfactual.grossProfit - base.grossProfit,
    npPct: counterfactual.npPct - base.npPct,
    salesGap: counterfactual.salesGap - base.salesGap,
    workbookCm: counterfactual.workbookCm - base.workbookCm,
  };
}
