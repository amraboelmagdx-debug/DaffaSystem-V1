import type {
  CompareScenariosInput,
  ScenarioComparisonResult,
  ScenarioFinancialDeltas,
  ScenarioGovernanceDeltas,
  ScenarioOperationalDeltas,
} from "@/types/scenario-comparison";
import { resolveEffectiveCompany } from "@/lib/planning/scenario/resolve-effective-planning";
import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import {
  computeNumericDelta,
  computePostureDelta,
  computeCapacityPressureProxy,
  computeStringDelta,
} from "./delta-helpers";
import { evaluateScenarioBundle } from "./evaluate-scenario-bundle";
import { buildComparisonNarrative } from "./comparison-narrative";
import type { ComparisonNarrativeLabels } from "@/types/scenario-comparison";
import type { ScenarioBundleEvaluation } from "@/types/scenario-comparison";

export class ScenarioComparisonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioComparisonError";
  }
}

function buildFinancialDeltas(
  base: ScenarioBundleEvaluation,
  compare: ScenarioBundleEvaluation
): ScenarioFinancialDeltas {
  const b = base.engine;
  const c = compare.engine;
  const bwt = base.workbook.workbookTargets;
  const cwt = compare.workbook.workbookTargets;

  return {
    revenue: computeNumericDelta(b.revenue, c.revenue),
    grossProfit: computeNumericDelta(b.grossProfit, c.grossProfit),
    netProfit: computeNumericDelta(b.netProfit, c.netProfit),
    npPct: computeNumericDelta(b.npPct, c.npPct),
    operatingMarginPct: computeNumericDelta(b.operatingMarginPct, c.operatingMarginPct),
    roi: computeNumericDelta(b.roi, c.roi),
    salesNeededGap: computeNumericDelta(b.salesNeededGap, c.salesNeededGap),
    salesTargetRevenue: computeNumericDelta(b.salesTargetRevenue, c.salesTargetRevenue),
    burnRateMonthly: computeNumericDelta(b.burnRateMonthly, c.burnRateMonthly),
    workbookBlendedCm: computeNumericDelta(bwt.blended, cwt.blended),
    workbookSalesTarget: computeNumericDelta(bwt.salesTarget, cwt.salesTarget),
    workbookNpAtTarget: computeNumericDelta(bwt.netProfitAtTarget, cwt.netProfitAtTarget),
    workbookRoiOnFixed: computeNumericDelta(bwt.roi, cwt.roi),
  };
}

function buildOperationalDeltas(
  input: CompareScenariosInput,
  base: ScenarioBundleEvaluation,
  compare: ScenarioBundleEvaluation
): ScenarioOperationalDeltas {
  const baseBundle = mergeGovernanceOnHydrate(input.bundlesById[input.baseScenarioId]!);
  const compareBundle = mergeGovernanceOnHydrate(input.bundlesById[input.compareScenarioId]!);
  const baseEff = resolveEffectiveCompany(input.anchorCompany, baseBundle);
  const compareEff = resolveEffectiveCompany(input.anchorCompany, compareBundle);
  const bSc = base.scenario;
  const cSc = compare.scenario;

  return {
    fixedCostsMonthly: computeNumericDelta(
      baseEff.fixedCostsMonthly,
      compareEff.fixedCostsMonthly
    ),
    growthTargetPct: computeNumericDelta(baseEff.growthTargetPct, compareEff.growthTargetPct),
    revenueMonthly: computeNumericDelta(baseEff.revenueMonthly, compareEff.revenueMonthly),
    npTargetPct: computeNumericDelta(baseEff.npTargetPct, compareEff.npTargetPct),
    marginTargetPct: computeNumericDelta(baseEff.marginTargetPct, compareEff.marginTargetPct),
    growthAdj: computeNumericDelta(bSc.growthAdj, cSc.growthAdj),
    fixedCostAdj: computeNumericDelta(bSc.fixedCostAdj, cSc.fixedCostAdj),
    revenueMixAdj: computeNumericDelta(bSc.revenueMixAdj, cSc.revenueMixAdj),
    conversionRateAdj: computeNumericDelta(bSc.conversionRateAdj, cSc.conversionRateAdj),
    pipelineWeightAdj: computeNumericDelta(bSc.pipelineWeightAdj, cSc.pipelineWeightAdj),
    tierOverrideStreamCount: computeNumericDelta(
      base.tierOverrideStreamCount,
      compare.tierOverrideStreamCount
    ),
  };
}

