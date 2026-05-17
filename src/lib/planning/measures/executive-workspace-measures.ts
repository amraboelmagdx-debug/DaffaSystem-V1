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
import { MEASURE_ID, type MeasureId } from "./measure-ids";
import type { KpiLineage } from "./measure-lineage";

export type MeasureLineage = {
  owner: "calculations-engine" | "workbook-engine" | "pipeline" | "derived" | "sales-plan-build-model";
  detail: string;
};

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

function blendedCmFromStreams(streams: DemoRevenueStream[], fallback: number): number {
  if (!streams.length) return fallback;
  return (
    streams.reduce((a, s) => a + s.revenueWeight * s.contributionMarginPct, 0) /
    streams.reduce((a, s) => a + s.revenueWeight, 0)
  );
}

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
      owner: meta.sourceEngine,
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
  };
}

export function evaluateExecutiveWorkspaceMeasures(
  input: PlanningContext | ExecutiveWorkspaceMeasuresInput
): ExecutiveWorkspaceMeasuresResult {
  const { company, streams, opportunities, scenarios, activeScenarioId, tierLineOverrides } = input;

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

  const scenarioById: Record<string, EngineOutputs> = {};
  for (const sc of scenarios) {
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

  const activeScenario =
    scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0] ?? ({} as DemoScenario);

  const activeEngine = scenarioById[activeScenario.id] ?? baseEngine;

  const npTargetForWorkbook = activeScenario?.npTargetPct ?? company.npTargetPct;
  const workbook = computeWorkbookPlanningSlice({
    streams,
    tierLineOverrides,
    fixedCostsMonthly: company.fixedCostsMonthly,
    npTargetPct: npTargetForWorkbook,
  });

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

  const scenarioCompare = scenarios.map((sc) => ({
    name: sc.name,
    profit: scenarioById[sc.id]!.netProfit,
    revenue: scenarioById[sc.id]!.revenue,
  }));

  const { measureLineageById, lineage } = buildLineageMaps();
  const valuesByMeasureId = fillValuesFromEngines({
    blendedStreamCmPct,
    weightedPipeline,
    baseEngine,
    activeEngine,
    workbook,
    pipeline: { health, coverage },
    forecastAchievementVsPlanProxy,
  });

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
