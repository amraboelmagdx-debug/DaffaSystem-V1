/**
 * Executive workspace measures — ONE orchestrator for dashboard + scenarios.
 *
 * 💡 الفكرة ببساطة:
 * - المحركات القديمة (`calculations/engine`, `workbook-engine`, `pipeline`) لسه هي اللي تحسب.
 * - الملف ده يجمع النتائج في كائن واحد + `valuesByMeasureId` + lineage كامل من الكتالوج.
 * - كده نقدر نضيف شاشات جديدة من غير ما ننسخ `useMemo` blocks في كل صفحة.
 */

import type { DemoScenario } from "@/types/domain";
import type { DemoRevenueStream } from "@/types/domain";
import type { EngineOutputs } from "@/lib/calculations/engine";
import { applyScenario, runForecastEngine } from "@/lib/calculations/engine";
import { coverageRatio, pipelineHealthScore, weightedRevenue } from "@/lib/calculations/pipeline";
import { MEASURE_CATALOG } from "./measure-catalog";
import { computeWorkbookPlanningSlice } from "./workbook-planning-slice";
import type { ExecutiveWorkspaceMeasuresInput, PlanningContext } from "./planning-context";
import type { FormulaOwner } from "./planning-measure-types";
import { MEASURE_ID, type MeasureId } from "./measure-ids";
import type { KpiLineage } from "./measure-lineage";
import {
  buildFeasibilityEvalContext,
  evaluateOperationalFeasibility,
} from "@/lib/planning/operational-feasibility";
import { evaluateScenarioBundle } from "@/lib/planning/scenario-comparison";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";
import {
  assertPlanningEvaluationContext,
  resolveActiveScenario,
} from "./planning-evaluation-readiness";
import { blendedCmFromStreams } from "@/lib/planning/primitives";
import { dealEconomicsRollupAsMeasureValues } from "@/lib/deal-economics/deal-measures";
import { serviceEconomicsAsMeasureValues } from "@/lib/service-economics/service-measures";
import type { DealEconomicsMeasures } from "@/lib/deal-economics/types";
import type { ServiceEconomicsMeasures } from "@/lib/service-economics/types";

export type MeasureLineageOwner =
  | "calculations-engine"
  | "workbook-engine"
  | "pipeline"
  | "derived"
  | "sales-plan-build-model";

export type MeasureLineage = {
  owner: MeasureLineageOwner;
  detail: string;
};