function buildGovernanceDeltas(
  base: ScenarioBundleEvaluation,
  compare: ScenarioBundleEvaluation
): ScenarioGovernanceDeltas {
  const bg = base.governance;
  const cg = compare.governance;
  return {
    scenarioType: {
      base: bg.scenarioType,
      compare: cg.scenarioType,
      changed: bg.scenarioType !== cg.scenarioType,
    },
    status: {
      base: bg.status,
      compare: cg.status,
      changed: bg.status !== cg.status,
    },
    riskLevel: computeStringDelta(bg.riskLevel, cg.riskLevel),
    confidenceLevel: computeStringDelta(bg.confidenceLevel, cg.confidenceLevel),
    aggressivenessLevel: computeStringDelta(bg.aggressivenessLevel, cg.aggressivenessLevel),
    strategicObjective: computeStringDelta(bg.strategicObjective, cg.strategicObjective),
    planningHorizon: computeStringDelta(bg.planningHorizon, cg.planningHorizon),
  };
}

export function compareScenarios(
  input: CompareScenariosInput,
  labels?: ComparisonNarrativeLabels
): ScenarioComparisonResult {
  const baseBundle = input.bundlesById[input.baseScenarioId];
  const compareBundle = input.bundlesById[input.compareScenarioId];
  if (!baseBundle) {
    throw new ScenarioComparisonError(`Missing bundle for base scenario ${input.baseScenarioId}`);
  }
  if (!compareBundle) {
    throw new ScenarioComparisonError(
      `Missing bundle for compare scenario ${input.compareScenarioId}`
    );
  }

  const evalInput = {
    anchorCompany: input.anchorCompany,
    streams: input.streams,
    opportunities: input.opportunities,
  };

  const base = evaluateScenarioBundle({ ...evalInput, bundle: baseBundle });
  const compare = evaluateScenarioBundle({ ...evalInput, bundle: compareBundle });

  const financial = buildFinancialDeltas(base, compare);
  const operational = buildOperationalDeltas(input, base, compare);
  const governance = buildGovernanceDeltas(base, compare);

  const posture = (
    [
      "growthPosture",
      "utilizationPosture",
      "hiringPosture",
      "pricingPosture",
      "costPosture",
    ] as const
  ).map((field) =>
    computePostureDelta(
      field,
      base.assumptionsSummary[field],
      compare.assumptionsSummary[field]
    )
  );

  const baseEff = resolveEffectiveCompany(input.anchorCompany, mergeGovernanceOnHydrate(baseBundle));
  const compareEff = resolveEffectiveCompany(
    input.anchorCompany,
    mergeGovernanceOnHydrate(compareBundle)
  );

  const capacityProxy = computeCapacityPressureProxy({
    baseUtilization: base.assumptionsSummary.utilizationPosture,
    compareUtilization: compare.assumptionsSummary.utilizationPosture,
    baseFixedCosts: baseEff.fixedCostsMonthly,
    compareFixedCosts: compareEff.fixedCostsMonthly,
  });

  const capacityPressure = {
    ...capacityProxy,
    isProxy: true as const,
  };

  const meta = {
    companyId: input.anchorCompany.id,
    baseScenarioId: input.baseScenarioId,
    compareScenarioId: input.compareScenarioId,
    baseName: base.scenario.name,
    compareName: compare.scenario.name,
    baseType: base.governance.scenarioType,
    compareType: compare.governance.scenarioType,
    baseStatus: base.governance.status,
    compareStatus: compare.governance.status,
  };

  const result: ScenarioComparisonResult = {
    meta,
    base,
    compare,
    financial,
    operational,
    posture,
    governance,
    capacityPressure,
    narrative: {
      headline: "",
      bullets: [],
      riskFlags: [],
      sharedStreamMixDisclaimer: true,
    },
  };

  if (labels) {
    result.narrative = buildComparisonNarrative(result, labels);
  }

  return result;
}
