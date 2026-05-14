import { describe, expect, it } from "vitest";
import {
  demoCompanies,
  demoOpportunities,
  demoScenarios,
  demoStreams,
} from "@/data/demo-seed";
import { applyScenario, runForecastEngine } from "@/lib/calculations/engine";
import { weightedRevenue } from "@/lib/calculations/pipeline";
import { evaluateExecutiveWorkspaceMeasures, MEASURE_ID } from "@/lib/planning/measures";

describe("evaluateExecutiveWorkspaceMeasures", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const scenarios = demoScenarios.filter((s) => s.companyId === company.id);
  const scenario = scenarios[0]!;

  it("matches legacy dashboard formulas for Northwind demo", () => {
    const opportunities = demoOpportunities;
    const weightedPipeline = opportunities
      .filter((o) => o.companyId === company.id)
      .reduce((s, o) => s + weightedRevenue(o), 0);

    const cm =
      streams.reduce((a, s) => a + s.revenueWeight * s.contributionMarginPct, 0) /
      streams.reduce((a, s) => a + s.revenueWeight, 0);

    const baseEngine = runForecastEngine(
      {
        fixedCostsMonthly: company.fixedCostsMonthly,
        contributionMarginPct: cm,
        targetNpPct: company.npTargetPct,
        revenueMonthly: company.revenueMonthly,
        cac: 18_000,
        ltv: 220_000,
      },
      { weightedPipeline }
    );

    const scenarioEngine = applyScenario(
      {
        fixedCostsMonthly: company.fixedCostsMonthly,
        contributionMarginPct: cm,
        targetNpPct: company.npTargetPct,
        revenueMonthly: company.revenueMonthly,
      },
      {
        npTargetPct: scenario.npTargetPct,
        revenueMixAdj: scenario.revenueMixAdj,
        conversionRateAdj: scenario.conversionRateAdj,
        fixedCostAdj: scenario.fixedCostAdj,
        growthAdj: scenario.growthAdj,
        pipelineWeightAdj: scenario.pipelineWeightAdj,
      },
      weightedPipeline
    );

    const snap = evaluateExecutiveWorkspaceMeasures({
      company,
      streams,
      opportunities,
      scenarios,
      activeScenarioId: scenario.id,
      tierLineOverrides: {},
    });

    expect(snap.blendedStreamCmPct).toBeCloseTo(cm, 10);
    expect(snap.weightedPipeline).toBeCloseTo(weightedPipeline, 6);
    expect(snap.baseEngine.netProfit).toBeCloseTo(baseEngine.netProfit, 6);
    expect(snap.activeEngine.revenue).toBeCloseTo(scenarioEngine.revenue, 6);
    expect(snap.activeEngine.roi).toBeCloseTo(scenarioEngine.roi, 6);
    expect(snap.scenarioCompare).toHaveLength(scenarios.length);

    const v = snap.valuesByMeasureId;
    expect(v[MEASURE_ID.REVENUE_SCENARIO_MONTHLY]).toBeCloseTo(scenarioEngine.revenue, 6);
    expect(v[MEASURE_ID.REVENUE_BASELINE_MONTHLY]).toBeCloseTo(baseEngine.revenue, 6);
    expect(v[MEASURE_ID.NET_PROFIT_SCENARIO_MONTHLY]).toBeCloseTo(scenarioEngine.netProfit, 6);
    expect(v[MEASURE_ID.PIPELINE_WEIGHTED_VALUE]).toBeCloseTo(weightedPipeline, 6);
    expect(snap.measureLineageById[MEASURE_ID.ROI_SCENARIO_ON_FIXED]?.upstreamMeasureIds).toContain(
      MEASURE_ID.NET_PROFIT_SCENARIO_MONTHLY
    );
  });
});