function mapFormulaOwnerToLineageOwner(source: FormulaOwner): MeasureLineageOwner {
  switch (source) {
    case "calculations-engine":
    case "workbook-engine":
    case "pipeline":
    case "sales-plan-build-model":
      return source;
    case "service-economics":
    case "deal-economics":
    case "derived":
      return "derived";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export type ExecutiveWorkspaceMeasuresResult = {
  blendedStreamCmPct: number;
  weightedPipeline: number;
  baseEngine: EngineOutputs;
  scenarioById: Record<string, EngineOutputs>;
  activeScenario: DemoScenario;
  activeEngine: EngineOutputs;
  workbook: ReturnType<typeof computeWorkbookPlanningSlice>;
  pipeline: { health: number; coverage: number };
  forecastAchievementVsPlanProxy: number;
  scenarioCompare: { name: string; profit: number; revenue: number }[];
  /** @deprecated Prefer measureLineageById — kept for quick tooltip text */
  lineage: Partial<Record<MeasureId, MeasureLineage>>;
  valuesByMeasureId: Partial<Record<MeasureId, number>>;
  measureLineageById: Partial<Record<MeasureId, KpiLineage>>;
};

function buildLineageMaps(): {
  measureLineageById: Partial<Record<MeasureId, KpiLineage>>;
  lineage: Partial<Record<MeasureId, MeasureLineage>>;
} {
  const measureLineageById: Partial<Record<MeasureId, KpiLineage>> = {};
  const lineage: Partial<Record<MeasureId, MeasureLineage>> = {};
  for (const meta of MEASURE_CATALOG) {
    measureLineageById[meta.id] = {
      measureId: meta.id,
      semanticMode: meta.semanticMode,
      sourceEngine: meta.sourceEngine,
      upstreamMeasureIds: meta.dependsOn,
      calculationPath: meta.calculationPath,
    };
    lineage[meta.id] = {
      owner: mapFormulaOwnerToLineageOwner(meta.sourceEngine),
      detail: meta.calculationPath.join(" → "),
    };
  }
  return { measureLineageById, lineage };
}

function fillValuesFromEngines(input: {
  blendedStreamCmPct: number;
  weightedPipeline: number;
  baseEngine: EngineOutputs;
  activeEngine: EngineOutputs;
  workbook: ReturnType<typeof computeWorkbookPlanningSlice>;
  pipeline: { health: number; coverage: number };
  forecastAchievementVsPlanProxy: number;
  serviceEconomicsMeasures?: ServiceEconomicsMeasures | null;
  dealEconomicsRollup?: DealEconomicsMeasures | null;
}): Partial<Record<MeasureId, number>> {
  const {
    blendedStreamCmPct,
    weightedPipeline,
    baseEngine,
    activeEngine,
    workbook,
    pipeline,
    forecastAchievementVsPlanProxy,
  } = input;
  const wt = workbook.workbookTargets;
  return {
    [MEASURE_ID.CM_BLENDED_STREAMS]: blendedStreamCmPct,
    [MEASURE_ID.REVENUE_BASELINE_MONTHLY]: baseEngine.revenue,
    [MEASURE_ID.REVENUE_SCENARIO_MONTHLY]: activeEngine.revenue,
    [MEASURE_ID.GROSS_PROFIT_SCENARIO_MONTHLY]: activeEngine.grossProfit,
    [MEASURE_ID.NET_PROFIT_SCENARIO_MONTHLY]: activeEngine.netProfit,
    [MEASURE_ID.ROI_SCENARIO_ON_FIXED]: activeEngine.roi,
    [MEASURE_ID.EBITDA_SCENARIO_MONTHLY]: activeEngine.ebitda,
    [MEASURE_ID.NP_PCT_SCENARIO]: activeEngine.npPct,
    [MEASURE_ID.OPERATING_MARGIN_SCENARIO]: activeEngine.operatingMarginPct,
    [MEASURE_ID.SALES_TARGET_SCENARIO_MONTHLY]: activeEngine.salesTargetRevenue,
    [MEASURE_ID.SALES_GAP_SCENARIO_MONTHLY]: activeEngine.salesNeededGap,
    [MEASURE_ID.BURN_RATE_SCENARIO_MONTHLY]: activeEngine.burnRateMonthly,
    [MEASURE_ID.CM_BLENDED_WORKBOOK]: wt.blended,
    [MEASURE_ID.WORKBOOK_SALES_TARGET]: wt.salesTarget,
    [MEASURE_ID.WORKBOOK_NP_AT_TARGET]: wt.netProfitAtTarget,
    [MEASURE_ID.WORKBOOK_ROI_ON_FIXED]: wt.roi,
    [MEASURE_ID.PIPELINE_WEIGHTED_VALUE]: weightedPipeline,
    [MEASURE_ID.PIPELINE_HEALTH]: pipeline.health,
    [MEASURE_ID.PIPELINE_COVERAGE]: pipeline.coverage,
    [MEASURE_ID.FORECAST_ACHIEVEMENT_PROXY]: forecastAchievementVsPlanProxy,
    [MEASURE_ID.BU_CM_BLENDED_STREAMS]: blendedStreamCmPct,
    [MEASURE_ID.BU_REVENUE_SCENARIO_MONTHLY]: activeEngine.revenue,
    [MEASURE_ID.BU_NET_PROFIT_SCENARIO_MONTHLY]: activeEngine.netProfit,
    [MEASURE_ID.BU_ROI_SCENARIO_ON_FIXED]: activeEngine.roi,
    ...(input.serviceEconomicsMeasures
      ? serviceEconomicsAsMeasureValues(input.serviceEconomicsMeasures)
      : {}),
    ...(input.dealEconomicsRollup
      ? dealEconomicsRollupAsMeasureValues(input.dealEconomicsRollup)
      : {}),
  };
}

export type EvaluateExecutiveWorkspaceMeasuresOptions = {
  hrSnapshot?: HrWorkforceSnapshot | null;
  serviceEconomicsMeasures?: ServiceEconomicsMeasures | null;
  dealEconomicsRollup?: DealEconomicsMeasures | null;
};

export function evaluateExecutiveWorkspaceMeasures(
  input: PlanningContext | ExecutiveWorkspaceMeasuresInput,
  options?: EvaluateExecutiveWorkspaceMeasuresOptions
): ExecutiveWorkspaceMeasuresResult {
  assertPlanningEvaluationContext(input);
  const {
    company,
    streams,
    opportunities,
    scenarios,
    activeScenarioId,
    tierLineOverrides,
    scenarioBundles,
  } = input;

  const weightedPipeline = opportunities
    .filter((o) => o.companyId === company.id)
    .reduce((s, o) => s + weightedRevenue(o), 0);

  const blendedStreamCmPct = blendedCmFromStreams(streams, company.contributionMarginPct);

  const baseEngine = runForecastEngine(
    {
      fixedCostsMonthly: company.fixedCostsMonthly,
      contributionMarginPct: blendedStreamCmPct,
      targetNpPct: company.npTargetPct,
      revenueMonthly: company.revenueMonthly,
      cac: 18_000,
      ltv: 220_000,
    },
    { weightedPipeline }
  );

  const companyStreams = streams.filter((s) => s.companyId === company.id);
  const evalCommon = {
    anchorCompany: company,
    streams: companyStreams,
    opportunities,
  };

  const scenarioById: Record<string, EngineOutputs> = {};
  if (scenarioBundles && Object.keys(scenarioBundles).length > 0) {
    for (const sc of scenarios) {
      const bundle = scenarioBundles[sc.id];
      if (bundle) {
        scenarioById[sc.id] = evaluateScenarioBundle({ ...evalCommon, bundle }).engine;
      }
    }
  }
  for (const sc of scenarios) {
    if (scenarioById[sc.id]) continue;
    scenarioById[sc.id] = applyScenario(
      {
        fixedCostsMonthly: company.fixedCostsMonthly,
        contributionMarginPct: blendedStreamCmPct,
        targetNpPct: company.npTargetPct,
        revenueMonthly: company.revenueMonthly,
      },
      {
        npTargetPct: sc.npTargetPct,
        revenueMixAdj: sc.revenueMixAdj,
        conversionRateAdj: sc.conversionRateAdj,
        fixedCostAdj: sc.fixedCostAdj,
        growthAdj: sc.growthAdj,
        pipelineWeightAdj: sc.pipelineWeightAdj,
      },
      weightedPipeline
    );
  }

  const activeScenario = resolveActiveScenario(scenarios, activeScenarioId);
  if (!activeScenario) {
    throw new Error(
      "evaluateExecutiveWorkspaceMeasures: invariant failed after assertPlanningEvaluationContext"
    );
  }

  const activeEngine = scenarioById[activeScenario.id];
  if (!activeEngine) {
    throw new Error(
      `evaluateExecutiveWorkspaceMeasures: missing engine output for scenario ${activeScenario.id}`
    );
  }

  const activeBundle = scenarioBundles?.[activeScenario.id];
  let workbook: ReturnType<typeof computeWorkbookPlanningSlice>;
  if (activeBundle && scenarioBundles) {
    const activeEval = evaluateScenarioBundle({ ...evalCommon, bundle: activeBundle });
    workbook = activeEval.workbook;
  } else {
    const npTargetForWorkbook = activeScenario.npTargetPct;
    workbook = computeWorkbookPlanningSlice({
      streams: companyStreams,
      tierLineOverrides,
      fixedCostsMonthly: company.fixedCostsMonthly,
      npTargetPct: npTargetForWorkbook,
    });
  }

  const rows = opportunities
    .filter((o) => o.companyId === company.id)
    .map((o) => ({
      dealValue: o.dealValue,
      probabilityPct: o.probabilityPct,
      stage: o.stage,
    }));
  const health = pipelineHealthScore(rows);
  const coverage = coverageRatio(weightedPipeline, company.revenueMonthly * 3);

  const forecastAchievementVsPlanProxy = Math.min(
    1.2,
    activeEngine.revenue / (company.revenueMonthly * 1.05)
  );

  const scenarioCompare = scenarios.map((sc) => {
    const engine = scenarioById[sc.id];
    if (!engine) {
      throw new Error(
        `evaluateExecutiveWorkspaceMeasures: missing engine output for scenario ${sc.id}`
      );
    }
    return {
      name: sc.name,
      profit: engine.netProfit,
      revenue: engine.revenue,
    };
  });

  const { measureLineageById, lineage } = buildLineageMaps();
  const valuesByMeasureId = fillValuesFromEngines({
    blendedStreamCmPct,
    weightedPipeline,
    baseEngine,
    activeEngine,
    workbook,
    pipeline: { health, coverage },
    forecastAchievementVsPlanProxy,
    serviceEconomicsMeasures: options?.serviceEconomicsMeasures,
    dealEconomicsRollup: options?.dealEconomicsRollup,
  });

  if (options?.hrSnapshot && activeBundle) {
    const baselineBundle = scenarios.find((s) => s.baseline)
      ? scenarioBundles?.[scenarios.find((s) => s.baseline)!.id]
      : undefined;
    const feasCtx = buildFeasibilityEvalContext({
      anchorCompany: company,
      streams: companyStreams,
      opportunities,
      bundle: activeBundle,
      baselineBundle,
      hrSnapshot: options.hrSnapshot,
    });
    const feas = evaluateOperationalFeasibility(feasCtx);
    if (feas.feasibilityMode === "hr_backed" && feas.supply && feas.demand) {
      valuesByMeasureId[MEASURE_ID.OPERATIONAL_SUPPLY_HOURS] =
        feas.supply.totalBillableHoursMonth;
      valuesByMeasureId[MEASURE_ID.OPERATIONAL_DEMAND_HOURS] =
        feas.demand.totalDemandHoursMonth;
      valuesByMeasureId[MEASURE_ID.OPERATIONAL_UTILIZATION_PCT] =
        feas.saturation?.buUtilizationPct ?? 0;
      valuesByMeasureId[MEASURE_ID.OPERATIONAL_HIRING_FTE_GAP] =
        feas.staffing?.impliedFteGap ?? 0;
    }
  }

  return {
    blendedStreamCmPct,
    weightedPipeline,
    baseEngine,
    scenarioById,
    activeScenario,
    activeEngine,
    workbook,
    pipeline: { health, coverage },
    forecastAchievementVsPlanProxy,
    scenarioCompare,
    lineage,
    valuesByMeasureId,
    measureLineageById,
  };
}
