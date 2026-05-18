import { applyScenario } from "@/lib/calculations/engine";
import { weightedRevenue } from "@/lib/calculations/pipeline";
import { computeWorkbookPlanningSlice } from "@/lib/planning/measures/workbook-planning-slice";
import { blendedCmFromStreams } from "@/lib/planning/primitives";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import { resolveEffectiveCompany } from "@/lib/planning/scenario/resolve-effective-planning";
import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type { ScenarioBundleEvaluation } from "@/types/scenario-comparison";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream } from "@/types/domain";

export type EvaluateScenarioBundleInput = {
  anchorCompany: DemoCompany;
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  bundle: ScenarioPlanningBundle;
};

export function evaluateScenarioBundle(input: EvaluateScenarioBundleInput): ScenarioBundleEvaluation {
  const { anchorCompany, streams, opportunities, bundle } = input;
  const merged = mergeGovernanceOnHydrate(bundle);
  const effective = resolveEffectiveCompany(anchorCompany, merged);
  const companyStreams = streams.filter((s) => s.companyId === anchorCompany.id);

  const weightedPipeline = opportunities
    .filter((o) => o.companyId === anchorCompany.id)
    .reduce((s, o) => s + weightedRevenue(o), 0);

  const blendedStreamCmPct = blendedCmFromStreams(
    companyStreams,
    effective.contributionMarginPct
  );

  const engine = applyScenario(
    {
      fixedCostsMonthly: effective.fixedCostsMonthly,
      contributionMarginPct: blendedStreamCmPct,
      targetNpPct: effective.npTargetPct,
      revenueMonthly: effective.revenueMonthly,
    },
    {
      npTargetPct: merged.scenario.npTargetPct,
      revenueMixAdj: merged.scenario.revenueMixAdj,
      conversionRateAdj: merged.scenario.conversionRateAdj,
      fixedCostAdj: merged.scenario.fixedCostAdj,
      growthAdj: merged.scenario.growthAdj,
      pipelineWeightAdj: merged.scenario.pipelineWeightAdj,
    },
    weightedPipeline
  );

  const workbook = computeWorkbookPlanningSlice({
    streams: companyStreams,
    tierLineOverrides: merged.tierLineOverrides,
    fixedCostsMonthly: effective.fixedCostsMonthly,
    npTargetPct: effective.npTargetPct,
  });

  const tierOverrideStreamCount = Object.keys(merged.tierLineOverrides).length;

  return {
    scenarioId: merged.scenario.id,
    scenario: merged.scenario,
    governance: merged.governance,
    assumptionsSummary: merged.governance.assumptionsSummary,
    engine,
    workbook,
    blendedStreamCmPct,
    tierOverrideStreamCount,
  };
}
